from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import date
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import models
from django.contrib.postgres.fields import ArrayField 
from datetime import datetime

import math
import random
import datetime

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

class RegistrationRecord(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    PAYMENT_MODE_CHOICES = [('CASH', 'Cash'), ('INSURANCE', 'Insurance')]
    
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    id_number = models.CharField(max_length=20) 
    
    age = models.PositiveIntegerField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    
    payment_mode = models.CharField(max_length=15, choices=PAYMENT_MODE_CHOICES, default="CASH")
    
    insurance_company = models.ForeignKey(
        'InsuranceCompany', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='registrations'
    )
    insurance_number = models.CharField(max_length=100, blank=True, null=True)
    
    is_urgent = models.BooleanField(default=False)
    is_returning = models.BooleanField(default=False)

    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='registrations')
    
    queue_id = models.CharField(max_length=15, unique=True, editable=False)
    health_record_number = models.CharField(max_length=30, unique=True, editable=False)
    
    registered_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Cache current timestamp via timezone utility to guarantee uniformity across fields
        now_dt = timezone.now()
        short_year = str(now_dt.year)[-2:] # E.g., "26"

        # 1. Fallback sync calculations from patient master metadata
        if self.patient:
            if not self.name:
                self.name = self.patient.name
            if not self.phone:
                self.phone = self.patient.phone
            if not self.gender:
                self.gender = self.patient.gender

        # 2. Robust Queue ID Generation (E.g., Q26-001)
        if not self.queue_id:
            last_record = RegistrationRecord.objects.all().order_by('id').last()
            if not last_record or not last_record.queue_id:
                self.queue_id = f"Q{short_year}-001"
            else:
                try:
                    # Safely split format to locate chronological integer tail
                    last_sequence_part = last_record.queue_id.split('-')[-1]
                    next_id = int(last_sequence_part) + 1
                except (ValueError, IndexError):
                    next_id = RegistrationRecord.objects.count() + 1
                
                self.queue_id = f"Q{short_year}-{str(next_id).zfill(3)}"
                
        # 3. 🚀 FIXED: Robust Health Record Number Generation safely bypassing native import bugs
        if not self.health_record_number:
            last_hrn_record = RegistrationRecord.objects.all().order_by('id').last()
            if not last_hrn_record or not last_hrn_record.health_record_number:
                next_sequence = "001"
            else:
                try:
                    # Parse string pattern matching 'SCC-[Sequence]/[Year]'
                    last_sequence_part = last_hrn_record.health_record_number.split('-')[1].split('/')[0]
                    next_sequence = str(int(last_sequence_part) + 1).zfill(3)
                except (ValueError, IndexError):
                    next_sequence = str(RegistrationRecord.objects.count() + 1).zfill(3)
            
            self.health_record_number = f"SCC-{next_sequence}/{short_year}"
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.queue_id} - {self.health_record_number} - {self.name}"
    

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
    
    # New Entrant Preliminary Fallback Fields
    manual_patient_name = models.CharField(max_length=255, blank=True, help_text="For preliminary registration")
    manual_patient_phone = models.CharField(max_length=20, blank=True, help_text="For preliminary notification updates")
    manual_patient_email = models.EmailField(blank=True, null=True, help_text="For preliminary notification updates")
    
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
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES, default="General")
    stock = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=5)
    unit = models.CharField(max_length=50, default="Units")
    
    # REQUIRED FOR FINANCE: Base cost tracking for auto-calculating totals
    buying_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.stock} {self.unit} remaining)"
    
class PharmacyStockCatalogItem(models.Model):
    """
    Tracks central pharmacy medicine stock elements and purchasing costs 
    for procurement indents, keeping patient prescriptions decoupled from finance.
    """
    drug_name = models.CharField(max_length=255, unique=True)
    formulation = models.CharField(max_length=100, help_text="e.g., Tablets, Vials, Syrup")
    current_stock = models.IntegerField(default=0)
    buying_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.drug_name} - KES {self.buying_price}"

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


