from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    PatientViewSet, 
    ProtocolViewSet, 
    TreatmentViewSet, 
    ChemoSessionViewSet, 
    DrugViewSet, 
    LabResultViewSet, 
    BillViewSet,
    AppointmentViewSet,
    VitalSignViewSet,
    SalamaTokenObtainPairView  # Custom JWT view for employeeID/securityCode
)

# Using DefaultRouter for automatic URL conf and a clean API root
router = DefaultRouter()

# --- 1. Front Desk & Patient Registry ---
# Handles scheduling and the 'Salama Registry' UI
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'patients', PatientViewSet, basename='patient')

# --- 2. Triage & Clinical Care ---
# Processes vitals captured at the clinic and treatment plans
router.register(r'vitals', VitalSignViewSet, basename='vital')
router.register(r'protocols', ProtocolViewSet, basename='protocol')
router.register(r'treatments', TreatmentViewSet, basename='treatment')

# --- 3. Execution (Chemotherapy) & Pharmacy ---
# Tracks the actual administration of drugs and inventory levels
router.register(r'chemo-sessions', ChemoSessionViewSet, basename='chemo-session')
router.register(r'drugs', DrugViewSet, basename='drug')

# --- 4. Diagnostics & Revenue Cycle ---
# Handles lab integrations and billing/insurance verification
router.register(r'lab-results', LabResultViewSet, basename='lab-result')
router.register(r'bills', BillViewSet, basename='bill')

urlpatterns = [
    # API Router Endpoints - Ensure this is precisely matched
    path('', include(router.urls)), # Move the 'api/' prefix into the include if preferred, or keep it clean here

    # Authentication Endpoints
    path('api/token/', SalamaTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]