from rest_framework import viewsets, filters, permissions, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView

# Import local models and serializers
from .models import Patient, Protocol, Treatment, ChemoSession, Drug, LabResult, Bill
from .serializers import (
    PatientSerializer, ProtocolSerializer, TreatmentSerializer, 
    ChemoSessionSerializer, DrugSerializer, LabResultSerializer, 
    BillSerializer, SalamaTokenObtainPairSerializer
)

# --- 1. ROBUST PERMISSION LOGIC ---
# Using getattr ensures that even if a user doesn't have the 'role' field 
# (like a standard Superuser), the system won't crash with a 500 error.

class IsClinicalStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Checks both 'role' and 'designation' for backward compatibility
        user_role = getattr(request.user, 'role', getattr(request.user, 'designation', ''))
        return user_role in ['ONCOLOGIST', 'NURSE', 'LAB_TECH', 'ADMIN']

class IsFinancialStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        user_role = getattr(request.user, 'role', getattr(request.user, 'designation', ''))
        return user_role in ['BILLING', 'ADMIN']


# --- 2. THE API GATEWAY ---
class SalamaTokenObtainPairView(TokenObtainPairView):
    """
    The security checkpoint for the React app. 
    Uses the custom serializer to map employeeID -> username.
    """
    serializer_class = SalamaTokenObtainPairSerializer


# --- 3. CLINICAL VIEWSETS (API) ---

class PatientViewSet(viewsets.ModelViewSet):
    """Standardized patient registry with optimized search for oncology."""
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'registry_no', 'cancer_type']

class TreatmentViewSet(viewsets.ModelViewSet):
    """Manages treatment plans. Restricted to clinical personnel."""
    serializer_class = TreatmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient', 'status']

    def get_queryset(self):
        # select_related reduces database hits (N+1 problem)
        return Treatment.objects.select_related('patient', 'protocol', 'oncologist').all()

class LabResultViewSet(viewsets.ModelViewSet):
    """Handles diagnostic data. Critical results prioritized in the UI."""
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient', 'is_critical']
    
    def get_queryset(self):
        return LabResult.objects.order_by('-is_critical', '-test_date')

class ChemoSessionViewSet(viewsets.ModelViewSet):
    """Tracks individual drug administrations."""
    queryset = ChemoSession.objects.all()
    serializer_class = ChemoSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['treatment']
    
    def perform_create(self, serializer):
        # Auditing: Links the session to the currently logged-in Nurse/Oncologist
        serializer.save(administered_by=self.request.user)


# --- 4. ADMINISTRATIVE & INVENTORY ---

class DrugViewSet(viewsets.ModelViewSet):
    """Pharmacy inventory management."""
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'batch_no']

class BillViewSet(viewsets.ModelViewSet):
    """Financial tracking. Only accessible by Billing and Admin."""
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated, IsFinancialStaff]
    filterset_fields = ['patient', 'is_paid']

class ProtocolViewSet(viewsets.ModelViewSet):
    """Standardized oncology treatment protocols (e.g., CHOP, AC)."""
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    permission_classes = [permissions.IsAuthenticated]