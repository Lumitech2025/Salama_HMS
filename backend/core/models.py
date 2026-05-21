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

from django.db import models
from django.contrib.auth.models import User

# Add or modify this model in your models.py
class LabOrder(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
    ]

    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='lab_orders')
    
    # FIX: Pointing to 'RegistrationRecord' instead of 'Visit'
    visit = models.ForeignKey('RegistrationRecord', on_delete=models.CASCADE, related_name='requested_labs', null=True, blank=True)
    
    # This will hold what the doctor selected, e.g., ["CBC", "UE", "LFT"]
    requested_tests = models.JSONField(default=list, help_text="List of test codes requested by the doctor")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    doctor_notes = models.TextField(blank=True, null=True, help_text="Notes from the ordering clinician")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} for {self.patient.name} - {self.status}"


# 1. Create a dedicated table for your parent groups
class LabPanel(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name="Panel Name") # e.g., "Full Blood Count (CBC)"

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Lab Panel Group"
        verbose_name_plural = "Lab Panel Groups"


# 2. Update your registry model to reference it
class LabTestRegistry(models.Model):
    # Pass 'LabPanel' as the first positional argument
    parent_panel = models.ForeignKey(
        'LabPanel', 
        on_delete=models.PROTECT, # Stops someone from deleting a panel if tests are attached
        related_name='test_parameters',
        verbose_name="Main Panel Target"
    )
    name = models.CharField(max_length=255, verbose_name="Sub Test Parameter Name")
    unit = models.CharField(max_length=50, verbose_name="Accurate Unit Index")
    lower_range = models.FloatField(default=0.0, blank=True, null=True)
    upper_range = models.FloatField(default=0.0, blank=True, null=True)
    recommendation_below_minimum = models.TextField(blank=True, default="")
    recommendation_above_maximum = models.TextField(blank=True, default="")
    price = models.IntegerField(default=0, verbose_name="Base Cost Charge (KES)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Lab Reference Standard"
        verbose_name_plural = "Lab Reference Standards"

    def __str__(self):
        return f"{self.name} ({self.parent_panel.name})"    


class LabResult(models.Model):
    TEST_CHOICES = [
        ('CBC', 'Full Blood Count (CBC)'),
        ('PSA', 'Prostate Specific Antigen (PSA)'),
        ('UE', 'Urea, Electrolytes & Creatinine (U&E)'),
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
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    is_critical = models.BooleanField(default=False)
    technician_notes = models.TextField(blank=True, null=True)
    
    # --- 1. FULL BLOOD COUNT (CBC PANEL) METRICS ---
    cbc_hb = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="Hb (g/dL)")
    cbc_wbc = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="WBC (x10³/µL)")
    cbc_neut = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="Neut (x10³/µL)")
    cbc_plt = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True, verbose_name="Plt (x10³/µL)")
    cbc_mcv = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="MCV (fL)")

    # --- 2. UREA, ELECTROLYTES & CREATININE (U&E) ---
    ue_na = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="Na+ (mmol/L)")
    ue_k = models.DecimalField(max_digits=4, decimal_places=2, blank=True, null=True, verbose_name="K+ (mmol/L)")
    ue_urea = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="Urea (mmol/L)")
    ue_creatinine = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True, verbose_name="Cr (µmol/L)")

    # --- 3. LIVER FUNCTION PANEL (LFT) ---
    lft_alt = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="ALT (U/L)")
    lft_ast = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="AST (U/L)")
    lft_tbil = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="T.BIL (µmol/L)")
    lft_dbil = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="D.BIL (µmol/L)")
    lft_alp = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True, verbose_name="ALP (U/L)")
    lft_albumin = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="ALB (g/L)")

    # --- 4. ONCOLOGY SPECIFIC SERUM BIOMARKERS ---
    psa_total = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True, verbose_name="Total PSA (ng/mL)")

    # --- 5. ROUTINE URINALYSIS PROPERTIES ---
    urine_color = models.CharField(max_length=30, blank=True, null=True, choices=[('Straw', 'Straw'), ('Yellow', 'Yellow'), ('Amber', 'Amber'), ('Red', 'Red')])
    urine_clarity = models.CharField(max_length=30, blank=True, null=True, choices=[('Clear', 'Clear'), ('Cloudy', 'Cloudy'), ('Turbid', 'Turbid')])
    urine_glucose = models.CharField(max_length=20, blank=True, null=True, choices=[('Negative', 'Negative'), ('Trace', 'Trace'), ('1+', '1+'), ('2+', '2+'), ('3+', '3+'), ('4+', '4+')])
    urine_protein = models.CharField(max_length=20, blank=True, null=True, choices=[('Negative', 'Negative'), ('Trace', 'Trace'), ('1+', '1+'), ('2+', '2+'), ('3+', '3+')])
    urine_nitrites = models.CharField(max_length=20, blank=True, null=True, choices=[('Negative', 'Negative'), ('Positive', 'Positive')])
    urine_blood = models.CharField(max_length=20, blank=True, null=True, choices=[('Negative', 'Negative'), ('Positive', 'Positive')])

    # --- 6. HEMATOLOGICAL BLOOD TYPE CROSS MATCH ---
    bg_abo = models.CharField(max_length=5, blank=True, null=True, verbose_name="Blood Group", choices=[('A', 'A'), ('B', 'B'), ('AB', 'AB'), ('O', 'O')])
    bg_rhesus = models.CharField(max_length=15, blank=True, null=True, verbose_name="Rhesus Factor", choices=[('Positive', 'Positive (+)'), ('Negative', 'Negative (-)')])
    bg_compatibility = models.CharField(max_length=20, blank=True, null=True, verbose_name="Crossmatch", choices=[('Compatible', 'Compatible'), ('Incompatible', 'Incompatible')])

    # --- 7. INFECTIOUS PARASITOLOGY METRICS ---
    malaria_mps = models.CharField(max_length=20, blank=True, null=True, verbose_name="MPS Status", choices=[('Not Seen', 'Not Seen'), ('Positive', 'Positive (+)')])
    malaria_species = models.CharField(max_length=40, blank=True, null=True, verbose_name="Parasite Species", choices=[('P. falciparum', 'P. falciparum'), ('P. vivax', 'P. vivax'), ('N/A', 'N/A')])

    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'LAB_TECH'})
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_test_name_display()} - {self.patient.name}"
    

