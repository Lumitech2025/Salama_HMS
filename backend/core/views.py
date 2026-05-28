from rest_framework import viewsets, filters, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db import transaction
from django.db.models import Avg, Count, F, Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView
from datetime import datetime, time
from rest_framework.permissions import AllowAny
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
# Add this line near the top of your views.py file:
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters import rest_framework as django_filters
from django.db.models import Sum, DecimalField
from django.db.models.functions import Coalesce
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import OuterRef, Subquery, ExpressionWrapper, DecimalField, IntegerField


from appointments.utils import dispatch_async_notifications

# Import local models and serializers
from .models import (
    LabPanel, Patient, Protocol, Requisition, Treatment, ChemoSession, Drug, 
    LabResult, LabOrder, Bill, Appointment, VitalSign, Queue, 
    LabInventoryItem, StockAdjustment, Prescription, 
    PrescriptionItem, ClinicalNote, ImagingRecord, RegistrationRecord, InventoryItem, PsychologyEnrollment, SessionLog, BereavementLog, 
    OutreachCampaign, ReferralPartner, SocialMediaPost, MarketingRequisitionExtension, LabReference, LabTestRegistry, ProtocolMaster, ProtocolDrug, DrugGuardrail,
    InsuranceCompany, InsuranceClaim, RemittanceBatch,ClaimDispatchBatch, InsuranceScheme,
    Service, PatientBillableItem
)
from .serializers import (
    LabOrderSerializer, LabReferenceSerializer, OncologyClinicalPortalSerializer, PatientSerializer, ProtocolSerializer, TreatmentSerializer, 
    ChemoSessionSerializer, DrugSerializer, LabResultSerializer, 
    BillSerializer, SalamaTokenObtainPairSerializer, LabInventorySerializer, 
    StockAdjustmentSerializer, AppointmentSerializer, VitalSignSerializer, 
    QueueSerializer, PrescriptionSerializer, ClinicalNoteSerializer, ImagingRecordSerializer, RegistrationRecordSerializer, InventoryItemSerializer, PsychologyEnrollmentSerializer, 
    SessionLogSerializer, 
    BereavementLogSerializer, OutreachCampaignSerializer, ReferralPartnerSerializer, SocialMediaPostSerializer,RequisitionSerializer, MarketingRequisitionSerializer, LabTestRegistrySerializer, ProtocolMasterSerializer,
    InsuranceCompanySerializer, InsuranceClaimSerializer, RemittanceBatchSerializer, DetailedPatientClaimSerializer, ClaimDispatchBatchSerializer, InsuranceSchemeSerializer,
    ServiceSerializer, PatientBillableItemSerializer
)

# --- 1. PERMISSION LOGIC ---

class IsReceptionStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') in ['RECEPTIONIST', 'ADMIN']

class IsClinicalStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        clinical_roles = ['ONCOLOGIST', 'NURSE', 'LAB_TECH', 'HEMATOLOGIST', 'SURGEON', 'ADMIN', 'RADIOLOGIST', 'RECEPTIONIST']
        return request.user.is_authenticated and getattr(request.user, 'role', '') in clinical_roles

class IsFinancialStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') in ['BILLING', 'FINANCE', 'ADMIN']

# --- 2. AUTHENTICATION ---

class SalamaTokenObtainPairView(TokenObtainPairView):
    serializer_class = SalamaTokenObtainPairSerializer

# --- 3. QUEUE ORCHESTRATION ---

