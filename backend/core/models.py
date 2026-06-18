from decimal import Decimal
from enum import unique
from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from datetime import date
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import models
from django.contrib.postgres.fields import ArrayField 
from datetime import datetime
from django.utils import timezone
from django.apps import apps

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
    registry_no = models.CharField(max_length=100, blank=True, null=True)
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

    
class RegistrationRecord(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    PAYMENT_MODE_CHOICES = [('CASH', 'Cash'), ('INSURANCE', 'Insurance')]
    
    RELATIONSHIP_CHOICES = [
        ('SPOUSE', 'Spouse'),
        ('PARENT', 'Parent'),
        ('CHILD', 'Child'),
        ('SIBLING', 'Sibling'),
        ('GUARDIAN', 'Legal Guardian'),
        ('DEPENDENT', 'Dependent'),
        ('OTHER', 'Other Relative'),
    ]
    
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100)
    id_number = models.CharField(max_length=50) 
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True) 
    
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
    
    # Status Flags
    is_urgent = models.BooleanField(default=False)
    is_returning = models.BooleanField(default=False)

    # Master Data Relations
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='registrations')
    
    # System Managed Identifiers
    queue_id = models.CharField(max_length=15, unique=True, editable=False)
    health_record_number = models.CharField(max_length=30, unique=True, editable=False)
    
    registered_at = models.DateTimeField(auto_now_add=True)

    # Next of Kin / Relational Context
    next_of_kin_name = models.CharField(max_length=255)
    next_of_kin_relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES, default='SPOUSE')
    next_of_kin_phone = models.CharField(max_length=20)

    @property
    def full_name(self):
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"

    def save(self, *args, **kwargs):
        now_dt = timezone.now()
        short_year = str(now_dt.year)[-2:] 

        if self.patient:
            if not self.first_name:
                
                self.first_name = getattr(self.patient, 'first_name', '')
                self.middle_name = getattr(self.patient, 'middle_name', '')
                self.last_name = getattr(self.patient, 'last_name', '')
            if not self.phone:
                self.phone = self.patient.phone
            if not self.gender:
                self.gender = self.patient.gender

        
        if not self.queue_id or not self.health_record_number:
            with transaction.atomic():
                last_record = RegistrationRecord.objects.select_for_update().order_by('id').last()
                
                # Assign Queue ID
                if not self.queue_id:
                    if not last_record or not last_record.queue_id:
                        self.queue_id = f"Q{short_year}-001"
                    else:
                        try:
                            last_sequence_part = last_record.queue_id.split('-')[-1]
                            next_id = int(last_sequence_part) + 1
                        except (ValueError, IndexError):
                            next_id = RegistrationRecord.objects.count() + 1
                        self.queue_id = f"Q{short_year}-{str(next_id).zfill(3)}"

                # Assign Health Record Number
                if not self.health_record_number:
                    if not last_record or not last_record.health_record_number:
                        next_sequence = "001"
                    else:
                        try:
                            last_sequence_part = last_record.health_record_number.split('-')[1].split('/')[0]
                            next_sequence = str(int(last_sequence_part) + 1).zfill(3)
                        except (ValueError, IndexError):
                            next_sequence = str(RegistrationRecord.objects.count() + 1).zfill(3)
                    
                    self.health_record_number = f"SCC-{next_sequence}/{short_year}"
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.queue_id} - {self.health_record_number} - {self.first_name} {self.last_name}"
    

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
    manual_patient_name = models.CharField(max_length=255, blank=True)
    manual_patient_phone = models.CharField(max_length=20, blank=True)
    manual_patient_email = models.EmailField(blank=True, null=True)
    
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
        ('UNDER_CONSULTATION', 'Under Consultation'), 
        ('AWAITING_MEDICATION', 'Awaiting Medication'), 
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
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='vitals')
    visit = models.ForeignKey('RegistrationRecord', on_delete=models.CASCADE, related_name='vitals', null=True)
    queue_entry = models.ForeignKey('Queue', on_delete=models.SET_NULL, null=True, blank=True)
    
    temperature = models.DecimalField(max_digits=4, decimal_places=1, help_text="°C")
    systolic_bp = models.PositiveIntegerField(help_text="mmHg")
    diastolic_bp = models.PositiveIntegerField(help_text="mmHg")
    heart_rate = models.PositiveIntegerField(help_text="bpm")
    respiratory_rate = models.PositiveIntegerField(blank=True, null=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, help_text="kg")
    height = models.DecimalField(max_digits=5, decimal_places=2, help_text="cm")
    spo2 = models.PositiveIntegerField(verbose_name="Oxygen Saturation %", blank=True, null=True)
    
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    # These dynamic properties handle calculation on the fly, avoiding data conflicts!
    @property
    def bmi(self):
        if self.weight and self.height and float(self.height) > 0:
            height_m = float(self.height) / 100
            return round(float(self.weight) / (height_m ** 2), 2)
        return 0.0

    @property
    def bsa(self):
        if self.weight and self.height:
            # Mosteller Formula
            bsa_value = math.sqrt((float(self.height) * float(self.weight)) / 3600)
            return round(bsa_value, 2)
        return 0.0

#2 --- Oncology section Treatment & Protocol ---

class Protocol(models.Model):
    # Core identifying attributes
    name = models.CharField(max_length=255, help_text="e.g., TC, CMF, FOLFOX")
    description = models.TextField(blank=True, null=True)
    total_cycles = models.PositiveIntegerField(default=1)
    cycle_duration_days = models.IntegerField(
        default=21, 
        help_text="Duration of a single treatment cycle (days)"
    )
    
    # Structural hierarchy link options 
    primary_site_id = models.IntegerField(help_text="ID of the matching primary anatomical site")
    cancer_type_id = models.IntegerField(help_text="ID of the specific cancer variant")
    regimen_template_id = models.IntegerField(blank=True, null=True, help_text="ID of blueprint template if pre-populated")
    
    # Applicable stages stored as JSON array (e.g. ['Stage I', 'Stage II'])
    applicable_stages = models.JSONField(default=list)
    
    # Financial fields to be populated by other personnel later
    total_cost_per_cycle = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ProtocolIngredient(models.Model):
    """
    Holds individual medication elements connected to a parent Protocol.
    Costs remain optional here so other teams can edit them down the line.
    """
    protocol = models.ForeignKey(Protocol, on_delete=models.CASCADE, related_name='components')
    medication_name = models.CharField(max_length=255)
    base_dosage = models.DecimalField(max_digits=10, decimal_places=2)
    dosage_unit = models.CharField(max_length=50, help_text="e.g., mg/m², mg, mcg")
    route_of_administration = models.CharField(max_length=100, help_text="e.g., IV Infusion, Oral")
    
    # Updatable cost per specific drug row
    cost_per_cycle = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.medication_name} ({self.base_dosage} {self.dosage_unit}) for {self.protocol.name}"

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


