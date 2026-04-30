from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('ONCOLOGIST', 'Oncologist'),
        ('NURSE', 'Nurse'),
        ('PHARMACIST', 'Pharmacist'),
        ('BILLING', 'Billing Officer'),
        ('RECEPTIONIST', 'Receptionist'),
        ('LAB_TECH', 'Lab Technician'),
        ('RADIOLOGIST', 'Radiologist'),
        ('ADMIN', 'HMS Admin'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='RECEPTIONIST')
    employee_id = models.CharField(max_length=15, unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

# --- Clinical Models ---

class Patient(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    
    name = models.CharField(max_length=255)
    registry_no = models.CharField(max_length=50, unique=True)
    dob = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    cancer_type = models.CharField(max_length=255)
    staging = models.CharField(max_length=50, blank=True)
    biomarkers = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.registry_no})"

class Protocol(models.Model):
    """Standardized treatment plans (e.g., AC-T for Breast Cancer)"""
    name = models.CharField(max_length=255)
    description = models.TextField()
    total_cycles = models.IntegerField(default=1)

    def __str__(self):
        return self.name

class Treatment(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='treatments')
    protocol = models.ForeignKey(Protocol, on_delete=models.SET_NULL, null=True)
    start_date = models.DateField()
    status = models.CharField(max_length=20, default='ACTIVE')

    def __str__(self):
        return f"Treatment for {self.patient.name}"

class ChemoSession(models.Model):
    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE)
    date = models.DateTimeField()
    cycle_no = models.IntegerField()
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Session {self.cycle_no} - {self.treatment.patient.name}"

class Drug(models.Model):
    name = models.CharField(max_length=255)
    batch_no = models.CharField(max_length=100)
    stock_quantity = models.IntegerField()

    def __str__(self):
        return self.name

class LabResult(models.Model): # This resolves your ImportError
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    test_name = models.CharField(max_length=255)
    result_value = models.CharField(max_length=255)
    is_critical = models.BooleanField(default=False)
    test_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.test_name}: {self.patient.name}"

class Bill(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Bill for {self.patient.name} - {self.amount}"