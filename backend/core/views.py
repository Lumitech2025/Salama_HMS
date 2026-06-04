from django.http import JsonResponse

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
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters import rest_framework as django_filters
from django.db.models import Sum, DecimalField
from django.db.models.functions import Coalesce
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import OuterRef, Subquery, ExpressionWrapper, DecimalField, IntegerField
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from django.db.models import Q
import requests
from django.conf import settings
from django.core.cache import cache

from appointments.utils import dispatch_async_notifications

# Import local models and serializers
from .models import (
    LabPanel, Patient, Protocol, Requisition, Treatment, ChemoSession, Drug, 
    LabResult, LabOrder, Bill, Appointment, VitalSign, Queue, 
    LabInventoryItem, StockAdjustment, Prescription, 
    PrescriptionItem, ClinicalNote, ImagingRecord, RegistrationRecord, InventoryItem, PsychologyEnrollment, SessionLog, BereavementLog, 
    OutreachCampaign, ReferralPartner, SocialMediaPost, MarketingRequisitionExtension, LabReference, LabTestRegistry, 
    ProtocolMaster, ProtocolDrug, DrugGuardrail, ProtocolIngredient,
    CancerSite, CancerType, Regimen, RegimenDrug,
    InsuranceCompany, InsuranceClaim, RemittanceBatch,ClaimDispatchBatch, InsuranceScheme,
    Service, PatientBillableItem, PatientInvoice, 
    ICD10Diagnosis, PatientDiagnosis,
    ImagingOrder, ImagingResult,
    Supplier,
    PurchaseOrder, GoodsReceivedNote, 
    PurchaseInvoice, PaymentVoucher,
    NurseServiceOrder
    
)
from .serializers import (
    LabOrderSerializer, LabReferenceSerializer, LabResultSerializer, 
    OncologyClinicalPortalSerializer, PatientSerializer, 
    ProtocolSerializer, ProtocolIngredientSerializer, 
    TreatmentSerializer, ChemoSessionSerializer, DrugSerializer, 
    CancerSiteSerializer, CancerTypeSerializer, RegimenSerializer, RegimenDrugSerializer,
    BillSerializer, SalamaTokenObtainPairSerializer, LabInventorySerializer, 
    StockAdjustmentSerializer, AppointmentSerializer, VitalSignSerializer, 
    QueueSerializer, PrescriptionSerializer, ClinicalNoteSerializer, ImagingRecordSerializer, RegistrationRecordSerializer, InventoryItemSerializer, PsychologyEnrollmentSerializer, 
    SessionLogSerializer, 
    BereavementLogSerializer, OutreachCampaignSerializer, ReferralPartnerSerializer, SocialMediaPostSerializer,RequisitionSerializer, MarketingRequisitionSerializer, LabTestRegistrySerializer, ProtocolMasterSerializer,
    InsuranceCompanySerializer, InsuranceClaimSerializer, RemittanceBatchSerializer, DetailedPatientClaimSerializer, ClaimDispatchBatchSerializer, InsuranceSchemeSerializer,
    ServiceSerializer, PatientBillingLookupSerializer, ActiveInvoiceSerializer, PatientBillableItemSerializer,
    ICD10DiagnosisSerializer, PatientDiagnosisSerializer,
    SupplierSerializer,
    PurchaseOrderSerializer, GoodsReceivedNoteSerializer, 
    PurchaseInvoiceSerializer, PaymentVoucherSerializer,
    ImagingOrderSerializer, ImagingResultSerializer,
    NurseServiceOrderSerializer
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

       
        if target_station == 'DOCTOR':
            try:
                from models import PatientInvoice, InvoiceLineItem
                from models import Service 
                
                
                target_sku = 'ONC-CONS_ONCO'  
                
               
                consultation_service = Service.objects.filter(
                    sku=target_sku, 
                    charge_type='TRIGGERED',
                    active=True
                ).first()
                
                if consultation_service and queue_item.visit:
                    # Fetch or create the active open invoice assigned to this specific RegistrationRecord
                    invoice, created = PatientInvoice.objects.get_or_create(
                        patient=queue_item.patient,
                        visit=queue_item.visit,
                        status='UNPAID'
                    )
                    
                    charge_exists = InvoiceLineItem.objects.filter(
                        invoice=invoice,
                        item_name=consultation_service.name
                    ).exists()
                    
                    if not charge_exists:
                        InvoiceLineItem.objects.create(
                            invoice=invoice,
                            # service=consultation_service, # Uncomment if ForeignKey exists
                            item_name=consultation_service.name,
                            quantity=1,
                            unit_price=consultation_service.price,
                            total_price=consultation_service.price,
                            status='PENDING'
                        )
                        
                        if hasattr(invoice, 'recalculate_totals'):
                            invoice.recalculate_totals()
                            
            except Exception as billing_err:
                print(f"[TRIAGE AUTOMATION ERROR]: Failed to generate upfront charge: {str(billing_err)}")
        # =================================================================

        # 2. Complete standard station routing changes
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
    serializer_class = VitalSignSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]

    def get_queryset(self):
        # Fallback to query parameter matching regardless of active filter backends
        queryset = VitalSign.objects.all().order_by('-created_at')
        patient_id = self.request.query_params.get('patient', None)
        
        if patient_id is not None:
            queryset = queryset.filter(patient_id=patient_id)
            
        return queryset

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
        test_skus = self.request.data.get('test_skus', [])
        
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
        