class CancerSite(models.Model):
    """Primary site: e.g., BREAST CANCER, LUNG CANCER, PROSTATE CANCER"""
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

class CancerType(models.Model):
    """Subtype: e.g., BREAST CANCER HORMONAL THERAPY, GASTROINTESTINAL ADENOCARCINOMA"""
    site = models.ForeignKey(CancerSite, on_delete=models.CASCADE, related_name="types")
    name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.site.name} - {self.name}"

class Regimen(models.Model):
    """Protocol acronym: e.g., AC-T, FOLFOX-6, CAPOX"""
    cancer_type = models.ForeignKey(CancerType, on_delete=models.CASCADE, related_name="regimens")
    name = models.CharField(max_length=255, help_text="Oncology protocol name")
    default_cycles = models.IntegerField(default=6)
    
    def __str__(self):
        return f"{self.name} ({self.cancer_type.name})"

class RegimenDrug(models.Model):
    """The individual drugs that load automatically under Dropdown 3"""
    regimen = models.ForeignKey(Regimen, on_delete=models.CASCADE, related_name="drugs")
    name = models.CharField(max_length=255)  # e.g., Docetaxel, Pemetrexed
    base_value = models.CharField(max_length=255, blank=True)  # e.g., 75, 500
    metric_unit = models.CharField(max_length=255, default="mg/m²")  # e.g., mg, mg/m²
    route_pathway = models.CharField(max_length=255, default="IV Infusion")
    cycle_cost_kes = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.regimen.name} -> {self.name}"
    

# 3. Radiologist Section
class ImagingRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    scan_type = models.CharField(max_length=50) 
    image_url = models.URLField(blank=True) 
    findings = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


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
    
class InventoryItem(models.Model):
    DEPARTMENT_CHOICES = [
        ('PHARMACY', 'Pharmacy'),
        ('LAB', 'Laboratory'),
        ('NURSING', 'Nursing'),
        ('RADIOLOGY', 'Radiology'),
        ('ADMIN', 'General Admin'),
    ]

    DOSAGE_CHOICES = [
        ('TABLET', 'Tablet'),
        ('CAPSULE', 'Capsule'),
        ('SYRUP', 'Syrup'),
        ('SUSPENSION', 'Oral Suspension'),
        ('VIAL', 'Vial (Liquid/Powder for Injection)'),
        ('AMP_INJ', 'Ampoule (Injection)'),
        ('INF_BAG', 'Infusion Bag (Premixed Cytotoxic/Hydration)'),
        ('OINTMENT', 'Ointment / Cream'),
        ('PATCH', 'Transdermal Patch (e.g., Fentanyl Palliative Care)'),
        ('PESSARY', 'Pessary (e.g., localized hormonal therapies)'),
        ('SUPPOSITORY', 'Suppository (e.g., antiemetics / palliative comfort care)'),
    ]

    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True, null=True)
    dosage_form = models.CharField(max_length=20, choices=DOSAGE_CHOICES, default='TABLET')
    strength = models.CharField(max_length=50, blank=True, null=True)
    quantity_available = models.IntegerField(default=0)
    cost_per_unit = models.DecimalField(max_digits=12, decimal_places=2)
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES)
    batch_number = models.CharField(max_length=100, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    reorder_level = models.PositiveIntegerField(default=50)
    added_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # 1. Generate Sequential Base SKU automatically if missing
        if not self.sku and self.name:
            clean_base_name = self.name.strip().lower()
            # Clean strength to match safely
            clean_strength = self.strength.strip().lower() if self.strength else ""

            with transaction.atomic():
                # FIX: Match on BOTH name and strength to differentiate versions
                existing_item = InventoryItem.objects.filter(
                    name__iexact=clean_base_name,
                    strength__iexact=clean_strength if clean_strength else None
                ).exclude(sku__isnull=True).exclude(sku="").first()

                if existing_item:
                    # Same drug with same strength -> shares the base SKU code
                    self.sku = existing_item.sku
                else:
                    # New drug OR existing drug with a brand new strength variant -> generate new SKU
                    last_item = InventoryItem.objects.filter(sku__startswith="SCC").order_by("-id").first()
                    if last_item and last_item.sku:
                        try:
                            last_number_str = last_item.sku.replace("SCC", "")
                            last_number = int(last_number_str)
                            next_number = last_number + 1
                        except ValueError:
                            next_number = InventoryItem.objects.filter(sku__startswith="SCC").count() + 1
                    else:
                        next_number = 1

                    self.sku = f"SCC{next_number:04d}"

        # 2. Refined Batch Generation: Matches layout schema "SCC-B001/090626"
        if not self.batch_number:
            generation_date = self.added_at if self.id else timezone.now()
            date_str = generation_date.strftime("%d%m%y")
            
            day_start = generation_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = generation_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            with transaction.atomic():
                last_daily_batch = InventoryItem.objects.filter(
                    added_at__range=(day_start, day_end),
                    batch_number__startswith="SCC-B"
                ).order_by("-id").first()

                next_batch_num = 1
                if last_daily_batch and last_daily_batch.batch_number:
                    try:
                        raw_batch_part = last_daily_batch.batch_number.split('/')[0]
                        counter_str = raw_batch_part.replace("SCC-B", "")
                        next_batch_num = int(counter_str) + 1
                    except (ValueError, IndexError):
                        next_batch_num = InventoryItem.objects.filter(added_at__range=(day_start, day_end)).count() + 1

                self.batch_number = f"SCC-B{next_batch_num:03d}/{date_str}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.strength}) - {self.sku} [{self.batch_number}]"
    
class Drug(models.Model):
    DOSAGE_CHOICES = [
        ('TABLET', 'Tablet'),
        ('CAPSULE', 'Capsule'),
        ('SYRUP', 'Syrup'),
        ('SUSPENSION', 'Oral Suspension'),
        ('VIAL', 'Vial (Liquid/Powder for Injection)'),
        ('AMP_INJ', 'Ampoule (Injection)'),
        ('INF_BAG', 'Infusion Bag (Premixed Cytotoxic/Hydration)'),
        ('OINTMENT', 'Ointment / Cream'),
        ('PATCH', 'Transdermal Patch (e.g., Fentanyl)'),
        ('SUPPOSITORY', 'Suppository (e.g., antiemetics)'),
    ]

    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True, blank=True, null=True)
    batch_no = models.CharField(max_length=100)
    dosage_form = models.CharField(max_length=20, choices=DOSAGE_CHOICES, blank=True, null=True)
