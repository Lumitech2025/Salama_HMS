# seed_claims.py
import os
import django
import random

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings") # Swap with your actual project directory name if different
django.setup()

from django.utils import timezone
from core.models import InsuranceClaim, PatientInvoice, Patient, InsuranceCompany # Adjust application label if necessary

def seed():
    print("Seeding demo rows into InsuranceClaim model...")
    invoice = PatientInvoice.objects.first()
    company = InsuranceCompany.objects.first()
    patient = Patient.objects.first()
    
    if not invoice:
        print("Error: Please make sure you have at least 1 PatientInvoice created first!")
        return

    claim = InsuranceClaim.objects.create(
        claim_number=f"CLM-26-{random.randint(1000, 9999)}",
        patient=patient or getattr(invoice, 'patient', None),
        patient_invoice=invoice,
        insurance_company=company,
        pre_auth_code=f"AUTH-2026-XYZ{random.randint(100, 999)}",
        total_amount_billed=getattr(invoice, 'total_payable', 15000.00),
        status="SUBMITTED",
        date_submitted=timezone.now()
    )
    print(f"Success! Created claim {claim.claim_number} for invoice {invoice.invoice_number}")

if __name__ == "__main__":
    seed()