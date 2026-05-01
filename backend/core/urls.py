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
# We keep this as the central nervous system for clinical data.
router = DefaultRouter()
router.register(r'patients', PatientViewSet)
router.register(r'protocols', ProtocolViewSet)
router.register(r'treatments', TreatmentViewSet, basename='treatment')
router.register(r'chemo-sessions', ChemoSessionViewSet)
router.register(r'drugs', DrugViewSet)
router.register(r'lab-results', LabResultViewSet, basename='lab-result')
router.register(r'bills', BillViewSet, basename='bill')

urlpatterns = [
    # --- 2. CLINICAL DATA ENDPOINTS ---
    # Since config/urls.py already uses path('api/', include('core.urls')),
    # these will be accessible at http://127.0.0.1:8000/api/patients/, etc.
    path('', include(router.urls)),
]