# Formulation power
    strength = models.CharField(max_length=50, blank=True, null=True)
    stock_quantity = models.PositiveIntegerField(default=0) # Shop floor quantity available
    reorder_level = models.PositiveIntegerField(default=50) # Threshold indicator
    
    # Pricing fields
    cost_price_unit = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # Base cost from store
    selling_price_kes = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # Patient retail cost
    
    expiry_date = models.DateField(null=True, blank=True) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.batch_no})"

    @property
    def is_expired(self):
        return date.today() >= self.expiry_date if self.expiry_date else False
    
class ICD10Diagnosis(models.Model):
    # Pure anatomical primary sites matching your exact UI layout
    PRIMARY_SITE_CHOICES = [
        ('BREAST', 'Breast'),
        ('HEAD & NECK', 'Head & Neck'),
        ('BONE & NECK', 'Bone & Neck'),
        ('BRAIN TUMOURS', 'Brain Tumours'),
        ('GASTROINTESTINAL', 'Gastrointestinal'),
        ('LUNG', 'Lung'),
        ('UROLOGICAL', 'Urological'),
        ('KAPOSI SARCOMA', 'Kaposi Sarcoma'),
        ('GYNAECOLOGICAL', 'Gynaecological'),
        ('LEUKEMIA', 'Leukemia'),
    ]
    
    primary_site = models.CharField(max_length=50, choices=PRIMARY_SITE_CHOICES, db_index=True)
    code = models.CharField(max_length=15, unique=True, db_index=True)
    short_description = models.CharField(max_length=255)
    long_description = models.TextField()

    class Meta:
        verbose_name = "Anatomical Diagnosis Mapping"
        verbose_name_plural = "Anatomical Diagnosis Mappings"

    def __str__(self):
        return f"[{self.code}] {self.short_description}"
    

class PatientDiagnosis(models.Model):
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='diagnoses')
    
    # 🔗 Point explicitly to RegistrationRecord while keeping the field name 'visit' 
    # to maintain compatibility with the frontend API payloads
    visit = models.ForeignKey(RegistrationRecord, on_delete=models.CASCADE, related_name='diagnoses')
    
    primary_site = models.CharField(
        max_length=50, 
        choices=ICD10Diagnosis.PRIMARY_SITE_CHOICES, 
        db_index=True
    )
    
    # Snapshot details of the selected diagnosis code
    icd10_code = models.CharField(max_length=15, db_index=True)
    icd10_description = models.CharField(max_length=255)
    long_description = models.TextField(blank=True, null=True)
    
    # Automatically tracks date and time of the entry
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Patient Diagnosis Record"
        verbose_name_plural = "Patient Diagnosis Records"
        ordering = ['-created_at']

    def __str__(self):
        # Displays the assigned health record number cleanly in the Django Admin portal
        return f"[{self.icd10_code}] - {self.visit.health_record_number} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
    


