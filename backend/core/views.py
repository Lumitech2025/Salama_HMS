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
    PrescriptionItem, ClinicalNote, ImagingRecord
)
from .serializers import (
    PatientSerializer, ProtocolSerializer, TreatmentSerializer, 
    ChemoSessionSerializer, DrugSerializer, LabResultSerializer, 
    BillSerializer, SalamaTokenObtainPairSerializer, LabInventorySerializer, 
    StockAdjustmentSerializer, AppointmentSerializer, VitalSignSerializer, 
    QueueSerializer, PrescriptionSerializer, ClinicalNoteSerializer, ImagingRecordSerializer
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
        return request.user.is_authenticated and getattr(request.user, 'role', '') in ['BILLING', 'ADMIN']

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
        """Advances the patient to the next clinical station."""
        queue_item = self.get_object()
        flow = {
            'REGISTRATION': 'TRIAGE',
            'TRIAGE': 'DOCTOR',
            'DOCTOR': 'LAB', 
            'LAB': 'DOCTOR',
            'RADIOLOGY': 'DOCTOR',
            'PHARMACY': 'BILLING',
            'BILLING': 'COMPLETED'
        }
        current = queue_item.current_station
        next_station = flow.get(current, 'COMPLETED')
        
        if next_station == 'COMPLETED':
            queue_item.status = 'COMPLETED'
        else:
            queue_item.current_station = next_station
            queue_item.status = 'WAITING'
            
        queue_item.save()
        return Response({'status': f'Patient moved to {next_station}'})

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
            'station_queue': pending_count,
            'completed_today': station_qs.exclude(status__in=['WAITING', 'AWAITING_MEDICATION']).count(),
            'total_appointments': Appointment.objects.filter(appointment_date=today).count()
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
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient']

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
    queryset = LabResult.objects.all().order_by('-test_date')
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