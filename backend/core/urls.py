from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LabInventoryViewSet,
    PatientViewSet, 
    ProtocolViewSet, 
    TreatmentViewSet, 
    ChemoSessionViewSet, 
    DrugViewSet, 
    LabResultViewSet, 
    BillViewSet,
    AppointmentViewSet,
    VitalSignViewSet,
    QueueViewSet,              
    SalamaTokenObtainPairView  
)

# Using DefaultRouter for automatic URL conf and a clean API root
router = DefaultRouter()

# --- 1. Front Desk & Patient Registry ---
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'patients', PatientViewSet, basename='patient')

# --- 2. NEW: Queue & Orchestration ---
# This powers your 3-tier Live Monitor in React
router.register(r'queue', QueueViewSet, basename='queue')

# --- 3. Triage & Clinical Care ---
router.register(r'vitals', VitalSignViewSet, basename='vital')
router.register(r'vital-signs', VitalSignViewSet, basename='vital-signs')
router.register(r'protocols', ProtocolViewSet, basename='protocol')
router.register(r'treatments', TreatmentViewSet, basename='treatment')

# --- 4. Execution (Chemotherapy) & Pharmacy ---
router.register(r'chemo-sessions', ChemoSessionViewSet, basename='chemo-session')
router.register(r'drugs', DrugViewSet, basename='drug')

router.register(r'inventory', LabInventoryViewSet)

# --- 5. Diagnostics & Revenue Cycle ---
router.register(r'lab-results', LabResultViewSet, basename='lab-result')
router.register(r'bills', BillViewSet, basename='bill')

urlpatterns = [
    path('', include(router.urls)), 

    path('token/', SalamaTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]