class LabOrder(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Processing'),
        ('COMPLETED', 'Results Ready'),
    ]

    # Explicit canonical choices for the 7 standard available profiles
    # These match your exact frontend naming convention
    TEST_CHOICES = [
        ('CBC', 'Full Blood Count (CBC)'),
        ('UE', 'Urea, Electrolytes & Creatinine (U&E)'),
        ('LFT', 'Liver Function Test (LFT)'),
        ('PSA', 'Prostate Specific Antigen (PSA)'),
        ('URINE', 'Urinalysis (Routine)'),
        ('BG_CROSS', 'Blood Group & Cross Match'),
        ('BS_MP', 'Blood Slide (Malaria Parasite)'),
    ]

    # Relational Database Connections
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='lab_orders')
    visit = models.ForeignKey('RegistrationRecord', on_delete=models.CASCADE, related_name='requested_labs', null=True, blank=True)
    
    # Simple explicit mapping using standard text choices inside an array structure 
    # Or simple boolean markers for each of the 7 tests. Boolean flags are easiest for calculations!
    has_cbc = models.BooleanField(default=False, verbose_name="Full Blood Count (CBC)")
    has_ue = models.BooleanField(default=False, verbose_name="Urea, Electrolytes & Creatinine (U&E)")
    has_lft = models.BooleanField(default=False, verbose_name="Liver Function Test (LFT)")
    has_psa = models.BooleanField(default=False, verbose_name="Prostate Specific Antigen (PSA)")
    has_urine = models.BooleanField(default=False, verbose_name="Urinalysis (Routine)")
    has_bg_cross = models.BooleanField(default=False, verbose_name="Blood Group & Cross Match")
    has_bs_mp = models.BooleanField(default=False, verbose_name="Blood Slide (Malaria Parasite)")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    doctor_notes = models.TextField(blank=True, null=True, help_text="Notes/Clinical indications from the ordering clinician")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    # --- Relational Helpers For the 4 Users ---

    @property
    def patient_name(self):
        """Used by Doctor, Tech, Patient, Billing"""
        return self.patient.name

    @property
    def health_record_number(self):
        """Used by Doctor, Tech, Patient, Billing"""
        return getattr(self.patient, 'health_record_number', 'N/A')

    @property
    def queue_id(self):
        """
        Dynamically extracts token tracking identifier from active session sequence
        Used by Lab Tech to sort work queues, and Billing Officer to find active session invoices.
        """
        if self.visit:
            return getattr(self.visit, 'token_id', f"Q{self.visit.id}")
        return "N/A"

    @property
    def selected_test_list(self):
        """Returns string representations matching frontend tracking matrices"""
        tests = []
        if self.has_cbc: tests.append("Full Blood Count (CBC)")
        if self.has_ue: tests.append("Urea, Electrolytes & Creatinine (U&E)")
        if self.has_lft: tests.append("Liver Function Test (LFT)")
        if self.has_psa: tests.append("Prostate Specific Antigen (PSA)")
        if self.has_urine: tests.append("Urinalysis (Routine)")
        if self.has_bg_cross: tests.append("Blood Group & Cross Match")
        if self.has_bs_mp: tests.append("Blood Slide (Malaria Parasite)")
        return tests

    def __str__(self):
        return f"Order #{self.id} | Token: {self.queue_id} | {self.patient_name} - {self.status}"


class LabPanel(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name="Panel Name") # e.g., "CBC", "UE", "LFT"

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Lab Panel Group"
        verbose_name_plural = "Lab Panel Groups"


class LabTestRegistry(models.Model):
    parent_panel = models.ForeignKey(
        'LabPanel', 
        on_delete=models.PROTECT, 
        related_name='test_parameters',
        verbose_name="Main Panel Target"
    )
    name = models.CharField(max_length=255, verbose_name="Sub Test Parameter Name") # e.g., "Hb", "Creatinine"
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

    # LINK BACK TO THE ORDER SYSTEM:
    lab_order = models.ForeignKey(
        'LabOrder', 
        on_delete=models.CASCADE, 
        related_name='results', 
        null=True, 
        blank=True,
        help_text="The originating clinical instruction record"
    )
    
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

    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'LAB_TECH'})
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_test_name_display()} - {self.patient.name} ({self.status})"

    def evaluate_ranges(self):
        """
        Dynamically analyzes wide-table field entry data against constraints 
        mapped inside the LabTestRegistry standard library profiles.
        """
        alerts = []
        # Find matching parameters registered under the active parent group code name
        registry_entries = LabTestRegistry.objects.filter(parent_panel__name=self.test_name)
        
        # Field mapping dictionary to map registry configurations to database wide-columns
        mapping = {
            'hb': 'cbc_hb', 'wbc': 'cbc_wbc', 'neut': 'cbc_neut', 'plt': 'cbc_plt', 'mcv': 'cbc_mcv',
            'na+': 'ue_na', 'k+': 'ue_k', 'urea': 'ue_urea', 'creatinine': 'ue_creatinine',
            'alt': 'lft_alt', 'ast': 'lft_ast', 't.bil': 'lft_tbil', 'd.bil': 'lft_dbil', 'alp': 'lft_alp', 'alb': 'lft_albumin',
            'total psa': 'psa_total'
        }

        for entry in registry_entries:
            lookup_field = mapping.get(entry.name.lower())
            if lookup_field:
                val = getattr(self, lookup_field, None)
                if val is not None:
                    float_val = float(val)
                    if entry.upper_range and float_val > entry.upper_range:
                        alerts.append(f"⚠️ {entry.name} High ({float_val} > {entry.upper_range}). Recommendation: {entry.recommendation_above_maximum}")
                    elif entry.lower_range and float_val < entry.lower_range:
                        alerts.append(f"⚠️ {entry.name} Low ({float_val} < {entry.lower_range}). Recommendation: {entry.recommendation_below_minimum}")
        return alerts


