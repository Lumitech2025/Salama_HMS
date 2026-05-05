from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Patient, Protocol, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign
)

User = get_user_model()

# --- 1. JWT CUSTOM AUTH SERIALIZER ---
class SalamaTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Maps React 'employeeID' to Django's internal username."""
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
        fields = ['id', 'username', 'full_name', 'role_display']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role_display(self, obj):
        return getattr(obj, 'role', 'STAFF')

# --- 3. TRIAGE & APPOINTMENT SERIALIZERS ---

class VitalSignSerializer(serializers.ModelSerializer):
    """Captured during Triage; essential for oncology dosage calculations."""
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model = VitalSign
        fields = '__all__'
        read_only_fields = ['recorded_by']

class AppointmentSerializer(serializers.ModelSerializer):
    """Powers the AppointmentCalendar.jsx with dynamic name resolution."""
    patient_name = serializers.SerializerMethodField()
    practitioner_details = UserSerializer(source='practitioner', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'

    def get_patient_name(self, obj):
        # Logic: If it's a registered patient, use the database name. 
        # Otherwise, use the manual name entered by the receptionist.
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
    Finalized for Front-End Verification & Clinical Review.
    Includes the recent vitals and treatment history.
    """
    treatments = TreatmentSerializer(many=True, read_only=True)
    recent_vitals = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'registry_no', 'dob', 'gender', 'phone', 
            'blood_group', 'cancer_type', 'staging', 'ecog_status', 
            'biomarkers', 'insurance_type', 'insurance_no', 
            'insurance_verified', 'last_verification_date', 'benefit_balance',
            'emergency_contact', 'treatments', 'recent_vitals', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_recent_vitals(self, obj):
        # Fetch only the latest triage data for the patient
        latest = obj.vitals.order_by('-created_at').first()
        if latest:
            return VitalSignSerializer(latest).data
        return None

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