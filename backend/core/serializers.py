from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction
from django.utils import timezone
from .models import (
    FixedAsset, LabReference, LabTestRegistry, Patient, 
    Protocol, ProtocolIngredient, RequisitionItem, StockAdjustment, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign, Queue,
    LabInventoryItem, Prescription, PrescriptionItem, LabPanel,
    CancerSite, CancerType, Regimen, RegimenDrug,
    ClinicalNote, ImagingRecord, RegistrationRecord, InventoryItem, PsychologyEnrollment, SessionLog, BereavementLog, 
    OutreachCampaign, ReferralPartner, SocialMediaPost, MarketingRequisitionExtension, LabOrder, ProtocolMaster, ProtocolDrug, DrugGuardrail, Requisition, MarketingRequisitionExtension, OutreachCampaign,
    InsuranceScheme, InsuranceCompany, InsuranceClaim, RemittanceBatch, ClaimDispatchBatch,
    Service, PatientBillableItem,
    ICD10Diagnosis, PatientDiagnosis,
    Supplier, StockTake,
    PurchaseOrder, PurchaseOrderItem, 
    GoodsReceivedNote, GRNItem, 
    PurchaseInvoice, PaymentVoucher,
    PatientInvoice, PatientBillableItem,
    ImagingOrder, ImagingResult,
    NurseServiceOrder, Expense

)
import os
import re
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
    # REMOVED write_only=True so fields are serialized in GET responses
    first_name = serializers.CharField()
    middle_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField()
    id_number = serializers.CharField()
    phone = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_null=True, default=None)
    gender = serializers.CharField(required=False, default='M')
    age = serializers.IntegerField()
    
    # Next of Kin captured payload fields (made readable)
    next_of_kin_name = serializers.CharField()
    next_of_kin_relationship = serializers.CharField()
    next_of_kin_phone = serializers.CharField()
    
    # Keep this write_only as it's only an incoming ID pointer link
    insurance_company_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    # Dynamic read representation for frontend rendering
    insurance_company_name = serializers.CharField(source='insurance_company.name', read_only=True)
    name = serializers.CharField(source='full_name', read_only=True)

    class Meta:
        model = RegistrationRecord
        fields = [
            'id', 'queue_id', 'name', 'health_record_number', 'patient', 
            'id_number', 'first_name', 'middle_name', 'last_name', 'phone', 'email', 'gender', 'age', 
            'payment_mode', 'insurance_company_id', 'insurance_company_name', 'insurance_number', 
            'is_urgent', 'is_returning', 'next_of_kin_name', 'next_of_kin_relationship', 
            'next_of_kin_phone', 'registered_at'
        ]
        read_only_fields = ['patient', 'name', 'queue_id', 'health_record_number', 'registered_at']

    def validate(self, data):
        id_num = data.get('id_number')
        is_returning = data.get('is_returning', False)
        
        patient_exists = Patient.objects.filter(registry_no=id_num).exists()
        if patient_exists and not is_returning:
            raise serializers.ValidationError({
                "id_number": "A master patient record with this National ID/Passport already exists. Please check 'Returning Patient'."
            })
        return data

    def create(self, validated_data):
        # Using .get() or .pop() with safe defaults so fields remain for create block execution
        id_num = validated_data.pop('id_number')
        f_name = validated_data.pop('first_name')
        m_name = validated_data.pop('middle_name', '')
        l_name = validated_data.pop('last_name')
        phone_num = validated_data.pop('phone', '')
        email_val = validated_data.pop('email', None)
        gender_choice = validated_data.pop('gender', 'M')
        insurance_co_id = validated_data.pop('insurance_company_id', None)
        
        nok_name = validated_data.pop('next_of_kin_name')
        nok_rel = validated_data.pop('next_of_kin_relationship')
        nok_phone = validated_data.pop('next_of_kin_phone')

        is_returning = validated_data.get('is_returning', False)
        full_name = f"{f_name} {m_name} {l_name}".replace("  ", " ").strip()

        with transaction.atomic():
            patient, created = Patient.objects.get_or_create(
                registry_no=id_num,
                defaults={
                    'name': full_name,
                    'phone': phone_num,
                    'email': email_val if email_val else None,
                    'gender': gender_choice,
                    'insurance_no': validated_data.get('insurance_number', '')
                }
            )
            
            if not created and is_returning:
                patient.name = full_name
                patient.phone = phone_num
                if email_val:
                    patient.email = email_val
                patient.save()

            patient.refresh_from_db()

            insurance_instance = None
            if validated_data.get('payment_mode') == 'INSURANCE' and insurance_co_id:
                try:
                    insurance_instance = InsuranceCompany.objects.get(id=insurance_co_id)
                except InsuranceCompany.DoesNotExist:
                    raise serializers.ValidationError({
                        "insurance_company_id": "Selected insurance provider does not exist in the database."
                    })

            registration = RegistrationRecord.objects.create(
                patient=patient,
                first_name=f_name,
                middle_name=m_name if m_name else None,
                last_name=l_name,
                phone=phone_num,
                email=email_val if email_val else None,
                gender=gender_choice,
                insurance_company=insurance_instance,
                next_of_kin_name=nok_name,
                next_of_kin_relationship=nok_rel,
                next_of_kin_phone=nok_phone,
                **validated_data
            )
            
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

class QueueSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_id_no = serializers.ReadOnlyField(source='patient.registry_no')
    patient_gender = serializers.CharField(source='patient.gender', read_only=True)
    patient_age = serializers.IntegerField(source='visit.age', read_only=True)
    visit_id = serializers.PrimaryKeyRelatedField(source='visit', read_only=True)
    station_display = serializers.CharField(source='get_current_station_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    wait_time = serializers.ReadOnlyField()

    health_record_number = serializers.ReadOnlyField(source='visit.health_record_number')
    is_urgent = serializers.BooleanField(source='visit.is_urgent', read_only=True, default=False)

    diagnosis_snapshot = serializers.SerializerMethodField()
    
    class Meta:
        model = Queue
        fields = [
            'id', 'token_id', 'patient', 'patient_name', 'patient_age', 'patient_gender','health_record_number','patient_id_no', 
            'current_station', 'status', 'priority', 'entered_at', 'wait_time',
            'is_urgent', 'visit_id','status_display', 'station_display', 'diagnosis_snapshot'
        ]

    def get_diagnosis_snapshot(self, obj):
        # Resolve tracking against the RegistrationRecord (visit)
        encounter = obj.visit if obj.visit else None
        if encounter:
            diagnoses = encounter.diagnoses.all()
            return [
                {
                    "id": d.id,
                    "primary_site": d.primary_site,
                    "primary_site_display": d.get_primary_site_display() if hasattr(d, 'get_primary_site_display') else d.primary_site,
                    "icd10_code": d.icd10_code,
                    "description": d.icd10_description,
                    "long_description": d.long_description,
                    "recorded_at": d.created_at.strftime('%Y-%m-%d %H:%M') if d.created_at else None
                } for d in diagnoses
            ]
        return []

# ─────────────────────────────────────────────────────────────────────────────
# 4. CLINICAL EMR
# ─────────────────────────────────────────────────────────────────────────────
class VitalSignSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_gender = serializers.CharField(source='patient.gender', read_only=True)
    patient_age = serializers.IntegerField(source='visit.age', read_only=True)
    health_record_number = serializers.CharField(source='visit.health_record_number', read_only=True)

    # Explicitly declare the model properties as read-only fields
    bmi = serializers.ReadOnlyField()
    bsa = serializers.ReadOnlyField()

    class Meta:
        model = VitalSign
        fields = [
            'id', 'patient', 'patient_name', 'patient_gender', 'patient_age', 
            'health_record_number', 'visit', 'queue_entry', 
            'temperature', 'systolic_bp', 'diastolic_bp', 
            'heart_rate', 'respiratory_rate', 'weight', 'height', 'spo2',
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
    selling_price_kes = serializers.DecimalField(source='drug.selling_price_kes', max_digits=10, decimal_places=2, read_only=True)
    available_stock = serializers.IntegerField(source='drug.stock_quantity', read_only=True)
    dosage_form = serializers.CharField(source='drug.get_dosage_form_display', read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = [
            'id', 'stage', 'drug', 'medication_name', 'dosage', 
            'calc_factor', 'factor_value', 'route', 'diluent', 
            'volume', 'duration', 'selling_price_kes', 'available_stock', 'dosage_form'
        ]


class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True)

    patient = serializers.PrimaryKeyRelatedField(read_only=True)
    visit = serializers.PrimaryKeyRelatedField(read_only=True)

    # Patient Profile / Demographics mappings
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_gender = serializers.CharField(source='patient.gender', read_only=True)
    patient_age = serializers.IntegerField(source='visit.age', read_only=True)
    health_record_number = serializers.CharField(source='visit.health_record_number', read_only=True)
    queue_token = serializers.CharField(source='visit.token_id', read_only=True)

    # Dynamic system clinical state snapshots
    vitals_snapshot = serializers.SerializerMethodField()
    diagnosis_snapshot = serializers.SerializerMethodField()
    lab_results_snapshot = serializers.SerializerMethodField()
    
    # 🌟 NEW: Exposes rich nested lookup detailing back to the UI layout safely
    diagnosis_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'patient', 'patient_name', 'patient_gender', 'patient_age', 
            'health_record_number', 'queue_token', 'visit', 'protocol', 
            'cycle_no', 'total_cycles', 'diagnosis', 'diagnosis_detail', 'allergies', 
            'dose_adjustment_notes', 'prescribed_by', 'pharmacy_status', 
            'vitals_snapshot', 'diagnosis_snapshot', 'lab_results_snapshot', 
            'items', 'treatment_date'
        ]

    def _get_clinical_encounter(self, obj):
        """Helper to resolve the underlying clinical encounter (RegistrationRecord)."""
        return obj.visit.visit if (obj.visit and hasattr(obj.visit, 'visit')) else None

    def get_vitals_snapshot(self, obj):
        encounter = self._get_clinical_encounter(obj)
        if encounter:
            latest_vital = encounter.vitals.all()[0] if encounter.vitals.exists() else None
            if latest_vital:
                return {
                    "temperature": latest_vital.temperature,
                    "blood_pressure": f"{latest_vital.systolic_bp}/{latest_vital.diastolic_bp}",
                    "heart_rate": latest_vital.heart_rate,
                    "weight_kg": latest_vital.weight,
                    "height_cm": latest_vital.height,
                    "bmi": latest_vital.bmi,
                    "bsa": latest_vital.bsa,
                    "spo2": latest_vital.spo2
                }
        return None

    def get_diagnosis_snapshot(self, obj):
        """
        Queries explicitly against your PatientDiagnosis tracking matrix linked 
        to the active RegistrationRecord to serve the pharmacy UI with absolute clarity.
        """
        encounter = self._get_clinical_encounter(obj)
        if encounter:
            diagnoses = encounter.diagnoses.all()
            return [
                {
                    "id": d.id,
                    "primary_site": d.primary_site,
                    "primary_site_display": d.get_primary_site_display() if hasattr(d, 'get_primary_site_display') else d.primary_site,
                    "icd10_code": d.icd10_code,
                    "description": d.icd10_description,
                    "long_description": d.long_description,
                    "recorded_at": d.created_at.strftime('%Y-%m-%d %H:%M') if d.created_at else None
                } for d in diagnoses
            ]
        return []

    # 🌟 NEW: Safety method resolving the specific single target diagnosis set directly on the prescription
    def get_diagnosis_detail(self, obj):
        if obj.diagnosis:
            d = obj.diagnosis
            return {
                "id": d.id,
                "primary_site": getattr(d, 'primary_site', ''),
                "icd10_code": getattr(d, 'icd10_code', ''),
                "description": getattr(d, 'icd10_description', ''),
                "long_description": getattr(d, 'long_description', '')
            }
        return None

    def get_lab_results_snapshot(self, obj):
        encounter = self._get_clinical_encounter(obj)
        if not encounter:
            return {}

        completed_results = [
            res for res in encounter.lab_orders.all() 
            if getattr(res, 'status', None) == 'COMPLETED'
        ]
        
        PANEL_MAPPINGS = {
            'CBC': {"Hb": "cbc_hb", "WBC": "cbc_wbc", "ANC (Neut)": "cbc_neut", "Plt": "cbc_plt", "MCV": "cbc_mcv"},
            'UE': {"Sodium": "ue_na", "Potassium": "ue_k", "Urea": "ue_urea", "Creatinine": "ue_creatinine"},
            'LFT': {"ALT": "lft_alt", "AST": "lft_ast", "Total Bilirubin": "lft_tbil", "Albumin": "lft_albumin", "ALP": "lft_alp"},
            'PSA': {"Total PSA": "psa_total"}
        }

        labs_dict = {}
        for res in completed_results:
            panel_key = res.test_name
            if panel_key in PANEL_MAPPINGS:
                metrics = {
                    label: getattr(res, field_attr, None)
                    for label, field_attr in PANEL_MAPPINGS[panel_key].items()
                }
                
                labs_dict[res.get_test_name_display()] = {
                    "panel_code": panel_key,
                    "is_critical": res.is_critical,
                    "parameters": metrics,
                    "technician_notes": res.technician_notes,
                    "verified_at": res.updated_at.strftime('%Y-%m-%d') if res.updated_at else None
                }
        return labs_dict
    
class LabResultSerializer(serializers.ModelSerializer):
    test_name_display = serializers.CharField(source='get_test_name_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_gender = serializers.CharField(source='patient.gender', read_only=True)
    patient_age = serializers.IntegerField(source='visit.age', read_only=True)
    health_record_number = serializers.CharField(source='visit.health_record_number', read_only=True)
    class Meta:
        model = LabResult
        fields = '__all__' 

class LabOrderSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    requested_tests = serializers.SerializerMethodField()
    token_id = serializers.SerializerMethodField()

    patient_gender = serializers.CharField(source='patient.gender', read_only=True)
    patient_age = serializers.IntegerField(source='visit.age', read_only=True)
    health_record_number = serializers.CharField(source='visit.health_record_number', read_only=True)

    # Explicitly catch frontend tracking metrics safely
    test_skus = serializers.ListField(
        child=serializers.CharField(), 
        write_only=True, 
        required=True
    )
    total_estimated_charge = serializers.FloatField(
        write_only=True, 
        required=False
    )

    class Meta:
        model = LabOrder
        fields = [
            'id', 'patient', 'patient_name', 'patient_gender', 'health_record_number','visit', 'status', 'doctor_notes',
            'has_cbc', 'has_ue', 'has_lft', 'has_psa', 'has_urine', 
            'has_bg_cross', 'has_bs_mp', 'created_at',
            'requested_tests', 'token_id',  'patient_age',
            'test_skus', 'total_estimated_charge'
        ]
        extra_kwargs = {
            'has_cbc': {'write_only': True},
            'has_ue': {'write_only': True},
            'has_lft': {'write_only': True},
            'has_psa': {'write_only': True},
            'has_urine': {'write_only': True},
            'has_bg_cross': {'write_only': True},
            'has_bs_mp': {'write_only': True},
        }

    def get_token_id(self, obj):
        if obj.visit and hasattr(obj.visit, 'queue_id'):
            return obj.visit.queue_id
        return f"REQ-{obj.id}"

    def get_requested_tests(self, obj):
        # Gracefully handles reading back the database items array property
        return getattr(obj, 'selected_test_list', [])

    def to_internal_value(self, data):
        """
        INPUT (Write): Intercepts the clean SKU list strings 
        to accurately flip internal database tracking booleans.
        """
        internal_value = super().to_internal_value(data)
        incoming_skus = data.get('test_skus', None)
        
        if incoming_skus is not None:
            if not isinstance(incoming_skus, list):
                raise serializers.ValidationError({
                    "test_skus": "Expected an array/list of string SKU identifiers."
                })
                
            internal_value['has_cbc'] = "LAB-CBC" in incoming_skus
            internal_value['has_psa'] = "LAB-PSA" in incoming_skus
            internal_value['has_ue'] = "LAB-UE" in incoming_skus
            internal_value['has_lft'] = "LAB-LFT" in incoming_skus
            internal_value['has_urine'] = "LAB-URINE" in incoming_skus
            internal_value['has_bg_cross'] = "LAB-BG_CROSS" in incoming_skus
            internal_value['has_bs_mp'] = "LAB-BS_MP" in incoming_skus

        return internal_value

    def create(self, validated_data):
        # Cleanly drop UI helper fields before database model record serialization instantiates
        validated_data.pop('test_skus', None)
        validated_data.pop('total_estimated_charge', None)
        
        # Save the main Lab Order entry
        lab_order = super().create(validated_data)
        visit = lab_order.visit
        
        if visit:
            # Locate or build an active payment record ledger
            invoice, created = PatientInvoice.objects.get_or_create(
                visit=visit,
                defaults={'patient': lab_order.patient, 'status': 'UNPAID'}
            )
            
            # Map flags directly to master Service configurations catalog entries
            lab_sku_mapping = {
                'has_cbc': 'SKU-LAB-CBC',
                'has_psa': 'SKU-LAB-PSA',
                'has_ue': 'SKU-LAB-UE',
                'has_lft': 'SKU-LAB-LFT',
                'has_urine': 'SKU-LAB-URINE',
                'has_bg_cross': 'SKU-LAB-CROSS',
                'has_bs_mp': 'SKU-LAB-MALARIA',
            }
            
            for field_name, service_sku in lab_sku_mapping.items():
                if validated_data.get(field_name, False):
                    service_catalog = Service.objects.filter(sku=service_sku, active=True).first()
                    if service_catalog:
                        PatientBillableItem.objects.get_or_create(
                            invoice=invoice,
                            service=service_catalog,
                            defaults={
                                'name': service_catalog.name,
                                'unit_price': service_catalog.price,
                                'quantity': 1,
                                'station': 'Laboratory'
                            }
                        )
                        
        return lab_order
    
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
    
class ImagingResultSerializer(serializers.ModelSerializer):
    imaging_name_display = serializers.CharField(source='get_imaging_name_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)

    class Meta:
        model = ImagingResult
        fields = '__all__'


class ImagingOrderSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    requested_imaging = serializers.SerializerMethodField()
    token_id = serializers.SerializerMethodField()

    # Explicitly catch frontend tracking matrices safely
    imaging_skus = serializers.ListField(
        child=serializers.CharField(), 
        write_only=True, 
        required=True
    )
    # Because you set ultrasounds as VARIABLE, this field maps the custom pricing directly!
    total_estimated_charge = serializers.FloatField(
        write_only=True, 
        required=False
    )

    class Meta:
        model = ImagingOrder
        fields = [
            'id', 'patient', 'patient_name', 'visit', 'status', 'doctor_notes',
            'has_us_carotid', 'has_us_duplex_low_ext', 'has_us_venous_ext', 
            'has_us_venous_unila', 'has_us_doppler_abd_pel', 'has_us_limited_duplex', 
            'has_us_hemodialysis', 'created_at',
            'requested_imaging', 'token_id',  
            'imaging_skus', 'total_estimated_charge'
        ]
        extra_kwargs = {
            'has_us_carotid': {'write_only': True},
            'has_us_duplex_low_ext': {'write_only': True},
            'has_us_venous_ext': {'write_only': True},
            'has_us_venous_unila': {'write_only': True},
            'has_us_doppler_abd_pel': {'write_only': True},
            'has_us_limited_duplex': {'write_only': True},
            'has_us_hemodialysis': {'write_only': True},
        }

    def get_token_id(self, obj):
        if obj.visit and hasattr(obj.visit, 'queue_id'):
            return obj.visit.queue_id
        return f"IMG-{obj.id}"

    def get_requested_imaging(self, obj):
        return getattr(obj, 'selected_imaging_list', [])

    def to_internal_value(self, data):
        """
        INPUT (Write): Intercepts the clean SKU list strings 
        to accurately flip internal database tracking booleans.
        """
        internal_value = super().to_internal_value(data)
        incoming_skus = data.get('imaging_skus', None)
        
        if incoming_skus is not None:
            if not isinstance(incoming_skus, list):
                raise serializers.ValidationError({
                    "imaging_skus": "Expected an array/list of string SKU identifiers."
                })
                
            internal_value['has_us_carotid'] = "RAD-US_CAROTID" in incoming_skus
            internal_value['has_us_duplex_low_ext'] = "RAD-US_DUPLEX_LOW_EXT" in incoming_skus
            internal_value['has_us_venous_ext'] = "RAD-US_VENOUS_EXT" in incoming_skus
            internal_value['has_us_venous_unila'] = "RAD-US_VENOUS_UNILA" in incoming_skus
            internal_value['has_us_doppler_abd_pel'] = "RAD-US_DOPPLER_ABD_PEL" in incoming_skus
            internal_value['has_us_limited_duplex'] = "RAD-US_LIMITED_DUPLEX" in incoming_skus
            internal_value['has_us_hemodialysis'] = "RAD-US_HEMODIALYSIS" in incoming_skus

        return internal_value

    def create(self, validated_data):
        # Extract UI helper inputs safely before saving model fields
        imaging_skus = validated_data.pop('imaging_skus', None)
        custom_variable_price = validated_data.pop('total_estimated_charge', None)
        
        # Save the main Imaging Order entry
        imaging_order = super().create(validated_data)
        visit = imaging_order.visit
        
        if visit:
            # Locate or build an active payment record ledger
            invoice, created = PatientInvoice.objects.get_or_create(
                visit=visit,
                defaults={'patient': imaging_order.patient, 'status': 'UNPAID'}
            )
            
            # Map flags directly to master Service configurations catalog entries
            imaging_sku_mapping = {
                'has_us_carotid': 'RAD-US_CAROTID',
                'has_us_duplex_low_ext': 'RAD-US_DUPLEX_LOW_EXT',
                'has_us_venous_ext': 'RAD-US_VENOUS_EXT',
                'has_us_venous_unila': 'RAD-US_VENOUS_UNILA',
                'has_us_doppler_abd_pel': 'RAD-US_DOPPLER_ABD_PEL',
                'has_us_limited_duplex': 'RAD-US_LIMITED_DUPLEX',
                'has_us_hemodialysis': 'RAD-US_HEMODIALYSIS',
            }
            
            for field_name, service_sku in imaging_sku_mapping.items():
                if validated_data.get(field_name, False):
                    service_catalog = Service.objects.filter(sku=service_sku, active=True).first()
                    if service_catalog:
                        # Fallback calculation logic for VARIABLE priced procedures
                        final_unit_price = custom_variable_price if custom_variable_price is not None else service_catalog.price
                        
                        PatientBillableItem.objects.get_or_create(
                            invoice=invoice,
                            service=service_catalog,
                            defaults={
                                'name': service_catalog.name,
                                'unit_price': final_unit_price,
                                'quantity': 1,
                                'station': 'Radiology'
                            }
                        )
                        
        return imaging_order
    
class NurseServiceOrderSerializer(serializers.ModelSerializer):
    # Read-only fields fetched from the related Patient model (matching Lab/Imaging style)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    
    # Formatted list of selected services to make frontend table rendering incredibly easy
    requested_services = serializers.SerializerMethodField()

    class Meta:
        model = NurseServiceOrder
        fields = [
            'id', 
            'patient', 
            'patient_name', 
            'patient_number',
            'has_wound_dressing', 
            'has_catheter_change', 
            'has_pelvic_screening',
            'requested_services',
            'total_estimated_charge', 
            'doctor_notes', 
            'status', 
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_estimated_charge']

    def get_requested_services(self, obj):
        """
        Dynamically compiles a clean string array of active procedures
        e.g., ["Wound Dressing", "Pelvic Screening"]
        """
        services = []
        if obj.has_wound_dressing:
            services.append("Wound Dressing")
        if obj.has_catheter_change:
            services.append("Catheter Change")
        if obj.has_pelvic_screening:
            services.append("Pelvic Screening")
        return services
    
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
    

class CancerSiteSerializer(serializers.ModelSerializer):
    """Dropdown 1: Serializes the main cancer groups"""
    class Meta:
        model = CancerSite
        fields = ['id', 'name']


class CancerTypeSerializer(serializers.ModelSerializer):
    """Dropdown 2: Serializes specific sub-types or variants"""
    class Meta:
        model = CancerType
        fields = ['id', 'name', 'site']


class RegimenSerializer(serializers.ModelSerializer):
    """Dropdown 3: Serializes the protocol acronyms (e.g., TC, CMF)"""
    class Meta:
        model = Regimen
        fields = ['id', 'name', 'default_cycles', 'cancer_type']


class RegimenDrugSerializer(serializers.ModelSerializer):
    """Dynamic Rows: Serializes the list of drugs for a chosen protocol"""
    class Meta:
        model = RegimenDrug
        fields = ['id', 'name', 'base_value', 'metric_unit', 'route_pathway', 'cycle_cost_kes']

        

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

class ProtocolIngredientSerializer(serializers.ModelSerializer):
    pharmacy_drug_id = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProtocolIngredient
        fields = [
            'id', 'medication_name', 'base_dosage', 
            'dosage_unit', 'route_of_administration', 
            'pharmacy_drug_id', 'in_stock'
        ]

        extra_kwargs = {
            'protocol': {'required': False, 'allow_null': True}
        }

    def _get_cached_drug(self, obj):
        """Optimizes runtime operations by keeping data execution down to 1 hit per row"""
        if not hasattr(obj, '_cached_drug'):
            obj._cached_drug = Drug.objects.filter(name__icontains=obj.medication_name).first()
        return obj._cached_drug

    def get_pharmacy_drug_id(self, obj):
        drug = self._get_cached_drug(obj)
        return drug.id if drug else None

    def get_in_stock(self, obj):
        drug = self._get_cached_drug(obj)
        return drug.stock_quantity if drug else 0


class ProtocolDetailSerializer(serializers.ModelSerializer):
    """Used specifically for read-only detail viewports"""
    components = ProtocolIngredientSerializer(many=True, read_only=True)

    class Meta:
        model = Protocol
        fields = [
            'id', 'name', 'description', 'total_cycles', 
            'cycle_duration_days', 'components'
        ]


class ProtocolSerializer(serializers.ModelSerializer):
    """The master configuration engine processing complete write procedures"""
    components = ProtocolIngredientSerializer(many=True, required=False)
    applicable_stages = serializers.JSONField(required=False, default=list)
    total_cost_per_cycle = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    regimen_template_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Protocol
        fields = [
            'id', 'name', 'description', 'total_cycles', 
            'cycle_duration_days', 'primary_site_id', 'cancer_type_id', 
            'regimen_template_id', 'applicable_stages', 'total_cost_per_cycle', 
            'components'
        ]

    def create(self, validated_data):
        components_data = validated_data.pop('components', [])
        
        with transaction.atomic():
            protocol = Protocol.objects.create(**validated_data)
            for component in components_data:
                ProtocolIngredient.objects.create(protocol=protocol, **component)
                
        return protocol

    def update(self, instance, validated_data):
        components_data = validated_data.pop('components', None)
        
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if components_data is not None:
                instance.components.all().delete()
                for component in components_data:
                    ProtocolIngredient.objects.create(protocol=instance, **component)
                
        return instance
    
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
    """
    Core serialization layer representing master tracking schema maps
    across Salama Cancer Center substores.
    """
    # Exposing human-readable department labels to the client side
    department_display = serializers.CharField(source='get_department_display', read_only=True)
    dosage_form_display = serializers.CharField(source='get_dosage_form_display', read_only=True)

    class Meta:
        model = InventoryItem
        fields = '__all__'

        extra_kwargs = {
            'dosage_form': {
                'required': False, 
                'allow_null': True, 
                'allow_blank': True
            },
            'strength': {
                'required': False, 
                'allow_null': True, 
                'allow_blank': True
            },
            'expiry_date': {
                'required': False, 
                'allow_null': True
            }
        }


class StockTakeSerializer(serializers.ModelSerializer):
    """
    Auditing serialization ledger capturing ground vs system variances.
    Dynamically swaps from flat input IDs to deep entity metadata lines.
    """
    # Embedded field mappings explicitly for frontend performance optimization
    item_details = InventoryItemSerializer(source='item', read_only=True)
    
    # Traceability safety captures
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    variance = serializers.IntegerField(read_only=True)
    variance_percentage = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)

    class Meta:
        model = StockTake
        fields = [
            'id', 
            'item', 
            'item_details', 
            'system_quantity', 
            'physical_quantity', 
            'variance', 
            'variance_percentage', 
            'notes', 
            'performed_by', 
            'performed_by_name', 
            'created_at',
            'recorded_at'
        ]
        read_only_fields = ['performed_by', 'created_at']

    def create(self, validated_data):
        """
        Intercepts the creation routine to automatically bind the executing 
        finance officer context to the audit footprint.
        """
        request = self.context.get('request')
        if request and request.user and not request.user.is_anonymous:
            validated_data['performed_by'] = request.user
            
        return super().create(validated_data)

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

class RequisitionItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='inventory_item.name', read_only=True)
    sku = serializers.CharField(source='inventory_item.sku', read_only=True)
    
    
    class Meta:
        model = RequisitionItem
        fields = [
            'id', 
            'inventory_item',   # Primary key ID sent from frontend basket
            'item_name',        # Evaluated and returned dynamically 
            'sku',              # Evaluated and returned dynamically
            'non_inventory_title', 
            'quantity', 
            'unit_price',       # Snapped automatically during model save()
            'line_total'
        ]
        read_only_fields = ['id', 'unit_price', 'line_total']

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
        return obj.created_at.strftime('%Y-%m-%d') if obj.created_at else None

    # ====================================================================
    # FIXED: Replaced legacy attribute lookups with the unified inventory tracking model
    # ====================================================================
    def get_itemSummary(self, obj):
        if obj.department == 'MARKETING' and hasattr(obj, 'marketing_meta') and obj.marketing_meta:
            meta = obj.marketing_meta
            campaign_name = meta.campaign.name if meta.campaign else "General Outreach"
            return f"{meta.get_category_display()} — Campaign: {campaign_name}"
        
        items = obj.items.all()
        if items.exists():
            first_item = items.first()
            count = items.count()
            
            # Use getattr to safely check for the new unified inventory item link
            if getattr(first_item, 'inventory_item', None):
                item_name = first_item.inventory_item.name
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
                # Compute the line item math explicitly before database saving
                qty = int(item_data.get('quantity', 1))
                price = float(item_data.get('unit_price', 0))
                computed_line_total = qty * price
                
                RequisitionItem.objects.create(
                    requisition=requisition, 
                    line_total=computed_line_total, # Pass the calculated valuation here
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
    

class ICD10DiagnosisSerializer(serializers.ModelSerializer):
    """
    Serializer optimized for anatomical site filtering and autocomplete.
    Provides the primary site grouping, clinical code, and descriptions.
    """
    # Expose a clean display string combining the code and the short description
    display_label = serializers.SerializerMethodField()

    class Meta:
        model = ICD10Diagnosis
        fields = [
            'id', 
            'primary_site', 
            'code', 
            'short_description', 
            'long_description',
            'display_label'
        ]
        read_only_fields = fields

    def get_display_label(self, obj):
        """
        Creates a uniform label format for frontend drop-down options.
        Example: "[C50.4] Malignant neoplasm of upper-outer quadrant of breast"
        """
        return f"[{obj.code}] {obj.short_description}"
    
class PatientDiagnosisSerializer(serializers.ModelSerializer):
    # Formats the auto_now_add datetime field nicely
    formatted_date = serializers.DateTimeField(source='created_at', format='%Y-%m-%d %H:%M', read_only=True)
    
    # ⭐ Pulls the custom assigned health record number straight from the referenced RegistrationRecord
    health_record_number = serializers.CharField(source='visit.health_record_number', read_only=True)

    class Meta:
        model = PatientDiagnosis
        fields = [
            'id', 
            'patient', 
            'visit', 
            'health_record_number',  # Included in output payloads automatically
            'primary_site', 
            'icd10_code', 
            'icd10_description', 
            'long_description', 
            'created_at',
            'formatted_date'
        ]
        read_only_fields = ['id', 'created_at', 'formatted_date', 'health_record_number']


# Suppliers


class SupplierSerializer(serializers.ModelSerializer):
    # Read-only field for rendering pretty labels on the React directory cards
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    # We can explicitly mark compliance files as optional at serializer layer, 
    # but handle multi-part file payloads safely.
    kra_pin_doc = serializers.FileField(required=False, allow_null=True)
    incorporation_doc = serializers.FileField(required=False, allow_null=True)
    regulatory_license_doc = serializers.FileField(required=False, allow_null=True)
    bank_confirmation_doc = serializers.FileField(required=False, allow_null=True)
    tax_compliance_doc = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'category', 'category_display', 'contact_person', 
            'email', 'phone', 'tin_number', 'license_number',
            'bank_name', 'account_name', 'account_number', 'branch_code', 'swift_code',
            'contract_document', 'contract_start', 'contract_end', 'payment_terms', 
            'performance_rating', 'kra_pin_doc', 'incorporation_doc', 
            'regulatory_license_doc', 'bank_confirmation_doc', 
            'tax_compliance_doc', 'tax_compliance_expiry', 'notes', 'is_active'
        ]

    def validate(self, data):
        """
        Object-level validation to safeguard our compliance workflows.
        """
        tax_doc = data.get('tax_compliance_doc')
        expiry_date = data.get('tax_compliance_expiry')

        # Rule 1: If TCC is uploaded, the expiration date must be supplied for Dorcas' system to track it
        if tax_doc and not expiry_date:
            raise serializers.ValidationError({
                "tax_compliance_expiry": "You must provide an expiration date when uploading a Tax Compliance Certificate."
            })
            
        # Rule 2: Warning validation flag if they try to onboard an already expired document
        if expiry_date and expiry_date < timezone.now().date():
            raise serializers.ValidationError({
                "tax_compliance_expiry": "The provided Tax Compliance Certificate has already expired."
            })

        return data
    

# Purchases

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    total_cost = serializers.ReadOnlyField()

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'item_name', 'category', 'quantity', 'unit_cost', 'total_cost']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    # Read-only fields to simplify UI consumption
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    total_amount = serializers.ReadOnlyField()
    
    # Write-only fields explicitly exposed for incoming form raw item structures
    items_raw = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'supplier', 'supplier_name', 'issue_date', 
            'delivery_date', 'payment_terms', 'status', 'notes', 
            'total_amount', 'linked_requisitions', 'items', 'items_raw'
        ]

    def create(self, validated_data):
        """Overrides creation logic to automatically handle nested item arrays"""
        items_data = validated_data.pop('items_raw', [])
        
        with transaction.atomic():
            purchase_order = PurchaseOrder.objects.create(**validated_data)
            
            # Unpack items sent by React state structure
            for item in items_data:
                PurchaseOrderItem.objects.create(
                    purchase_order=purchase_order,
                    item_name=item.get('item_name'),
                    category=item.get('category', 'PHARMACY'),
                    quantity=int(item.get('quantity', 1)),
                    unit_cost=float(item.get('unit_cost', 0.00))
                )
                
        return purchase_order