# Standalone diagnostic library profile for reference standard legacy usage
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
        ('PHARMACY', 'Pharmacy'),
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
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='finance_requisitions')
    reason = models.TextField(help_text="Clinical, operational, or campaign-specific justification")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_viewed_by_finance = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"REQ-{self.id} [{self.department}] - {self.status}"

    def update_total_cost(self):
        """Updates and caches the parent total cost based on child line links or extensions."""
        if self.department == 'MARKETING' and hasattr(self, 'marketing_meta'):
            self.total_cost = self.marketing_meta.requested_amount
        else:
            self.total_cost = sum(item.line_total for item in self.items.all())
            
        Requisition.objects.filter(id=self.id).update(total_cost=self.total_cost)

class RequisitionItem(models.Model):
    requisition = models.ForeignKey(Requisition, related_name='items', on_delete=models.CASCADE)
    
    # Precise point references matching your actual domain layout arrays
    lab_item = models.ForeignKey(LabInventoryItem, on_delete=models.PROTECT, null=True, blank=True, related_name='requisition_lines')
    pharmacy_item = models.ForeignKey(PharmacyStockCatalogItem, on_delete=models.PROTECT, null=True, blank=True, related_name='requisition_lines')
    
    # Generic item details field to handle random unindexed office/admin supplies
    non_inventory_title = models.CharField(max_length=255, null=True, blank=True, help_text="For miscellaneous line items not in the inventory logs")
    
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Locked price point history snapshot")
    line_total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        # Auto-extract true values based on context mapping configurations
        if self.lab_item:
            self.unit_price = self.lab_item.buying_price
        elif self.pharmacy_item:
            self.unit_price = self.pharmacy_item.buying_price
            
        self.line_total = self.unit_price * self.quantity
        super().save(*args, **kwargs)
        self.requisition.update_total_cost()

    def delete(self, *args, **kwargs):
        requisition = self.requisition
        super().delete(*args, **kwargs)
        requisition.update_total_cost()


# --- SUPPLIER & VENDOR MANAGEMENT ---
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

from django.db import models

class InsuranceCompany(models.Model):
    """
    Main registry for Insurance Providers (Payers).
    """
    PAYER_TYPE_CHOICES = [
        ('COMMERCIAL', 'Private Commercial Insurance'),
        ('STATUTORY', 'State/Statutory Payer (e.g., SHA)'),
        ('CORPORATE_DIRECT', 'Corporate Direct Self-Funded'),
        ('SUBSIDIZED', 'Low-Tier Subsidized/NGO'),
    ]

    name = models.CharField(max_length=255, unique=True)
    payer_code = models.CharField(max_length=50, unique=True, help_text="System code e.g. JUB-MED-01")
    payer_type = models.CharField(max_length=30, choices=PAYER_TYPE_CHOICES, default='COMMERCIAL')
    kra_pin = models.CharField(max_length=15, blank=True, null=True, help_text="Required for corporate financial auditing")
    api_endpoint = models.URLField(blank=True, null=True, help_text="Link to eligibility sync verification API")
    
    # Structural Addresses
    physical_address = models.TextField(blank=True, null=True)
    postal_address = models.CharField(max_length=255, blank=True, null=True)
    
    # Detailed Relationship Contacts
    contact_person = models.CharField(max_length=100)
    contact_role = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. Senior Relationship Manager")
    email = models.EmailField(help_text="Primary email for claims dispatch and routing")
    phone = models.CharField(max_length=20, help_text="Escalation hotline number")
    
    # Contract Management & SLA Timelines
    contract_start_date = models.DateField(blank=True, null=True)
    contract_end_date = models.DateField(blank=True, null=True)
    claim_submission_window = models.PositiveIntegerField(default=45, help_text="Maximum claim submission window in days")
    corporate_discount_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Percentage discount off tariff")
    price_list_tariff = models.CharField(max_length=100, default="Standard Cash", help_text="Assigned base price tariff matrix")
    sla_document = models.FileField(upload_to='insurance_contracts/', blank=True, null=True, help_text="Uploaded PDF active SLA contract")

    # Financial Aggregates for KPI Cards
    total_billed = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_remitted = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def aging_debt(self):
        return self.total_billed - self.total_remitted

    def __str__(self):
        return self.name


