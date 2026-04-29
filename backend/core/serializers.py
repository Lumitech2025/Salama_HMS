from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Patient, Protocol, Treatment, ChemoSession, Drug, LabResult, Bill

# --- User Serializer (For Staff tracking) ---
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

# --- Oncology Specific Serializers ---
class ProtocolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Protocol
        fields = '__all__'

class ChemoSessionSerializer(serializers.ModelSerializer):
    nurse_details = UserSerializer(source='nurse', read_only=True)
    
    class Meta:
        model = ChemoSession
        fields = '__all__'

class TreatmentSerializer(serializers.ModelSerializer):
    protocol_details = ProtocolSerializer(source='protocol', read_only=True)
    sessions = ChemoSessionSerializer(many=True, read_only=True, source='chemosession_set')

    class Meta:
        model = Treatment
        fields = '__all__'

# --- The Main Patient Serializer ---
class PatientSerializer(serializers.ModelSerializer):
    # This allows the frontend to see the full treatment history inside the patient object
    treatments = TreatmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'registry_no', 'dob', 'gender', 
            'cancer_type', 'staging', 'biomarkers', 'ecog_status', 
            'treatments', 'created_at'
        ]

# --- Support Serializers ---
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