# ----------------------------------------------------------------------
# 2. GOODS RECEIVED NOTE SERIALIZERS
# ----------------------------------------------------------------------

class GRNItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GRNItem
        fields = ['id', 'item_name', 'ordered_quantity', 'quantity_received', 'damaged_quantity', 'satisfaction_level']


def generate_next_batch_number():
    """
    Scans the existing inventory lots to atomically extract, compute, 
    and increment the sequential serial lot identification indexes.
    Example output format: SCC-INV-001/2026
    """
    # Import locally to avoid potential model initialization state loops
    from core.models import InventoryItem
    
    current_year = timezone.now().year
    prefix = "SCC-INV-"
    suffix = f"/{current_year}"
    
    # Extract the highest primary ID item matching the current calendar layout sequence
    latest_item = InventoryItem.objects.filter(
        batch_number__startswith=prefix,
        batch_number__endswith=suffix
    ).order_by('-id').first()
    
    if latest_item:
        try:
            # Strip prefixes/suffixes to isolate raw numbers e.g. "SCC-INV-012/2026" -> "012" -> 12
            current_num_str = latest_item.batch_number.replace(prefix, "").replace(suffix, "")
            next_num = int(current_num_str) + 1
        except (ValueError, TypeError):
            next_num = 1
    else:
        next_num = 1
        
    return f"{prefix}{str(next_num).zfill(3)}{suffix}"


