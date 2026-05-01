from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Patient, Protocol, Treatment, ChemoSession, Drug, LabResult, Bill

User = get_user_model()

# --- 1. JWT CUSTOM AUTH SERIALIZER ---
class SalamaTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT Serializer for Salama HMS.
    Maps frontend fields to Django's internal auth fields.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # "Stamp" user data into the encrypted token payload
        # Using getattr to support both 'role' and 'designation' fields safely
        token['role'] = getattr(user, 'role', getattr(user, 'designation', 'STAFF'))
        token['username'] = user.username
        return token

    def validate(self, attrs):
        # --- FIELD MAPPING FOR REACT FRONTEND ---
        # Intercept the 'employeeID' and 'securityCode' from Vite
        data_input = self.context['request'].data
        
        # Inject them into the expected Django 'username' and 'password' keys
        # This solves the "No active account found" error
        attrs['username'] = data_input.get('employeeID', attrs.get('username'))
        attrs['password'] = data_input.get('securityCode', attrs.get('password'))

        # Now run the standard validation
        data = super().validate(attrs)
        
        # Return plain-text info to the frontend for UI routing
        user_role = getattr(self.user, 'role', getattr(self.user, 'designation', 'STAFF'))
        
        # If it's a superuser, default to ADMIN if no role is set
        if self.user.is_superuser and user_role == 'STAFF':
            user_role = 'ADMIN'

        data['role'] = user_role
        data['username'] = self.user.username
        data['name'] = self.user.get_full_name() or self.user.username
        
        return data

# --- 2. USER SERIALIZER ---
class UserSerializer(serializers.ModelSerializer):
    """Clean representation of hospital staff."""
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
    # Relational details for the UI
    administered_by_details = UserSerializer(source='administered_by', read_only=True)
    
    class Meta:
        model = ChemoSession
        fields = '__all__'

class TreatmentSerializer(serializers.ModelSerializer):
    protocol_details = ProtocolSerializer(source='protocol', read_only=True)
    # Nested sessions for the timeline view
    sessions = ChemoSessionSerializer(many=True, read_only=True, source='chemosession_set')
    oncologist_name = serializers.CharField(source='oncologist.get_full_name', read_only=True)

    class Meta:
        model = Treatment
        fields = '__all__'

class PatientSerializer(serializers.ModelSerializer):
    # Full clinical history nested within the patient profile
    treatments = TreatmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'registry_no', 'dob', 'gender', 
            'cancer_type', 'staging', 'biomarkers', 'ecog_status', 
            'treatments', 'created_at'
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