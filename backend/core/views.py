from rest_framework import viewsets, filters, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Avg, Count, F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView
from datetime import datetime, time

# Import local models and serializers
from .models import (
    Patient, Protocol, Treatment, ChemoSession, Drug, 
    LabResult, Bill, Appointment, VitalSign, Queue
)
from .serializers import (
    PatientSerializer, ProtocolSerializer, TreatmentSerializer, 
    ChemoSessionSerializer, DrugSerializer, LabResultSerializer, 
    BillSerializer, SalamaTokenObtainPairSerializer,
    AppointmentSerializer, VitalSignSerializer, QueueSerializer
)

# --- 1. ROBUST PERMISSION LOGIC ---

class IsReceptionStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') in ['RECEPTIONIST', 'ADMIN']

class IsClinicalStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        clinical_roles = ['ONCOLOGIST', 'NURSE', 'LAB_TECH', 'HEMATOLOGIST', 'SURGEON', 'ADMIN', 'RADIOLOGIST']
        return request.user.is_authenticated and getattr(request.user, 'role', '') in clinical_roles

class IsFinancialStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') in ['BILLING', 'ADMIN']

# --- 2. THE API GATEWAY ---
class SalamaTokenObtainPairView(TokenObtainPairView):
    serializer_class = SalamaTokenObtainPairSerializer

# --- 3. QUEUE ORCHESTRATION ---

class QueueViewSet(viewsets.ModelViewSet):
    """
    Powers the Salama Monitor.
    """
    queryset = Queue.objects.all().order_by('priority', 'entered_at')
    serializer_class = QueueSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['current_station', 'status', 'priority']
    search_fields = ['patient__name', 'token_id', 'patient__registry_no']

    @action(detail=True, methods=['post'])
    def move_next(self, request, pk=None):
        """
        Logic for the 'Arrow' button on the Queue Status Monitor.
        Advances the patient to the next logical clinical station.
        """
        queue_item = self.get_object()
        flow = {
            'REGISTRATION': 'TRIAGE',
            'TRIAGE': 'DOCTOR',
            'DOCTOR': 'LAB', # Or PHARMACY depending on clinical outcome
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
        """
        Returns real-time KPIs for the Front Desk Home Dashboard.
        """
        station = request.query_params.get('station', 'ALL')
        today = timezone.now().date()
        start_of_day = timezone.make_aware(datetime.combine(today, time.min))
        
        # 1. KPI: Total patients registered today
        today_total = Patient.objects.filter(created_at__gte=start_of_day).count()
        
        # 2. KPI: Total overall appointments in the system
        today_appts = Appointment.objects.filter(appointment_date=today).count()
        total_appts = Appointment.objects.count()  # For "Today's Schedule" Card


        # 4. Table Helper: Count for currently waiting in a specific station
        station_qs = Queue.objects.filter(status='WAITING')
        if station != 'ALL':
            station_qs = station_qs.filter(current_station=station)
        
        # Calculate Avg Wait (Simulated for now, or use real DB duration)
        avg_wait = 12 

        return Response({
            'today_total': today_total,           # New Admissions
            'today_appointments': today_appts,    # Confirmed Today
            'total_appointments': total_appts, # For "Today's Schedule" Card
            'station_queue': station_qs.count(),
            'avg_wait_time': f"{avg_wait}m"
        })

# --- 4. FRONT DESK & SCHEDULING ---

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all().order_by('-appointment_date', '-appointment_time')
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['appointment_date', 'status', 'visit_type', 'practitioner']
    search_fields = ['patient__name', 'patient__registry_no', 'manual_patient_name']

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        appointment = self.get_object()
        appointment.status = 'CHECKED_IN'
        appointment.save()
        
        if appointment.patient:
            queue_entry, created = Queue.objects.get_or_create(
                patient=appointment.patient,
                appointment=appointment,
                defaults={'current_station': 'TRIAGE', 'status': 'WAITING'}
            )
            return Response({'token': queue_entry.token_id, 'station': 'TRIAGE'})
        
        return Response({'error': 'No patient linked'}, status=400)

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'registry_no', 'phone']
    ordering_fields = ['created_at', 'name']

    def perform_create(self, serializer):
        patient = serializer.save()
        # VETERAN HMS LOGIC: Automatically add newly registered patients to Triage Queue
        Queue.objects.create(
            patient=patient,
            current_station='TRIAGE',
            status='WAITING'
        )

# --- 5. CLINICAL & TRIAGE ---

class VitalSignViewSet(viewsets.ModelViewSet):
    queryset = VitalSign.objects.all().order_by('-created_at')
    serializer_class = VitalSignSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient']

    def perform_create(self, serializer):
        vital = serializer.save(recorded_by=self.request.user)
        
        # ADVANCE QUEUE LOGIC:
        # If this patient is currently in the Queue at TRIAGE, 
        # move them to DOCTOR automatically upon saving vitals.
        Queue.objects.filter(
            patient=vital.patient, 
            current_station='TRIAGE'
        ).update(
            current_station='DOCTOR',
            status='WAITING'
        )

# --- 6. REMAINING VIEWSETS ---

class TreatmentViewSet(viewsets.ModelViewSet):
    serializer_class = TreatmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient', 'status']
    def get_queryset(self):
        return Treatment.objects.select_related('patient', 'protocol', 'oncologist').all()

class ChemoSessionViewSet(viewsets.ModelViewSet):
    queryset = ChemoSession.objects.all()
    serializer_class = ChemoSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    def perform_create(self, serializer):
        serializer.save(administered_by=self.request.user)

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated, IsFinancialStaff]
    filterset_fields = ['patient', 'is_paid']

class LabResultViewSet(viewsets.ModelViewSet):
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient', 'is_critical']

class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'batch_no']

class ProtocolViewSet(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    permission_classes = [permissions.IsAuthenticated]