class QueueViewSet(viewsets.ModelViewSet):
    queryset = Queue.objects.all().order_by('priority', 'entered_at')
    serializer_class = QueueSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['current_station', 'status', 'priority']
    search_fields = ['patient__name', 'token_id', 'patient__registry_no']

    @action(detail=True, methods=['post'])
    def move_next(self, request, pk=None):
        """Advances the patient. Supports both automated flow and manual selection."""
        queue_item = self.get_object()
        target_station = request.data.get('target_station')
        
        if not target_station:
            flow = {
                'REGISTRATION': 'TRIAGE',
                'TRIAGE': 'DOCTOR',
                'DOCTOR': 'LAB', 
                'LAB': 'DOCTOR',
                'RADIOLOGY': 'DOCTOR',
                'PHARMACY': 'BILLING',
                'BILLING': 'COMPLETED'
            }
            target_station = flow.get(queue_item.current_station, 'COMPLETED')

        if target_station == 'COMPLETED':
            queue_item.status = 'COMPLETED'
        else:
            queue_item.current_station = target_station
            queue_item.status = 'WAITING'
            
        queue_item.save()
        
        return Response({
            'status': 'success',
            'next_station': queue_item.get_current_station_display(),
            'current_status': queue_item.get_status_display()
        })

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Powers KPI cards for Oncology and Pharmacy Dashboards."""
        station = request.query_params.get('station', 'DOCTOR')
        today = timezone.now().date()
        
        station_qs = Queue.objects.filter(entered_at__date=today, current_station=station)
        
        if station == 'PHARMACY':
            pending_count = station_qs.filter(status='AWAITING_MEDICATION').count()
        else:
            pending_count = station_qs.filter(status='WAITING').count()

        return Response({
            "total_appointments": Appointment.objects.count(),
            "today_appointments": Appointment.objects.filter(appointment_date=today).count(),
            "total_registrations": Patient.objects.count(), 
            "today_total": Queue.objects.filter(entered_at__date=today).count(),
        })

# --- 4. CLINICAL & EMR MODULES ---

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'registry_no', 'phone']

    # FIX: Cleaned redundant duplicate queue creations out of standard model mutations

class VitalSignViewSet(viewsets.ModelViewSet):
    queryset = VitalSign.objects.all().order_by('-created_at')
    serializer_class = VitalSignSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient']

    def perform_create(self, serializer):
        with transaction.atomic():
            vital = serializer.save(recorded_by=self.request.user)
            # Find and systematically update the active tracking space safely
            queue_items = Queue.objects.filter(patient=vital.patient, current_station='TRIAGE')
            for item in queue_items:
                item.current_station = 'DOCTOR'
                item.status = 'WAITING'
                item.save()

class ClinicalNoteViewSet(viewsets.ModelViewSet):
    queryset = ClinicalNote.objects.all().order_by('-created_at')
    serializer_class = ClinicalNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['patient', 'visit', 'note_type']
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class ImagingRecordViewSet(viewsets.ModelViewSet):
    queryset = ImagingRecord.objects.all().order_by('-created_at')
    serializer_class = ImagingRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient']

# --- 5. PRESCRIPTIONS & PHARMACY ---

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all().order_by('-created_at')
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        patient_id = self.request.query_params.get('patient')
        status_val = self.request.query_params.get('status')
        qs = self.queryset
        if patient_id: qs = qs.filter(patient_id=patient_id)
        if status_val: qs = qs.filter(status=status_val)
        return qs

    @action(detail=False, methods=['get'], url_path='summary')
    def pharmacy_summary(self, request):
        today = timezone.now().date()
        return Response({
            'dispensed_today': Prescription.objects.filter(created_at__date=today, status='DISPENSED').count(),
            'revenue_today': Bill.objects.filter(created_at__date=today, is_paid=True).aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'low_stock_items': Drug.objects.filter(quantity_in_stock__lte=F('reorder_level')).count()
        })

# --- 6. APPOINTMENTS & BILLING ---

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        queryset = Appointment.objects.all()
        target_date_str = self.request.query_params.get('appointment_date', None)
        
        if target_date_str:
            parsed_date = parse_date(target_date_str)
            if parsed_date:
                queryset = queryset.filter(appointment_date=parsed_date)
                
        return queryset.order_by('appointment_time')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            appointment = serializer.save()
            
            patient_name = (appointment.patient.name if appointment.patient else None) or getattr(appointment, 'manual_patient_name', None) or "Valued Patient"
            patient_phone = (appointment.patient.phone if appointment.patient else None) or getattr(appointment, 'manual_patient_phone', None)
            patient_email = (appointment.patient.email if appointment.patient else None) or getattr(appointment, 'manual_patient_email', None)
            booking_date = getattr(appointment, 'appointment_date', 'Scheduled Date')
            booking_time = getattr(appointment, 'appointment_time', 'Scheduled Time')
            
            subject = "Appointment Confirmation - Salama Cancer Care"
            message_body = (
                f"Dear {patient_name},\n\n"
                f"Your clinical appointment at Salama Cancer Care has been successfully confirmed for "
                f"{booking_date} at {booking_time}.\n\n"
                f"Please arrive 15 minutes early for vitals triage sorting.\n\n"
                f"Thank you,\nSalama Medical Team"
            )
            
            if patient_phone or patient_email:
                dispatch_async_notifications(
                    phone=patient_phone,
                    email=patient_email,
                    message_body=message_body,
                    subject=subject
                )
            
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='send_reminder')
    def send_reminder(self, request, pk=None):
        try:
            appointment = self.get_object()
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment record not found."}, status=status.HTTP_404_NOT_FOUND)

        patient_name = (appointment.patient.name if appointment.patient else None) or getattr(appointment, 'manual_patient_name', None) or "Valued Patient"
        patient_phone = (appointment.patient.phone if appointment.patient else None) or getattr(appointment, 'manual_patient_phone', None)
        patient_email = (appointment.patient.email if appointment.patient else None) or getattr(appointment, 'manual_patient_email', None)
        booking_date = getattr(appointment, 'appointment_date', 'Scheduled Date')
        booking_time = getattr(appointment, 'appointment_time', 'Scheduled Time')

        subject = "Appointment Reminder - Salama Cancer Care"
        message_body = (
            f"Dear {patient_name},\n\n"
            f"This is a friendly reminder that your upcoming clinical appointment at Salama Cancer Care "
            f"is scheduled for {booking_date} at {booking_time}.\n\n"
            f"If you are unable to make this slot, please contact the clinic helpdesk immediately.\n\n"
            f"Thank you,\nSalama Medical Team"
        )

        if not patient_phone and not patient_email:
            return Response(
                {"error": "This patient profile does not contain a registered phone or email address."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        dispatch_async_notifications(
            phone=patient_phone,
            email=patient_email,
            message_body=message_body,
            subject=subject
        )

        return Response({"message": f"Reminder sent for {patient_name}."}, status=status.HTTP_200_OK)

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all().order_by('-created_at')
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated, IsFinancialStaff]
    filterset_fields = ['patient', 'is_paid']

# --- 7. INVENTORY & LAB ---

class LabOrderViewSet(viewsets.ModelViewSet):
    # Optimizing database queries with select_related to prevent N+1 issues when fetching patient/visit details
    queryset = LabOrder.objects.all().select_related('patient', 'visit').order_by('-created_at')
    serializer_class = LabOrderSerializer
    
    # Keeping your permissions intact
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['visit', 'status', 'patient']
    
    # Updated search fields to match your relational fields (using patient name or queue/token id)
    search_fields = ['patient__name', 'visit__queue_id']

    def perform_create(self, serializer):
        # Cleanly saves the order. The serializer automatically maps the array into boolean fields.
        serializer.save()

    # --- Custom Actions Tailored for Your 4 User Profiles ---

    @action(detail=False, methods=['get'], url_path='active-queue')
    def active_queue(self, request):
        """
        1. FOR THE LAB TECH
        Returns only PENDING orders so they can see their active workload 
        without getting bogged down by historic, completed data.
        """
        pending_orders = self.get_queryset().filter(status='PENDING')
        
        # Optional: Filter specifically by a specific queue_id if passed in query params
        queue_id = request.query_params.get('queue_id', None)
        if queue_id:
            pending_orders = pending_orders.filter(visit__queue_id=queue_id)
            
        serializer = self.get_serializer(pending_orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='billing-pending')
    def billing_pending(self, request):
        """
        2. FOR THE BILLING OFFICER
        Returns lab orders that are completed or pending but need financial clearance.
        Can easily filter by visit to attach to a running consultation invoice.
        """
        visit_id = request.query_params.get('visit', None)
        orders = self.get_queryset()
        if visit_id:
            orders = orders.filter(visit_id=visit_id)
            
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='patient-history')
    def patient_history(self, request):
        """
        3. FOR THE PATIENT / DOCTOR
        Quickly pull all historical lab orders for a specific patient.
        """
        patient_id = request.query_params.get('patient', None)
        if not patient_id:
            return Response({"error": "Patient ID parameter is required"}, status=400)
            
        orders = self.get_queryset().filter(patient_id=patient_id)
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.all().order_by('-created_at') 
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient', 'is_critical']

class LabInventoryViewSet(viewsets.ModelViewSet):
    queryset = LabInventoryItem.objects.all().order_by('name')
    serializer_class = LabInventorySerializer

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        with transaction.atomic():
            item = self.get_object()
            used = int(request.data.get('used', 0))
            item.stock -= used
            item.save()
            StockAdjustment.objects.create(
                item=item, technician=request.user, quantity_used=used,
                remaining_stock=item.stock, notes=request.data.get('notes', '')
            )
            return Response({'status': 'Stock adjusted', 'new_stock': item.stock})
    
class LabReferenceViewSet(viewsets.ModelViewSet):
    queryset = LabReference.objects.all()
    serializer_class = LabReferenceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category']

class LabTestRegistryViewSet(viewsets.ModelViewSet):
    queryset = LabTestRegistry.objects.all().select_related('parent_panel')
    serializer_class = LabTestRegistrySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'parent_panel__name']

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        raw_panel_name = data.get('parent_panel') or data.get('main_panel_target') or data.get('category')
        
        if not raw_panel_name:
            return Response(
                {"parent_panel": ["This field is required to structure lab rules."]}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # FIX: Operations grouped within transaction safe space
        with transaction.atomic():
            panel_obj, _ = LabPanel.objects.get_or_create(name=raw_panel_name.strip())
            
            if 'lower_range_constraint' in data:
                data['lower_range'] = data['lower_range_constraint']
            if 'upper_range_constraint' in data:
                data['upper_range'] = data['upper_range_constraint']
            if 'base_cost_charge' in data:
                data['price'] = data['base_cost_charge']

            serializer = self.get_serializer(data=data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
            serializer.save(parent_panel=panel_obj)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        raw_panel_name = data.get('parent_panel') or data.get('main_panel_target') or data.get('category')
        
        with transaction.atomic():
            serializer = self.get_serializer(instance, data=data, partial=partial)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
            if raw_panel_name:
                panel_obj, _ = LabPanel.objects.get_or_create(name=raw_panel_name.strip())
                serializer.save(parent_panel=panel_obj)
            else:
                serializer.save()
                
            return Response(serializer.data)
        

class ClinicalPortalPatientDetailsView(APIView):
    """
    Retrieves consolidated telemetry mapping for registration, vitals, and lab parameters.
    """
    def get(self, request, encounter_id, *args, **kwargs):
        try:
            # Querying the record alongside pre-fetched relation entries to optimize DB hits
            record = RegistrationRecord.objects.prefetch_related('vitals', 'lab_orders').get(id=encounter_id)
            serializer = OncologyClinicalPortalSerializer(record)
            return Response(serializer.data, status=status.HTTP_OK)
        except RegistrationRecord.DoesNotExist:
            return Response(
                {"error": "Encounter or Registration instance not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )

class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all().order_by('name')
    serializer_class = DrugSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['store_location']
    search_fields = ['name', 'batch_number']

class ProtocolViewSet(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    permission_classes = [permissions.IsAuthenticated]

class ChemoSessionViewSet(viewsets.ModelViewSet):
    queryset = ChemoSession.objects.all()
    serializer_class = ChemoSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]

class TreatmentViewSet(viewsets.ModelViewSet):
    serializer_class = TreatmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    def get_queryset(self):
        return Treatment.objects.select_related('patient', 'protocol', 'oncologist').all()

class RegistrationRecordViewSet(viewsets.ModelViewSet):
    queryset = RegistrationRecord.objects.all().order_by('-registered_at')
    serializer_class = RegistrationRecordSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # 🚀 FIXED: Capture name/phone variables out of request data BEFORE saving,
            # because serializer.save() pops them during write_only validation extraction.
            f_name = request.data.get('first_name', '').strip()
            l_name = request.data.get('last_name', '').strip()
            full_name = f"{f_name} {l_name}".strip() or "Valued Patient"
            patient_phone = request.data.get('phone', None)
            patient_email = request.data.get('email', None)

            # Process the transaction database save routines
            registration_item = serializer.save()

            real_hrn = getattr(registration_item, 'health_record_number', 'PENDING')

            subject = "Registration Successful - Salama Cancer Care"
            message_body = (
                f"Hello {full_name},\n\n"
                f"Thank you for registering. We are pleased to serve you.\n\n"
                f"Your health record number is {real_hrn}\n\n"
                f"Proceed to the triage station to have your vitals checked.\n\n"
                f"Best regards,\nSalama Medical Team"
            )

            if patient_phone or patient_email:
                try:
                    dispatch_async_notifications(
                        phone=patient_phone,
                        email=patient_email,
                        message_body=message_body,
                        subject=subject
                    )
                except Exception as e:
                    print(f"⚠️ NOTIFICATION WORKER ERROR: {str(e)}")

            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        today = timezone.now().date()
        
        total_count = RegistrationRecord.objects.count()
        today_qs = RegistrationRecord.objects.filter(registered_at__date=today).order_by()
        
        age_groups = {
            "Pediatric (0-17)": today_qs.filter(age__lt=18).count(),
            "Adult (18-55)": today_qs.filter(age__gte=18, age__lte=55).count(),
            "Senior (55+)": today_qs.filter(age__gt=55).count(),
        }

        gender_data = today_qs.values('gender').annotate(count=Count('gender'))
        gender_map = {item['gender']: item['count'] for item in gender_data}

        # 🚀 FIXED: Aggregate by payment_mode (CASH vs INSURANCE) instead of old text field
        payment_mode_data = today_qs.values('payment_mode').annotate(count=Count('payment_mode'))
        payment_mode_map = {item['payment_mode']: item['count'] for item in payment_mode_data}

        # 🚀 EXTRA CREDIT: Break down the actual insurance company numbers for today's intake
        insurance_breakdown = today_qs.filter(payment_mode='INSURANCE')\
                                      .values('insurance_company__name')\
                                      .annotate(count=Count('insurance_company'))
        
        insurance_map = {
            item['insurance_company__name'] or 'Corporate': item['count'] 
            for item in insurance_breakdown
        }

        return Response({
            "total_patients": total_count,
            "todays_registrations": today_qs.count(),
            "urgent_today": today_qs.filter(is_urgent=True).count(),
            "returning_today": today_qs.filter(is_returning=True).count(),
            "gender_distribution": {
                "M": gender_map.get('M', 0),
                "F": gender_map.get('F', 0)
            },
            "age_groups": age_groups,
            "payment_mode_distribution": payment_mode_map, # New clean breakdown tracker
            "insurance_distribution": insurance_map        # Dynamic breakdown of carrier names
        })
    
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by('-added_at')
    serializer_class = InventoryItemSerializer

class PsychologyEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = PsychologyEnrollment.objects.all().order_by('-created_at')
    serializer_class = PsychologyEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(enrolled_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='lost-to-follow-up')
    def lost_to_follow_up(self, request):
        ltfu_cases = self.queryset.filter(status='LOST_TO_FOLLOW_UP')
        page = self.paginate_queryset(ltfu_cases)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(ltfu_cases, many=True)
        return Response(serializer.data)

class SessionLogViewSet(viewsets.ModelViewSet):
    queryset = SessionLog.objects.all().order_by('-session_date')
    serializer_class = SessionLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='unsynced-hro')
    def unsynced_hro(self, request):
        unsynced = self.queryset.filter(is_synced_with_hro=False)
        serializer = self.get_serializer(unsynced, many=True)
        return Response(serializer.data)

class BereavementLogViewSet(viewsets.ModelViewSet):
    queryset = BereavementLog.objects.all().order_by('-last_contact_date')
    serializer_class = BereavementLogSerializer
    permission_classes = [permissions.IsAuthenticated]

class OutreachCampaignViewSet(viewsets.ModelViewSet):
    queryset = OutreachCampaign.objects.all().order_by('-created_at')
    serializer_class = OutreachCampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

class ReferralPartnerViewSet(viewsets.ModelViewSet):
    queryset = ReferralPartner.objects.all().order_by('-total_patients_referred')
    serializer_class = ReferralPartnerSerializer
    permission_classes = [permissions.IsAuthenticated]

class SocialMediaPostViewSet(viewsets.ModelViewSet):
    queryset = SocialMediaPost.objects.all().order_by('-created_at')
    serializer_class = SocialMediaPostSerializer
    permission_classes = [permissions.IsAuthenticated]



class ProtocolMasterViewSet(viewsets.ModelViewSet):
    queryset = ProtocolMaster.objects.all().prefetch_related('drugs__rules')
    serializer_class = ProtocolMasterSerializer
    authentication_classes = [] 
    permission_classes = [AllowAny]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"message": "Protocol Matrix cleanly deleted from engine space."}, 
            status=status.HTTP_204_NO_CONTENT
        )
    
class RequisitionViewSet(viewsets.ModelViewSet):
    """
    The main clearinghouse endpoint for the Finance Office.
    Provides data feeds for the Lab, Pharmacy, and Marketing tabs simultaneously.
    """
    queryset = Requisition.objects.all().prefetch_related('items__lab_item', 'items__pharmacy_item', 'marketing_meta__campaign')
    serializer_class = RequisitionSerializer
    permission_classes = [IsAuthenticated]
    
    # Enable filtering by department and approval status out of the box
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'status', 'is_viewed_by_finance']
    search_fields = ['reason', 'requested_by__first_name', 'requested_by__last_name', 'id']
    ordering_fields = ['created_at', 'total_cost']
    ordering = ['-created_at']  # Default newest first

    def get_queryset(self):
        """
        Optional optimization: You can restrict standard non-finance users 
        to only seeing their own submitted requests, while allowing finance 
        officers to view everything.
        """
        user = self.request.user
        # Replace with your actual user role flag (e.g., user.is_finance or user.role == 'FINANCE')
        if getattr(user, 'is_staff', False) or user.groups.filter(name='Finance').exists():
            return self.queryset
        return self.queryset.filter(requested_by=user)

    @action(detail=True, methods=['patch'], url_path='mark-as-viewed')
    def mark_as_viewed(self, request, pk=None):
        """
        Clears the real-time notification badge on the Finance Sidebar 
        when an auditor clicks on a requisition row.
        """
        requisition = self.get_object()
        requisition.is_viewed_by_finance = True
        requisition.save(update_fields=['is_viewed_by_finance'])
        return Response({'status': 'notification badge cleared'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='pending-counts')
    def pending_counts(self):
        """
        Returns real-time counter metrics partitioned by department.
        Perfect for rendering dynamic badge pills directly into the Sidebar tabs.
        """
        counts = {
            'LAB': Requisition.objects.filter(department='LAB', status='PENDING').count(),
            'PHARMACY': Requisition.objects.filter(department='PHARMACY', status='PENDING').count(),
            'MARKETING': Requisition.objects.filter(department='MARKETING', status='PENDING').count(),
            'TOTAL_UNVIEWED': Requisition.objects.filter(is_viewed_by_finance=False).count()
        }
        return Response(counts, status=status.HTTP_200_OK)
    
class MarketingRequisitionViewSet(viewsets.ModelViewSet):
    """
    Dedicated viewset for your Marketing team dashboard.
    Accepts and renders data structures matching your legacy schema,
    but handles operations inside the unified core system under the hood.
    """
    queryset = Requisition.objects.filter(department='MARKETING').prefetch_related('marketing_meta__campaign')
    serializer_class = MarketingRequisitionSerializer
    permission_classes = [IsAuthenticated]
    
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['reason', 'marketing_meta__campaign__name']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        """
        Ensures that requests arriving through the marketing dashboard form 
        automatically bind the current request user as the applicant.
        """
        serializer.save(request=self.request)

class InsuranceCompanyViewSet(viewsets.ModelViewSet):
    serializer_class = InsuranceCompanySerializer
    permission_classes = [IsAuthenticated]
    
    # Enable API parsers to seamlessly switch between structured JSON and Multipart file streams
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'kra_pin', 'contact_person', 'payer_code']
    ordering_fields = ['name', 'created_at', 'annotated_total_billed', 'annotated_total_remitted', 'annotated_aging_debt']

    def get_queryset(self):
        """
        Overrides the default queryset to isolate aggregates into decoupled SQL subqueries,
        eliminating the Cartesian Product duplication trap and enabling performant server-side sorting.
        """
        # 1. Isolate historical claim billings subquery to prevent join explosion
        claims_subquery = InsuranceClaim.objects.filter(
            insurance_company=OuterRef('pk')
        ).values('insurance_company').annotate(
            total=Sum('total_amount_billed')
        ).values('total')

        # 2. Isolate remittance batch collections subquery 
        # (Ensure RemittanceBatch model mapping matches your exact app placement)
        batches_subquery = InsuranceClaim.objects.filter(
            insurance_company=OuterRef('pk')
        ).values('insurance_company').annotate(
            total=Sum('amount_paid') # Point to the appropriate remittance aggregate field
        ).values('total')

        # 3. Assemble parent query executing clean, performance-isolated sub-selections
        return InsuranceCompany.objects.all()\
            .prefetch_related('schemes')\
            .annotate(
                annotated_total_billed=Coalesce(
                    Subquery(claims_subquery, output_field=DecimalField()),
                    0.00,
                    output_field=DecimalField()
                ),
                annotated_total_remitted=Coalesce(
                    Subquery(batches_subquery, output_field=DecimalField()),
                    0.00,
                    output_field=DecimalField()
                )
            )\
            .annotate(
                # 👇 FIXED: Injected database-level expression so sorting works seamlessly out-of-the-box
                annotated_aging_debt=ExpressionWrapper(
                    F('annotated_total_billed') - F('annotated_total_remitted'),
                    output_field=DecimalField()
                )
            ).order_by('name')

    @action(
        detail=True, 
        methods=['post'], 
        url_path='upload-sla', 
        parser_classes=[MultiPartParser, FormParser]
    )
    def upload_sla(self, request, pk=None):
        """
        Stitches the React UI file handler component to the database file storage.
        Catches the separate, secondary multi-part binary stream upload securely.
        """
        company = self.get_object()
        serializer = InsuranceCompanySLAUploadSerializer(company, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "SLA Document synchronized successfully.",
                "sla_document_url": company.sla_document.url
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """
        Safety Guardrail: Prevent hard-deleting an insurance provider if they have active 
        claims historical records tied to them. In healthcare systems, audit trails are law.
        """
        instance = self.get_object()
        if instance.insuranceclaim_set.exists():
            return Response(
                {"error": "Cannot delete this provider. Active or historical insurance claims are attached to this record. Consider setting is_active=False instead."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class InsuranceSchemeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for individual insurance sub-plans and benefit matrices.
    Provides standalone lookup capabilities for triage check-ins and frontend dropdowns.
    """
    queryset = InsuranceScheme.objects.all().order_by('name')
    serializer_class = InsuranceSchemeSerializer
    permission_classes = [IsAuthenticated]
    
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'company__name', 'classification']

    def get_queryset(self):
        """
        Allows quick-filtering sub-schemes by their parent provider identifier 
        via clean request query parameters.
        Example lookup: /api/insurance-schemes/?company_id=2
        """
        queryset = super().get_queryset()
        company_id = self.request.query_params.get('company_id') or self.request.query_params.get('company')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        return queryset


class RemittanceBatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing physical bulk bank remittance deposit statements.
    Accommodates multipart form data streams for attached spreadsheet binary uploads.
    """
    queryset = RemittanceBatch.objects.all().order_by('-date_received', '-id')
    serializer_class = RemittanceBatchSerializer
    permission_classes = [IsAuthenticated]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['insurance_company']
    search_fields = ['payment_reference', 'insurance_company__name']
    ordering_fields = ['date_received', 'total_amount_received', 'created_at']

    def perform_create(self, serializer):
        # Passes the active request context down to the serializer save method
        # so that 'reconciled_by' defaults to the authenticated user automatically.
        serializer.save(reconciled_by=self.request.user)


class InsuranceClaimViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage the individual patient hospital treatment invoices routed to insurers.
    """
    queryset = InsuranceClaim.objects.all().order_by('-date_submitted')
    serializer_class = InsuranceClaimSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # Allow quick database filtering states by matching processing workflows or payer accounts
    filterset_fields = ['status', 'insurance_company']
    search_fields = ['claim_number', 'patient_name', 'pre_auth_code', 'insurance_company__name']
    ordering_fields = ['total_amount_billed', 'shortfall_amount', 'date_submitted']



class InsuranceClaimFilter(django_filters.FilterSet):
    # Enable filtering exactly by target bundle index numbers or explicit patient references
    patient_id = django_filters.NumberFilter(field_name="patient__id")
    dispatch_batch_id = django_filters.NumberFilter(field_name="dispatch_batch__id")

    class Meta:
        model = InsuranceClaim
        fields = ['status', 'insurance_company', 'patient_id', 'dispatch_batch_id']