class GoodsReceivedNoteSerializer(serializers.ModelSerializer):
    items_received = GRNItemSerializer(many=True, read_only=True)
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    supplier_name = serializers.CharField(source='purchase_order.supplier.name', read_only=True)
    
    # Write-only field to receive verified item snapshots directly from front-end
    items_received_raw = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = GoodsReceivedNote
        fields = [
            'id', 'grn_number', 'purchase_order', 'po_number', 'supplier_name', 
            'delivery_note_ref', 'date_received', 'items_received', 'items_received_raw'
        ]

    def create(self, validated_data):
        from core.models import InventoryItem, PurchaseOrderItem
        
        items_data = validated_data.pop('items_received_raw', [])
        
        with transaction.atomic():
            # 1. Save the master Goods Received Note entry
            grn = GoodsReceivedNote.objects.create(**validated_data)
            po = grn.purchase_order
            
            # 2. Iterate through incoming items to log arrival details and update inventory counters
            for item in items_data:
                item_name = item.get('item_name')
                qty_received = int(item.get('quantity_received', 0))
                damaged_qty = int(item.get('damaged_quantity', 0))
                ordered_qty = int(item.get('ordered_quantity', 0))
                satisfaction = item.get('satisfaction_level', 'GoodCondition')
                
                # Dynamic field collection mapped straight from frontend date pickers
                expiry_date = item.get('expiry_date') or None

                # Create the receipt audit item line row
                GRNItem.objects.create(
                    goods_received_note=grn,
                    item_name=item_name,
                    ordered_quantity=ordered_qty,
                    quantity_received=qty_received,
                    damaged_quantity=damaged_qty,
                    satisfaction_level=satisfaction
                )
                
                # If zero usable units arrived, skip updating the physical asset inventory
                if qty_received <= 0:
                    continue
                
                # Look up matching procurement line item details from the original PO
                po_line_item = PurchaseOrderItem.objects.filter(
                    purchase_order=po, 
                    item_name=item_name
                ).first()
                
                # Fallbacks if items don't have an exact structural match in the PO line
                unit_cost = po_line_item.unit_cost if po_line_item else 0.00
                department = po_line_item.category if po_line_item else 'PHARMACY'
                
                # Generate tracking index sequentially
                assigned_batch_id = generate_next_batch_number()
                
                # 3. Commit unique trace lot line directly to the stock inventory ledger table
                InventoryItem.objects.create(
                    name=item_name,
                    batch_number=assigned_batch_id,
                    department=department,
                    quantity_available=qty_received,
                    cost_per_unit=unit_cost,
                    expiry_date=expiry_date
                )
                
            # 4. Advance linked PO status to prevent double-processing delivery workflows
            po.status = 'RECEIVED'
            po.save()

        return grn


