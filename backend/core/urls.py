from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import ICD11TokenProxyView
from core.views import ICD10DiagnosisView


# All viewsets and functions imported cleanly from your local views.py
from .views import (
    ICD11TokenProxyView,
    InsuranceCompanyViewSet,
    InsuranceSchemeViewSet,      
    RemittanceBatchViewSet, 
    InsuranceClaimViewSet,
    ClaimDispatchBatchViewSet,
    InventoryItemViewSet,
    LabInventoryViewSet,
    LabOrderViewSet,
    LabReferenceViewSet,         
    LabTestRegistryViewSet,
    MarketingRequisitionViewSet,
    PatientViewSet, 
    ProtocolViewSet,
    CancerSiteViewSet, 
    CancerTypeViewSet, 
    RegimenViewSet,
    RequisitionViewSet, 
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
    PsychologyEnrollmentViewSet,
    SessionLogViewSet,
    BereavementLogViewSet,
    OutreachCampaignViewSet, 
    ReferralPartnerViewSet, 
    SocialMediaPostViewSet,
    ProtocolMasterViewSet,
    ServiceViewSet,
    PatientBillableItemViewSet,
    patient_lookup,
)

class OptionalSlashRouter(DefaultRouter):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.trailing_slash = '/?' 

router = OptionalSlashRouter()

# --- 1. Front Desk & Patient Registry ---
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'registrations', RegistrationRecordViewSet, basename='registration-records')

# --- 2. Queue & Workflow Orchestration ---
router.register(r'queue', QueueViewSet, basename='queue')

# --- 3. Triage & Clinical EMR Data ---
router.register(r'vital-signs', VitalSignViewSet, basename='vital-signs')
router.register(r'vitals', VitalSignViewSet, basename='vitals') 
router.register(r'clinical-notes', ClinicalNoteViewSet, basename='clinical-note')
router.register(r'imaging', ImagingRecordViewSet, basename='imaging')

# --- 4. Protocols & Treatment Plans ---
# --- 4. Protocols & Treatment Plans ---
router.register(r'protocols', ProtocolViewSet, basename='protocol')
router.register(r'protocol-masters', ProtocolViewSet, basename='protocol-master') 
router.register(r'treatments', TreatmentViewSet, basename='treatment')
router.register(r'chemo-sessions', ChemoSessionViewSet, basename='chemo-session')

# ✨ FIX: The router automatically builds the custom action paths for these viewsets!
router.register(r'cancer-sites', CancerSiteViewSet, basename='cancer-site')
router.register(r'cancer-types', CancerTypeViewSet, basename='cancer-type')
router.register(r'regimens', RegimenViewSet, basename='regimen')

# --- 5. Pharmacy & Inventory ---
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')
router.register(r'drugs', DrugViewSet, basename='drug')
router.register(r'inventory', LabInventoryViewSet, basename='inventory')
router.register(r'inventory-items', InventoryItemViewSet, basename='inventory-item')

# --- 6. Diagnostics, Revenue Cycle & Lab Core ---
router.register(r'services', ServiceViewSet, basename='services')
router.register(r'billable-items', PatientBillableItemViewSet, basename='billable-item')
router.register(r'lab-results', LabResultViewSet, basename='lab-result')
router.register(r'lab-orders', LabOrderViewSet, basename='lab-order')
router.register(r'lab-registry', LabTestRegistryViewSet, basename='lab-registry')
router.register(r'lab-references', LabReferenceViewSet, basename='lab-reference')
router.register(r'bills', BillViewSet, basename='bill')

# --- 7. Support & Psychology Units ---
router.register(r'psychology-enrollments', PsychologyEnrollmentViewSet, basename='psychology-enrollment')
router.register(r'session-logs', SessionLogViewSet, basename='session-log')
router.register(r'bereavement-logs', BereavementLogViewSet, basename='bereavement-log')

# --- 8. Outreach Public Relations & Marketing ---
router.register(r'outreach-campaigns', OutreachCampaignViewSet, basename='outreach-campaigns')
router.register(r'referral-partners', ReferralPartnerViewSet, basename='referral-partners')
router.register(r'social-media-posts', SocialMediaPostViewSet, basename='social-media-posts')
router.register(r'requisitions', RequisitionViewSet, basename='requisition')
router.register(r'marketing-requisitions', MarketingRequisitionViewSet, basename='marketing-requisitions')

# --- 9. Insurance Infrastructure & Revenue Cycle Management (RCM) ---
router.register(r'insurance-companies', InsuranceCompanyViewSet, basename='insurance-company')
router.register(r'insurance-schemes', InsuranceSchemeViewSet, basename='insurance-scheme')
router.register(r'remittance-batches', RemittanceBatchViewSet, basename='remittance-batch')
router.register(r'insurance-claims', InsuranceClaimViewSet, basename='insurance-claim')
router.register(r'claim-dispatch-batches', ClaimDispatchBatchViewSet, basename='claim-dispatch-batch')


urlpatterns = [
    path('token/', SalamaTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('patients/lookup/', patient_lookup, name='patient-lookup'),

     path('api/icd11/token/', ICD11TokenProxyView.as_view(), name='icd11-token'),

    # All generated viewset endpoints (including nested action URLs) are safely included here
    path('', include(router.urls)), 
]