class ImagingOrderViewSet(viewsets.ModelViewSet):
    # Optimizing database queries to prevent expensive database round-trips
    queryset = ImagingOrder.objects.all().select_related('patient', 'visit').order_by('-created_at')
    serializer_class = ImagingOrderSerializer
    
    # Matches your exact clinical protection logic
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['visit', 'status', 'patient']
    
    # Clean lookup mapping leveraging your patient model structure
    search_fields = ['patient__name', 'visit__id']

    def perform_create(self, serializer):
        # Captures raw data elements seamlessly before processing creation pipelines
        imaging_skus = self.request.data.get('imaging_skus', [])
        serializer.save()

    # --- Custom Actions Tailored for Your Operational Profiles ---

    @action(detail=False, methods=['get'], url_path='active-queue')
    def active_queue(self, request):
        """
        1. FOR THE RADIOLOGIST
        Returns only PENDING scans so they can see their active imagery workload 
        without getting bogged down by completed historic archives.
        """
        pending_orders = self.get_queryset().filter(status='PENDING')
        
        # Optional: Filter specifically by a concrete registration instance
        visit_id = request.query_params.get('visit_id', None)
        if visit_id:
            pending_orders = pending_orders.filter(visit_id=visit_id)
            
        serializer = self.get_serializer(pending_orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='billing-pending')
    def billing_pending(self, request):
        """
        2. FOR THE BILLING OFFICER
        Returns imaging orders requiring dynamic billing processing or adjustments.
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
        Quickly scans and aggregates historical ultrasound studies across visits.
        """
        patient_id = request.query_params.get('patient', None)
        if not patient_id:
            return Response({"error": "Patient ID parameter is required"}, status=400)
            
        orders = self.get_queryset().filter(patient_id=patient_id)
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)


class ImagingResultViewSet(viewsets.ModelViewSet):
    queryset = ImagingResult.objects.all().select_related('patient', 'visit', 'imaging_order').order_by('-created_at')
    serializer_class = ImagingResultSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['patient', 'is_critical', 'visit', 'imaging_order']

class NurseServiceOrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling Nurse Service Orders (Wound Dressing, Catheter Changes, Pelvic Screening).
    Matches the transactional routing pattern used in Imaging and Lab setups.
    """
    queryset = NurseServiceOrder.objects.all().select_related('patient')
    serializer_class = NurseServiceOrderSerializer
    filterset_fields = ['patient', 'status']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Wrapping in an atomic transaction ensures database integrity
        with transaction.atomic():
            # 1. Save the nursing service order record
            nurse_order = serializer.save()
            
            # 2. Workflow Routing: Automatically update the patient's queue status to NURSE
            patient_id = request.data.get('patient')
            if patient_id:
                # Find the active queue record for this patient and route them to the Nurse station
                # Note: Adjust fields matching your exact Queue architecture (e.g., current_station)
                Queue.objects.filter(patient_id=patient_id, status='ACTIVE').update(
                    current_station='NURSE',
                    updated_at=nurse_order.created_at
                )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], url_path='complete-order')
    def complete_order(self, request, pk=None):
        """
        Custom action endpoint to mark a nursing service as completed by the nurse panel.
        URL: POST /api/nurse-orders/<id>/complete-order/
        """
        order = self.get_object()
        if order.status == 'COMPLETED':
            return Response({'detail': 'Order is already completed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = 'COMPLETED'
        order.save()
        return Response({'status': 'Nurse order completed successfully.'}, status=status.HTTP_200_OK)
        

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
    filterset_fields = ['dosage_form', 'sku']
    search_fields = ['name', 'batch_number']

class ProtocolViewSet(viewsets.ModelViewSet):
    # Optimized using prefetch_related so reading protocols fetches all drugs in a single database hit
    queryset = Protocol.objects.all().prefetch_related('components')
    serializer_class = ProtocolSerializer
    
    # Keeping it secure; adjust permission classes as per your system roles
    permission_classes = [permissions.IsAuthenticated]

    # OPTIONAL CUSTOM ACTION: 
    # If other personnel (e.g., finance) want to update only specific drug costs 
    # without submitting the whole complex protocol form payload again.
    @action(detail=True, methods=['patch'], url_path='update-costs')
    def update_costs(self, request, pk=None):
        """
        Allows billing/finance teams to submit an array of updated ingredient costs.
        Payload expectation:
        {
            "costs": [
                {"ingredient_id": 12, "cost_per_cycle": 15000.00},
                {"ingredient_id": 13, "cost_per_cycle": 8500.00}
            ]
        }
        """
        protocol = self.get_object()
        costs_data = request.data.get('costs', [])
        
        if not costs_data:
            return Response(
                {"error": "No cost data provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        updated_ingredients = []
        running_total = 0.00
        
        for item in costs_data:
            ing_id = item.get('ingredient_id')
            cost = item.get('cost_per_cycle')
            
            try:
                # Ensure the ingredient actually belongs to this specific protocol
                ingredient = protocol.components.get(id=ing_id)
                ingredient.cost_per_cycle = cost
                ingredient.save()
                updated_ingredients.append(ingredient)
            except ProtocolIngredient.DoesNotExist:
                return Response(
                    {"error": f"Ingredient ID {ing_id} not found under this protocol"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Automatically recalculate the total cumulative cost for the protocol master
        for ing in protocol.components.all():
            if ing.cost_per_cycle:
                running_total += float(ing.cost_per_cycle)
                
        protocol.total_cost_per_cycle = running_total
        protocol.save()
        
        # Return the updated protocol info
        serializer = self.get_serializer(protocol)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ChemoSessionViewSet(viewsets.ModelViewSet):
    queryset = ChemoSession.objects.all()
    serializer_class = ChemoSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]

class TreatmentViewSet(viewsets.ModelViewSet):
    serializer_class = TreatmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    def get_queryset(self):
        return Treatment.objects.select_related('patient', 'protocol', 'oncologist').all()
    

class CancerSiteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Handles operations for Primary Cancer Sites.
    - GET /api/cancer-sites/            -> Returns list for Dropdown 1
    - GET /api/cancer-sites/{id}/types/  -> Returns filtered types for Dropdown 2
    """
    queryset = CancerSite.objects.all()
    serializer_class = CancerSiteSerializer

    @action(detail=True, methods=['get'])
    def types(self, request, pk=None):
        """Get filtered variants for Dropdown 2 based on site selection"""
        site = self.get_object()
        # Uses your related_name="types" from CancerType model
        types = site.types.all() 
        serializer = CancerTypeSerializer(types, many=True)
        return Response(serializer.data)


class CancerTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Handles operations for Specific Cancer Variants/Subtypes.
    - GET /api/cancer-types/                -> Returns list of all types
    - GET /api/cancer-types/{id}/regimens/  -> Returns filtered acronyms for Dropdown 3
    """
    queryset = CancerType.objects.all()
    serializer_class = CancerTypeSerializer

    @action(detail=True, methods=['get'])
    def regimens(self, request, pk=None):
        """Get filtered acronym protocols for Dropdown 3 based on type selection"""
        cancer_type = self.get_object()
        # Uses your related_name="regimens" from Regimen model
        regimens = cancer_type.regimens.all()
        serializer = RegimenSerializer(regimens, many=True)
        return Response(serializer.data)


class RegimenViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Handles operations for Protocol Acronyms.
    - GET /api/regimens/            -> Returns list of all regimens
    - GET /api/regimens/{id}/drugs/  -> Returns detailed drug layout to auto-populate rows
    """
    queryset = Regimen.objects.all()
    serializer_class = RegimenSerializer

    @action(detail=True, methods=['get'])
    def drugs(self, request, pk=None):
        """Get all pre-mapped drugs to auto-populate the table rows"""
        regimen = self.get_object()
        # Uses your related_name="drugs" from RegimenDrug model
        drugs = regimen.drugs.all()
        drug_serializer = RegimenDrugSerializer(drugs, many=True)
        
        # Matches your exact expected structure: standard cycles + drug rows array
        return Response({
            'default_cycles': regimen.default_cycles,
            'drugs': drug_serializer.data
        })


class RegistrationRecordViewSet(viewsets.ModelViewSet):
    queryset = RegistrationRecord.objects.all().order_by('-registered_at')
    serializer_class = RegistrationRecordSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # 🚀 FIXED & EXPANDED: Capture explicit segment data elements safely before popping
            f_name = request.data.get('first_name', '').strip()
            m_name = request.data.get('middle_name', '').strip()
            l_name = request.data.get('last_name', '').strip()
            
            # Combine split components intelligently while removing hanging spaces
            full_name = f"{f_name} {m_name} {l_name}".replace("  ", " ").strip() or "Valued Patient"
            
            patient_phone = request.data.get('phone', None)
            patient_email = request.data.get('email', None)

            # Process transaction database save routines
            registration_item = serializer.save()

            real_hrn = getattr(registration_item, 'health_record_number', 'PENDING')

            subject = "Registration Successful - Salama Cancer Care"
            message_body = (
                f"Hello {full_name},\n\n"
                f"Thank you for registering at Salama Cancer Care. We are pleased to serve you.\n\n"
                f"Your health record number is: {real_hrn}\n\n"
                f"Please proceed to the triage station to have your vitals checked.\n\n"
                f"Best regards,\nSalama Medical Team"
            )

            if patient_phone or patient_email:
                try:
                    # Assuming dispatch_async_notifications is imported globally
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

        # Aggregate by payment_mode (CASH vs INSURANCE)
        payment_mode_data = today_qs.values('payment_mode').annotate(count=Count('payment_mode'))
        payment_mode_map = {item['payment_mode']: item['count'] for item in payment_mode_data}

        # Break down the actual insurance company numbers for today's intake
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
                "F": gender_map.get('F', 0),
                "O": gender_map.get('O', 0)
            },
            "age_groups": age_groups,
            "payment_mode_distribution": payment_mode_map, 
            "insurance_distribution": insurance_map        
        })
    
