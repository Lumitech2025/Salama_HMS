from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Patient, Protocol, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign, Queue
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
        # Support for custom login field names (employeeID/securityCode)
        attrs['username'] = data_input.get('employeeID', attrs.get('username'))
        attrs['password'] = data_input.get('securityCode', attrs.get('password'))
        
        data = super().validate(attrs)
        data['role'] = getattr(self.user, 'role', 'STAFF')
        data['name'] = self.user.get_full_name() or self.user.username
        return data

# ─────────────────────────────────────────────────────────────────────────────
# 2. QUEUE ORCHESTRATION SERIALIZER (Powers Table 1)
# ─────────────────────────────────────────────────────────────────────────────
class QueueSerializer(serializers.ModelSerializer):
    # Extracts the Name from the related Patient model
    patient_name = serializers.ReadOnlyField(source='patient.name')
    # Extracts the ID Number (registry_no) for the table
    patient_id_no = serializers.ReadOnlyField(source='patient.registry_no')
    
    # Human-readable labels for choices
    station_display = serializers.CharField(source='get_current_station_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    # Model property for elapsed time
    wait_time = serializers.ReadOnlyField() 

    class Meta:
        model = Queue
        fields = [
            'id', 'token_id', 'patient', 'patient_name', 'patient_id_no',
            'appointment', 'current_station', 'station_display', 
            'status', 'status_display', 'priority', 'priority_display',
            'wait_time', 'entered_at'
        ]

# ─────────────────────────────────────────────────────────────────────────────
# 3. APPOINTMENT SERIALIZER (Powers Table 2)
# ─────────────────────────────────────────────────────────────────────────────
class AppointmentSerializer(serializers.ModelSerializer):
    # Logic to handle both linked patients and manual names (pre-registration)
    patient_name = serializers.SerializerMethodField()
    patient_registry_no = serializers.ReadOnlyField(source='patient.registry_no')
    
    # Practitioner Details
    practitioner_name = serializers.ReadOnlyField(source='practitioner.get_full_name') 
    practitioner_role = serializers.ReadOnlyField(source='practitioner.role')
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'appointment_date', 'appointment_time', 'patient', 
            'patient_name', 'patient_registry_no', 'manual_patient_name', 
            'practitioner', 'practitioner_name', 'practitioner_role', 
            'reason', 'status', 'status_display', 'visit_type'
        ]

    def get_patient_name(self, obj):
        if obj.patient:
            return obj.patient.name
        return obj.manual_patient_name

# ─────────────────────────────────────────────────────────────────────────────
# 4. PATIENT REGISTRY SERIALIZER
# ─────────────────────────────────────────────────────────────────────────────
class PatientSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(source='current_age', read_only=True)
    
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    id_number = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'first_name', 'last_name', 'registry_no', 'id_number', 
            'dob', 'age', 'gender', 'phone', 'email', 'blood_group', 
            'cancer_type', 'staging', 'insurance_type', 'insurance_no', 
            'emergency_contact', 'created_at'
        ]
        read_only_fields = ['created_at', 'age']
        extra_kwargs = {
            'name': {'required': False},
            'registry_no': {'required': False}
        }

    def create(self, validated_data):
        # 1. Extract virtual fields
        first = validated_data.pop('first_name', '')
        last = validated_data.pop('last_name', '')
        id_val = validated_data.pop('id_number', '')
        
        # 2. Map names and registry number
        if not validated_data.get('name'):
            validated_data['name'] = f"{first} {last}".strip()
        if id_val:
            validated_data['registry_no'] = id_val
            
        # 3. Create the actual patient record
        patient = super().create(validated_data)

        # 4. 🚀 AUTO-QUEUE LOGIC
        # Ensure the Queue entry is linked to the new patient
        Queue.objects.create(
            patient=patient,
            current_station='TRIAGE',
            status='WAITING',
            priority='NORMAL'
        )
        
        return patient
# ─────────────────────────────────────────────────────────────────────────────
# 5. CLINICAL & ANCILLARY SERIALIZERS
# ─────────────────────────────────────────────────────────────────────────────
class VitalSignSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    appointment = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.objects.all(), 
        required=False, 
        allow_null=True
    )

    class Meta:
        model = VitalSign
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

class DrugSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()
    class Meta:
        model = Drug
        fields = '__all__'

class LabResultSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='patient.name')
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    class Meta:
        model = LabResult
        fields = '__all__'

class BillSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='patient.name')
    bill_date = serializers.DateTimeField(source='created_at', read_only=True)
    class Meta:
        model = Bill
        fields = '__all__'