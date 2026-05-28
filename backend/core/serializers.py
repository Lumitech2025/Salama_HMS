from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction
from .models import (
    LabReference, LabTestRegistry, Patient, Protocol, RequisitionItem, StockAdjustment, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign, Queue,
    LabInventoryItem, Prescription, PrescriptionItem, LabPanel,
    ClinicalNote, ImagingRecord, RegistrationRecord, InventoryItem, PsychologyEnrollment, SessionLog, BereavementLog, 
    OutreachCampaign, ReferralPartner, SocialMediaPost, MarketingRequisitionExtension, LabOrder, ProtocolMaster, ProtocolDrug, DrugGuardrail, Requisition, MarketingRequisitionExtension, OutreachCampaign,
    InsuranceScheme, InsuranceCompany, InsuranceClaim, RemittanceBatch, ClaimDispatchBatch,
    Service, PatientBillableItem
)
User = get_user_model()

# ─────────────────────────────────────────────────────────────────────────────
# 1. AUTHENTICATION SERIALIZER
# ─────────────────────────────────────────────────────────────────────────────
class SalamaTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = getattr(user, 'role', 'STAFF')
        token['username'] = user.username
        return token

    def validate(self, attrs):
        data_input = self.context['request'].data
        attrs['username'] = data_input.get('employeeID', attrs.get('username'))
        attrs['password'] = data_input.get('securityCode', attrs.get('password'))
        
        data = super().validate(attrs)
        data['role'] = getattr(self.user, 'role', 'STAFF')
        data['name'] = self.user.get_full_name() or self.user.username
        return data

