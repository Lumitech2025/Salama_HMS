from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import date
import math
import random

from authentication.models import User

# --- Clinical Models ---

class Patient(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    BLOOD_GROUPS = [
        ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'), 
        ('O+', 'O+'), ('O-', 'O-'), ('AB+', 'AB+'), ('AB-', 'AB-')
    ]
    
    name = models.CharField(max_length=255, db_index=True) 
    registry_no = models.CharField(
        max_length=50, 
        unique=True, 
        verbose_name="ID Number",
        help_text="National ID or Passport Number"
    ) 
    dob = models.DateField(verbose_name="Date of Birth", null=True, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUPS, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True, null=True)
    
    # Oncology Specifics
    cancer_type = models.CharField(max_length=255, default="General")
    staging = models.CharField(max_length=50, blank=True)
    ecog_status = models.IntegerField(default=0, help_text="0-5 Performance Status") 
    biomarkers = models.TextField(blank=True, help_text="Relevant genetic or protein markers")
    
    # Billing & Insurance
    insurance_type = models.CharField(max_length=50, default="CASH") 
    insurance_no = models.CharField(max_length=100, blank=True)
    insurance_verified = models.BooleanField(default=False) 
    last_verification_date = models.DateTimeField(null=True, blank=True)
    benefit_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    emergency_contact = models.CharField(max_length=255, blank=True) 
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def current_age(self):
        if self.dob:
            today = date.today()
            return today.year - self.dob.year - ((today.month, today.day) < (self.dob.month, self.dob.day))
        return None

    def __str__(self):
        return f"{self.name} - ID: {self.registry_no}"

# --- Appointment & Triage Workflow ---

class Appointment(models.Model):
    VISIT_TYPE_CHOICES = [('NEW', 'New Visit'), ('SUBSEQUENT', 'Subsequent Visit')]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('CHECKED_IN', 'Checked-in'),
        ('WAITING_TRIAGE', 'Waiting Triage'), 
        ('TRIAGED', 'Triaged'),               
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, null=True, blank=True, related_name='appointments')
    manual_patient_name = models.CharField(max_length=255, blank=True, help_text="For preliminary registration")
    
    practitioner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role__in': ['ONCOLOGIST', 'SURGEON', 'HEMATOLOGIST', 'PSYCHOLOGIST', 'NURSE', 'LAB_TECH', 'RADIOLOGIST']},
        related_name='practitioner_appointments'
    )
    
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    visit_type = models.CharField(max_length=20, choices=VISIT_TYPE_CHOICES, default='NEW')
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        name = self.patient.name if self.patient else self.manual_patient_name
        return f"{name} - {self.appointment_date}"

# --- Queue Orchestration ---

class Queue(models.Model):
    STATION_CHOICES = [
        ('REGISTRATION', 'Registration'),
        ('TRIAGE', 'Triage Station'),
        ('DOCTOR', 'Consultation Room'),
        ('LAB', 'Laboratory'),
        ('RADIOLOGY', 'Radiology Room'),
        ('PSYCHOLOGY', 'Psychology Room'),
        ('PHARMACY', 'Pharmacy'),
        ('BILLING', 'Billing/Discharge'),
    ]

    STATUS_CHOICES = [
        ('WAITING', 'Waiting'), 
        ('UNDER_CONSULTATION', 'Under Consultation'), # For Doctor KPI
        ('AWAITING_MEDICATION', 'Awaiting Medication'), # For Pharmacist KPI
        ('COMPLETED', 'Completed')
    ]
    PRIORITY_CHOICES = [('NORMAL', 'Normal Priority'), ('HIGH', 'High Priority'), ('EMERGENCY', 'Emergency')]

    token_id = models.CharField(max_length=10, unique=True, editable=False)
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE)
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True)

    visit = models.OneToOneField('RegistrationRecord', on_delete=models.CASCADE, related_name='queue_ticket', null=True, blank=True)
       
    
    current_station = models.CharField(max_length=20, choices=STATION_CHOICES, default='TRIAGE')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='WAITING')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='NORMAL')
    
    entered_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.token_id:
            number = random.randint(100, 999)
            self.token_id = f"Q-{number}"
        super().save(*args, **kwargs)

    @property
    def wait_time(self):
        diff = timezone.now() - self.entered_at
        return int(diff.total_seconds() / 60)

    def __str__(self):
        return f"{self.token_id} - {self.patient.name}"
    