class InsuranceScheme(models.Model):
    """
    Sub-products and schemes belonging to an Insurance Provider.
    Enforces precise billing boundary checkpoints at point-of-sale invoicing.
    """
    CLASSIFICATION_CHOICES = [
        ('CORPORATE', 'Corporate Tier'),
        ('INDIVIDUAL', 'Individual Retail'),
        ('MANAGED_CARE', 'Managed Care / Capitation'),
    ]

    SHIF_COORDINATION_CHOICES = [
        ('DEDUCT', 'Automatically Deduct SHA Allocation First'),
        ('NONE', 'Pure Private (No SHA Cut)'),
    ]

    BIOMETRIC_AUTH_CHOICES = [
        ('M-TIBA', 'M-TIBA / CarePay'),
        ('COMPULINK', 'Compulink Card'),
        ('MEDVANTAGE', 'Medvantage System'),
        ('PORTAL_ONLY', 'None (Web Portal Only)'),
    ]

    company = models.ForeignKey(InsuranceCompany, on_delete=models.CASCADE, related_name='schemes')
    name = models.CharField(max_length=255, help_text="e.g. Jubilee JCare Johari Plan A")
    classification = models.CharField(max_length=30, choices=CLASSIFICATION_CHOICES, default='CORPORATE')
    
    # Financial Rules & Co-Pays
    preauth_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Invoicing amount triggering mandatory pre-auth token code")
    copay_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Fixed standard client copay contribution amount")
    consultation_cap = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text="Maximum GP/Specialist payment allowance before patient balance triggers")
    
    # Refactored Statutory Controls & Ward Limit Rules
    shif_coordination = models.CharField(max_length=20, choices=SHIF_COORDINATION_CHOICES, default='DEDUCT')
    daily_bed_rate_limit = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text="Maximum currency allowance per 24 hours for room board")
    biometric_auth_type = models.CharField(max_length=20, choices=BIOMETRIC_AUTH_CHOICES, default='PORTAL_ONLY')

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company', 'name')

    def __str__(self):
        return f"{self.company.name} - {self.name}"


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
        ('PARTIALLY_REMITTED', 'Partially Settled / Shortfall'),
    ]
    
    insurance_company = models.ForeignKey(InsuranceCompany, on_delete=models.CASCADE)
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='insurance_claims')
    
    claim_number = models.CharField(max_length=100, unique=True)
    pre_auth_code = models.CharField(max_length=100, blank=True, null=True)
    pre_auth_approved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Financial Breakdown
    total_amount_billed = models.DecimalField(max_digits=12, decimal_places=2, default=0.00,help_text="Original invoice value sent to insurer")
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Amount actually remitted")
    shortfall_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Deductions or disallowed amounts")
    
    date_submitted = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=CLAIM_STATUS, default='DRAFT')
    
    rejection_reason = models.TextField(blank=True)
    remittance_reference = models.CharField(max_length=100, blank=True, null=True, help_text="EFT transaction / Cheque code from batch upload")
    reconciled_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"CLAIM-{self.claim_number} ({self.patient.name})"
 
class ClaimDispatchBatch(models.Model):
    """Tracks a bundle of multiple patients' claims compiled and mailed to an insurer."""
    batch_reference = models.CharField(max_length=50, unique=True)
    insurance_company = models.ForeignKey('InsuranceCompany', on_delete=models.CASCADE)
    date_dispatched = models.DateField(auto_now_add=True)
    total_batch_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_acknowledged = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Dispatch Batch {self.batch_reference} -> {self.insurance_company.name}"

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
    

class MarketingRequisitionExtension(models.Model):
    CATEGORY_CHOICES = [
        ('POSTERS_PRINTING', 'Posters & Printing Materials'),
        ('SOCIAL_ADS', 'Social Media Advertising (Meta/Google)'),
        ('LOGISTICS_TRAVEL', 'Field Transport & Fuel Logistics'),
        ('MEDIA_AIRTIME', 'Radio Airtime & PR Sponsorships'),
        ('MISC_SUPPLIES', 'Miscellaneous Camp Supplies'),
    ]

    requisition = models.OneToOneField(Requisition, on_delete=models.CASCADE, related_name='marketing_meta')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    campaign = models.ForeignKey('OutreachCampaign', on_delete=models.CASCADE, related_name='marketing_links')
    requested_amount = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Push total directly to parent cache to keep frontend table dynamic arrays synced
        self.requisition.update_total_cost()

    def __str__(self):
        return f"Meta for REQ-{self.requisition.id} Campaign: {self.campaign.name}"
    

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
    


