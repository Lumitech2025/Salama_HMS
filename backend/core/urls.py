from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PatientViewSet, ProtocolViewSet, TreatmentViewSet, 
    ChemoSessionViewSet, DrugViewSet, LabResultViewSet, BillViewSet
)

router = DefaultRouter()
router.register(r'patients', PatientViewSet)
router.register(r'protocols', ProtocolViewSet)
router.register(r'treatments', TreatmentViewSet)
router.register(r'chemo-sessions', ChemoSessionViewSet)
router.register(r'drugs', DrugViewSet)
router.register(r'lab-results', LabResultViewSet)
router.register(r'bills', BillViewSet)

urlpatterns = [
    path('', include(router.urls)),
]