from django.db import models

# Create your models here.

from django.db import models
from django.contrib.auth.models import User

# --- 1. PATIENT MANAGEMENT ---
class Patient(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    
    name = models.CharField(max_length=200)
    registry_no = models.CharField(max_length=50, unique=True, help_text="Cancer Registry Number")
    dob = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    
    # Oncology Specifics (Using JSONField for flexibility)
    cancer_type = models.CharField(max_length=100)
    staging = models.JSONField(default=dict, help_text="TNM Staging (e.g., {'T': 1, 'N': 0, 'M': 0})")
    biomarkers = models.JSONField(default=dict, help_text="ER, PR, HER2, etc.")
    ecog_status = models.IntegerField(default=0, help_text="0-5 scale")
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.registry_no})"

# --- 2. ONCOLOGY TREATMENT ---
class Protocol(models.Model):
    name = models.CharField(max_length=100) # e.g., CHOP
    description = models.TextField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Treatment(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='treatments')
    protocol = models.ForeignKey(Protocol, on_delete=models.PROTECT)
    start_date = models.DateField()
    total_cycles = models.IntegerField()
    status = models.CharField(max_length=20, default='Active')

class ChemoSession(models.Model):
    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE)
    cycle_no = models.IntegerField()
    administered_at = models.DateTimeField(auto_now_add=True)
    nurse = models.ForeignKey(User, on_delete=models.SET_NULL, null=True) # Staff assignment
    toxicity_score = models.IntegerField(default=0, help_text="CTCAE grade")
    notes = models.TextField(blank=True)

# --- 3. PHARMACY & INVENTORY ---
class Drug(models.Model):
    name = models.CharField(max_length=100)
    batch_no = models.CharField(max_length=50)
    expiry_date = models.DateField()
    stock_qty = models.IntegerField(default=0)
    min_threshold = models.IntegerField(default=10)

# --- 4. LAB & BILLING ---
class LabResult(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    test_name = models.CharField(max_length=100) # e.g., CBC, PSA
    result_value = models.CharField(max_length=50)
    is_critical = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

class Bill(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)
    insurance_claim_status = models.CharField(max_length=50, default='Pending')