class LabReference(models.Model):
    name = models.CharField(max_length=255, verbose_name="Sub Test Parameter Name")
    category = models.CharField(max_length=255, verbose_name="Main Panel Target")
    unit = models.CharField(max_length=50, verbose_name="Accurate Unit Index")
    lower_range = models.FloatField(default=0.0, blank=True, null=True)
    upper_range = models.FloatField(default=0.0, blank=True, null=True)
    recommendation_below_minimum = models.TextField(blank=True, default="")
    recommendation_above_maximum = models.TextField(blank=True, default="")
    price = models.IntegerField(default=0, verbose_name="Base Cost Charge (KES)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Lab Reference Standard"
        verbose_name_plural = "Lab Reference Standards"

    def __str__(self):
        return f"{self.name} ({self.category})"
    
    
## Finance & Revenue Cycle Models

class Requisition(models.Model):
    DEPARTMENT_CHOICES = [
        ('LAB', 'Laboratory'),
        ('NURSING', 'Nursing'),
        ('PHARMACY', 'Pharmacy'),
        ('RADIOLOGY', 'Radiology'),
        ('MARKETING', 'Marketing'),
        ('ADMIN', 'General Admin'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('FULFILLED', 'Fulfilled'),
    ]

    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reason = models.TextField(help_text="Clinical or operational justification for the request")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_viewed_by_finance = models.BooleanField(default=False) # For the notification badge

    def __str__(self):
        return f"REQ-{self.id} ({self.department})"

class RequisitionItem(models.Model):
    requisition = models.ForeignKey(Requisition, related_name='items', on_delete=models.CASCADE)
    # Linking to inventory to pull the latest buying_price
    item = models.ForeignKey('LabInventoryItem', on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    # This captures the cost at the moment of request
    line_total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        # Automatically calculate cost based on current inventory price
        self.line_total = self.item.buying_price * self.quantity
        super().save(*args, **kwargs)
        # Update the parent requisition total
        self.requisition.total_cost = sum(item.line_total for item in self.requisition.items.all())
        self.requisition.save()


# --- 1. SUPPLIER & VENDOR MANAGEMENT ---
class Supplier(models.Model):
    CATEGORY_CHOICES = [
        ('PHARMA', 'Pharmaceuticals & Oncology Drugs'),
        ('LAB', 'Laboratory Reagents'),
        ('SURGICAL', 'Surgical & Medical Consumables'),
        ('GENERAL', 'General Supplies & Services'),
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='PHARMA')
    contact_person = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    tin_number = models.CharField(max_length=50, blank=True, help_text="Tax ID Number")
    
    # Banking (Crucial for Dorcas to process payments)
    bank_name = models.CharField(max_length=100, blank=True)
    account_name = models.CharField(max_length=255, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    branch_code = models.CharField(max_length=20, blank=True)
    swift_code = models.CharField(max_length=20, blank=True)

    # Contract & Terms
    contract_document = models.FileField(upload_to='supplier_contracts/', null=True, blank=True)
    contract_start = models.DateField(null=True, blank=True)
    contract_end = models.DateField(null=True, blank=True)
    payment_terms = models.CharField(max_length=100, default="Net 30") 
    performance_rating = models.IntegerField(default=5, help_text="1 to 5 stars")
    
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.category})"

# --- 2. PROCUREMENT (PO -> INVOICE -> STOCK) ---

class PurchaseOrder(models.Model):
    PO_STATUS = [
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent to Vendor'),
        ('PARTIAL', 'Partially Received'),
        ('CLOSED', 'Closed/Fulfilled'),
        ('CANCELLED', 'Cancelled'),
    ]
    po_number = models.CharField(max_length=50, unique=True, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    issue_date = models.DateField(auto_now_add=True)
    delivery_deadline = models.DateField()
    status = models.CharField(max_length=20, choices=PO_STATUS, default='DRAFT')
    total_estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    linked_requisitions = models.ManyToManyField('Requisition', blank=True)

    def save(self, *args, **kwargs):
        if not self.po_number:
            count = PurchaseOrder.objects.count() + 1
            self.po_number = f"SALAMA-PO-{timezone.now().year}-{count:04d}"
        super().save(*args, **kwargs)

class PurchaseInvoice(models.Model):
    """The formal bill sent by the Supplier after delivery"""
    invoice_number = models.CharField(max_length=100, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    purchase_order = models.OneToOneField(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True)
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    due_date = models.DateField()
    is_fully_paid = models.BooleanField(default=False)
    
    # The Physical Scan of the Invoice
    invoice_file = models.FileField(upload_to='invoices/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"INV-{self.invoice_number} ({self.supplier.name})"

class MainStoreBatch(models.Model):
    item = models.ForeignKey('LabInventoryItem', on_delete=models.CASCADE, related_name='batches')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True)
    invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.SET_NULL, null=True, related_name='batches')
    
    batch_number = models.CharField(max_length=100, unique=True)
    grn_number = models.CharField(max_length=50, unique=True, help_text="Goods Received Note")
    
    quantity_received = models.PositiveIntegerField()
    current_quantity = models.PositiveIntegerField()
    buying_price = models.DecimalField(max_digits=12, decimal_places=2)
    
    expiry_date = models.DateField()
    received_at = models.DateTimeField(auto_now_add=True)

    @property
    def valuation(self):
        return self.current_quantity * self.buying_price


class InsuranceCompany(models.Model):
    """
    Main registry for Insurance Providers (Payers).
    """
    name = models.CharField(max_length=255, unique=True)
    contact_person = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    portal_link = models.URLField(
        blank=True, 
        help_text="Link to the insurer's online claims submission portal"
    )
    
    # Financial Aggregates for the KPI Cards
    total_billed = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_remitted = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def aging_debt(self):
        """Calculates money still sitting with this insurer."""
        return self.total_billed - self.total_remitted

    def __str__(self):
        return self.name


class InsuranceClaim(models.Model):
    """
    Individual treatment claims submitted for payment.
    """
    CLAIM_STATUS = [
        ('DRAFT', 'Drafting'),
        ('SUBMITTED', 'Submitted to Payer'),
        ('ADJUDICATION', 'Under Review/In Process'),
        ('DISPUTED', 'Disputed/Rejected'),
        ('REMITTED', 'Paid/Remitted'),
    ]
    
    insurance_company = models.ForeignKey(InsuranceCompany, on_delete=models.CASCADE)
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE)
    
    # Oncology specific tracking
    claim_number = models.CharField(max_length=100, unique=True)
    pre_auth_code = models.CharField(
        max_length=100, 
        help_text="The code provided by the insurer before the chemo/radio cycle started"
    )
    
    # Money
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0.00, 
        help_text="Amount actually remitted by the insurer"
    )
    
    date_submitted = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=CLAIM_STATUS, default='DRAFT')
    
    # Conflict resolution
    rejection_reason = models.TextField(blank=True, help_text="Notes from the insurer if rejected")
    reconciled_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"CLAIM-{self.claim_number} ({self.patient.name})"