@receiver(post_save, sender=LabOrder)
def auto_generate_lab_results(sender, instance, created, **kwargs):
    """
    Listens to newly stored clinician orders and instantly updates the
    LabResult processing queues to map clinical workloads seamlessly.
    """
    if created:
        # 🔴 FIX: Safe fallback if requested_tests isn't a direct DB field,
        # or change 'test_names' / 'tests' to whatever field name is on your LabOrder model
        requested_tests = getattr(instance, 'requested_tests', None)
        
        # If it's a JSON string or comma-separated string, parse it. 
        # If it's already a list or iterable, we can loop over it directly.
        if requested_tests:
            # Check against your database valid TEST_CHOICES keys before mounting rows
            valid_codes = [choice[0] for choice in LabResult.TEST_CHOICES]
            
            for code in requested_tests:
                # If your frontend passes descriptive labels like "Full Blood Count (CBC)",
                # make sure to extract or match the clean choice key (e.g., 'CBC')
                clean_code = code
                if '(' in code and ')' in code:
                    # Extracts 'CBC' from 'Full Blood Count (CBC)'
                    clean_code = code.split('(')[-1].split(')')[0]

                if clean_code in valid_codes:
                    LabResult.objects.get_or_create(
                        lab_order=instance,
                        patient=instance.patient,
                        visit=instance.visit,
                        test_name=clean_code,
                        status='PENDING'
                    )


class Service(models.Model):
    DEPARTMENT_CHOICES = [
        ('ONC', 'Oncology Center'),
        ('LAB', 'Laboratory'),
        ('RAD', 'Radiology & Imaging'),
        ('NUR', 'Nursing & Procedures'),
        ('PSY', 'Counselling Psychology'),
        ('PHA', 'Pharmacy'),
    ]

    sku = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    dept = models.CharField(max_length=3, choices=DEPARTMENT_CHOICES)
    price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Base selling price in KES")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.sku} - {self.name} (KES {self.price})"


# --- Transactional Point-Of-Care Billing Matrix ---

class PatientBillableItem(models.Model):
    STATION_CHOICES = [
        ('REGISTRATION', 'Registration'),
        ('TRIAGE', 'Triage Station'),
        ('DOCTOR', 'Consultation Room'),
        ('LAB', 'Laboratory'),
        ('RADIOLOGY', 'Radiology Room'),
        ('PSYCHOLOGY', 'Psychology Room'),
        ('PHARMACY', 'Pharmacy'),
    ]

    BILLING_STATUS_CHOICES = [
        ('PENDING', 'Pending Payment'),
        ('PAID', 'Paid'),
        ('WAIVED', 'Waived'),
    ]

    patient = models.ForeignKey(
        'Patient', 
        on_delete=models.CASCADE, 
        related_name='billable_items'
    )
    # Links directly to the current session sequence to cluster items on an active visit invoice
    visit = models.ForeignKey(
        'RegistrationRecord', 
        on_delete=models.CASCADE, 
        related_name='billable_items',
        null=True,
        blank=True
    )
    # Optional connection to the specific base configuration blueprint
    service = models.ForeignKey(
        Service, 
        on_delete=models.PROTECT, 
        related_name='billed_instances',
        null=True,
        blank=True
    )
    
    # Text fallback snapshots to prevent historical changes from corrupting old financial records
    service_sku_snapshot = models.CharField(max_length=50)
    service_name_snapshot = models.CharField(max_length=255)
    
    # Real-time auditing context
    station_charged = models.CharField(max_length=20, choices=STATION_CHOICES)
    qty = models.PositiveIntegerField(default=1)
    price_snap = models.DecimalField(max_digits=12, decimal_places=2, help_text="Price snapshot at point of care")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    
    billing_status = models.CharField(max_length=15, choices=BILLING_STATUS_CHOICES, default='PENDING')
    ordered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        related_name='initiated_charges'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Always pull from the configuration template if present during initial entry creation
        if self.service and not self.id:
            self.service_sku_snapshot = self.service.sku
            self.service_name_snapshot = self.service.name
            if not self.price_snap:
                self.price_snap = self.service.price
                
        # Handle strict point-of-care totals generation
        self.total_amount = self.qty * self.price_snap
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.service_sku_snapshot} - {self.patient.name} ({self.billing_status})"