# ----------------------------------------------------------------------
# 3. SUPPLIER INVOICE SERIALIZERS
# ----------------------------------------------------------------------

class PurchaseInvoiceSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    supplier_name = serializers.CharField(source='purchase_order.supplier.name', read_only=True)
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseInvoice
        fields = ['id', 'invoice_number', 'purchase_order', 'po_number', 'supplier_name', 'total_billed', 'due_date', 'status', 'invoice_file', 'file_name']

    def get_file_name(self, obj):
        """Extracts fallback string filename for React file badges"""
        if obj.invoice_file:
            return obj.invoice_file.name.split('/')[-1]
        return "invoice.pdf"


# ----------------------------------------------------------------------
# 4. PAYMENT VOUCHER SERIALIZERS
# ----------------------------------------------------------------------

class PaymentVoucherSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    purchase_invoice_number = serializers.CharField(source='purchase_invoice.invoice_number', read_only=True)
    supplier_name = serializers.CharField(source='purchase_order.supplier.name', read_only=True)

    class Meta:
        model = PaymentVoucher
        fields = [
            'id', 'voucher_number', 'purchase_order', 'po_number', 'purchase_invoice', 
            'purchase_invoice_number', 'supplier_name', 'amount_paid', 'payment_mode', 
            'payment_reference', 'date_issued'
        ]

    def create(self, validated_data):
        with transaction.atomic():
            voucher = PaymentVoucher.objects.create(**validated_data)
            
            # Automatically push Invoice billing state to PAID upon allocation
            invoice = voucher.purchase_invoice
            invoice.status = 'PAID'
            invoice.save()
            
        return voucher
    

