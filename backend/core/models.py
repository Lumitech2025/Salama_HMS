from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


# --- Clinical Models ---

class Patient(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    BLOOD_GROUPS = [('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'), ('O+', 'O+'), ('O-', 'O-'), ('AB+', 'AB+'), ('AB-', 'AB-')]
    
    # Core Identity
    name = models.CharField(max_length=255) # Concatenated firstName + lastName
    registry_no = models.CharField(max_length=50, unique=True) # National ID/Passport
    dob = models.DateField(verbose_name="Date of Birth")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUPS, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Oncology Specifics
    cancer_type = models.CharField(max_length=255)
    staging = models.CharField(max_length=50, blank=True)
    # Vital for the PatientSerializer and oncology triage
    ecog_status = models.IntegerField(default=0, help_text="0-5 Performance Status") 
    biomarkers = models.TextField(blank=True, help_text="Relevant genetic or protein markers")
    
    # Billing & Insurance
    insurance_type = models.CharField(max_length=50, default="CASH")
    insurance_no = models.CharField(max_length=100, blank=True)
    
    # Emergency Contact
    emergency_contact = models.CharField(max_length=255, blank=True) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.registry_no})"

class Protocol(models.Model):
    """Standardized treatment plans (e.g., AC-T for Breast Cancer)"""
    name = models.CharField(max_length=255)
    description = models.TextField()
    total_cycles = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.name

class Treatment(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('ON_HOLD', 'On Hold'),
        ('TERMINATED', 'Terminated'),
    ]

    
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='treatments')
    protocol = models.ForeignKey(Protocol, on_delete=models.SET_NULL, null=True)
    oncologist = models.ForeignKey(
        settings.AUTH_USER_MODEL,  # Use the setting, not the class name
        on_delete=models.SET_NULL, 
        null=True, 
        limit_choices_to={'role': 'ONCOLOGIST'}
    )
    start_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    def __str__(self):
        return f"{self.protocol.name if self.protocol else 'Custom'} for {self.patient.name}"

class ChemoSession(models.Model):
    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateTimeField()
    cycle_no = models.IntegerField()
    administered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        limit_choices_to={'role': 'NURSE'}
    )
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Cycle {self.cycle_no} - {self.treatment.patient.name}"

class Drug(models.Model):
    name = models.CharField(max_length=255)
    batch_no = models.CharField(max_length=100)
    stock_quantity = models.PositiveIntegerField()
    expiry_date = models.DateField(null=True) # Critical safety field

    def __str__(self):
        return f"{self.name} (Batch: {self.batch_no})"

class LabResult(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    test_name = models.CharField(max_length=255)
    result_value = models.CharField(max_length=255)
    is_critical = models.BooleanField(default=False, help_text="Flags for immediate attention")
    test_date = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'LAB_TECH'})

    def __str__(self):
        return f"{self.test_name}: {self.patient.name}"

class Bill(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)
    billing_officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'BILLING'})
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Bill for {self.patient.name} - {self.amount}"