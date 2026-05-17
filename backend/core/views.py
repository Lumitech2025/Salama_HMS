from rest_framework import viewsets, filters, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Avg, Count, F, Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView
from datetime import datetime, time

# Import local models and serializers
from .models import (
    Patient, Protocol, Treatment, ChemoSession, Drug, 
    LabResult, Bill, Appointment, VitalSign, Queue, 
    LabInventoryItem, StockAdjustment, Prescription, 
    PrescriptionItem, ClinicalNote, ImagingRecord, RegistrationRecord, InventoryItem,PsychologyEnrollment, SessionLog, BereavementLog, 
    OutreachCampaign, ReferralPartner, SocialMediaPost, MarketingRequisition
)
from .serializers import (
    PatientSerializer, ProtocolSerializer, TreatmentSerializer, 
    ChemoSessionSerializer, DrugSerializer, LabResultSerializer, 
    BillSerializer, SalamaTokenObtainPairSerializer, LabInventorySerializer, 
    StockAdjustmentSerializer, AppointmentSerializer, VitalSignSerializer, 
    QueueSerializer, PrescriptionSerializer, ClinicalNoteSerializer, ImagingRecordSerializer, RegistrationRecordSerializer, InventoryItemSerializer,PsychologyEnrollmentSerializer, 
    SessionLogSerializer, 
    BereavementLogSerializer, OutreachCampaignSerializer, ReferralPartnerSerializer, SocialMediaPostSerializer, MarketingRequisitionSerializer
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
        return request.user.is_authenticated and getattr(request.user, 'role', '') in ['BILLING', 'FINANCE','ADMIN']

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
        
        # 1. Check if the Frontend sent a specific target (e.g., from the Triage dropdown)
        target_station = request.data.get('target_station')
        
        if not target_station:
            # 2. Fallback to your hardcoded flow if no target was provided
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

        # 3. Apply the move
        if target_station == 'COMPLETED':
            queue_item.status = 'COMPLETED'
        else:
            queue_item.current_station = target_station
            queue_item.status = 'WAITING'
            
        queue_item.save()
        
        # Return display-friendly names for the alert box
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

    def perform_create(self, serializer):
        patient = serializer.save()
        Queue.objects.create(patient=patient, current_station='TRIAGE', status='WAITING')

class VitalSignViewSet(viewsets.ModelViewSet):
    queryset = VitalSign.objects.all().order_by('-created_at')
    serializer_class = VitalSignSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient']

    def perform_create(self, serializer):
        vital = serializer.save(recorded_by=self.request.user)
        # Advance Queue automatically
        Queue.objects.filter(patient=vital.patient, current_station='TRIAGE').update(
            current_station='DOCTOR', status='WAITING'
        )

class ClinicalNoteViewSet(viewsets.ModelViewSet):
    queryset = ClinicalNote.objects.all().order_by('-created_at')
    serializer_class = ClinicalNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['patient', 'visit', 'note_type']
    

    def perform_create(self, serializer):
        # Automatically set the author to the logged-in staff member
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
    queryset = Appointment.objects.all().order_by('-appointment_date', '-appointment_time')
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['patient', 'practitioner', 'appointment_date', 'status']

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        appointment = self.get_object()
        appointment.status = 'CHECKED_IN'
        appointment.save()
        if appointment.patient:
            queue_entry, _ = Queue.objects.get_or_create(
                patient=appointment.patient,
                appointment=appointment,
                defaults={'current_station': 'TRIAGE', 'status': 'WAITING'}
            )
            return Response({'token': queue_entry.token_id, 'station': 'TRIAGE'})
        return Response({'error': 'No patient linked'}, status=400)

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all().order_by('-created_at')
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated, IsFinancialStaff]
    filterset_fields = ['patient', 'is_paid']

# --- 7. INVENTORY & LAB ---

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
        item = self.get_object()
        used = int(request.data.get('used', 0))
        item.stock -= used
        item.save()
        StockAdjustment.objects.create(
            item=item, technician=request.user, quantity_used=used,
            remaining_stock=item.stock, notes=request.data.get('notes', '')
        )
        return Response({'status': 'Stock adjusted', 'new_stock': item.stock})

class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all().order_by('name')
    serializer_class = DrugSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['store_location'] # 👈 Supports our toggle (main/pharmacy)
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
    
# Add to core/views.py

class RegistrationRecordViewSet(viewsets.ModelViewSet):
    queryset = RegistrationRecord.objects.all().order_by('-registered_at')
    serializer_class = RegistrationRecordSerializer

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        today = timezone.now().date()
        # All records for lifetime stats
        total_qs = self.get_queryset()
        # Filtered records for today's operational stats
        today_qs = total_qs.filter(registered_at__date=today)
        
        # 1. Age group logic (Filtered for today so cards reflect current traffic)
        age_groups = {
            "Pediatric (0-17)": today_qs.filter(age__lt=18).count(),
            "Adult (18-55)": today_qs.filter(age__gte=18, age__lte=55).count(),
            "Senior (55+)": today_qs.filter(age__gt=55).count(),
        }

        # 2. Logic for Gender Distribution (Today)
        # Using the map we created to avoid multiple database hits
        gender_data = today_qs.values('gender').annotate(count=Count('gender'))
        gender_map = {item['gender']: item['count'] for item in gender_data}

        # 3. Logic for Insurance Distribution (Today)
        insurance_data = today_qs.values('insurance').annotate(count=Count('insurance'))
        insurance_map = {item['insurance']: item['count'] for item in insurance_data}

        return Response({
            "total_patients": total_qs.count(),
            "todays_registrations": today_qs.count(),
            "urgent_today": today_qs.filter(is_urgent=True).count(),
            "returning_today": today_qs.filter(is_returning=True).count(),
            "gender_distribution": {
                "M": gender_map.get('M', 0),
                "F": gender_map.get('F', 0)
            },
            "age_groups": age_groups,
            "insurance_distribution": insurance_map
        })
    
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by('-added_at')
    serializer_class = InventoryItemSerializer

class PsychologyEnrollmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows psychology cases to be viewed, edited, or created.
    """
    queryset = PsychologyEnrollment.objects.all().order_by('-created_at')
    serializer_class = PsychologyEnrollmentSerializer
    # Adjust permissions based on your system security setup
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        """Automatically stamp the logging psychologist onto the case file"""
        serializer.save(enrolled_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='lost-to-follow-up')
    def lost_to_follow_up(self, request):
        """Custom endpoint to quickly pull patients flagged for tracking"""
        ltfu_cases = self.queryset.filter(status='LOST_TO_FOLLOW_UP')
        page = self.paginate_queryset(ltfu_cases)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(ltfu_cases, many=True)
        return Response(serializer.data)


class SessionLogViewSet(viewsets.ModelViewSet):
    """
    API endpoint for logging daily therapeutic consult interactions.
    """
    queryset = SessionLog.objects.all().order_by('-session_date')
    serializer_class = SessionLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='unsynced-hro')
    def unsynced_hro(self, request):
        """Pulls all sessions that haven't been pushed to the HRO Daily Sync yet"""
        unsynced = self.queryset.filter(is_synced_with_hro=False)
        serializer = self.get_serializer(unsynced, many=True)
        return Response(serializer.data)


class BereavementLogViewSet(viewsets.ModelViewSet):
    """
    API endpoint managing family grief tracking operations.
    """
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


class MarketingRequisitionViewSet(viewsets.ModelViewSet):
    queryset = MarketingRequisition.objects.all().order_by('-created_at')
    serializer_class = MarketingRequisitionSerializer
    permission_classes = [permissions.IsAuthenticated]