@api_view(['GET'])
# Keep AllowAny if it's public, or remove if you've implemented the header authorization tokens successfully
@permission_classes([AllowAny]) 
def patient_lookup(request):
    # Get the raw string parameter (e.g., "SCC-001/26" or "556677883")
    search_query = request.query_params.get('search', '').strip()
    
    if not search_query:
        return Response(
            {"detail": "Search query parameter is required."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # We look up matching rows where the query hits either ID number or HRN
        record = RegistrationRecord.objects.filter(
            Q(health_record_number__iexact=search_query) | 
            Q(id_number__icontains=search_query)
        ).latest('registered_at') # Grabs their most recent active registration desk record

        # Structure the payload exactly how your React front-end extracts it
        payload = {
            "id": record.id,
            "health_record_number": record.health_record_number,
            "queue_id": record.queue_id,
            "full_name": record.full_name, # Leveraging your model's helper property
            "id_number": record.id_number,
            "payment_mode": record.payment_mode,
            "insurance_number": record.insurance_number,
            "age": record.age,
            "gender": record.gender
        }
        return Response(payload, status=status.HTTP_200_OK)

    except RegistrationRecord.DoesNotExist:
        return Response(
            {"detail": "No matching active record found."}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by('-added_at')
    serializer_class = InventoryItemSerializer

    @action(detail=False, methods=['get'], url_path='unique-catalog')
    def unique_catalog(self):
        """
        Returns a clean list of unique product names, grouped by department 
        and bundled with their default baseline unit costs for the procurement engine.
        """
        items = InventoryItem.objects.values('name', 'department', 'cost_per_unit').distinct()
        return Response(items)

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


# APIs
class ICD11TokenProxyView(APIView):
    """
    Obtains and caches short-lived OAuth2 access tokens from the WHO Identity server
    to securely authorize the frontend Embedded Classification Tool.
    """
    def get(self, request):
        # 1. Look for a valid token in the Django cache framework first
        cached_token = cache.get('icd11_access_token')
        if cached_token:
            return Response({"token": cached_token}, status=status.HTTP_200_OK)

        # 2. Grab configurations from settings
        client_id = getattr(settings, 'ICD11_CLIENT_ID', None)
        client_secret = getattr(settings, 'ICD11_CLIENT_SECRET', None)

        if not client_id or not client_secret:
            return Response(
                {"error": "ICD-11 credentials are unconfigured on the server environment."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 3. Request a fresh token directly from the WHO Access Management server
        token_url = "https://icdaccessmanagement.who.int/connect/token"
        payload = {
            'client_id': client_id,
            'client_secret': client_secret,
            'grant_type': 'client_credentials',
            'scope': 'icdapi_access'
        }

        try:
            response = requests.post(token_url, data=payload, timeout=10)
            response.raise_for_status()
            token_data = response.json()
            
            access_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 3600)

            # Cache the token, setting expiration 5 minutes early as a safety buffer
            cache.set('icd11_access_token', access_token, timeout=expires_in - 300)

            return Response({"token": access_token}, status=status.HTTP_200_OK)

        except requests.exceptions.RequestException as e:
            return Response(
                {"error": f"Failed authentication handshake with WHO: {str(e)}"}, 
                status=status.HTTP_502_BAD_GATEWAY
            )
        
class ICD10DiagnosisViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exposes full search capability against mapped ICD10 codes grouped by primary anatomical site.
    """
    queryset = ICD10Diagnosis.objects.all()
    serializer_class = ICD10DiagnosisSerializer
    
    # Enable query parameter filtering and string lookups
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'short_description', 'long_description']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Explicitly filter down records if a specific primary site is targeted
        primary_site = self.request.query_params.get('primary_site', None)
        if primary_site:
            queryset = queryset.filter(primary_site__iexact=primary_site)
            
        return queryset
    
class PatientDiagnosisViewSet(viewsets.ModelViewSet):
    """
    ViewSet to log, list, and audit patient diagnosis records 
    linked to unique Registration health record numbers.
    """
    queryset = PatientDiagnosis.objects.select_related('patient', 'visit').all()
    serializer_class = PatientDiagnosisSerializer
    
    # Enable standard filtering and search backends
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Fields that can be directly searched via ?search=
    search_fields = ['icd10_code', 'icd10_description', 'visit__health_record_number']
    
    # Default order showing the most recent diagnosis logs first
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 1. Extract potential lookup query parameters from the request URL
        patient_id = self.request.query_params.get('patient', None)
        visit_id = self.request.query_params.get('visit', None)
        health_record_number = self.request.query_params.get('health_record_number', None)
        
        # 2. Apply filtering chains sequentially if values are provided
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        if visit_id:
            queryset = queryset.filter(visit_id=visit_id)
            
        if health_record_number:
            # Traverses the RegistrationRecord relation to find the exact health record match
            queryset = queryset.filter(visit__health_record_number__iexact=health_record_number)
            
        return queryset
    

class SupplierViewSet(viewsets.ModelViewSet):
    """
    Unified registry viewset to handle legal onboarding, 
    compliance file processing, and vendor monitoring.
    """
    queryset = Supplier.objects.all().order_by('-id')
    serializer_class = SupplierSerializer
    
    # Crucial for receiving file uploads (FileField / FormData) from React
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        """
        Intercepts creation to gracefully handle file stream data
        and return crisp validation errors back to our UI.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(
                {
                    "message": "Supplier corporate registry created with document packages.",
                    "data": serializer.data
                }, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='compliance-alerts')
    def compliance_alerts(self, request):
        """
        Custom endpoint: /api/suppliers/compliance-alerts/
        Instantly surfaces vendors whose Tax Compliance Certificate (TCC) 
        has expired or is missing completely.
        """
        today = timezone.now().date()
        
        # Pull suppliers where TCC is missing OR past its valid expiry window
        compromised_suppliers = Supplier.objects.filter(
            models.Q(tax_compliance_expiry__isnull=True) | 
            models.Q(tax_compliance_expiry__lt=today),
            is_active=True
        )
        
        serializer = self.get_serializer(compromised_suppliers, many=True)
        return Response({
            "count": compromised_suppliers.count(),
            "status": "Action Required",
            "flagged_vendors": serializer.data
        }, status=status.HTTP_200_OK)
    

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """
    Handles all Purchase Order interactions.
    Provides standard CRUD operations + custom action for quick approval transitions.
    """
    queryset = PurchaseOrder.objects.all().order_by('-created_at')
    serializer_class = PurchaseOrderSerializer

    def create(self, request, *args, **kwargs):
        # Maps frontend 'items' array payload seamlessly to 'items_raw' expected by serializer
        data = request.data.copy()
        if 'items' in data:
            data['items_raw'] = data.pop('items')
            
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['patch'], url_path='approve')
    def approve_order(self, request, pk=None):
        """Custom endpoint allowing the frontend to trigger 'Approve & Send' instantly"""
        purchase_order = self.get_object()
        purchase_order.status = 'APPROVED'
        purchase_order.save()
        return Response(
            {"status": "Purchase Order approved and advanced successfully."},
            status=status.HTTP_200_OK
        )


# ----------------------------------------------------------------------
# 2. GOODS RECEIVED NOTE (GRN) VIEWSET
# ----------------------------------------------------------------------
class GoodsReceivedNoteViewSet(viewsets.ModelViewSet):
    """
    Logs physical delivery receipt updates.
    Automatically steps associated Purchase Order status forward to 'RECEIVED'.
    """
    queryset = GoodsReceivedNote.objects.all().order_by('-created_at')
    serializer_class = GoodsReceivedNoteSerializer

    def create(self, request, *args, **kwargs):
        # Maps frontend 'items_received' verified array data cleanly to serializer
        data = request.data.copy()
        if 'items_received' in data:
            data['items_received_raw'] = data.pop('items_received')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# ----------------------------------------------------------------------
# 3. SUPPLIER INVOICE VIEWSET
# ----------------------------------------------------------------------
class PurchaseInvoiceViewSet(viewsets.ModelViewSet):
    """
    Manages commercial matching calculations for incoming bills.
    """
    queryset = PurchaseInvoice.objects.all().order_by('-created_at')
    serializer_class = PurchaseInvoiceSerializer

    def create(self, request, *args, **kwargs):
        # Handles binary file payloads safely (multipart/form-data) if user attaches physical scan
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# ----------------------------------------------------------------------
# 4. PAYMENT VOUCHER VIEWSET
# ----------------------------------------------------------------------
class PaymentVoucherViewSet(viewsets.ModelViewSet):
    """
    Documents accounts payable outgoing capital transactions.
    Automatically steps target Invoice statuses forward to 'PAID'.
    """
    queryset = PaymentVoucher.objects.all().order_by('-date_issued')
    serializer_class = PaymentVoucherSerializer


class PatientBillingSearchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows the Front Desk terminal to search for active,
    registered patients and instantly fetch their station bills.
    """
    serializer_class = PatientBillingLookupSerializer

    def get_queryset(self):
        """
        Filters patients dynamically based on the search query parameter (?q=...)
        Matches against Name, ID Number, or Health Record Number.
        Only grabs recent records to ensure it's an active outpatient session.
        """
        queryset = RegistrationRecord.objects.all().order_by('-registered_at')
        search_query = self.request.query_params.get('q', None)
        
        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(id_number__icontains=search_query) |
                Q(health_record_number__icontains=search_query) |
                Q(queue_id__icontains=search_query)
            )
            return queryset[:10]  # Limit results for instant frontend search responses
            
        # If no query is provided, return nothing to prevent heavy database loads
        return RegistrationRecord.objects.none()


class PatientInvoiceViewSet(viewsets.ModelViewSet):
    """
    API endpoint to handle actions on the master Invoice ledger sheets, 
    such as finalizing payments from the terminal control panel.
    """
    queryset = PatientInvoice.objects.all()
    serializer_class = ActiveInvoiceSerializer

    @action(detail=True, methods=['post'], url_path='settle-payment')
    def settle_payment(self, request, pk=None):
        """
        Custom action endpoint to execute transaction settlements.
        Validates client-side items against accounting rows to prevent leakage.
        """
        invoice = self.get_object()
        payment_method = request.data.get('payment_method', 'CASH')
        validated_items = request.data.get('validated_items', [])
        
        if validated_items:
            # 1. Extract IDs of items remaining in frontend cart
            frontend_item_ids = [item.get('id') for item in validated_items if item.get('id')]
            
            # 2. Drop items deleted from the cart by the terminal clerk
            invoice.items.exclude(id__in=frontend_item_ids).delete()
            
            # 3. Synchronize adjusted catalog prices into ledger database logs
            for item_data in validated_items:
                item_id = item_data.get('id')
                if item_id:
                    # Parse calculated client rates safely
                    client_price = item_data.get('price', 0)
                    PatientBillableItem.objects.filter(id=item_id, invoice=invoice).update(
                        unit_price=client_price,
                        is_paid=True
                    )
        else:
            # Fallback if payload is missing item-level arrays
            invoice.items.all().update(is_paid=True)
        
        # Set overall invoice status header
        invoice.status = 'PAID'
        invoice.save()
        
        return Response({
            "status": "success",
            "message": f"Invoice KES {invoice.total_payable:,} successfully cleared via {payment_method}.",
            "invoice_id": invoice.id
        }, status=status.HTTP_200_OK)