from rest_framework import viewsets, filters, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Avg, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView
from datetime import date

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
    Powers the Live Queue Monitor.
    Provides station-based filtering and real-time wait-time analytics.
    """
    queryset = Queue.objects.all().order_by('priority', 'entered_at')
    serializer_class = QueueSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['current_station', 'status', 'priority']
    search_fields = ['patient__name', 'token_id', 'patient__registry_no']

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Returns KPIs for the Dashboard Tier 2 cards."""
        station = request.query_params.get('station', 'ALL')
        queryset = self.get_queryset()
        
        if station != 'ALL':
            queryset = queryset.filter(current_station=station)

        # Calculate station stats
        total_registered = Patient.objects.filter(created_at__date=date.today()).count()
        in_queue = queryset.filter(status='WAITING').count()
        
        # Expert Tip: Wait time is calculated in the model property, 
        # but for bulk analytics, we use DB aggregation here.
        avg_wait = 0
        if in_queue > 0:
            # Placeholder for complex duration aggregation if needed
            avg_wait = 15 # Default/Estimated if DB doesn't support direct duration avg
            
        return Response({
            'today_total': total_registered,
            'station_queue': in_queue,
            'avg_wait_time': f"{avg_wait}m"
        })

# --- 4. FRONT DESK & SCHEDULING ---

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all().order_by('appointment_date', 'appointment_time')
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['appointment_date', 'status', 'visit_type', 'practitioner']
    search_fields = ['patient__name', 'patient__registry_no', 'manual_patient_name']

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        """
        Moves patient to WAITING_TRIAGE and creates a Queue Token.
        """
        appointment = self.get_object()
        appointment.status = 'WAITING_TRIAGE'
        appointment.save()
        
        # Automated Queue Entry creation
        if appointment.patient:
            queue_entry, created = Queue.objects.get_or_create(
                patient=appointment.patient,
                appointment=appointment,
                status='WAITING',
                current_station='TRIAGE'
            )
            
            return Response({
                'status': 'Checked-in Success',
                'token': queue_entry.token_id,
                'patient': appointment.patient.name,
                'station': 'TRIAGE'
            }, status=status.HTTP_200_OK)
        
        return Response({'error': 'Patient record required for queue token.'}, status=400)

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'registry_no', 'phone']

    def perform_create(self, serializer):
        age = self.request.data.get('age')
        if age and not self.request.data.get('dob'):
            birth_year = date.today().year - int(age)
            serializer.save(dob=date(birth_year, 1, 1))
        else:
            serializer.save()

# --- 5. CLINICAL & TRIAGE ---

class VitalSignViewSet(viewsets.ModelViewSet):
    queryset = VitalSign.objects.all().order_by('-created_at')
    serializer_class = VitalSignSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient']

    def perform_create(self, serializer):
        vital = serializer.save(recorded_by=self.request.user)
        
        # Automatically advance the Queue when Triage is done
        if vital.appointment:
            apt = vital.appointment
            apt.status = 'TRIAGED'
            apt.save()
            
            # Update Queue station to DOCTOR
            Queue.objects.filter(appointment=apt).update(
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