# ─────────────────────────────────────────────────────────────────────────────
# 2. WORKFLOW & QUEUE SERIALIZERS
# ─────────────────────────────────────────────────────────────────────────────
class QueueSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_id_no = serializers.ReadOnlyField(source='patient.registry_no')
    visit_id = serializers.PrimaryKeyRelatedField(source='visit', read_only=True)
    station_display = serializers.CharField(source='get_current_station_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    wait_time = serializers.ReadOnlyField()

    health_record_number = serializers.ReadOnlyField(source='visit.health_record_number')
    is_urgent = serializers.BooleanField(source='visit.is_urgent', read_only=True, default=False)
    
    class Meta:
        model = Queue
        fields = [
            'id', 'token_id', 'patient', 'patient_name', 'health_record_number','patient_id_no', 
            'current_station', 'status', 'priority', 'entered_at', 'wait_time',
            'is_urgent', 'visit_id','status_display', 'station_display'
        ]

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_registry_no = serializers.ReadOnlyField(source='patient.registry_no')
    practitioner_name = serializers.ReadOnlyField(source='practitioner.get_full_name') 
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    email_address = serializers.EmailField(write_only=True, required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Appointment
        fields = '__all__'

    def get_patient_name(self, obj):
        return obj.patient.name if obj.patient else obj.manual_patient_name

    def create(self, validated_data):
        phone_number = validated_data.pop('phone_number', None)
        email_address = validated_data.pop('email_address', None)

        if not validated_data.get('patient'):
            if phone_number:
                validated_data['manual_patient_phone'] = phone_number
            if email_address:
                validated_data['manual_patient_email'] = email_address

        return super().create(validated_data)

# ─────────────────────────────────────────────────────────────────────────────
# 3. REGISTRATION & ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────
class RegistrationRecordSerializer(serializers.ModelSerializer):
    # Field aliases to safely capture incoming multipart payload segments from frontend
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    id_number = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    gender = serializers.CharField(write_only=True, required=False, default='M')
    age = serializers.IntegerField(write_only=True)
    
    # 🚀 FIXED: Frontend handles "insurance_company_id" (integer id pointer)
    insurance_company_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    # 🚀 FIXED: Dynamic read representation for your frontend log stream table view columns
    insurance_company_name = serializers.CharField(source='insurance_company.name', read_only=True)

    class Meta:
        model = RegistrationRecord
        fields = [
            'id', 'queue_id', 'name', 'health_record_number', 'patient', 
            'id_number', 'first_name', 'last_name', 'phone', 'gender', 'age', 
            'payment_mode', 'insurance_company_id', 'insurance_company_name', 
            'insurance_number', 'is_urgent', 'is_returning', 'registered_at'
        ]
        read_only_fields = ['patient', 'name', 'queue_id', 'health_record_number', 'registered_at']

    def validate(self, data):
        id_num = data.get('id_number')
        is_returning = data.get('is_returning', False)
        
        # Cross-reference with Master Registry mapping inside Patient Model
        patient_exists = Patient.objects.filter(registry_no=id_num).exists()
        
        if patient_exists and not is_returning:
            raise serializers.ValidationError({
                "id_number": "A master patient record with this National ID/Passport already exists. Please check 'Returning Patient'."
            })
        return data

    def create(self, validated_data):
        # Extract frontend elements out of kwargs pool to avoid model instantiation crash
        id_num = validated_data.pop('id_number')
        f_name = validated_data.pop('first_name')
        l_name = validated_data.pop('last_name')
        phone_num = validated_data.pop('phone', '')
        gender_choice = validated_data.pop('gender', 'M')
        insurance_co_id = validated_data.pop('insurance_company_id', None)
        
        full_name = f"{f_name} {l_name}".strip()

        with transaction.atomic():
            # 1. Look up or assemble patient master entry record
            patient, created = Patient.objects.get_or_create(
                registry_no=id_num,
                defaults={
                    'name': full_name,
                    'phone': phone_num,
                    'gender': gender_choice,
                    'insurance_no': validated_data.get('insurance_number', '')
                }
            )
            
            if not created and validated_data.get('is_returning'):
                patient.name = full_name
                patient.phone = phone_num
                patient.save()

            patient.refresh_from_db()

            # 2. Match structural corporate database primary keys if payment mode is insurance
            insurance_instance = None
            if validated_data.get('payment_mode') == 'INSURANCE' and insurance_co_id:
                try:
                    insurance_instance = InsuranceCompany.objects.get(id=insurance_co_id)
                except InsuranceCompany.DoesNotExist:
                    raise serializers.ValidationError({
                        "insurance_company_id": "Selected insurance provider does not exist in the database."
                    })

            # 3. Formulate and save the fresh local registration transaction
            registration = RegistrationRecord.objects.create(
                patient=patient,
                name=full_name,
                phone=phone_num,
                gender=gender_choice,
                insurance_company=insurance_instance,
                **validated_data
            )
            
            # 4. Enqueue record transmission directly forward into Triage Boarding
            Queue.objects.create(
                patient=patient,
                visit=registration,
                token_id=registration.queue_id,
                current_station='TRIAGE',
                status='WAITING',
                priority='EMERGENCY' if registration.is_urgent else 'NORMAL'
            )
            
            registration.refresh_from_db()
            return registration

class RegistrationAnalyticsSerializer(serializers.Serializer):
    total_patients = serializers.IntegerField()
    todays_registrations = serializers.IntegerField()
    urgent_today = serializers.IntegerField()        
    returning_today = serializers.IntegerField()     
    gender_distribution = serializers.DictField()    
    age_groups = serializers.DictField()
    insurance_distribution = serializers.DictField()

# ─────────────────────────────────────────────────────────────────────────────
# 4. CLINICAL EMR
# ─────────────────────────────────────────────────────────────────────────────
class VitalSignSerializer(serializers.ModelSerializer):
    oxygen_saturation_percentage = serializers.IntegerField(source='spo2', read_only=True)
    bmi = serializers.ReadOnlyField()
    bsa = serializers.ReadOnlyField()

    class Meta:
        model = VitalSign
        fields = [
            'id', 'patient', 'visit', 'temperature', 'systolic_bp', 
            'diastolic_bp', 'heart_rate', 'respiratory_rate', 
            'weight', 'height', 'spo2', 'oxygen_saturation_percentage', 
            'bmi', 'bsa', 'created_at'
        ]

class ClinicalNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    note_type_display = serializers.CharField(source='get_note_type_display', read_only=True)

    class Meta:
        model = ClinicalNote
        fields = ['id', 'patient', 'visit', 'note_type', 'note_type_display', 'content', 'author', 'author_name', 'created_at']
        read_only_fields = ['author']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)

class ImagingRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagingRecord
        fields = '__all__'

# ─────────────────────────────────────────────────────────────────────────────
# 5. PATIENT MASTER RECORD
# ─────────────────────────────────────────────────────────────────────────────
class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'

# ─────────────────────────────────────────────────────────────────────────────
# 6. PHARMACY, LAB & BILLING
# ─────────────────────────────────────────────────────────────────────────────
class DrugSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()
    selling_price_display = serializers.SerializerMethodField()
    class Meta:
        model = Drug
        fields = '__all__'
    def get_selling_price_display(self, obj):
        return f"Ksh {obj.selling_price_kes:,.2f}"

class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = '__all__'

class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True) 
    patient_name = serializers.ReadOnlyField(source='patient.name')
    class Meta:
        model = Prescription
        fields = '__all__'