class RemittanceBatch(models.Model):
    """
    Container for bulk payments received from insurers.
    """
    insurance_company = models.ForeignKey(InsuranceCompany, on_delete=models.CASCADE)
    payment_reference = models.CharField(
        max_length=100, 
        unique=True, 
        help_text="EFT Number, Cheque No, or Bank Transfer ID"
    )
    total_amount_received = models.DecimalField(max_digits=15, decimal_places=2)
    date_received = models.DateField()
    
    # The formal document upload
    remittance_file = models.FileField(
        upload_to='remittances/', 
        null=True, 
        blank=True, 
        help_text="Upload the PDF/Excel advice provided by the insurer"
    )
    
    # Meta
    reconciled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Remittance Batches"

    def __str__(self):
        return f"REMIT-{self.payment_reference} ({self.insurance_company.name})"
    

class InventoryItem(models.Model):
    DEPARTMENT_CHOICES = [
        ('PHARMACY', 'Pharmacy'),
        ('LAB', 'Laboratory'),
        ('NURSING', 'Nursing'),
        ('RADIOLOGY', 'Radiology'),
        ('ADMIN', 'General Admin'),
    ]

    name = models.CharField(max_length=255)
    quantity_available = models.IntegerField(default=0)
    cost_per_unit = models.DecimalField(max_digits=12, decimal_places=2)
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES)
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField(null=True, blank=True) # Optional
    
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.batch_number}"
    
