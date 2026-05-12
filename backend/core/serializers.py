from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Patient, Protocol, StockAdjustment, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign, Queue,
    LabInventoryItem, Prescription, PrescriptionItem, 
    ClinicalNote, ImagingRecord
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
        # Map custom frontend fields to standard Django fields
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
    patient_name = serializers.ReadOnlyField(source='patient.name')
    patient_id_no = serializers.ReadOnlyField(source='patient.registry_no')
    station_display = serializers.CharField(source='get_current_station_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    wait_time = serializers.ReadOnlyField() 

    class Meta:
        model = Queue
        fields = '__all__'

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
# 3. PHARMACY & DRUG INVENTORY (The Shop Logic)
# ─────────────────────────────────────────────────────────────────────────────
class DrugSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()
    # Ensure currency and decimals are handled correctly for the frontend
    selling_price_display = serializers.SerializerMethodField()

    class Meta:
        model = Drug
        fields = '__all__'

    def get_selling_price_display(self, obj):
        return f"Ksh {obj.selling_price_kes:,.2f}"

class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = ['id', 'medication_name', 'dosage', 'route', 'frequency', 'duration', 'instructions']

class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True) 
    patient_name = serializers.ReadOnlyField(source='patient.name')
    doctor_name = serializers.ReadOnlyField(source='prescribed_by.get_full_name')

    class Meta:
        model = Prescription
        fields = ['id', 'patient', 'patient_name', 'doctor_name', 'status', 'clinical_notes', 'items', 'created_at']

    def create(self, validated_data):
        """Allows posting multiple drugs at once from the Doctor portal"""
        items_data = validated_data.pop('items')
        prescription = Prescription.objects.create(**validated_data)
        for item_data in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **item_data)
        return prescription

# ─────────────────────────────────────────────────────────────────────────────
# 4. LONGITUDINAL EMR (Medical History)
# ─────────────────────────────────────────────────────────────────────────────
class ClinicalNoteSerializer(serializers.ModelSerializer):
    doctor_name = serializers.ReadOnlyField(source='doctor.get_full_name')
    
    class Meta:
        model = ClinicalNote
        fields = '__all__'

class ImagingRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagingRecord
        fields = '__all__'

class VitalSignSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    bmi_value = serializers.ReadOnlyField(source='bmi')
    bsa_value = serializers.ReadOnlyField(source='bsa')

    class Meta:
        model = VitalSign
        fields = '__all__'

# ─────────────────────────────────────────────────────────────────────────────
# 5. PATIENT REGISTRY & ANCILLARY
# ─────────────────────────────────────────────────────────────────────────────
class PatientSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(source='current_age', read_only=True)
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Patient
        fields = '__all__'

    def create(self, validated_data):
        # Handle virtual name fields from the registration form
        first = validated_data.pop('first_name', '')
        last = validated_data.pop('last_name', '')
        if not validated_data.get('name'):
            validated_data['name'] = f"{first} {last}".strip()
        
        patient = super().create(validated_data)
        # Automatic Triage Queue placement on registration
        Queue.objects.create(patient=patient, current_station='TRIAGE', status='WAITING')
        return patient

class LabResultSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='patient.name')
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
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