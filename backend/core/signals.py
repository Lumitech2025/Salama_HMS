from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import (
    Queue, 
    LabOrder, 
    ImagingOrder, 
    NurseServiceOrder,  # Added new model import
    PatientInvoice, 
    PatientBillableItem, 
    Service
)

@receiver(post_save, sender=Queue)
def trigger_station_checkin_charges(sender, instance, created, **kwargs):
    """
    Listens to the Queue tracking mechanism. When a patient's current_station changes,
    we look up if there is a flat 'TRIGGERED' event fee mapped to that department.
    """
    if not instance.visit:
        return  # No active registration record context to bill against
        
    # Get or spin up the open tracking session invoice
    invoice, _ = PatientInvoice.objects.get_or_create(
        visit=instance.visit,
        patient=instance.patient,
        defaults={'status': 'UNPAID'}
    )

    # Core mapping matching your distinct charging stations
    station_dept_map = {
        'DOCTOR': 'ONC',      # Consultation Room -> Oncology Center Fee
        'LAB': 'LAB',         # Lab Check-in basic tariff
        'RADIOLOGY': 'RAD',   # Radiology basic check-in tariff
        'NURSE': 'NUR',       # Updated to match station naming pattern for Nursing/Triage
        'PSYCHOLOGY': 'PSY',  # Counselling Psychology session fee
        'PHARMACY': 'PHA',    # Pharmacy billing line items
    }

    target_dept = station_dept_map.get(instance.current_station)
    if target_dept:
        # Search the master service table for automated check-in base rates
        matching_service = Service.objects.filter(
            dept=target_dept, 
            charge_type='TRIGGERED', 
            active=True
        ).first()

        if matching_service:
            # Check if this exact base tariff has already been billed for this visit session
            already_billed = PatientBillableItem.objects.filter(
                invoice=invoice,
                service=matching_service
            ).exists()

            if not already_billed:
                # Ensure structure matches unit price and name defaults if required
                PatientBillableItem.objects.create(
                    invoice=invoice,
                    service=matching_service,
                    quantity=1,
                    defaults={
                        'unit_price': matching_service.price,
                        'name': matching_service.name
                    } if hasattr(PatientBillableItem, 'unit_price') else {}
                )


@receiver(post_save, sender=LabOrder)
def trigger_completed_lab_charges(sender, instance, created=False, **kwargs):
    """
    Listens to Lab Orders. Fires immediately when an order is created or updated
    to parse active test flags and bill them against the dynamic service catalog prices.
    """
    if not instance.visit:
        return

    # Fetch or initialize the active open tracking invoice ledger
    invoice, _ = PatientInvoice.objects.get_or_create(
        visit=instance.visit,
        patient=instance.patient,
        defaults={'status': 'UNPAID'}
    )

    # Dictionary mapping potential model field flags to your master Service SKUs
    lab_test_sku_map = {
        'has_cbc': 'LAB-CBC',
        'has_ue': 'LAB-UE',
        'has_lft': 'LAB-LFT',
        'has_psa': 'LAB-PSA',
        'has_urine': 'LAB-URINE',
        'has_bg_cross': 'LAB-BG_CROSS',
        'has_bs_mp': 'LAB-BS_MP',
    }

    for flag_attr, service_sku in lab_test_sku_map.items():
        if hasattr(instance, flag_attr):
            is_test_selected = getattr(instance, flag_attr, False)
        else:
            alt_attr = flag_attr.replace('_', '')
            is_test_selected = getattr(instance, alt_attr, False)

        if is_test_selected:
            matching_service = Service.objects.filter(sku=service_sku, active=True).first()
            
            if matching_service:
                PatientBillableItem.objects.get_or_create(
                    invoice=invoice,
                    service=matching_service,
                    defaults={'quantity': 1}
                )


@receiver(post_save, sender=ImagingOrder)
def trigger_completed_imaging_charges(sender, instance, created=False, **kwargs):
    """
    Listens to Imaging Orders.
    Fires on creation/update to parse active ultrasound matrix flags and post 
    them directly to the active ledger invoice.
    """
    if not instance.visit:
        return

    # Fetch or initialize the active open tracking invoice ledger
    invoice, _ = PatientInvoice.objects.get_or_create(
        visit=instance.visit,
        patient=instance.patient,
        defaults={'status': 'UNPAID'}
    )

    # Dictionary mapping internal ultrasound boolean parameters to exact SKUs
    imaging_scan_sku_map = {
        'has_us_carotid': 'RAD-US_CAROTID',
        'has_us_duplex_low_ext': 'RAD-US_DUPLEX_LOW_EXT',
        'has_us_venous_ext': 'RAD-US_VENOUS_EXT',
        'has_us_venous_unila': 'RAD-US_VENOUS_UNILA',
        'has_us_doppler_abd_pel': 'RAD-US_DOPPLER_ABD_PEL',
        'has_us_limited_duplex': 'RAD-US_LIMITED_DUPLEX',
        'has_us_hemodialysis': 'RAD-US_HEMODIALYSIS',
    }

    for flag_attr, service_sku in imaging_scan_sku_map.items():
        if hasattr(instance, flag_attr):
            is_scan_selected = getattr(instance, flag_attr, False)
        else:
            alt_attr = flag_attr.replace('_', '')
            is_scan_selected = getattr(instance, alt_attr, False)

        if is_scan_selected:
            matching_service = Service.objects.filter(sku=service_sku, active=True).first()
            
            if matching_service:
                base_price = matching_service.price
                PatientBillableItem.objects.get_or_create(
                    invoice=invoice,
                    service=matching_service,
                    defaults={
                        'quantity': 1,
                        'unit_price': base_price,
                        'name': matching_service.name
                    }
                )


@receiver(post_save, sender=NurseServiceOrder)
def trigger_completed_nurse_charges(sender, instance, created=False, **kwargs):
    """
    ✨ NEW: Listens to Nurse Service Orders.
    Fires on creation/update to parse active nursing service flags (Wound Dressing, 
    Catheter Change, Pelvic Screening) and maps them cleanly onto the invoice ledger.
    """
    if not instance.visit:
        return

    # Fetch or initialize the active open tracking invoice ledger
    invoice, _ = PatientInvoice.objects.get_or_create(
        visit=instance.visit,
        patient=instance.patient,
        defaults={'status': 'UNPAID'}
    )

    # Dictionary mapping internal nursing boolean parameters to explicit billing SKUs
    nurse_service_sku_map = {
        'has_wound_dressing': 'NUR-WOUND',
        'has_catheter_change': 'NUR-CATH',
        'has_pelvic_screening': 'NUR-PELVIC',
    }

    for flag_attr, service_sku in nurse_service_sku_map.items():
        if hasattr(instance, flag_attr):
            is_service_selected = getattr(instance, flag_attr, False)
        else:
            alt_attr = flag_attr.replace('_', '')
            is_service_selected = getattr(instance, alt_attr, False)

        if is_service_selected:
            matching_service = Service.objects.filter(sku=service_sku, active=True).first()
            
            if matching_service:
                base_price = matching_service.price
                PatientBillableItem.objects.get_or_create(
                    invoice=invoice,
                    service=matching_service,
                    defaults={
                        'quantity': 1,
                        'unit_price': base_price,
                        'name': matching_service.name
                    }
                )