class InsuranceClaimViewSet(viewsets.ModelViewSet):
    queryset = InsuranceClaim.objects.all().select_related('patient', 'insurance_company', 'dispatch_batch')
    serializer_class = DetailedPatientClaimSerializer
    filterset_class = InsuranceClaimFilter
    search_fields = ['claim_number', 'patient__first_name', 'patient__last_name', 'pre_auth_code']


class ClaimDispatchBatchViewSet(viewsets.ModelViewSet):
    queryset = ClaimDispatchBatch.objects.all().order_by('-date_dispatched')
    serializer_class = ClaimDispatchBatchSerializer
    filterset_fields = ['insurance_company', 'is_acknowledged']
    search_fields = ['batch_reference']

class ServiceViewSet(viewsets.ModelViewSet):
    """
    Handles administrative CRUD operations for the clinic's price book catalog.
    """
    queryset = Service.objects.all().order_by('sku')
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['dept', 'active']
    search_fields = ['sku', 'name']

    def destroy(self, request, *args, **kwargs):
        """
        Prevent accidental hard deletion of services. Soft-deactivates instead 
        to maintain historical foreign key data integrity.
        """
        instance = self.get_object()
        instance.active = False
        instance.save()
        return Response(
            {"detail": f"Service {instance.sku} has been deactivated successfully."},
            status=status.HTTP_200_OK
        )