class Prescription(models.Model):
    # Core Context Links
    patient = models.ForeignKey(
        'Patient', 
        on_delete=models.CASCADE, 
        related_name='prescriptions'
    )
    visit = models.ForeignKey(
        'Queue',  # Or your historical visit tracker model
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    # Clinical Metadata Fields (Tier 1)
    diagnosis = models.ForeignKey(
        'PatientDiagnosis', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='prescriptions'
    )
    protocol = models.CharField(max_length=255, blank=True, default='')
    cycle_no = models.CharField(max_length=50, default='1')
    total_cycles = models.CharField(max_length=50, blank=True, default='')
    allergies = models.TextField(blank=True, default='')
    treatment_date = models.DateField(auto_now_add=True)
    
    # Dose Adjustment Notes (Tier 5)
    dose_adjustment_notes = models.TextField(blank=True, default='')
    
    # Signatures & Verification (Tier 7)
    prescribed_by = models.CharField(max_length=255, blank=True, default='')
    prescribe_date = models.DateField(null=True, blank=True)
    pharmacy_status = models.CharField(max_length=50, default='Pending Dispense')
    
    # Extensible Metadata Storage for structural configurations
    meta_extensions = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Rx #{self.id} - {self.patient.name} ({self.protocol or 'No Protocol'})"


class PrescriptionItem(models.Model):
    STAGE_CHOICES = [
        ('PRE_CHEMO', 'Pre-Chemotherapy'),
        ('CHEMO', 'Chemotherapy Core Orders'),
        ('POST_CHEMO', 'Post-Chemotherapy Take Home'),
    ]

    prescription = models.ForeignKey(
        Prescription, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES)
    medication_name = models.CharField(max_length=255)
    
    # Optional Link to an actual inventory system or stock table row
    drug = models.ForeignKey(
        Drug, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    # Chemo-matrix explicit variables (Tier 4 metrics)
    dosage = models.CharField(max_length=100, blank=True, default='')
    calc_factor = models.CharField(max_length=50, blank=True, default='')
    factor_value = models.CharField(max_length=50, blank=True, default='')
    route = models.CharField(max_length=50, blank=True, default='')
    diluent = models.CharField(max_length=50, blank=True, default='')
    volume = models.CharField(max_length=50, blank=True, default='')
    duration = models.CharField(max_length=50, blank=True, default='')

    def __str__(self):
        return f"{self.stage} | {self.medication_name} ({self.dosage or 'STAT'})"
    
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
    
# Imaging
class ImagingOrder(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Processing'),
        ('COMPLETED', 'Results Ready'),
    ]

    # Explicit canonical choices for the 7 standard available ultrasounds
    # Matches your frontend naming conventions perfectly
    IMAGING_CHOICES = [
        ('US_CAROTID', 'U/S Carotid Doppler/Duplex'),
        ('US_DUPLEX_LOW_EXT', 'U/S Duplex Scan Low Ext Artery R/O Pseudo'),
        ('US_VENOUS_EXT', 'U/S Venous Duplex/Extremity'),
        ('US_VENOUS_UNILA', 'U/S Venous Duplex/Extrm/Unila'),
        ('US_DOPPLER_ABD_PEL', 'U/S Doppler, Abdominal/Pelvic'),
        ('US_LIMITED_DUPLEX', 'U/S Limited Study Duplex Scan'),
        ('US_HEMODIALYSIS', 'U/S Duplex Scan of Hemodialysis'),
    ]

    # Relational Database Connections (Matching your Lab layout)
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='imaging_orders')
    visit = models.ForeignKey('RegistrationRecord', on_delete=models.CASCADE, related_name='requested_imaging', null=True, blank=True)
    
    # Simple explicit matrix layout using boolean flags for the 7 standard procedures
    has_us_carotid = models.BooleanField(default=False, verbose_name="U/S Carotid Doppler/Duplex")
    has_us_duplex_low_ext = models.BooleanField(default=False, verbose_name="U/S Duplex Scan Low Ext Artery R/O Pseudo")
    has_us_venous_ext = models.BooleanField(default=False, verbose_name="U/S Venous Duplex/Extremity")
    has_us_venous_unila = models.BooleanField(default=False, verbose_name="U/S Venous Duplex/Extrm/Unila")
    has_us_doppler_abd_pel = models.BooleanField(default=False, verbose_name="U/S Doppler, Abdominal/Pelvic")
    has_us_limited_duplex = models.BooleanField(default=False, verbose_name="U/S Limited Study Duplex Scan")
    has_us_hemodialysis = models.BooleanField(default=False, verbose_name="U/S Duplex Scan of Hemodialysis")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    doctor_notes = models.TextField(blank=True, null=True, help_text="Notes/Clinical indications from the ordering clinician")
    radiologist_report = models.TextField(blank=True, null=True, help_text="Official scan diagnostic summary from the radiologist")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    # --- Relational Helpers For the 4 Users (Mirrored from LabOrder) ---

    @property
    def patient_name(self):
        """Used by Doctor, Radiologist, Patient, Billing"""
        return self.patient.name

    @property
    def health_record_number(self):
        """Used by Doctor, Radiologist, Patient, Billing"""
        return getattr(self.patient, 'health_record_number', 'N/A')

    @property
    def queue_id(self):
        """
        Dynamically extracts token tracking identifier from active session sequence.
        Used by Radiologist to process scans, and Billing Officer to calculate active invoices.
        """
        if self.visit:
            return getattr(self.visit, 'token_id', f"Q{self.visit.id}")
        return "N/A"

    @property
    def selected_imaging_list(self):
        """Returns string representations matching frontend tracking matrices"""
        scans = []
        if self.has_us_carotid: scans.append("U/S Carotid Doppler/Duplex")
        if self.has_us_duplex_low_ext: scans.append("U/S Duplex Scan Low Ext Artery R/O Pseudo")
        if self.has_us_venous_ext: scans.append("U/S Venous Duplex/Extremity")
        if self.has_us_venous_unila: scans.append("U/S Venous Duplex/Extrm/Unila")
        if self.has_us_doppler_abd_pel: scans.append("U/S Doppler, Abdominal/Pelvic")
        if self.has_us_limited_duplex: scans.append("U/S Limited Study Duplex Scan")
        if self.has_us_hemodialysis: scans.append("U/S Duplex Scan of Hemodialysis")
        return scans

    def __str__(self):
        return f"Imaging Order #{self.id} | Token: {self.queue_id} | {self.patient_name} - {self.status}"
    

class ImagingResult(models.Model):
    # Matches your exact frontend imaging choices matrix
    IMAGING_CHOICES = [
        ('US_CAROTID', 'U/S Carotid Doppler/Duplex'),
        ('US_DUPLEX_LOW_EXT', 'U/S Duplex Scan Low Ext Artery R/O Pseudo'),
        ('US_VENOUS_EXT', 'U/S Venous Duplex/Extremity'),
        ('US_VENOUS_UNILA', 'U/S Venous Duplex/Extrm/Unila'),
        ('US_DOPPLER_ABD_PEL', 'U/S Doppler, Abdominal/Pelvic'),
        ('US_LIMITED_DUPLEX', 'U/S Limited Study Duplex Scan'),
        ('US_HEMODIALYSIS', 'U/S Duplex Scan of Hemodialysis'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Result Ready'),
    ]

    # LINK BACK TO THE ORDER SYSTEM (Exactly like Lab)
    imaging_order = models.ForeignKey(
        'ImagingOrder', 
        on_delete=models.CASCADE, 
        related_name='results', 
        null=True, 
        blank=True,
        help_text="The originating clinical instruction record"
    )
    
    # Direct linkages for fast patient history lookups
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='imaging_history')
    visit = models.ForeignKey('RegistrationRecord', on_delete=models.CASCADE, related_name='imaging_results', null=True)
    
    # Target scan properties
    imaging_name = models.CharField(max_length=50, choices=IMAGING_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    is_critical = models.BooleanField(default=False)
    
    # Radiologist Narrative Reports
    findings = models.TextField(
        blank=True, 
        null=True, 
        help_text="Detailed anatomical observations made during the ultrasound scan."
    )
    impression = models.TextField(
        blank=True, 
        null=True, 
        help_text="The core clinical conclusion/diagnosis. What the doctor needs to know immediately."
    )
    
    # Ownership Tracking
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        limit_choices_to={'role': 'RADIOLOGIST'} # Limits options to your specialized image reader role
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_imaging_name_display()} - {self.patient.name} ({self.status})"


class ImagingAttachment(models.Model):
    """
    Holds the actual visual ultrasound images/snapshots tied back to the 
    specific diagnostic result row above.
    """
    imaging_result = models.ForeignKey(
        ImagingResult, 
        on_delete=models.CASCADE, 
        related_name='attachments'
    )
    image = models.ImageField(
        upload_to='radiology/attachments/%Y/%m/%d/',
        help_text="Key frame or annotated ultrasound snapshot graph"
    )
    caption = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Optional description, e.g., 'Right carotid artery bifurcation showing velocity'"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for Result #{self.imaging_result.id}"
    

class NurseServiceOrder(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='nurse_orders')
    visit = models.ForeignKey('RegistrationRecord', on_delete=models.CASCADE,  related_name='nurse_orders', null=True, blank=True)
    
    # Procedure selection flags
    has_wound_dressing = models.BooleanField(default=False, verbose_name="Wound Dressing")
    has_catheter_change = models.BooleanField(default=False, verbose_name="Catheter Change")
    has_pelvic_screening = models.BooleanField(default=False, verbose_name="Pelvic Screening")
    
    # Billing tracking & instructions
    total_estimated_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    doctor_notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Nurse Order #{self.id} - Patient: {self.patient}"
    

    
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
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when requisition was submitted")
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
    
    inventory_item = models.ForeignKey(
        'InventoryItem', 
        on_delete=models.PROTECT, 
        null=True, 
        blank=True, 
        related_name='requisition_lines'
    )
    
    # Generic item details field to handle random unindexed office/admin supplies
    non_inventory_title = models.CharField(max_length=255, null=True, blank=True, help_text="For miscellaneous line items not in the inventory logs")
    
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Locked price point history snapshot")
    line_total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        # ALIGNED: Extract price directly from unified item data layout
        if self.inventory_item:
            self.unit_price = self.inventory_item.cost_per_unit
            
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
    
    # --- Identification & Regulatory Meta ---
    tin_number = models.CharField(max_length=50, blank=True, help_text="Tax ID Number / KRA PIN")
    license_number = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="Regulatory Operating License Number (e.g., PPB or County License)"
    )
    
    # --- Banking (Crucial for Dorcas to process payments) ---
    bank_name = models.CharField(max_length=100, blank=True)
    account_name = models.CharField(max_length=255, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    branch_code = models.CharField(max_length=20, blank=True)
    swift_code = models.CharField(max_length=20, blank=True)

    # --- Contract & Terms ---
    contract_document = models.FileField(upload_to='supplier_contracts/', null=True, blank=True)
    contract_start = models.DateField(null=True, blank=True)
    contract_end = models.DateField(null=True, blank=True)
    payment_terms = models.CharField(max_length=100, default="Net 30") 
    performance_rating = models.IntegerField(default=5, help_text="1 to 5 stars")
    
    # --- New Core Compliance Document Repository ---
    kra_pin_doc = models.FileField(
        upload_to='supplier_compliance/kra_pin/', 
        null=True, 
        blank=True, 
        help_text="Uploaded KRA PIN/TIN Document (PDF)"
    )
    incorporation_doc = models.FileField(
        upload_to='supplier_compliance/incorporation/', 
        null=True, 
        blank=True, 
        help_text="Certificate of Incorporation or Registration (PDF)"
    )
    regulatory_license_doc = models.FileField(
        upload_to='supplier_compliance/licenses/', 
        null=True, 
        blank=True, 
        help_text="Valid PPB / Commercial Trade License Document (PDF)"
    )
    bank_confirmation_doc = models.FileField(
        upload_to='supplier_compliance/bank_verification/', 
        null=True, 
        blank=True, 
        help_text="Bank Confirmation Letter or Cancelled Cheque (PDF)"
    )
    
    # Tax Compliance Certificate (TCC) + Time-sensitive tracking
    tax_compliance_doc = models.FileField(
        upload_to='supplier_compliance/tcc/', 
        null=True, 
        blank=True, 
        help_text="Valid Tax Compliance Certificate (PDF)"
    )
    tax_compliance_expiry = models.DateField(
        null=True, 
        blank=True, 
        help_text="Expiry date of the current Tax Compliance Certificate"
    )
    
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.category})"

