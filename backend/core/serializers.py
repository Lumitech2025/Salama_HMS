from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Patient, Protocol, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign, Queue
)
from datetime import date

User = get_user_model()

# --- 1. JWT CUSTOM AUTH SERIALIZER ---
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

# --- 2. USER SERIALIZER ---
class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'role']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

# --- 3. QUEUE & FLOW SERIALIZERS ---

class QueueSerializer(serializers.ModelSerializer):
    """
    Powers the Tier 3 Live Queue Monitor Table.
    Includes live-calculated wait_time from the model property.
    """
    patient_name = serializers.ReadOnlyField(source='patient.name')
    patient_id_no = serializers.ReadOnlyField(source='patient.registry_no')
    wait_time = serializers.ReadOnlyField() # Calls the @property in models.py
    station_display = serializers.CharField(source='get_current_station_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Queue
        fields = [
            'id', 'token_id', 'patient', 'patient_name', 'patient_id_no', 
            'appointment', 'current_station', 'station_display', 
            'status', 'status_display', 'priority', 'wait_time', 
            'entered_at', 'updated_at'
        ]

class VitalSignSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    bmi = serializers.ReadOnlyField()
    bsa = serializers.ReadOnlyField() 
    
    class Meta:
        model = VitalSign
        fields = [
            'id', 'patient', 'appointment', 'queue_entry', 'temperature', 
            'systolic_bp', 'diastolic_bp', 'heart_rate', 'respiratory_rate', 
            'weight', 'height', 'spo2', 'bmi', 'bsa', 'recorded_by', 
            'recorded_by_name', 'created_at'
        ]
        read_only_fields = ['recorded_by', 'bmi', 'bsa']

class AppointmentSerializer(serializers.ModelSerializer):
    practitioner_name = serializers.ReadOnlyField(source='practitioner.get_full_name') 
    practitioner_role = serializers.ReadOnlyField(source='practitioner.role')
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'appointment_date', 'appointment_time', 'patient', 
            'patient_name', 'manual_patient_name', 'practitioner', 
            'practitioner_name', 'practitioner_role', 
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
        fields = '__all__'

class TreatmentSerializer(serializers.ModelSerializer):
    protocol_details = ProtocolSerializer(source='protocol', read_only=True)
    sessions = ChemoSessionSerializer(many=True, read_only=True)
    oncologist_name = serializers.CharField(source='oncologist.get_full_name', read_only=True)
    class Meta:
        model = Treatment
        fields = '__all__'

class PatientSerializer(serializers.ModelSerializer):
    treatments = TreatmentSerializer(many=True, read_only=True)
    recent_vitals = serializers.SerializerMethodField()
    age = serializers.IntegerField(source='current_age', read_only=True)
    
    # Virtual fields for the Registration Desk
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    id_number = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'first_name', 'last_name', 'registry_no', 'id_number', 
            'dob', 'age', 'gender', 'phone', 'email', 'blood_group', 
            'cancer_type', 'staging', 'ecog_status', 'biomarkers', 
            'insurance_type', 'insurance_no', 'insurance_verified', 
            'benefit_balance', 'emergency_contact', 'treatments', 
            'recent_vitals', 'created_at'
        ]
        read_only_fields = ['created_at', 'age', 'registry_no']

    def validate_id_number(self, value):
        if value and Patient.objects.filter(registry_no=value.strip()).exists():
            raise serializers.ValidationError("National ID already registered in Salama HMS.")
        return value

    def get_recent_vitals(self, obj):
        latest = obj.vitals.order_by('-created_at').first()
        return VitalSignSerializer(latest).data if latest else None

    def create(self, validated_data):
        first = validated_data.pop('first_name', '').strip()
        last = validated_data.pop('last_name', '').strip()
        id_val = validated_data.pop('id_number', '').strip()
        if not validated_data.get('name'):
            validated_data['name'] = f"{first} {last}".strip()
        if id_val:
            validated_data['registry_no'] = id_val
        return super().create(validated_data)

# --- 5. SUPPORT SERVICES ---

class DrugSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()
    class Meta:
        model = Drug
        fields = '__all__'

class LabResultSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='patient.name')
    class Meta:
        model = LabResult
        fields = '__all__'

class BillSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    class Meta:
        model = Bill
        fields = '__all__'