class LabResultSerializer(serializers.ModelSerializer):
    test_name_display = serializers.CharField(source='get_test_name_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)

    class Meta:
        model = LabResult
        fields = '__all__' 

class LabOrderSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    # 1. Dynamically read/write requested_tests so your frontend stays exactly the same
    requested_tests = serializers.SerializerMethodField()
    token_id = serializers.SerializerMethodField()

    class Meta:
        model = LabOrder
        fields = [
            'id', 'patient', 'patient_name', 'visit', 
            'requested_tests', 'status', 'doctor_notes', 
            'token_id', 'created_at'
        ]

    def get_token_id(self, obj):
        # Fallback matches your updated property approach cleanly
        if obj.visit and hasattr(obj.visit, 'queue_id'):
            return obj.visit.queue_id
        return f"REQ-{obj.id}"

    def get_requested_tests(self, obj):
        """
        OUTPUT (Read): Maps database booleans back to the 
        frontend's array format ["Full Blood Count (CBC)", ...]
        """
        return obj.selected_test_list

    def to_internal_value(self, data):
        """
        INPUT (Write/Create/Update): intercept the frontend's 
        ["Full Blood Count (CBC)"] array data, map it back into internal boolean 
        fields, and pass it cleanly into the database.
        """
        # Pull standard validation from DRF first
        internal_value = super().to_internal_value(data)
        
        # Look for the payload coming from the doctor's screen
        incoming_tests = data.get('requested_tests', None)
        
        if incoming_tests is not None:
            if not isinstance(incoming_tests, list):
                raise serializers.ValidationError({
                    "requested_tests": "Expected a list of test names."
                })
                
            # Map frontend strings back to database model boolean attributes
            internal_value['has_cbc'] = "Full Blood Count (CBC)" in incoming_tests
            internal_value['has_ue'] = "Urea, Electrolytes & Creatinine (U&E)" in incoming_tests
            internal_value['has_lft'] = "Liver Function Test (LFT)" in incoming_tests
            internal_value['has_psa'] = "Prostate Specific Antigen (PSA)" in incoming_tests
            internal_value['has_urine'] = "Urinalysis (Routine)" in incoming_tests
            internal_value['has_bg_cross'] = "Blood Group & Cross Match" in incoming_tests
            internal_value['has_bs_mp'] = "Blood Slide (Malaria Parasite)" in incoming_tests

        return internal_value
    
class LabReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabReference
        fields = [
            'id', 'name', 'parent_panel', 'category', 'unit', 
            'lower_range', 'upper_range', 'recommendation_below_minimum', 
            'recommendation_above_maximum', 'price'
        ]

    def validate(self, data):
        lower = data.get('lower_range', 0)
        upper = data.get('upper_range', 0)
        if lower and upper and lower > upper:
            raise serializers.ValidationError({
                "lower_range": "Lower reference baseline cannot be greater than the upper range constraint."
            })
        return data

class LabTestRegistrySerializer(serializers.ModelSerializer):
    parent_panel = serializers.CharField(source='parent_panel.name', read_only=True)
    category = serializers.CharField(source='parent_panel.name', read_only=True)
    
    class Meta:
        model = LabTestRegistry
        fields = [
            'id', 'parent_panel', 'category', 'name', 'unit',
            'lower_range', 'upper_range', 'recommendation_below_minimum',
            'recommendation_above_maximum', 'price'
        ]
        extra_kwargs = {
            'lower_range': {'required': False, 'allow_null': True},
            'upper_range': {'required': False, 'allow_null': True},
            'price': {'required': False, 'default': 0}
        }

    def validate(self, data):
        lower = data.get('lower_range')
        upper = data.get('upper_range')
        if lower is not None and upper is not None:
            if float(lower) > float(upper):
                raise serializers.ValidationError({
                    "lower_range": "Lower reference limit cannot exceed the upper reference limit."
                })
        return data
    
class OncologyClinicalPortalSerializer(serializers.ModelSerializer):
    # Patient Demographic Fields mapped directly from RegistrationRecord
    patient_name = serializers.CharField(source='name', read_only=True)
    health_record_number = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    visit_reference = serializers.CharField(source='queue_id', read_only=True)
    encounter_id = serializers.IntegerField(source='id', read_only=True)

    # Dynamic Vitals calculations derived from the latest VitalSign row
    body_mass_index = serializers.SerializerMethodField()
    body_surface_area = serializers.SerializerMethodField()

    # Organized Dictionary of Completed Lab Results
    diagnostic_profiles = serializers.SerializerMethodField()

    class Meta:
        model = RegistrationRecord
        fields = [
            'encounter_id', 'patient_name', 'health_record_number', 
            'age', 'gender_display', 'visit_reference',
            'body_mass_index', 'body_surface_area', 'diagnostic_profiles'
        ]

    def get_body_mass_index(self, obj):
        latest_vital = obj.vitals.first() # Uses related_name='vitals' from your model
        return latest_vital.bmi if latest_vital else "N/A"

    def get_body_surface_area(self, obj):
        latest_vital = obj.vitals.first()
        return latest_vital.bsa if latest_vital else "N/A"

    def get_diagnostic_profiles(self, obj):
        """
        Gathers wide-table database rows associated with this registration record 
        and extracts values into a payload structured for the frontend.
        """
        # Fetching only completed records matching this visit/encounter
        completed_labs = obj.lab_orders.filter(status='COMPLETED')
        
        lab_payload = {}
        
        for result in completed_labs:
            test_code = result.test_name  # e.g., 'LFT', 'BG_CROSS'
            
            # Formulating structure per test entry type
            test_data = {
                "test_display": result.get_test_name_display(),
                "validated_at": result.updated_at.strftime("%B %d, %Y"),
                "is_critical": result.is_critical,
                "technician_notes": result.technician_notes,
                "parameters": {}
            }

            # Map fields conditionally based on what test model choice is active
            if test_code == 'CBC':
                test_data["parameters"] = {
                    "hb": {"value": result.cbc_hb, "unit": "g/dL"},
                    "wbc": {"value": result.cbc_wbc, "unit": "x10³/µL"},
                    "neut": {"value": result.cbc_neut, "unit": "x10³/µL"},
                    "plt": {"value": result.cbc_plt, "unit": "x10³/µL"},
                    "mcv": {"value": result.cbc_mcv, "unit": "fL"}
                }
            elif test_code == 'UE':
                test_data["parameters"] = {
                    "na": {"value": result.ue_na, "unit": "mmol/L"},
                    "k": {"value": result.ue_k, "unit": "mmol/L"},
                    "urea": {"value": result.ue_urea, "unit": "mmol/L"},
                    "creatinine": {"value": result.ue_creatinine, "unit": "µmol/L"}
                }
            elif test_code == 'LFT':
                test_data["parameters"] = {
                    "alt": {"value": result.lft_alt, "unit": "U/L"},
                    "ast": {"value": result.lft_ast, "unit": "U/L"},
                    "tbil": {"value": result.lft_tbil, "unit": "µmol/L"},
                    "dbil": {"value": result.lft_dbil, "unit": "µmol/L"},
                    "alp": {"value": result.lft_alp, "unit": "U/L"},
                    "albumin": {"value": result.lft_albumin, "unit": "g/L"}
                }
            elif test_code == 'PSA':
                test_data["parameters"] = {
                    "psa_total": {"value": result.psa_total, "unit": "ng/mL"}
                }
            elif test_code == 'URINALYSIS':
                test_data["parameters"] = {
                    "color": {"value": result.urine_color, "unit": "text"},
                    "clarity": {"value": result.urine_clarity, "unit": "text"},
                    "glucose": {"value": result.urine_glucose, "unit": "semi-quant"},
                    "protein": {"value": result.urine_protein, "unit": "semi-quant"}
                }
            elif test_code == 'BG_CROSS':
                test_data["parameters"] = {
                    "blood_group": {"value": result.bg_abo, "unit": "ABO"},
                    "rhesus": {"value": result.bg_rhesus, "unit": "+/-"},
                    "compatibility": {"value": result.bg_compatibility, "unit": "status"}
                }

            lab_payload[test_code] = test_data

        return lab_payload

class BillSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='patient.name')
    class Meta:
        model = Bill
        fields = '__all__'

class LabInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LabInventoryItem
        fields = '__all__'

class StockAdjustmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockAdjustment
        fields = '__all__'

class ProtocolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Protocol
        fields = '__all__'

class TreatmentSerializer(serializers.ModelSerializer):
     oncologist_name = serializers.CharField(source='oncologist.get_full_name', read_only=True)
     protocol_name = serializers.ReadOnlyField(source='protocol.name')
     class Meta:
        model = Treatment
        fields = '__all__'

class ChemoSessionSerializer(serializers.ModelSerializer):
    administered_by_name = serializers.CharField(source='administered_by.get_full_name', read_only=True)
    class Meta:
        model = ChemoSession
        fields = '__all__'

class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = '__all__'

# ─────────────────────────────────────────────────────────────────────────────
# 7. COUNSELLING & ONCOLOGY MARKETING
# ─────────────────────────────────────────────────────────────────────────────
class SessionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionLog
        fields = ['id', 'enrollment', 'session_date', 'clinical_notes', 'is_synced_with_hro']
        read_only_fields = ['session_date']

class BereavementLogSerializer(serializers.ModelSerializer):
    last_contact_formatted = serializers.SerializerMethodField()

    class Meta:
        model = BereavementLog
        fields = [
            'id', 'enrollment', 'primary_contact_name', 'contact_phone',
            'support_status', 'total_sessions_conducted', 'last_contact_date',
            'last_contact_formatted'
        ]
        read_only_fields = ['last_contact_date']

    def get_last_contact_formatted(self, obj):
        if obj.last_contact_date:
            return obj.last_contact_date.strftime('%d %b %Y')
        return None

class PsychologyEnrollmentSerializer(serializers.ModelSerializer):
    sessions = SessionLogSerializer(many=True, read_only=True)
    bereavement_logs = BereavementLogSerializer(many=True, read_only=True)
    
    stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    department_display = serializers.CharField(source='get_location_department_display', read_only=True)
    enrolled_by_username = serializers.CharField(source='enrolled_by.username', read_only=True)
    created_at_formatted = serializers.SerializerMethodField()

    class Meta:
        model = PsychologyEnrollment
        fields = [
            'id', 'patient_name', 'medical_record_no', 'diagnosis',
            'current_stage', 'stage_display', 'status', 'status_display',
            'location_department', 'department_display', 'consent_form_signed',
            'initial_intake_note', 'enrolled_by', 'enrolled_by_username',
            'created_at', 'created_at_formatted', 'updated_at',
            'sessions', 'bereavement_logs'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'enrolled_by']

    def get_created_at_formatted(self, obj):
        if obj.created_at:
            return obj.created_at.strftime('%d %b %Y')
        return None
    
