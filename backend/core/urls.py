# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PatientViewSet, 
    ProtocolViewSet, 
    TreatmentViewSet, 
    ChemoSessionViewSet, 
    DrugViewSet, 
    LabResultViewSet, 
    BillViewSet,
    AppointmentViewSet,  # NEW
    VitalSignViewSet     # NEW
)

router = DefaultRouter()

# 1. Front Desk & Scheduling
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'patients', PatientViewSet)

# 2. Triage & Clinical Setup
router.register(r'vitals', VitalSignViewSet, basename='vital')
router.register(r'protocols', ProtocolViewSet)
router.register(r'treatments', TreatmentViewSet, basename='treatment')

# 3. Execution & Inventory
router.register(r'chemo-sessions', ChemoSessionViewSet)
router.register(r'drugs', DrugViewSet)

# 4. Diagnostics & Finance
router.register(r'lab-results', LabResultViewSet, basename='lab-result')
router.register(r'bills', BillViewSet, basename='bill')

urlpatterns = [
    path('', include(router.urls)),
]