class PatientBillableItemSerializer(serializers.ModelSerializer):
    """
    Serializes individual line items to match the columns on the React frontend:
    Station, Service/Procedure, Cost (KES).
    """
    # Use the human-readable display string for the station choice field
    station = serializers.CharField(source='get_station_display')
    service = serializers.CharField(source='name')
    price = serializers.FloatField(source='total_cost')

    class Meta:
        model = PatientBillableItem
        fields = ['id', 'station', 'service', 'price']


class ActiveInvoiceSerializer(serializers.ModelSerializer):
    """
    Serializes the complete billing profile for the selected patient transaction.
    """
    items = PatientBillableItemSerializer(many=True, read_only=True)
    total_payable = serializers.FloatField(read_only=True)

    class Meta:
        model = PatientInvoice
        fields = ['id', 'status', 'total_payable', 'items']


class PatientBillingLookupSerializer(serializers.ModelSerializer):
    """
    Used when searching patients at the front desk. Resolves identification,
    payment coverage flags, and hooks into their active transaction ledger.
    """
    # Flatten names cleanly using your model helper property
    name = serializers.CharField(source='full_name', read_only=True)
    scheme = serializers.SerializerMethodField()
    active_bill = serializers.SerializerMethodField()

    class Meta:
        model = RegistrationRecord
        fields = ['id', 'queue_id', 'health_record_number', 'name', 'phone', 'payment_mode', 'scheme', 'active_bill']

    def get_scheme(self, obj):
        """Returns corporate insurer details or plain self-pay text"""
        if obj.payment_mode == 'INSURANCE' and obj.insurance_company:
            return f"{obj.insurance_company.name} - ({obj.insurance_number})"
        return "Self Pay (Cash/M-Pesa)"

    def get_active_bill(self, obj):
        """
        Resolves an active open invoice context. Auto-instantiates 
        the row safely if it doesn't exist yet to secure station connectivity.
        """
        # 1. First, check if ANY invoice at all exists for this visit session to prevent UNIQUE clashes
        invoice = PatientInvoice.objects.filter(visit=obj).first()
        
        # 2. If absolutely no invoice exists for this visit, safely create it on the fly
        if not invoice:
            patient_record = getattr(obj, 'patient', None)
            if patient_record:
                try:
                    # Using get_or_create provides an extra layer of structural race-condition safety
                    invoice, created = PatientInvoice.objects.get_or_create(
                        visit=obj,
                        defaults={
                            'patient': patient_record,
                            'status': 'UNPAID'
                        }
                    )
                except Exception as e:
                    # Log or handle unexpected database locking gracefully
                    invoice = PatientInvoice.objects.filter(visit=obj).first()

        # 3. Return the serialized data if we successfully found or generated the record
        if invoice:
            return ActiveInvoiceSerializer(invoice).data
            
        # Hard fallback only if database integrity is fundamentally broken
        return {
            "id": None,
            "status": "UNPAID",
            "total_payable": 0.0,
            "items": []
        }
    


