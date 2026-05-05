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

class IsClinicalStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
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
    """Checkpoint for the React app using employeeID -> username mapping."""
    serializer_class = SalamaTokenObtainPairSerializer


# --- 3. CLINICAL VIEWSETS (API) ---

class PatientViewSet(viewsets.ModelViewSet):
    """Registry with optimized search for the PatientDirectory UI."""
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    # search_fields must match the 'searchTerm' logic in your React directory[cite: 3]
    search_fields = ['name', 'registry_no', 'cancer_type', 'phone']

class TreatmentViewSet(viewsets.ModelViewSet):
    """Manages plans. Restricted to clinical personnel."""
    serializer_class = TreatmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient', 'status']

    def get_queryset(self):
        # select_related avoids the N+1 problem by joining tables in one query
        return Treatment.objects.select_related('patient', 'protocol', 'oncologist').all()

class LabResultViewSet(viewsets.ModelViewSet):
    """Diagnostic data. Critical results prioritized."""
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient', 'is_critical']
    
    def get_queryset(self):
        return LabResult.objects.order_by('-is_critical', '-test_date')

class ChemoSessionViewSet(viewsets.ModelViewSet):
    """Tracks drug administrations and audits the provider[cite: 2]."""
    queryset = ChemoSession.objects.all()
    serializer_class = ChemoSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['treatment']
    
    def perform_create(self, serializer):
        # Automatically logs which staff member administered the session
        serializer.save(administered_by=self.request.user)


# --- 4. ADMINISTRATIVE & INVENTORY ---

class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'batch_no']

class BillViewSet(viewsets.ModelViewSet):
    """Restricted to Billing/Admin for patient privacy[cite: 2]."""
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated, IsFinancialStaff]
    filterset_fields = ['patient', 'is_paid']

class ProtocolViewSet(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    permission_classes = [permissions.IsAuthenticated]