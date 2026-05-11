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
    PrescriptionViewSet,     # Added
    ClinicalNoteViewSet,     # Added
    ImagingRecordViewSet,    # Added
    SalamaTokenObtainPairView  
)

# Using DefaultRouter for automatic URL conf and a clean API root
router = DefaultRouter()

# --- 1. Front Desk & Patient Registry ---
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'patients', PatientViewSet, basename='patient')

# --- 2. Queue & Workflow Orchestration ---
# Powers the Live Monitor and KPI Analytics
router.register(r'queue', QueueViewSet, basename='queue')

# --- 3. Triage & Clinical EMR Data ---
# These power the Longitudinal History/EMR Tab
router.register(r'vital-signs', VitalSignViewSet, basename='vital-signs')
router.register(r'clinical-notes', ClinicalNoteViewSet, basename='clinical-note')
router.register(r'imaging', ImagingRecordViewSet, basename='imaging')

# --- 4. Protocols & Treatment Plans ---
router.register(r'protocols', ProtocolViewSet, basename='protocol')
router.register(r'treatments', TreatmentViewSet, basename='treatment')
router.register(r'chemo-sessions', ChemoSessionViewSet, basename='chemo-session')

# --- 5. Pharmacy & Inventory ---
# Powers the Doctor-to-Pharmacy "Push" and Pharmacist "Dispense" flow
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')
router.register(r'drugs', DrugViewSet, basename='drug')
router.register(r'inventory', LabInventoryViewSet, basename='inventory')

# --- 6. Diagnostics & Revenue Cycle ---
router.register(r'lab-results', LabResultViewSet, basename='lab-result')
router.register(r'bills', BillViewSet, basename='bill')

urlpatterns = [
    path('', include(router.urls)), 

    # Auth Endpoints
    path('token/', SalamaTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]