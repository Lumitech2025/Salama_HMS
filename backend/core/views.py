from rest_framework import viewsets, filters, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView
from datetime import date

# Import local models and serializers
from .models import (
    Patient, Protocol, Treatment, ChemoSession, Drug, 
    LabResult, Bill, Appointment, VitalSign
)
from .serializers import (
    PatientSerializer, ProtocolSerializer, TreatmentSerializer, 
    ChemoSessionSerializer, DrugSerializer, LabResultSerializer, 
    BillSerializer, SalamaTokenObtainPairSerializer,
    AppointmentSerializer, VitalSignSerializer
)

# --- 1. ROBUST PERMISSION LOGIC ---

class IsReceptionStaff(permissions.BasePermission):
    """Allows Front Desk to manage appointments and registration."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        user_role = getattr(request.user, 'role', '')
        return user_role in ['RECEPTIONIST', 'ADMIN']

class IsClinicalStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        user_role = getattr(request.user, 'role', '')
        return user_role in ['ONCOLOGIST', 'NURSE', 'LAB_TECH', 'HEMATOLOGIST', 'SURGEON', 'ADMIN']

class IsFinancialStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        user_role = getattr(request.user, 'role', '')
        return user_role in ['BILLING', 'ADMIN']

# --- 2. THE API GATEWAY ---
class SalamaTokenObtainPairView(TokenObtainPairView):
    serializer_class = SalamaTokenObtainPairSerializer

# --- 3. FRONT DESK & SCHEDULING ---

class AppointmentViewSet(viewsets.ModelViewSet):
    """
    Powers the AppointmentCalendar.jsx. 
    Handles booking logic and the transition to Triage.
    """
    queryset = Appointment.objects.all().order_by('appointment_date', 'appointment_time')
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['appointment_date', 'status', 'visit_type', 'practitioner']
    search_fields = ['patient__name', 'manual_patient_name']

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        """
        Moves patient from 'Confirmed' to 'Checked-in' (Triage Queue).
        """
        appointment = self.get_object()
        appointment.status = 'CHECKED_IN'
        appointment.save()
        
        return Response({
            'status': 'Checked-in Success',
            'patient': appointment.patient.name if appointment.patient else appointment.manual_patient_name,
            'timestamp': timezone.now()
        }, status=status.HTTP_200_OK)

class PatientViewSet(viewsets.ModelViewSet):
    """Registry with optimized search and Age-to-DOB processing."""
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'registry_no', 'cancer_type', 'phone']

    def perform_create(self, serializer):
        """
        Expert Logic: If the frontend sends an 'age' instead of 'dob', 
        we calculate an approximate DOB (Jan 1st of that year).
        """
        age = self.request.data.get('age')
        if age and not self.request.data.get('dob'):
            birth_year = date.today().year - int(age)
            calculated_dob = date(birth_year, 1, 1)
            serializer.save(dob=calculated_dob)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def verify_insurance(self, request, pk=None):
        patient = self.get_object()
        patient.insurance_verified = True
        patient.last_verification_date = timezone.now()
        # Update details from the insurance provider's response
        patient.insurance_no = request.data.get('insurance_no', patient.insurance_no)
        patient.insurance_type = request.data.get('insurance_type', patient.insurance_type)
        patient.benefit_balance = request.data.get('balance', patient.benefit_balance)
        
        patient.save()
        return Response({
            'status': 'Verification Success',
            'verified_at': patient.last_verification_date,
            'balance': patient.benefit_balance
        }, status=status.HTTP_200_OK)

# --- 4. CLINICAL & TRIAGE ---

class VitalSignViewSet(viewsets.ModelViewSet):
    """
    Captured during Triage. 
    Crucial for calculating BSA (Body Surface Area) for Chemo dosages.
    """
    queryset = VitalSign.objects.all().order_by('-created_at')
    serializer_class = VitalSignSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient']

    def perform_create(self, serializer):
        # Automatically tag the clinical staff member
        vital = serializer.save(recorded_by=self.request.user)
        
        # Expert Tip: Implement an automatic flag for critical vitals (e.g., Fever in chemo patients)
        if vital.temperature >= 38.0:
            # In a full system, you'd trigger a 'Critical Alert' signal here
            pass

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
    filterset_fields = ['treatment']
    
    def perform_create(self, serializer):
        serializer.save(administered_by=self.request.user)

# --- 5. ADMINISTRATIVE & INVENTORY ---

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated, IsFinancialStaff]
    filterset_fields = ['patient', 'is_paid']

    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        bill = self.get_object()
        bill.is_paid = True
        bill.billing_officer = request.user
        bill.save()
        return Response({'status': 'Payment Confirmed', 'officer': request.user.username})

class LabResultViewSet(viewsets.ModelViewSet):
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient', 'is_critical']
    
    def get_queryset(self):
        return LabResult.objects.order_by('-is_critical', '-test_date')

class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'batch_no']

class ProtocolViewSet(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    permission_classes = [permissions.IsAuthenticated]