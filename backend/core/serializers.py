from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction
from .models import (
    Patient, Protocol, StockAdjustment, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign, Queue,
    LabInventoryItem, Prescription, PrescriptionItem, 
    ClinicalNote, ImagingRecord, RegistrationRecord, InventoryItem, PsychologyEnrollment, SessionLog, BereavementLog, 
    OutreachCampaign, ReferralPartner, SocialMediaPost, MarketingRequisition
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
    
    # Links the urgency flag and visit ID for the Triage Portal
    is_urgent = serializers.BooleanField(source='visit.is_urgent', read_only=True, default=False)
    
    class Meta:
        model = Queue
        fields = [
            'id', 'token_id', 'patient', 'patient_name', 'patient_id_no', 
            'current_station', 'status', 'priority', 'entered_at', 'wait_time',
            'is_urgent', 'visit_id','status_display', 'station_display'
        ]


        

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_registry_no = serializers.ReadOnlyField(source='patient.registry_no')
    practitioner_name = serializers.ReadOnlyField(source='practitioner.get_full_name') 
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'

    def get_patient_name(self, obj):
        return obj.patient.name if obj.patient else obj.manual_patient_name

# ─────────────────────────────────────────────────────────────────────────────
# 3. REGISTRATION & ANALYTICS (The Entry Point)
# ─────────────────────────────────────────────────────────────────────────────
class RegistrationRecordSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='patient.name', read_only=True)
    id_number = serializers.CharField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False)
    gender = serializers.CharField(write_only=True, required=False)
    age = serializers.IntegerField(write_only=True) 


    class Meta:
        model = RegistrationRecord
        fields = [
            'id', 'queue_id', 'name', 'patient', 'id_number', 'first_name', 
            'last_name', 'phone', 'gender', 'age', 'insurance', 
            'insurance_number', 'is_urgent', 'is_returning', 'registered_at'
        ]
        read_only_fields = ['patient', 'queue_id', 'registered_at']

    def create(self, validated_data):
        # 1. Extract details needed for the Master Patient Index
        id_num = validated_data.pop('id_number')
        f_name = validated_data.pop('first_name')
        l_name = validated_data.pop('last_name')
        phone = validated_data.pop('phone', '')
        gender = validated_data.pop('gender', 'M')
        
        # 2. Peek at the age but DON'T pop it yet so it remains for the RegistrationRecord
        patient_age = validated_data.get('age') 

        with transaction.atomic():
            # 3. Create/Update the Master Patient record
            patient, created = Patient.objects.update_or_create(
                registry_no=id_num,
                defaults={'name': f"{f_name} {l_name}".strip()}
            )

            # 4. Create the Visit Encounter
            # validated_data still contains 'age', so the NOT NULL constraint is satisfied
            registration = RegistrationRecord.objects.create(
                patient=patient, 
                id_number=id_num, # Store for history
                **validated_data
            )
            
            # 5. Push to Triage Queue
            Queue.objects.create(
                patient=patient,
                visit=registration,
                token_id=registration.queue_id,
                current_station='TRIAGE',
                status='WAITING',
                priority='HIGH' if registration.is_urgent else 'NORMAL'
            )
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
# 4. CLINICAL EMR (Vitals, Notes, etc.)
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
        # Automatically assign the logged-in user as the author
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
    # Simplified: No longer creates Queue entries here to prevent duplicates
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



## Counselling Psychologist serializer
class SessionLogSerializer(serializers.ModelSerializer):
    """Handles individual counseling encounter entries for HRO logs"""
    class Meta:
        model = SessionLog
        fields = ['id', 'enrollment', 'session_date', 'clinical_notes', 'is_synced_with_hro']
        read_only_fields = ['session_date']


class BereavementLogSerializer(serializers.ModelSerializer):
    """Handles tracking records for family and caregiver grief support workflows"""
    # Read-only convenience fields for frontend presentation display lists
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
    """The master case file serializer for oncology support enrollments"""
    # Embedded nested listings to pull related sessions and family tracking logs automatically
    sessions = SessionLogSerializer(many=True, read_only=True)
    bereavement_logs = BereavementLogSerializer(many=True, read_only=True)
    
    # Read-only utility text transformations for clean UI presentation mappings
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

class MarketingRequisitionSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    campaign_title = serializers.CharField(source='campaign.title', read_only=True)

    class Meta:
        model = MarketingRequisition
        fields = '__all__'