class PsychologyEnrollment(models.Model):
    STAGE_CHOICES = [
        ('DENIAL', 'Denial & Shock'),
        ('ANGER', 'Anger & Resistance'),
        ('BARGAINING', 'Bargaining Process'),
        ('DEPRESSION', 'Depression'),
        ('ACCEPTANCE', 'Acceptance & Compliance'),
    ]
    
    STATUS_CHOICES = [
        ('IN_THERAPY', 'In Therapy'),
        ('BAD_NEWS_DEBRIEF', 'Bad News Debrief'),
        ('SUPPORT_GROUP', 'Support Group'),
        ('LOST_TO_FOLLOW_UP', 'Lost to Follow Up'),
        ('CASE_CLOSED', 'Case Closed'),
    ]

    DEPARTMENT_CHOICES = [
        ('CHEMO_SUITE', 'Chemo Suite'),
        ('PHARMACY_REFILL', 'Pharmacy Refill'),
        ('RADIOLOGY_REF', 'Radiology Reference'),
        ('LABORATORY', 'Laboratory'),
        ('WARDS', 'In-Patient Wards'),
    ]

    # Links directly to your central medical records/patient system
    patient_name = models.CharField(max_length=255)
    medical_record_no = models.CharField(max_length=100, unique=True)
    diagnosis = models.CharField(max_length=255)
    
    # Clinical tracking states
    current_stage = models.CharField(max_length=50, choices=STAGE_CHOICES, default='DENIAL')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='IN_THERAPY')
    location_department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES, default='CHEMO_SUITE')
    
    # Pre-requisite checklist from your handwritten notes
    consent_form_signed = models.BooleanField(default=False)
    initial_intake_note = models.TextField(blank=True, null=True)
    
    # Administrative tracking fields
    enrolled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.patient_name} ({self.medical_record_no})"


class SessionLog(models.Model):
    """Tracks individual clinical consult iterations for the HRO Daily Sync"""
    enrollment = models.ForeignKey(PsychologyEnrollment, on_delete=models.CASCADE, related_name='sessions')
    session_date = models.DateField(auto_now_add=True)
    clinical_notes = models.TextField()
    is_synced_with_hro = models.BooleanField(default=False)  # Tracks your HRO Registry requirement

    def __str__(self):
        return f"Session for {self.enrollment.patient_name} on {self.session_date}"


