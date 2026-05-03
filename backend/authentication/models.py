# authentication/models.py
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
        ('STAFF', 'General Staff'),
        ('PATIENT', 'Patient'),
        ('CLIENT', 'Client'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='RECEPTIONIST')
    # Supporting both names to fix your previous attribute errors
    designation = models.CharField(max_length=50, blank=True, null=True) 
    employee_id = models.CharField(max_length=15, unique=True, null=True, blank=True)
    
    # This is the "Heart Bypass" that fixes the login
    USERNAME_FIELD = 'employee_id' 
    REQUIRED_FIELDS = ['username', 'email']

    phone_number = models.CharField(max_length=15, blank=True)
    is_password_change_required = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        # Automatically sync designation with role for compatibility
        if not self.designation:
            self.designation = self.role
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_role_display()}: {self.first_name} {self.last_name} ({self.employee_id})"