# --- 2. PROCUREMENT (PO -> INVOICE -> STOCK) ---

class PurchaseOrder(models.Model):
    PO_STATUS = [
        ('DRAFT', 'Draft'),
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved & Sent'),
        ('RECEIVED', 'Goods Received'),
        ('PARTIAL', 'Partially Received'),
        ('CLOSED', 'Closed/Fulfilled'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    PAYMENT_TERMS = [
        ('Net 15', 'Net 15'),
        ('Net 30', 'Net 30'),
        ('Net 60', 'Net 60'),
    ]

    po_number = models.CharField(max_length=50, unique=True, editable=False)
    supplier = models.ForeignKey('Supplier', on_delete=models.CASCADE, related_name='purchase_orders')
    issue_date = models.DateField(auto_now_add=True)
    delivery_date = models.DateField(help_text="Expected delivery date")
    payment_terms = models.CharField(max_length=20, choices=PAYMENT_TERMS, default='Net 30')
    status = models.CharField(max_length=20, choices=PO_STATUS, default='PENDING')
    notes = models.TextField(blank=True, null=True)
    linked_requisitions = models.ManyToManyField('Requisition', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.po_number

    @property
    def total_amount(self):
        """Dynamically calculates total PO value based on line items"""
        return sum(item.total_cost for item in self.items.all())

    def save(self, *args, **kwargs):
        if not self.po_number:
            count = PurchaseOrder.objects.count() + 1
            self.po_number = f"SALAMA-PO-{timezone.now().year}-{count:04d}"
        super().save(*args, **kwargs)


class PurchaseOrderItem(models.Model):
    """Line items explicitly ordered inside a Purchase Order"""
    DEPARTMENT_CHOICES = [
        ('NURSING', 'Nursing'),
        ('PHARMACY', 'Pharmacy'),
        ('RADIOLOGY', 'Radiology'),
        ('LAB', 'Laboratory'),
        ('MARKETING', 'Marketing'),
        ('ADMIN', 'Administration'),
    ]

    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=255)
    category = models.CharField(max_length=30, choices=DEPARTMENT_CHOICES, default='PHARMACY')
    quantity = models.PositiveIntegerField(default=1)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    @property
    def total_cost(self):
        return self.quantity * self.unit_cost

    def __str__(self):
        return f"{self.item_name} ({self.quantity} x {self.unit_cost}) for {self.purchase_order.po_number}"


class GoodsReceivedNote(models.Model):
    """The logging entity for physical goods deliveries"""
    grn_number = models.CharField(max_length=50, unique=True, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='grns')
    delivery_note_ref = models.CharField(max_length=100, help_text="Vendor Delivery Note Number")
    date_received = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.grn_number

    def save(self, *args, **kwargs):
        if not self.grn_number:
            count = GoodsReceivedNote.objects.count() + 1
            self.grn_number = f"SALAMA-GRN-{timezone.now().year}-{count:04d}"
        super().save(*args, **kwargs)


class GRNItem(models.Model):
    SATISFACTION_CHOICES = [
        ('GoodCondition', 'Good Condition'),
        ('Satisfactory', 'Satisfactory'),
        ('Shortage', 'Shortage / Discrepancy'),
        ('Damaged', 'Damaged & Rejected'),
    ]

    goods_received_note = models.ForeignKey(GoodsReceivedNote, on_delete=models.CASCADE, related_name='items_received')
    item_name = models.CharField(max_length=255)
    ordered_quantity = models.PositiveIntegerField()
    quantity_received = models.PositiveIntegerField()
    damaged_quantity = models.PositiveIntegerField(default=0)
    satisfaction_level = models.CharField(max_length=30, choices=SATISFACTION_CHOICES, default='GoodCondition')
    expiry_date = models.DateField(null=True, blank=True, help_text="Leave blank for non-expiring clinical/marketing products")

    def __str__(self):
        return f"{self.item_name} on {self.goods_received_note.grn_number}"

    def save(self, *args, **kwargs):
        # 1. Resolve parent department, dosage form, and strength details via matching PO Item
        target_department = 'PHARMACY'
        dosage_val = 'TABLET'
        strength_val = 'GEN'
        
        po = self.goods_received_note.purchase_order
        matched_po_item = po.items.filter(item_name=self.item_name).first()
        
        if matched_po_item:
            target_department = matched_po_item.category
            # Read structural data properties if defined on your PO lines layout
            if hasattr(matched_po_item, 'dosage_form') and matched_po_item.dosage_form:
                dosage_val = matched_po_item.dosage_form
            if hasattr(matched_po_item, 'strength') and matched_po_item.strength:
                strength_val = "".join(matched_po_item.strength.split()).upper()

        # 2. Compute Custom SKU Variant using our unified logic
        clean_name = "".join(self.item_name.split()).upper()[:6]
        computed_sku = f"PHA-{clean_name}-{strength_val}"

        # 3. Compute Expiry-Driven Batch Code Variant
        if self.expiry_date:
            month = str(self.expiry_date.month).zfill(2)
            year = self.expiry_date.year
            computed_batch = f"SCC-INV-{month}/{year}"
        else:
            timestamp = timezone.now().strftime("%m%y")
            computed_batch = f"SCC-NONEXP-{timestamp}"

        # Save this physical line item entry 
        super().save(*args, **kwargs)

        # Calculate exact usable units safely
        usable_units = max(0, self.quantity_received - self.damaged_quantity)
        unit_cost_val = matched_po_item.unit_cost if matched_po_item else Decimal('0.00')

        # 4. LEVEL 1 WORKFLOW: Automate Entry to Main Store Warehouse Ledger
        InventoryItem = apps.get_model('core', 'InventoryItem')
        existing_stock = InventoryItem.objects.filter(sku=computed_sku, batch_number=computed_batch).first()

        if existing_stock:
            existing_stock.quantity_available += usable_units
            existing_stock.save()
        else:
            InventoryItem.objects.create(
                name=self.item_name,
                sku=computed_sku,
                batch_number=computed_batch,
                dosage_form=dosage_val,
                strength=strength_val if strength_val != "GEN" else "",
                quantity_available=usable_units,
                cost_per_unit=unit_cost_val,
                department=target_department,
                expiry_date=self.expiry_date
            )

        # 5. LEVEL 2 WORKFLOW: Cascade Downstream to Retail Point-of-Sale (Pharmacy Store)
        if target_department == 'PHARMACY':
            # Use dynamic apps fetch to preserve strict separation of modules
            Drug = apps.get_model('core', 'Drug')
            
            # Deduplicate Pharmacy Stock using unique SKU + Batch mapping
            existing_drug = Drug.objects.filter(sku=computed_sku, batch_no=computed_batch).first()
            
            if existing_drug:
                existing_drug.stock_quantity += usable_units
                existing_drug.save()
            else:
                # Automate retail point markup pricing baseline (e.g., + 33% standard healthcare buffer markup)
                computed_retail_price = Decimal(float(unit_cost_val) * 1.33)
                
                Drug.objects.create(
                    name=self.item_name,
                    sku=computed_sku,
                    batch_no=computed_batch,
                    dosage_form=dosage_val,
                    strength=strength_val if strength_val != "GEN" else "",
                    stock_quantity=usable_units,
                    cost_price_unit=unit_cost_val,
                    selling_price_kes=computed_retail_price,
                    expiry_date=self.expiry_date
                )


class PurchaseInvoice(models.Model):
    """The formal bill sent by the Supplier matched against a PO"""
    INVOICE_STATUS = [
        ('UNPAID', 'Unpaid'),
        ('PARTIAL', 'Partially Paid'),
        ('PAID', 'Paid In Full'),
    ]

    invoice_number = models.CharField(max_length=100, unique=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    total_billed = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=INVOICE_STATUS, default='UNPAID')
    invoice_file = models.FileField(upload_to='invoices/%Y/%m/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"INV-{self.invoice_number}"


class PaymentVoucher(models.Model):
    """The formal proof of payment issued to clear the invoice balance"""
    PAYMENT_MODES = [
        ('Bank Wire', 'Bank Wire'),
        ('M-Pesa Corporate', 'M-Pesa Corporate Paybill'),
        ('Cheque', 'Cheque'),
    ]

    voucher_number = models.CharField(max_length=50, unique=True, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name='vouchers')
    purchase_invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.PROTECT, related_name='vouchers')
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_mode = models.CharField(max_length=30, choices=PAYMENT_MODES, default='Bank Wire')
    payment_reference = models.CharField(max_length=100, unique=True, help_text="Transaction hash, Cheque No, or M-Pesa Code")
    date_issued = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.voucher_number

    def save(self, *args, **kwargs):
        if not self.voucher_number:
            count = PaymentVoucher.objects.count() + 1
            self.voucher_number = f"SALAMA-PV-{timezone.now().year}-{count:04d}"
        super().save(*args, **kwargs)

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
    

from django.db import models, transaction
from django.utils import timezone


    

    
class StockTake(models.Model):
    # Links directly to the inventory instance item being audited
    item = models.ForeignKey('InventoryItem', on_delete=models.CASCADE, related_name='stock_takes')
    
    # Frozen snapshot parameters captured directly from the Main Store inventory line during audit
    system_quantity = models.IntegerField(help_text="The quantity recorded in the database during audit")
    physical_quantity = models.IntegerField(help_text="The physical count verified on the ground by the officer")
    variance = models.IntegerField(default=0)
    variance_percentage = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    
    notes = models.TextField(blank=True, null=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    recorded_at = models.DateField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # 1. Automate variance equations cleanly before saving
        self.variance = self.physical_quantity - self.system_quantity
        if self.system_quantity > 0:
            self.variance_percentage = (float(self.variance) / float(self.system_quantity)) * 100
        else:
            self.variance_percentage = 100.00 if self.variance > 0 else 0.00
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Audit ({self.item.department}): {self.item.name} - Var: {self.variance}"
    
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
  
    if created:
       
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

    CHARGE_TYPE_CHOICES = [
        ('TRIGGERED', 'Triggered Event (Station Check-In)'),
        ('DAILY_RECURRING', 'Daily Recurring (Midnight Run)'),
        ('VARIABLE', 'Variable Entry (Manual input or Inventory)'),
    ]

    sku = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    dept = models.CharField(max_length=3, choices=DEPARTMENT_CHOICES)
    price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Base selling price in KES")
    charge_type = models.CharField(
        max_length=20, 
        choices=CHARGE_TYPE_CHOICES, 
        default='TRIGGERED',
        db_index=True
    )
    
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.sku} - {self.name} ({self.charge_type} - KES {self.price})"

class PatientInvoice(models.Model):
    """
    Groups all station charges incurred during a specific outpatient visit session.
    """
    STATUS_CHOICES = [
        ('UNPAID', 'Unpaid Draft'),
        ('PARTIAL', 'Partially Paid'),
        ('PAID', 'Fully Settled'),
        ('INSURANCE_PENDING', 'Awaiting Insurance Pre-Auth Clear'),
    ]

    # Unique Patient-Scoped Invoice tracking key matching: INV001-SCC-015/26 format
    invoice_number = models.CharField(max_length=100, unique=True, blank=True, null=True)

    visit = models.OneToOneField(
        'RegistrationRecord', 
        on_delete=models.CASCADE, 
        related_name='invoice'
    )
    patient = models.ForeignKey(
        'Patient', 
        on_delete=models.CASCADE, 
        related_name='invoices'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UNPAID')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    mpesa_checkout_id = models.CharField(max_length=100, blank=True, null=True)
    receipt_number = models.CharField(max_length=50, blank=True, null=True)
    payment_method = models.CharField(max_length=20, blank=True, null=True)

    @property
    def total_payable(self):
        """Aggregates all related line item costs dynamically for the frontend total"""
        return sum(item.total_cost for item in self.items.all())

    @classmethod
    def get_or_create_active_invoice(cls, registration_record):
        """
        Safety Hook: Locates an existing open invoice session ledger for the 
        current registration file or builds a clean one on demand.
        """
        invoice, created = cls.objects.get_or_create(
            visit=registration_record,
            patient=registration_record.patient,
            defaults={'status': 'UNPAID'}
        )
        return invoice

    def save(self, *args, **kwargs):
        """
        Intercept instance saves to auto-calculate patient-scoped structural tracking identifiers.
        """
        # Save first to establish a primary key if this is a new object
        super().save(*args, **kwargs)

        # Generate invoice tracker identifier sequences safely if completely empty
        if not self.invoice_number:
            # 1. Fetch the absolute, unchangeable health record number from the patient profile
            # e.g., 'SCC-015'
            hr_number = self.patient.health_record_number if self.patient else "UNKNOWN"
            
            # 2. Get current trailing 2-digit financial tracking year, e.g., '26'
            current_year = timezone.now().strftime('%y')
            
            # 3. Dynamic Patient Scope Check: Count pre-existing invoices recorded for this specific patient profile
            # We exclude self.id just in case a partial save was called elsewhere
            prior_invoice_count = type(self).objects.filter(patient=self.patient).exclude(id=self.id).count()
            
            # 4. Increment the historical ledger row depth by 1 and pad with zeros (e.g., 0 -> '001', 1 -> '002')
            sequence_string = str(prior_invoice_count + 1).zfill(3)
            
            # 5. Assemble exact requested format block: INV001-SCC-015/26
            self.invoice_number = f"INV{sequence_string}-{hr_number}/{current_year}"
            
            # 6. Push explicit updates into database rows without entering recursive save loops
            type(self).objects.filter(id=self.id).update(invoice_number=self.invoice_number)

    def __str__(self):
        if self.invoice_number:
            return f"{self.invoice_number} - {self.patient.name if self.patient else 'Unknown'}"
        if hasattr(self, 'patient') and self.patient:
            return f"Invoice for {self.patient.name}"
        return f"Invoice #{self.id}"

class PatientBillableItem(models.Model):
    """
    Unified line-item ledger that pulls costs from both standard Services 
    and Pharmacy Drugs, tracking the 6 exact active charging stations.
    """
    STATION_DISPLAY_CHOICES = [
        ('Consultation', 'Oncology (Consultation Room)'),
        ('Laboratory', 'Laboratory'),
        ('Radiology', 'Radiology & Imaging'),
        ('Nursing', 'Nursing & Procedures'),
        ('Pharmacy', 'Pharmacy'),
        ('Psychology', 'Counselling Psychology'),
    ]

    invoice = models.ForeignKey(
        PatientInvoice, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    
    station = models.CharField(
        max_length=30, 
        choices=STATION_DISPLAY_CHOICES, 
        default='Consultation'
    )

    service = models.ForeignKey(
        'Service', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='billable_items'
    )
    drug = models.ForeignKey(
        'Drug',  
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='billable_items'
    )

    name = models.CharField(
        max_length=255, 
        help_text="Captured name at the moment of entry execution"
    )
    unit_price = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0.00
    )
    quantity = models.PositiveIntegerField(default=1)
    
    is_paid = models.BooleanField(default=False)
    incurred_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_cost(self):
        return self.unit_price * self.quantity

    def save(self, *args, **kwargs):
        """
        Auto-lookup hook: pull default prices and standard names from 
        the source catalog records if not explicitly declared.
        """
        if self.service and not self.name:
            self.name = self.service.name
            self.unit_price = self.service.price
            
            dept_mapping = {
                'ONC': 'Consultation',
                'LAB': 'Laboratory',
                'RAD': 'Radiology',
                'NUR': 'Nursing',
                'PHA': 'Pharmacy',
                'PSY': 'Psychology'
            }
            self.station = dept_mapping.get(self.service.dept, 'Consultation')
            
        elif self.drug and not self.name:
            self.name = f"{self.drug.name} ({self.drug.strength or ''})"
            if self.unit_price == Decimal('0.00') and hasattr(self.drug, 'selling_price_kes'):
                self.unit_price = self.drug.selling_price_kes
            self.station = 'Pharmacy'

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.station} -> {self.name} ({self.quantity}x KES {self.unit_price})"


class FixedAsset(models.Model):
    DEPARTMENT_CHOICES = [
        ('PHARMACY', 'Pharmacy'),
        ('LAB', 'Laboratory'),
        ('NURSING', 'Nursing'),
        ('RADIOLOGY', 'Radiology'),
        ('ADMIN', 'General Admin'),
    ]

    name = models.CharField(
        max_length=255, 
        help_text="Name of the asset (e.g., Siemens Ultrasound Pro)"
    )
    sku = models.CharField(
        max_length=100, 
        unique=True, 
        help_text="Automatically generated unique asset code identifier"
    )
    department = models.CharField(
        max_length=50, 
        choices=DEPARTMENT_CHOICES, 
        default='PHARMACY',
        help_text="The clinical or administrative department using this asset"
    )
    quantity = models.PositiveIntegerField(
        default=1,
        help_text="Number of units owned by the hospital"
    )
    unit_cost = models.DecimalField(
        max_digits=14, 
        decimal_places=2,
        help_text="The purchase cost per individual unit in KES"
    )
    salvage_value = models.DecimalField(
        max_digits=14, 
        decimal_places=2, 
        default=0.00,
        help_text="Expected resale or scrap value of a single unit at the end of its usefulness"
    )
    depreciation_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=20.00,
        help_text="The annual percentage rate of value loss (e.g., 20.00 for 20%)"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the asset record was first onboarding"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the asset details were last updated"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Fixed Asset"
        verbose_name_plural = "Fixed Assets"

    # Business Logic Fallback: Automatically build a safe SKU if not passed directly by an API payload
    def save(self, *args, **kwargs):
        if not self.sku and self.name:
            clean_name = "".join(self.name.split()).upper()[:6]
            clean_dept = self.department[:3].upper()
            self.sku = f"AST-{clean_dept}-{clean_name}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.sku}) - Qty: {self.quantity}"
    

class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('SALARIES', 'Salaries'),
        ('WAGES', 'Wages'),
        ('LOCUM', 'Locum'),
        ('TRANSPORT', 'Transport'),
        ('SECURITY', 'Security & Alarm'),
        ('MAINTENANCE', 'Maintenance'),
        ('CATERING', 'Catering'),
        ('BANK_CHARGES', 'Bank Charges'),
        ('LICENSING', 'Licensing'),
        ('MARKETING', 'Marketing'),
        ('LEGAL_FEES', 'Legal Fees'),
        ('COMMUNICATION', 'Communication'),
        ('RENT', 'Rent'),
        ('UTILITIES', 'Utilities (Water & Elec)'),
    ]

    BEHAVIOR_CHOICES = [
        ('Fixed', 'Fixed (Auto-Renewable)'),
        ('Variable', 'Variable (On-Demand)'),
    ]

    STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PARTIAL', 'Partially Paid'),
        ('PAID', 'Fully Paid'),
    ]

    description = models.CharField(max_length=255)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='SALARIES')
    behavior = models.CharField(max_length=15, choices=BEHAVIOR_CHOICES, default='Fixed')
    date = models.DateField(default=timezone.now)
    
    # Financial fields tracking invoice vs actual offsets
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total expense amount invoiced/due")
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Amount paid to offset expense")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='UNPAID')
    
    reference = models.CharField(max_length=100, blank=True, null=True, default='PENDING_SORT')
    document = models.FileField(upload_to='expense_proofs/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = "Expense Voucher"
        verbose_name_plural = "Expense Vouchers"

    def save(self, *args, **kwargs):
        # Auto-compute status dynamically based on amount logged prior to saving
        if self.amount_paid <= 0:
            self.status = 'UNPAID'
        elif self.amount_paid < self.amount:
            self.status = 'PARTIAL'
        else:
            self.status = 'PAID'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} ({self.category}) - Paid: KES {self.amount_paid}/{self.amount}"

class LabInventoryItem(models.Model):
    CATEGORY_CHOICES = [
        ('Chemicals', 'Chemicals'),
        ('Consumables', 'Consumables'),
        ('Reagents', 'Reagents'),
        ('Microscopy', 'Microscopy'),
    ]

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=255, choices=CATEGORY_CHOICES, default="General")
    stock = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=5)
    unit = models.CharField(max_length=50, default="Units")
    
    buying_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.stock} {self.unit} remaining)"
    
class PharmacyStockCatalogItem(models.Model):
    drug_name = models.CharField(max_length=255, unique=True)
    formulation = models.CharField(max_length=255, help_text="e.g., Tablets, Vials, Syrup")
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