class BereavementLog(models.Model):
    """Manages tracking details for Caregivers following palliative changes or patient demises"""
    STATUS_CHOICES = [
        ('ACTIVE_GRIEF', 'Active Grief Work'),
        ('BEREAVEMENT', 'Bereavement Support'),
        ('PALLIATIVE_RECONCILIATION', 'Palliative Reconciliation'),
        ('MONITORING_CLOSED', 'Monitoring Closed'),
    ]

    enrollment = models.ForeignKey(PsychologyEnrollment, on_delete=models.SET_NULL, null=True, blank=True)
    primary_contact_name = models.CharField(max_length=255)  # e.g., Grace Kamau (Spouse)
    contact_phone = models.CharField(max_length=50)
    
    support_status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='ACTIVE_GRIEF')
    total_sessions_conducted = models.IntegerField(default=0)
    last_contact_date = models.DateField(auto_now=True)

    def __str__(self):
        return f"Grief Support: {self.primary_contact_name}"
    

## Marketing & Outreach Models

class OutreachCampaign(models.Model):
    CAMPAIGN_TYPE_CHOICES = [
        ('SCREENING_CAMP', 'Screening Camp'),
        ('COMMUNITY_BARAZA', 'Community Baraza'),
        ('MEDIA_DRIVE', 'Media Drive'),
        ('DIGITAL_OUTREACH', 'Digital Outreach'),
    ]

    STATUS_CHOICES = [
        ('PLANNING', 'Planning'),
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
    ]

    title = models.CharField(max_length=255)
    campaign_type = models.CharField(max_length=40, choices=CAMPAIGN_TYPE_CHOICES, default='SCREENING_CAMP')
    target_region_location = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    allocated_budget = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    actual_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    estimated_attendance = models.PositiveIntegerField(default=0)
    actual_turnout = models.PositiveIntegerField(default=0)
    patients_referred_to_salama = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNING')
    notes_summary = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.target_region_location})"


class ReferralPartner(models.Model):
    PARTNER_TYPE_CHOICES = [
        ('PRIVATE_CLINIC', 'Private Medical Practitioner / Clinic'),
        ('COUNTY_HOSPITAL', 'County Referral Hospital Unit'),
        ('CHV_NETWORK', 'Community Health Volunteer Network'),
        ('ALUMNI_PATIENT', 'Patient Advocate / Survivor'),
    ]

    facility_or_doctor_name = models.CharField(max_length=255)
    partner_type = models.CharField(max_length=40, choices=PARTNER_TYPE_CHOICES, default='PRIVATE_CLINIC')
    contact_phone = models.CharField(max_length=50)
    email_address = models.EmailField(blank=True, null=True)
    location_base = models.CharField(max_length=255)
    total_patients_referred = models.PositiveIntegerField(default=0)
    is_active_engagement = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.facility_or_doctor_name


class SocialMediaPost(models.Model):
    PLATFORM_CHOICES = [
        ('FACEBOOK', 'Facebook Page'),
        ('INSTAGRAM', 'Instagram Business'),
        ('VERNACULAR_RADIO', 'Vernacular Radio Log'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('AWAITING_APPROVAL', 'Awaiting Approval'),
        ('SCHEDULED', 'Scheduled'),
        ('DISPATCHED', 'Dispatched'),
    ]

    content = models.TextField()
    target_platform = models.CharField(max_length=30, choices=PLATFORM_CHOICES, default='FACEBOOK')
    schedule_date = models.DateField(blank=True, null=True)
    schedule_time = models.TimeField(blank=True, null=True)
    consent_verified = models.BooleanField(default=False)
    medical_signoff = models.BooleanField(default=False)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='DRAFT')
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.target_platform} Post - {self.status} ({self.created_at.date()})"
    

