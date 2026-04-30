from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    PatientViewSet, ProtocolViewSet, TreatmentViewSet, 
    ChemoSessionViewSet, DrugViewSet, LabResultViewSet, BillViewSet
)



# Clinical Router
router = DefaultRouter()
router.register(r'patients', PatientViewSet)
router.register(r'protocols', ProtocolViewSet)
router.register(r'treatments', TreatmentViewSet, basename='treatment')
router.register(r'chemo-sessions', ChemoSessionViewSet)
router.register(r'drugs', DrugViewSet)
router.register(r'lab-results', LabResultViewSet)
router.register(r'bills', BillViewSet)

urlpatterns = [
    # 1. Authentication Endpoints (The "Security Gate")
    # This is what your React Login.jsx will hit
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # This keeps doctors logged in without asking for password every 5 minutes
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # 2. Clinical Data Endpoints
    path('', include(router.urls)),
]