class VitalSign(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vitals')
    visit = models.ForeignKey('RegistrationRecord', on_delete=models.CASCADE, related_name='vitals', null=True)
    queue_entry = models.ForeignKey(Queue, on_delete=models.SET_NULL, null=True, blank=True)
    
    temperature = models.DecimalField(max_digits=4, decimal_places=1, help_text="°C")
    systolic_bp = models.PositiveIntegerField(help_text="mmHg")
    diastolic_bp = models.PositiveIntegerField(help_text="mmHg")
    heart_rate = models.PositiveIntegerField(help_text="bpm")
    respiratory_rate = models.PositiveIntegerField(blank=True, null=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, help_text="kg")
    height = models.DecimalField(max_digits=5, decimal_places=2, help_text="cm")
    spo2 = models.PositiveIntegerField(verbose_name="Oxygen Saturation %", blank=True, null=True)
    bmi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bsa = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def bmi(self):
        if self.weight and self.height:
            height_m = float(self.height) / 100
            return round(float(self.weight) / (height_m ** 2), 2)
        return 0.0

    @property
    def bsa(self):
        if self.weight and self.height:
            # Mosteller Formula: SQRT( (Height * Weight) / 3600 )
            bsa_value = math.sqrt((float(self.height) * float(self.weight)) / 3600)
            return round(bsa_value, 2)
        return 0.0

class Meta:
        # Crucial: Always get the latest recorded vitals first
        ordering = ['-created_at']

# --- Treatment & Protocol ---

class Protocol(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    total_cycles = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Treatment(models.Model):
    STATUS_CHOICES = [('ACTIVE', 'Active'), ('COMPLETED', 'Completed'), ('ON_HOLD', 'On Hold'), ('TERMINATED', 'Terminated')]
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='treatments')
    protocol = models.ForeignKey(Protocol, on_delete=models.SET_NULL, null=True)
    oncologist = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'ONCOLOGIST'})
    start_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

class ChemoSession(models.Model):
    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateTimeField(auto_now_add=True)
    cycle_no = models.IntegerField()
    administered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'NURSE'})
    pre_auth_code = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)


class ImagingRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    scan_type = models.CharField(max_length=50) # MRI, CT, XRAY
    image_url = models.URLField(blank=True) # Link to PACS or Cloud storage
    findings = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class Drug(models.Model):
    name = models.CharField(max_length=255)
    batch_no = models.CharField(max_length=100)
    stock_quantity = models.PositiveIntegerField()
    expiry_date = models.DateField(null=True) 
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.batch_no})"

    @property
    def is_expired(self):
        return date.today() >= self.expiry_date if self.expiry_date else False


class Bill(models.Model):
    bill_no = models.CharField(max_length=20, unique=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    appointment = models.ForeignKey('Appointment', on_delete=models.SET_NULL, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=50, default="CASH") 
    billing_officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'BILLING'})
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.bill_no:
            self.bill_no = f"SAL-{random.randint(10000, 99999)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bill_no} - {self.patient.name}"
    


class LabInventoryItem(models.Model):
    CATEGORY_CHOICES = [
        ('Chemicals', 'Chemicals'),
        ('Consumables', 'Consumables'),
        ('Reagents', 'Reagents'),
        ('Microscopy', 'Microscopy'),
    ]

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100, default="General")
    stock = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=5)  # Min. Threshold
    unit = models.CharField(max_length=50, default="Units")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class StockAdjustment(models.Model):
    item = models.ForeignKey(LabInventoryItem, on_delete=models.CASCADE, related_name='adjustments')
    technician = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True)
    quantity_used = models.IntegerField()
    remaining_stock = models.IntegerField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


    

class Prescription(models.Model):
    STATUS_CHOICES = [('PENDING', 'Pending'), ('DISPENSED', 'Dispensed'), ('CANCELLED', 'Cancelled')]
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    prescribed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    clinical_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(Prescription, related_name='items', on_delete=models.CASCADE)
    medication_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    route = models.CharField(max_length=100)     
    frequency = models.CharField(max_length=100) 
    duration = models.CharField(max_length=100)  
    instructions = models.TextField(blank=True)