class MarketingRequisition(models.Model):
    CATEGORY_CHOICES = [
        ('POSTERS_PRINTING', 'Posters & Printing Materials'),
        ('SOCIAL_ADS', 'Social Media Advertising (Meta/Google)'),
        ('LOGISTICS_TRAVEL', 'Field Transport & Fuel Logistics'),
        ('MEDIA_AIRTIME', 'Radio Airtime & PR Sponsorships'),
        ('MISC_SUPPLIES', 'Miscellaneous Camp Supplies'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Awaiting Finance Review'),
        ('APPROVED', 'Funds Disbursed'),
        ('REJECTED', 'Requisition Declined'),
    ]

    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    campaign = models.ForeignKey(
        OutreachCampaign, 
        on_delete=models.CASCADE, 
        related_name='requisitions',
        help_text="Link this budget request to an active outreach program line"
    )
    requested_amount = models.DecimalField(max_digits=12, decimal_places=2)
    justification_notes = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - KES {self.requested_amount} ({self.status})"
    

class ProtocolMaster(models.Model):
    """
    Step 1 & Step 2: Main Protocol Archetype Blueprint
    """
    CANCER_TYPE_CHOICES = [
        ('Breast Cancer', 'Breast Cancer'),
        ('Colorectal Cancer', 'Colorectal Cancer'),
        ('Prostate Cancer', 'Prostate Cancer'),
        ('Lung Cancer', 'Lung Cancer'),
    ]

    protocol_name = models.CharField(max_length=100, unique=True, help_text="e.g., FOLFOX6, AC-T")
    cancer_type = models.CharField(max_length=100, choices=CANCER_TYPE_CHOICES)
    
    # Storing arrays cleanly as JSON fields to preserve flexible tagging
    stages = models.JSONField(default=list, help_text="e.g., ['Stage III', 'Stage IV']")
    biomarkers = models.JSONField(default=list, help_text="e.g., ['KRAS Wild-Type', 'HER2 Negative']")
    
    clinical_signs = models.TextField(blank=True, null=True, help_text="Warnings/Nadir notes for clinicians")
    total_cycles = models.PositiveIntegerField(default=6)
    days_per_cycle = models.PositiveIntegerField(default=14)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.protocol_name} - {self.cancer_type}"


class ProtocolDrug(models.Model):
    """
    Step 2: Individual Medication Payload Streams attached to a Protocol
    """
    UNIT_CHOICES = [
        ('mg/m²', 'mg/m²'),
        ('mg/kg', 'mg/kg'),
        ('AUC', 'Target AUC'),
        ('mg (Fixed)', 'mg (Fixed)'),
    ]
    ROUTE_CHOICES = [
        ('IV Infusion', 'Intravenous Infusion'),
        ('IV Push', 'IV Push'),
        ('PO (Oral)', 'PO (Oral Pill)'),
    ]

    protocol = models.ForeignKey(ProtocolMaster, on_delete=models.CASCADE, related_name='drugs')
    drug_name = models.CharField(max_length=150, help_text="e.g., Oxaliplatin, Doxorubicin")
    base_dose = models.DecimalField(max_length=10, decimal_places=2, max_digits=10)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='mg/m²')
    route = models.CharField(max_length=50, choices=ROUTE_CHOICES, default='IV Infusion')
    administration_day = models.CharField(max_length=50, default='Day 1', help_text="e.g., Day 1, Days 1-2")

    def __str__(self):
        return f"{self.drug_name} ({self.base_dose} {self.unit}) inside {self.protocol.protocol_name}"


class DrugGuardrail(models.Model):
    """
    Step 3: Infinite Chained Decision Rules mapped to a single medication profile
    """
    PARAMETER_CHOICES = [
        ('CrCl (Renal)', 'CrCl (Renal Function)'),
        ('Total Bilirubin', 'Total Bilirubin (Hepatic)'),
        ('ANC (Neutrophils)', 'ANC (Absolute Neutrophils)'),
        ('Platelets', 'Platelets (Hematological)'),
    ]
    OPERATOR_CHOICES = [
        ('<', '<'),
        ('<=', '<='),
        ('>', '>'),
        ('>=', '>='),
    ]
    ACTION_CHOICES = [
        ('REDUCE_PCT', 'Reduce Dosage By'),
        ('BLOCK', 'BLOCK REGIMEN / HALT'),
    ]

    drug = models.ForeignKey(ProtocolDrug, on_delete=models.CASCADE, related_name='rules')
    parameter = models.CharField(max_length=50, choices=PARAMETER_CHOICES)
    operator = models.CharField(max_length=5, choices=OPERATOR_CHOICES)
    value = models.CharField(max_length=20, help_text="Laboratory limit threshold numerical limit value")
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, default='REDUCE_PCT')
    action_value = models.PositiveIntegerField(blank=True, null=True, help_text="Percentage to drop if action is REDUCE_PCT")

    def __str__(self):
        action_phrase = f"Drop {self.action_value}%" if self.action == 'REDUCE_PCT' else "HALT"
        return f"Rule for {self.drug.drug_name}: IF {self.parameter} {self.operator} {self.value} ➔ {action_phrase}"