class FixedAssetSerializer(serializers.ModelSerializer):
    department_display = serializers.CharField(source='get_department_display', read_only=True)
    total_asset_value = serializers.SerializerMethodField()
    annual_value_loss = serializers.SerializerMethodField()

    class Meta:
        model = FixedAsset
        fields = [
            'id', 'name', 'sku', 'department', 'department_display',
            'quantity', 'unit_cost', 'salvage_value', 'depreciation_rate',
            'total_asset_value', 'annual_value_loss', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'sku': {'required': False, 'allow_blank': True}
        }

    def get_total_asset_value(self, obj):
        return float((obj.quantity or 0) * (obj.unit_cost or 0))

    def get_annual_value_loss(self, obj):
        cost = float(obj.unit_cost or 0)
        salvage = float(obj.salvage_value or 0)
        rate = float(obj.depreciation_rate or 20) / 100
        quantity = obj.quantity or 0
        return float(max(0, (cost - salvage) * rate * quantity))
    
class ExpenseSerializer(serializers.ModelSerializer):
    # Display plain text labels for choices instead of raw keys in GET requests
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    behavior_display = serializers.CharField(source='get_behavior_display', read_only=True)
    
    # Read-only field to cleanly show only the file name to the frontend
    document_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 
            'description', 
            'category', 
            'category_display', 
            'behavior', 
            'behavior_display', 
            'date', 
            'amount', 
            'reference', 
            'document', 
            'document_name',
            'created_at', 
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_document_name(self, obj):
        if obj.document:
            return os.path.basename(obj.document.name)
        return None

    def validate_reference(self, value):
        # Convert empty strings or spaces from frontend inputs into the clean pending flag
        if not value or str(value).strip() == "":
            return "PENDING_SORT"
        return value