class PatientBillableItemViewSet(viewsets.ModelViewSet):
    """
    Handles point-of-care item charging across multiple clinical workflow stations.
    """
    queryset = PatientBillableItem.objects.all()
    serializer_class = PatientBillableItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['patient', 'visit', 'station_charged', 'billing_status']
    search_fields = ['service_sku_snapshot', 'service_name_snapshot', 'visit__queue_id', 'patient__name']

    def get_queryset(self):
        """
        Optimizes database performance using select_related, minimizing 
        N+1 lookup problems on heavy finance tracking queries.
        """
        return self.queryset.select_related('patient', 'visit', 'service', 'ordered_by')

    @action(detail=False, methods=['get'], url_path='active-invoice')
    def active_invoice(self, request):
        """
        Custom endpoint for the billing/cashier desk to instantly retrieve all 
        PENDING charges for a patient's active visit loop using their queue ID or visit record.
        Example query: /api/billable-items/active-invoice/?visit_id=5 or ?queue_id=Q26-001
        """
        visit_id = request.query_params.get('visit_id')
        queue_id = request.query_params.get('queue_id')
        
        queryset = self.get_queryset().filter(billing_status='PENDING')
        
        if visit_id:
            queryset = queryset.filter(visit_id=visit_id)
        elif queue_id:
            queryset = queryset.filter(visit__queue_id__iexact=queue_id)
        else:
            return Response(
                {"error": "Please provide a 'visit_id' or 'queue_id' query parameter."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer = self.get_serializer(queryset, many=True)
        
        # Calculate summary metadata block for the billing UI
        subtotal = sum(item.total_amount for item in queryset)
        
        return Response({
            "items": serializer.data,
            "invoice_metadata": {
                "item_count": queryset.count(),
                "total_pending_kes": subtotal
            }
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """
        Explicit action endpoint for the cashier or administrative desk to settle payments or issue waivers.
        Expected payload: {"status": "PAID"} or {"status": "WAIVED"}
        """
        billable_item = self.get_object()
        new_status = request.data.get('status')
        
        valid_statuses = [choice[0] for choice in PatientBillableItem.BILLING_STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid status selection. Choose from: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        billable_item.billing_status = new_status
        billable_item.save()
        
        return Response({
            "message": f"Item status updated successfully to {new_status}.",
            "item_id": billable_item.id,
            "new_status": billable_item.billing_status
        }, status=status.HTTP_200_OK)