class Drug(models.Model):
    STORE_CHOICES = [('main', 'Main Bulk Store'), ('pharmacy', 'Pharmacy Shop')]
    
    name = models.CharField(max_length=255)
    generic_name = models.CharField(max_length=255, blank=True)
    manufacturer = models.CharField(max_length=255, blank=True)
    batch_number = models.CharField(max_length=100)
    
    strength = models.CharField(max_length=100, help_text="e.g., 500mg, 10mg/ml")
    unit_type = models.CharField(max_length=50, default="vial", help_text="e.g., vial, tablet, bottle")
    
    quantity_in_stock = models.PositiveIntegerField(default=25)
    reorder_level = models.PositiveIntegerField(default=10, help_text="Minimum threshold before requisition")
    
    expiry_date = models.DateField(null=True) 
    selling_price_kes = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    store_location = models.CharField(max_length=20, choices=STORE_CHOICES, default='pharmacy')
    storage_requirements = models.TextField(blank=True, help_text="e.g., Refrigerate 2-8°C")
    is_hazardous = models.BooleanField(default=False, verbose_name="Cytotoxic/Hazardous")
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.batch_number}) - {self.store_location.upper()}"

    @property
    def is_expired(self):
        return date.today() >= self.expiry_date if self.expiry_date else False
    

class RegistrationRecord(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    id_number = models.CharField(max_length=20) 
    
    age = models.PositiveIntegerField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    insurance = models.CharField(max_length=100, default="CASH")
    insurance_number = models.CharField(max_length=100, blank=True, null=True)
    is_urgent = models.BooleanField(default=False)
    is_returning = models.BooleanField(default=False)

    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='registrations')
    
    queue_id = models.CharField(max_length=10, unique=True, editable=False)
    
    registered_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.queue_id:
            # Logic for Q001 sequence
            last_record = RegistrationRecord.objects.all().order_by('id').last()
            if not last_record:
                self.queue_id = "Q001"
            else:
                last_id = int(last_record.queue_id[1:])
                self.queue_id = f"Q{str(last_id + 1).zfill(3)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.queue_id} - {self.name}"

class ClinicalNote(models.Model):
    NOTE_TYPES = [
        ('TRIAGE', 'Triage Assessment'),
        ('ONCOLOGY', 'Oncology Consultation'),
        ('LAB_REPORT', 'Laboratory Summary'),
        ('PHARMACY', 'Pharmacist Notes'),
        ('GENERAL', 'General Progress Note'),
    ]

    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='clinical_notes')
    visit = models.ForeignKey('RegistrationRecord', on_delete=models.CASCADE, related_name='visit_notes', null=True)
    note_type = models.CharField(max_length=50, choices=NOTE_TYPES)
    content = models.TextField()
    # Changed 'doctor' to 'author' to include Nurses/Lab Techs/Pharmacists
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    
class LabResult(models.Model):
    TEST_CHOICES = [
        ('CBC', 'Full Blood Count (CBC)'),
        ('PSA', 'Prostate Specific Antigen (PSA)'),
        ('UE', 'Urea & Electrolytes (U&E)'),
        ('LFT', 'Liver Function Test (LFT)'),
        ('URINALYSIS', 'Urinalysis (Routine)'),
        ('BG_CROSS', 'Blood Group & Cross Match'),
        ('MALARIA_BS', 'Blood Slide for Malaria'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COLLECTED', 'Sample Collected'),
        ('COMPLETED', 'Result Ready'),
    ]

    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='lab_history')
    visit = models.ForeignKey('RegistrationRecord', on_delete=models.CASCADE, related_name='lab_orders', null=True)
    test_name = models.CharField(max_length=50, choices=TEST_CHOICES)
    
    # JSONField stores the specific breakdown (e.g., Color, pH, etc.)
    parameters = models.JSONField(default=dict, help_text="Structured results based on test type")
    
    # Global summary and critical flags
    technician_notes = models.TextField(blank=True, null=True)
    is_critical = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        limit_choices_to={'role': 'LAB_TECH'}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_test_name_display()} - {self.patient.name}"
    
