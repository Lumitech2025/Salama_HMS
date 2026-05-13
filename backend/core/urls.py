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
    PrescriptionViewSet,     
    ClinicalNoteViewSet,     
    ImagingRecordViewSet,    
    SalamaTokenObtainPairView,
    RegistrationRecordViewSet,
    VitalSignViewSet
)

# Using DefaultRouter for automatic URL conf and a clean API root
router = DefaultRouter()

# --- 1. Front Desk & Patient Registry ---
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'patients', PatientViewSet, basename='patient')

# --- 2. Queue & Workflow Orchestration ---
# This powers the Live Monitor and the KPI Analytics (Doctor & Pharmacy)
router.register(r'queue', QueueViewSet, basename='queue')

# --- 3. Triage & Clinical EMR Data ---
# These power the Longitudinal History/EMR Tab and Triage workflows
router.register(r'vital-signs', VitalSignViewSet, basename='vital-signs')
router.register(r'clinical-notes', ClinicalNoteViewSet, basename='clinical-note')
router.register(r'imaging', ImagingRecordViewSet, basename='imaging')

# --- 4. Protocols & Treatment Plans ---
router.register(r'protocols', ProtocolViewSet, basename='protocol')
router.register(r'treatments', TreatmentViewSet, basename='treatment')
router.register(r'chemo-sessions', ChemoSessionViewSet, basename='chemo-session')

# --- 5. Pharmacy & Inventory ---
# 'prescriptions' handles the doctor-to-pharmacy push
# 'drugs' handles the Pharmacy Shop and Main Store inventory
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')
router.register(r'drugs', DrugViewSet, basename='drug')
router.register(r'inventory', LabInventoryViewSet, basename='inventory')

# --- 6. Diagnostics & Revenue Cycle ---
router.register(r'lab-results', LabResultViewSet, basename='lab-result')
router.register(r'bills', BillViewSet, basename='bill')

router.register(r'registrations', RegistrationRecordViewSet, basename='registration-records')

router.register(r'vitals', VitalSignViewSet, basename='vitals')


urlpatterns = [
    path('', include(router.urls)), 

    # Authentication Endpoints
    path('token/', SalamaTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]