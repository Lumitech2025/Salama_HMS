from rest_framework import viewsets, filters, permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Patient, Protocol, Treatment, ChemoSession, Drug, LabResult, Bill
from .serializers import (
    PatientSerializer, ProtocolSerializer, TreatmentSerializer, 
    ChemoSessionSerializer, DrugSerializer, LabResultSerializer, 
    BillSerializer, SalamaTokenObtainPairSerializer
)

# --- AUTHENTICATION VIEW ---
class SalamaTokenObtainPairView(TokenObtainPairView):
    """The security checkpoint that stamps the user role."""
    serializer_class = SalamaTokenObtainPairSerializer

# --- CLINICAL VIEWSETS ---

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    # Only authenticated staff can see patients
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'registry_no', 'cancer_type']

class TreatmentViewSet(viewsets.ModelViewSet):
    serializer_class = TreatmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['patient', 'status']

    def get_queryset(self):
        # Optimized database query for clinical history
        return Treatment.objects.select_related('patient', 'protocol').all()

class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['patient', 'is_critical']
    
    def get_queryset(self):
        # Sort so critical results (high risk) are at the top for doctors
        return LabResult.objects.order_by('-is_critical', '-test_date')

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    # Access Control: Maybe only BILLING and ADMIN can see money
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['patient', 'is_paid']


# but add permission_classes = [permissions.IsAuthenticated] to all.

class ProtocolViewSet(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    permission_classes = [permissions.IsAuthenticated]

class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    search_fields = ['name', 'batch_no']
    permission_classes = [permissions.IsAuthenticated]
class ChemoSessionViewSet(viewsets.ModelViewSet):
    queryset = ChemoSession.objects.all()
    serializer_class = ChemoSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['treatment', 'nurse']