class OutreachCampaignSerializer(serializers.ModelSerializer):
    campaign_type_display = serializers.CharField(source='get_campaign_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = OutreachCampaign
        fields = '__all__'

class ReferralPartnerSerializer(serializers.ModelSerializer):
    partner_type_display = serializers.CharField(source='get_partner_type_display', read_only=True)

    class Meta:
        model = ReferralPartner
        fields = '__all__'

class SocialMediaPostSerializer(serializers.ModelSerializer):
    platform_display = serializers.CharField(source='get_target_platform_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SocialMediaPost
        fields = '__all__'

class RequisitionItemSerializer(serializers.ModelSerializer):
    lab_item_name = serializers.CharField(source='lab_item.name', read_only=True)
    pharmacy_item_name = serializers.CharField(source='pharmacy_item.drug_name', read_only=True)
    
    class Meta:
        model = RequisitionItem
        fields = [
            'id', 'lab_item', 'lab_item_name', 'pharmacy_item', 
            'pharmacy_item_name', 'non_inventory_title', 
            'quantity', 'unit_price', 'line_total'
        ]
        read_only_fields = ['id', 'line_total']


# ==========================================
# 2. MARKETING REQUISITION PROXY SERIALIZER
# ==========================================
class MarketingRequisitionSerializer(serializers.ModelSerializer):
    # Keep your exact legacy read-only display fields intact
    category_display = serializers.CharField(source='marketing_meta.get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    campaign_title = serializers.CharField(source='marketing_meta.campaign.name', read_only=True)
    
    # Expose the flat input parameters your frontend marketing forms are already expecting
    title = serializers.CharField(source='reason')  
    category = serializers.ChoiceField(choices=MarketingRequisitionExtension.CATEGORY_CHOICES, write_only=True)
    campaign = serializers.PrimaryKeyRelatedField(queryset=OutreachCampaign.objects.all(), write_only=True)
    requested_amount = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True)

    class Meta:
        model = Requisition
        fields = [
            'id', 'title', 'category', 'campaign', 'requested_amount', 
            'status', 'status_display', 'category_display', 'campaign_title',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if hasattr(instance, 'marketing_meta') and instance.marketing_meta:
            ret['category'] = instance.marketing_meta.category
            ret['campaign'] = instance.marketing_meta.campaign_id
            ret['requested_amount'] = str(instance.marketing_meta.requested_amount)
            ret['total'] = str(instance.total_cost)
        return ret

    def create(self, validated_data):
        category = validated_data.pop('category')
        campaign = validated_data.pop('campaign')
        requested_amount = validated_data.pop('requested_amount')
        
        reason = validated_data.get('reason', 'Marketing Outlay Request')
        request = self.context.get('request')
        requested_by = request.user if (request and request.user.is_authenticated) else None

        requisition = Requisition.objects.create(
            department='MARKETING',
            reason=reason,
            requested_by=requested_by,
            status='PENDING'
        )

        MarketingRequisitionExtension.objects.create(
            requisition=requisition,
            category=category,
            campaign=campaign,
            requested_amount=requested_amount
        )

        requisition.update_total_cost()
        return requisition


# ==========================================
# 3. CORE GLOBAL FINANCE REQUISITION SERIALIZER
# ==========================================
class RequisitionSerializer(serializers.ModelSerializer):
    dept = serializers.CharField(source='department')
    requestedBy = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    date = serializers.SerializerMethodField()
    itemSummary = serializers.SerializerMethodField()
    total = serializers.DecimalField(source='total_cost', max_digits=12, decimal_places=2, read_only=True)
    
    # Supporting nested write fields
    items = RequisitionItemSerializer(many=True, required=False)
    
    # FIXED: Name matched to 'MarketingRequisitionSerializer' declared above!
    marketing_meta = MarketingRequisitionSerializer(required=False, allow_null=True)

    class Meta:
        model = Requisition
        fields = [
            'id', 'dept', 'requested_by', 'requestedBy', 'reason', 'status', 
            'total', 'date', 'itemSummary', 'is_viewed_by_finance', 
            'items', 'marketing_meta'
        ]
        read_only_fields = ['id', 'requested_by', 'total', 'date', 'itemSummary']

    def get_date(self, obj):
        return obj.created_at.strftime('%Y-%m-%d')

    def get_itemSummary(self, obj):
        if obj.department == 'MARKETING' and hasattr(obj, 'marketing_meta') and obj.marketing_meta:
            meta = obj.marketing_meta
            return f"{meta.get_category_display()} — Campaign: {meta.campaign.name}"
        
        items = obj.items.all()
        if items.exists():
            first_item = items.first()
            count = items.count()
            
            if first_item.lab_item:
                item_name = first_item.lab_item.name
            elif first_item.pharmacy_item:
                item_name = first_item.pharmacy_item.drug_name
            else:
                item_name = first_item.non_inventory_title or "Operational Asset Indent"

            if count > 1:
                return f"{item_name} (+{count - 1} other line items)"
            return f"{item_name} (x{first_item.quantity})"
            
        return obj.reason[:65] + "..." if len(obj.reason) > 65 else obj.reason

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        marketing_meta_data = validated_data.pop('marketing_meta', None)
        
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['requested_by'] = request.user
        else:
            # Fallback to prevent crashes if user assignment isn't available
            from django.contrib.auth import get_user_model
            User = get_user_model()
            validated_data['requested_by'] = User.objects.first()

        requisition = Requisition.objects.create(**validated_data)
        department = validated_data.get('department', '').upper()

        if department == 'MARKETING' and marketing_meta_data:
            MarketingRequisitionExtension.objects.create(
                requisition=requisition,
                category=marketing_meta_data.get('marketing_meta', {}).get('category') or marketing_meta_data.get('category'),
                campaign=marketing_meta_data.get('marketing_meta', {}).get('campaign') or marketing_meta_data.get('campaign'),
                requested_amount=marketing_meta_data.get('marketing_meta', {}).get('requested_amount') or marketing_meta_data.get('requested_amount')
            )
        elif items_data:
            for item_data in items_data:
                # 🛠️ FIXED: Compute the line item math explicitly before database saving
                qty = int(item_data.get('quantity', 1))
                price = float(item_data.get('unit_price', 0))
                computed_line_total = qty * price
                
                RequisitionItem.objects.create(
                    requisition=requisition, 
                    line_total=computed_line_total, # <-- Pass the calculated valuation here
                    **item_data
                )
                
        requisition.update_total_cost()
        return requisition

    def update(self, instance, validated_data):
        instance.status = validated_data.get('status', instance.status)
        instance.is_viewed_by_finance = validated_data.get('is_viewed_by_finance', instance.is_viewed_by_finance)
        instance.reason = validated_data.get('reason', instance.reason)
        
        instance.save()
        return instance


# ─────────────────────────────────────────────────────────────────────────────
# 8. MASTER ONCOLOGY CLINICAL PROTOCOLS
# ─────────────────────────────────────────────────────────────────────────────
class DrugGuardrailSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = DrugGuardrail
        fields = ['id', 'parameter', 'operator', 'value', 'action', 'action_value']

class ProtocolDrugSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    rules = DrugGuardrailSerializer(many=True, required=False)

    class Meta:
        model = ProtocolDrug
        fields = ['id', 'drug_name', 'base_dose', 'unit', 'route', 'administration_day', 'rules']

class ProtocolMasterSerializer(serializers.ModelSerializer):
    drugs = ProtocolDrugSerializer(many=True)

    class Meta:
        model = ProtocolMaster
        fields = ['id', 'protocol_name', 'cancer_type', 'stages', 'biomarkers', 'clinical_signs', 'total_cycles', 'days_per_cycle', 'drugs']

    def create(self, validated_data):
        drugs_data = validated_data.pop('drugs', [])
        
        with transaction.atomic():
            protocol = ProtocolMaster.objects.create(**validated_data)
            for drug_data in drugs_data:
                rules_data = drug_data.pop('rules', [])
                drug = ProtocolDrug.objects.create(protocol=protocol, **drug_data)
                
                for rule_data in rules_data:
                    DrugGuardrail.objects.create(drug=drug, **rule_data)

            return protocol

    def update(self, instance, validated_data):
        drugs_data = validated_data.pop('drugs', [])

        with transaction.atomic():
            # 1. Update Core Protocol Fields
            instance.protocol_name = validated_data.get('protocol_name', instance.protocol_name)
            instance.cancer_type = validated_data.get('cancer_type', instance.cancer_type)
            instance.stages = validated_data.get('stages', instance.stages)
            instance.biomarkers = validated_data.get('biomarkers', instance.biomarkers)
            instance.clinical_signs = validated_data.get('clinical_signs', instance.clinical_signs)
            instance.total_cycles = validated_data.get('total_cycles', instance.total_cycles)
            instance.days_per_cycle = validated_data.get('days_per_cycle', instance.days_per_cycle)
            instance.save()

            keep_drugs = []

            # 2. Reconcile Medications Layer
            for drug_data in drugs_data:
                drug_id = drug_data.get('id', None)
                rules_data = drug_data.pop('rules', [])

                if drug_id:
                    drug_instance = ProtocolDrug.objects.get(id=drug_id, protocol=instance)
                    drug_instance.drug_name = drug_data.get('drug_name', drug_instance.drug_name)
                    drug_instance.base_dose = drug_data.get('base_dose', drug_instance.base_dose)
                    drug_instance.unit = drug_data.get('unit', drug_instance.unit)
                    drug_instance.route = drug_data.get('route', drug_instance.route)
                    drug_instance.administration_day = drug_data.get('administration_day', drug_instance.administration_day)
                    drug_instance.save()
                    keep_drugs.append(drug_instance.id)
                else:
                    drug_instance = ProtocolDrug.objects.create(protocol=instance, **drug_data)
                    keep_drugs.append(drug_instance.id)

                # Reconcile Guardrails Layer
                keep_rules = []
                for rule_data in rules_data:
                    rule_id = rule_data.get('id', None)
                    if rule_id:
                        rule_instance = DrugGuardrail.objects.get(id=rule_id, drug=drug_instance)
                        rule_instance.parameter = rule_data.get('parameter', rule_instance.parameter)
                        rule_instance.operator = rule_data.get('operator', rule_instance.operator)
                        rule_instance.value = rule_data.get('value', rule_instance.value)
                        rule_instance.action = rule_data.get('action', rule_instance.action)
                        rule_instance.action_value = rule_data.get('action_value', rule_instance.action_value)
                        rule_instance.save()
                        keep_rules.append(rule_instance.id)
                    else:
                        new_rule = DrugGuardrail.objects.create(drug=drug_instance, **rule_data)
                        keep_rules.append(new_rule.id)

                # Purge old guardrails removed from this specific drug
                DrugGuardrail.objects.filter(drug=drug_instance).exclude(id__in=keep_rules).delete()

            # FIX: Moved completely outside the drug reconciliation loop block
            instance.drugs.exclude(id__in=keep_drugs).delete()

            return instance
        

class InsuranceSchemeSerializer(serializers.ModelSerializer):
    """
    Handles plan-level details derived from product brochures 
    (e.g., JCare Johari Plan A vs Plan B).
    """
    # 👇 FIXED: Changed to CharField to accept 'temp-...' IDs from frontend without validation failures
    id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    company = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = InsuranceScheme
        fields = '__all__'
        extra_kwargs = {'company': {'required': False}}


class InsuranceCompanySerializer(serializers.ModelSerializer):
    schemes = InsuranceSchemeSerializer(many=True, required=False)

    # Dynamic metrics pointing to performant database sources
    total_billed = serializers.SerializerMethodField()
    total_remitted = serializers.SerializerMethodField()
    aging_debt = serializers.SerializerMethodField()

    class Meta:
        model = InsuranceCompany
        fields = [
            'id', 
            'name', 
            'payer_code',
            'payer_type',
            'kra_pin', 
            'api_endpoint',
            'physical_address',
            'postal_address',
            'contact_person', 
            'contact_role',
            'email', 
            'phone', 
            'contract_start_date',
            'contract_end_date',
            'price_list_tariff',
            'claim_submission_window',
            'corporate_discount_rate',
            'total_billed', 
            'total_remitted', 
            'aging_debt',
            'sla_document',  # 👇 FIXED: Restored field visibility for frontend rendering
            'schemes'  
        ]
        # Protect cached financial targets and documents from blind json writes
        read_only_fields = ['total_billed', 'total_remitted', 'aging_debt', 'sla_document']

    # --- Optimized Performance Computations ---
    def get_total_billed(self, obj):
        if hasattr(obj, 'annotated_total_billed'):
            return float(obj.annotated_total_billed)
        # 👇 FIXED: Leverages the stored database column field instead of looping relations
        return float(obj.total_billed or 0.00)

    def get_total_remitted(self, obj):
        if hasattr(obj, 'annotated_total_remitted'):
            return float(obj.annotated_total_remitted)
        # 👇 FIXED: Safely references the tracked aggregate column
        return float(obj.total_remitted or 0.00)

    def get_aging_debt(self, obj):
        # Always read straight from model property or perform fast local abstraction
        return float(obj.aging_debt or 0.00)

    # --- Hardened Writable Nested Logic ---
    def create(self, validated_data):
        """Extracts and writes inline scheme structures cleanly during creation"""
        schemes_data = validated_data.pop('schemes', [])
        
        # Strip out any incoming placeholder IDs present during basic profile initialization
        for scheme in schemes_data:
            scheme.pop('id', None)
            
        company = InsuranceCompany.objects.create(**validated_data)
        
        for scheme_data in schemes_data:
            InsuranceScheme.objects.create(company=company, **scheme_data)
        return company

    def update(self, instance, validated_data):
        """Synchronizes parent attributes and reconciles child scheme entries safely"""
        has_schemes = 'schemes' in validated_data
        schemes_data = validated_data.pop('schemes', None)
        
        # 1. Update core corporate layout configurations
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 2. Reconcile nested child rows safely
        if has_schemes and schemes_data is not None:
            keep_schemes = []
            for scheme_data in schemes_data:
                scheme_id = scheme_data.get('id', None)
                
                # Intercept and clean out temporary React client keys
                if scheme_id and str(scheme_id).startswith('temp-'):
                    scheme_id = None
                
                # Clean up data dictionary for active saving
                scheme_data.pop('id', None)

                if scheme_id:
                    try:
                        # 👇 FIXED: Coerce to clean integer now that string safety check has cleared
                        scheme_item = InsuranceScheme.objects.get(id=int(scheme_id), company=instance)
                        for attr, value in scheme_data.items():
                            setattr(scheme_item, attr, value)
                        scheme_item.save()
                        keep_schemes.append(scheme_item.id)
                    except (InsuranceScheme.DoesNotExist, ValueError):
                        # Graceful creation fallback if mismatch occurs
                        new_scheme = InsuranceScheme.objects.create(company=instance, **scheme_data)
                        keep_schemes.append(new_scheme.id)
                else:
                    # Instantiate fresh sub-plan added dynamically via UI additions line
                    new_scheme = InsuranceScheme.objects.create(company=instance, **scheme_data)
                    keep_schemes.append(new_scheme.id)

            # 3. Purge missing items dropped during user table edits
            instance.schemes.exclude(id__in=keep_schemes).delete()

        return instance


class RemittanceBatchSerializer(serializers.ModelSerializer):
    # Read-only field expansions to provide readable labels to React tables without extra queries
    insurance_company_name = serializers.CharField(source='insurance_company.name', read_only=True)
    reconciled_by_username = serializers.CharField(source='reconciled_by.username', read_only=True)
    
    # Explicitly enforce handling for file downloads and uploads
    remittance_file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = RemittanceBatch
        fields = [
            'id', 'insurance_company', 'insurance_company_name', 
            'payment_reference', 'total_amount_received', 'date_received', 
            'remittance_file', 'reconciled_by', 'reconciled_by_username', 'created_at'
        ]
        read_only_fields = ['reconciled_by', 'created_at']

    def create(self, validated_data):
        # Automatically bind the active logged-in endpoint user as the auditor who logged the batch
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['reconciled_by'] = request.user
        return super().create(validated_data)


class InsuranceClaimSerializer(serializers.ModelSerializer):
    # String representation expansions for easier rendering on the front-end data table columns
    insurance_company_name = serializers.CharField(source='insurance_company.name', read_only=True)

    class Meta:
        model = InsuranceClaim
        fields = [
            'id', 'claim_number', 'patient_name', 'insurance_company', 
            'insurance_company_name', 'pre_auth_code', 'total_amount_billed', 
            'shortfall_amount', 'status', 'date_submitted'
        ]

class ClaimDispatchBatchSerializer(serializers.ModelSerializer):
    insurance_company_name = serializers.CharField(source='insurance_company.name', read_only=True)
    claims_count = serializers.IntegerField(source='claims.count', read_only=True)
    sender_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = ClaimDispatchBatch
        fields = '__all__'


class DetailedPatientClaimSerializer(serializers.ModelSerializer):
    """Serializer explicitly tuned to handle the multi-column patient registry matrix."""
    insurance_company_name = serializers.CharField(source='insurance_company.name', read_only=True)
    dispatch_batch_reference = serializers.CharField(source='dispatch_batch.batch_reference', read_only=True)
    
    # Extract structural patient values dynamically to resolve frontend column variables cleanly
    patient_display_name = serializers.SerializerMethodField()
    patient_policy_number = serializers.CharField(source='patient.policy_number', read_only=True) 

    class Meta:
        model = InsuranceClaim
        fields = [
            'id', 'claim_number', 'patient_display_name', 'patient_policy_number',
            'insurance_company', 'insurance_company_name', 'pre_auth_code', 
            'total_amount_billed', 'shortfall_amount', 'status', 'date_submitted',
            'dispatch_batch', 'dispatch_batch_reference'
        ]

    def get_patient_display_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}"
        return "Unknown Patient"
    


class ServiceSerializer(serializers.ModelSerializer):
    # Display the human-readable label for departments in read-only mode
    dept_display = serializers.CharField(source='get_dept_display', read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'sku', 'name', 'dept', 'dept_display', 'price', 'active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_sku(self, value):
        """Force uppercase SKUs and strip whitespace."""
        return value.strip().upper()


# --- Real-Time Point-of-Care Billing Serializer ---

class PatientBillableItemSerializer(serializers.ModelSerializer):
    # Read-only nested lookup helpers for the UI dashboards
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    health_record_number = serializers.CharField(source='visit.health_record_number', read_only=True)
    queue_id = serializers.CharField(source='visit.queue_id', read_only=True)
    ordered_by_name = serializers.CharField(source='ordered_by.get_full_name', read_only=True)
    station_display = serializers.CharField(source='get_station_charged_display', read_only=True)
    
    class Meta:
        model = PatientBillableItem
        fields = [
            'id', 'patient', 'patient_name', 'visit', 'health_record_number', 'queue_id',
            'service', 'service_sku_snapshot', 'service_name_snapshot',
            'station_charged', 'station_display', 'qty', 'price_snap', 'total_amount', 
            'billing_status', 'ordered_by', 'ordered_by_name', 'created_at'
        ]
        read_only_fields = [
            'id', 'service_sku_snapshot', 'service_name_snapshot', 
            'total_amount', 'ordered_by', 'created_at'
        ]

    def validate(self, data):
        """
        Validate and automatically establish price snapshots from the 
        Service template matrix if not explicitly overridden.
        """
        service = data.get('service')
        price_snap = data.get('price_snap')

        # If a service blueprint is provided, pull its defaults if snapshots are missing
        if service:
            if not price_snap:
                data['price_snap'] = service.price
        elif not price_snap:
            raise serializers.ValidationError({
                "price_snap": "A baseline price rate must be supplied if no master service template is selected."
            })
            
        return data

    def create(self, validated_data):
        """Inject the requesting clinical user context directly from the active HTTP session."""
        request = self.context.get('request')
        if request and request.user:
            validated_data['ordered_by'] = request.user
        else:
            # Fallback error check if context isn't clean
            raise serializers.ValidationError("Authentication context is required to register automated point-of-care billing charges.")
            
        return super().create(validated_data)