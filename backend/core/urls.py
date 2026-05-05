from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PatientViewSet, 
    ProtocolViewSet, 
    TreatmentViewSet, 
    ChemoSessionViewSet, 
    DrugViewSet, 
    LabResultViewSet, 
    BillViewSet
)

# --- 1. ROUTER CONFIGURATION ---
# The DefaultRouter automatically generates URL patterns for our viewsets.
# For example: 'api/patients/' (GET all, POST new) and 'api/patients/1/' (GET one, PUT, DELETE).
router = DefaultRouter()

# Maps to Registration.jsx and PatientDirectory.jsx
router.register(r'patients', PatientViewSet)

# Maps to Oncology Protocol Management
router.register(r'protocols', ProtocolViewSet)

# Maps to the Treatment Timeline in the UI
router.register(r'treatments', TreatmentViewSet, basename='treatment')

# Maps to Nurse/Triage administration logs
router.register(r'chemo-sessions', ChemoSessionViewSet)

# Maps to Pharmacy/Inventory tracking
router.register(r'drugs', DrugViewSet)

# Maps to Diagnostic/Lab workflows
router.register(r'lab-results', LabResultViewSet, basename='lab-result')

# Maps to Billing and Insurance processing
router.register(r'bills', BillViewSet, basename='bill')

urlpatterns = [
    # --- 2. CLINICAL DATA ENDPOINTS ---
    # These routes are hooked into the 'api/' prefix defined in your main config/urls.py.
    path('', include(router.urls)),
]