from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Patient, Protocol, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign
)
from datetime import date

User = get_user_model()

# --- 1. JWT CUSTOM AUTH SERIALIZER ---
class SalamaTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Maps React 'employeeID' to Django's internal username and includes role."""
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
        user_role = getattr(self.user, 'role', 'STAFF')
        
        data['role'] = user_role
        data['name'] = self.user.get_full_name() or self.user.username
        return data

# --- 2. USER SERIALIZER ---
class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'role_display', 'role']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role_display(self, obj):
        return getattr(obj, 'role', 'STAFF')

# --- 3. TRIAGE & APPOINTMENT SERIALIZERS ---

class VitalSignSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    bmi = serializers.ReadOnlyField()
    bsa = serializers.ReadOnlyField() 
    
    class Meta:
        model = VitalSign
        fields = [
            'id', 'patient', 'appointment', 'temperature', 'systolic_bp', 
            'diastolic_bp', 'heart_rate', 'respiratory_rate', 'weight', 
            'height', 'spo2', 'bmi', 'bsa', 'recorded_by', 'recorded_by_name', 'created_at'
        ]
        read_only_fields = ['recorded_by', 'bmi', 'bsa']

class AppointmentSerializer(serializers.ModelSerializer):
    practitioner_name = serializers.ReadOnlyField(source='practitioner.get_full_name') 
    practitioner_role = serializers.ReadOnlyField(source='practitioner.role')
    patient_name = serializers.SerializerMethodField()
    practitioner_details = UserSerializer(source='practitioner', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'appointment_date', 'appointment_time', 'patient', 
            'patient_name', 'manual_patient_name', 'practitioner', 
            'practitioner_name', 'practitioner_role', 'practitioner_details', 
            'reason', 'status', 'visit_type'
        ]

    def get_patient_name(self, obj):
        if obj.patient:
            return obj.patient.name
        return obj.manual_patient_name

# --- 4. ONCOLOGY SPECIFIC SERIALIZERS ---

class ProtocolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Protocol
        fields = '__all__'

class ChemoSessionSerializer(serializers.ModelSerializer):
    administered_by_details = UserSerializer(source='administered_by', read_only=True)
    
    class Meta:
        model = ChemoSession
        fields = ['id', 'treatment', 'date', 'cycle_no', 'administered_by', 'administered_by_details', 'pre_auth_code', 'notes']
        read_only_fields = ['administered_by']

class TreatmentSerializer(serializers.ModelSerializer):
    protocol_details = ProtocolSerializer(source='protocol', read_only=True)
    sessions = ChemoSessionSerializer(many=True, read_only=True)
    oncologist_name = serializers.CharField(source='oncologist.get_full_name', read_only=True)

    class Meta:
        model = Treatment
        fields = '__all__'

class PatientSerializer(serializers.ModelSerializer):
    """
    Enhanced Registry Serializer.
    Fixes the UNIQUE constraint issue by validating id_number early.
    """
    treatments = TreatmentSerializer(many=True, read_only=True)
    recent_vitals = serializers.SerializerMethodField()
    age = serializers.IntegerField(source='current_age', read_only=True)
    
    # Virtual fields to catch frontend data
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    id_number = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'first_name', 'last_name', 'registry_no', 'id_number', 
            'dob', 'age', 'gender', 'phone', 'email',
            'blood_group', 'cancer_type', 'staging', 'ecog_status', 
            'biomarkers', 'insurance_type', 'insurance_no', 
            'insurance_verified', 'last_verification_date', 'benefit_balance',
            'emergency_contact', 'treatments', 'recent_vitals', 'created_at'
        ]
        read_only_fields = ['created_at', 'age', 'registry_no']

    def validate_id_number(self, value):
        """
        Validate that the ID/Passport number isn't already in use 
        as a registry_no.
        """
        if value:
            clean_id = value.strip()
            if value and Patient.objects.filter(registry_no=value).exists():
                raise serializers.ValidationError(
                    "A patient with this Registry/ID number already exists in the system."
                )
        return value

    def get_recent_vitals(self, obj):
        latest = obj.vitals.order_by('-created_at').first()
        if latest:
            return VitalSignSerializer(latest).data
        return None

    def create(self, validated_data):
        first = validated_data.pop('first_name', '').strip()
        last = validated_data.pop('last_name', '').strip()
        id_val = validated_data.pop('id_number', '').strip()
        
            
        return super().create(validated_data)

        # Construction of the full name
        if not validated_data.get('name'):
            validated_data['name'] = f"{first} {last}".strip()
        
        # Handle Registry Number assignment
        if id_val:
            validated_data['registry_no'] = id_val
        
        # If id_val is empty, we omit it so that the database 
        # doesn't try to save an empty string which triggers the unique constraint.
        return super().create(validated_data)

# --- 5. SUPPORT SERVICES ---

class DrugSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drug
        fields = '__all__'

class LabResultSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    class Meta:
        model = LabResult
        fields = '__all__'

class BillSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    
    class Meta:
        model = Bill
        fields = '__all__'