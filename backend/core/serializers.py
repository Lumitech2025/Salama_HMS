from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Patient, Protocol, Treatment, ChemoSession, Drug, LabResult, Bill

User = get_user_model()

# --- 1. JWT CUSTOM AUTH SERIALIZER ---
class SalamaTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT Serializer for Salama HMS.
    Maps Vite/React fields (employeeID) to Django's internal username.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Use getattr to safely handle custom user roles or designations
        token['role'] = getattr(user, 'role', getattr(user, 'designation', 'STAFF'))
        token['username'] = user.username
        return token

    def validate(self, attrs):
        # FIELD MAPPING: Intercept 'employeeID' from the React login form
        data_input = self.context['request'].data
        attrs['username'] = data_input.get('employeeID', attrs.get('username'))
        attrs['password'] = data_input.get('securityCode', attrs.get('password'))

        data = super().validate(attrs)
        
        user_role = getattr(self.user, 'role', getattr(self.user, 'designation', 'STAFF'))
        if self.user.is_superuser and user_role == 'STAFF':
            user_role = 'ADMIN'

        data['role'] = user_role
        data['username'] = self.user.username
        data['name'] = self.user.get_full_name() or self.user.username
        return data

# --- 2. USER SERIALIZER ---
class UserSerializer(serializers.ModelSerializer):
    """Representation of hospital staff for assignments."""
    full_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email', 'role_display']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role_display(self, obj):
        return getattr(obj, 'role', getattr(obj, 'designation', 'STAFF'))

# --- 3. ONCOLOGY SPECIFIC SERIALIZERS ---
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
    sessions = ChemoSessionSerializer(many=True, read_only=True, source='sessions') # Corrected source name
    oncologist_name = serializers.CharField(source='oncologist.get_full_name', read_only=True)

    class Meta:
        model = Treatment
        fields = '__all__'

class PatientSerializer(serializers.ModelSerializer):
    """
    Enhanced Patient Serializer including the new Insurance and Phone fields.
    """
    treatments = TreatmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'registry_no', 'dob', 'gender', 'phone', # Added phone
            'blood_group', 'cancer_type', 'staging', 'ecog_status', 
            'biomarkers', 'insurance_type', 'insurance_no', # Added billing
            'emergency_contact', 'treatments', 'created_at'
        ]

# --- 4. SUPPORT SERVICES ---
class DrugSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drug
        fields = '__all__'

class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = '__all__'

class BillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = '__all__'