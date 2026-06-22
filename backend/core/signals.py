from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

#  CLEANED UP: Removed all direct imports from .models at the top!

@receiver(post_save, sender='core.Queue')  #  CHANGED: Pass sender as a string
def trigger_station_checkin_charges(sender, instance, created, **kwargs):
    """
    Listens to the Queue tracking mechanism. When a patient's current_station changes,
    we look up if there is a flat 'TRIGGERED' event fee mapped to that department.
    """
    #  INLINE IMPORTS: Imported safely inside the signal context execution scope
    from core.models import PatientInvoice, PatientBillableItem, Service

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
                extra_fields = {}
                if hasattr(PatientBillableItem, 'unit_price'):
                    extra_fields['unit_price'] = matching_service.price
                if hasattr(PatientBillableItem, 'name'):
                    extra_fields['name'] = matching_service.name

                PatientBillableItem.objects.create(
                    invoice=invoice,
                    service=matching_service,
                    quantity=1,
                    **extra_fields
                )


@receiver(post_save, sender='core.LabOrder')  #  CHANGED: Pass sender as a string
def trigger_completed_lab_charges(sender, instance, created=False, **kwargs):
    """
    Listens to Lab Orders. Fires immediately when an order is created or updated
    to parse active test flags and bill them against the dynamic service catalog prices.
    """
    #  INLINE IMPORTS
    from core.models import PatientInvoice, PatientBillableItem, Service

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


@receiver(post_save, sender='core.ImagingOrder')  #  CHANGED: Pass sender as a string
def trigger_completed_imaging_charges(sender, instance, created=False, **kwargs):
    """
    Listens to Imaging Orders.
    Fires on creation/update to parse active ultrasound matrix flags and post 
    them directly to the active ledger invoice.
    """
    #  INLINE IMPORTS
    from core.models import PatientInvoice, PatientBillableItem, Service

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


@receiver(post_save, sender='core.NurseServiceOrder')  #  CHANGED: Pass sender as a string
def trigger_completed_nurse_charges(sender, instance, created=False, **kwargs):
    """
    Listens to Nurse Service Orders.
    Fires on creation/update to parse active nursing service flags, maps them cleanly 
    onto the invoice ledger, AND synchronizes the patient's queue tracker to the NURSE station.
    """
    #  INLINE IMPORTS
    from core.models import PatientInvoice, PatientBillableItem, Service, Queue

    if not instance.visit:
        return

    # 1. Fetch or initialize the active open tracking invoice ledger
    invoice, _ = PatientInvoice.objects.get_or_create(
        visit=instance.visit,
        patient=instance.patient,
        defaults={'status': 'UNPAID'}
    )

    # 2. Auto-route the patient's active queue tracking to the NURSE station
    Queue.objects.filter(
        visit=instance.visit, 
        patient=instance.patient
    ).update(current_station='NURSE')

    # 3. Dictionary mapping internal nursing boolean parameters to explicit billing SKUs
    nurse_service_sku_map = {
        'has_wound_dressing': 'NUR-WOUND',
        'has_catheter_change': 'NUR-CATH',
        'has_pelvic_screening': 'NUR-PELVIC',
    }

    # Collect all valid SKUs that are marked True on this instance
    active_skus = []
    for flag_attr, service_sku in nurse_service_sku_map.items():
        if hasattr(instance, flag_attr):
            is_service_selected = getattr(instance, flag_attr, False)
        else:
            alt_attr = flag_attr.replace('_', '')
            is_service_selected = getattr(instance, alt_attr, False)

        if is_service_selected:
            active_skus.append(service_sku)

    if not active_skus:
        return

    # Bulk fetch all matching services from the master catalog in one database query
    matching_services = Service.objects.filter(sku__in=active_skus, active=True)

    # Find what has already been billed on this invoice to prevent duplicate lines
    already_billed_skus = PatientBillableItem.objects.filter(
        invoice=invoice,
        service__sku__in=active_skus
    ).values_list('service__sku', flat=True)

    # Safely create billable items for any newly selected services
    for service in matching_services:
        if service.sku not in already_billed_skus:
            extra_fields = {}
            if hasattr(PatientBillableItem, 'unit_price'):
                extra_fields['unit_price'] = service.price
            if hasattr(PatientBillableItem, 'name'):
                extra_fields['name'] = service.name

            PatientBillableItem.objects.create(
                invoice=invoice,
                service=service,
                quantity=1,
                **extra_fields
            )


@receiver(post_save, sender='core.Prescription')  #  CHANGED: Pass sender as a string
def trigger_completed_pharmacy_charges(sender, instance, created=False, **kwargs):
    """
    Listens to Prescriptions. Fires automatically when a prescription is issued or updated 
    to process the item selection, pull real-time retail prices from the Drug inventory,
    and post them directly onto the open PatientInvoice.
    """
    #  INLINE IMPORTS
    from core.models import PatientInvoice, PatientBillableItem, Service

    # 1. Operational Guard: Ensure an active medical registration session exists
    if not instance.visit:
        return

    # 2. Skip charging if the medication has not been cleared for dispensation yet
    if hasattr(instance, 'status') and getattr(instance, 'status') != 'DISPENSED':
        return

    # 3. Retrieve or spin up the active tracking invoice ledger
    invoice, _ = PatientInvoice.objects.get_or_create(
        visit=instance.visit,
        patient=instance.patient,
        defaults={'status': 'UNPAID'}
    )

    # 4. Resolve the stock entry item from the inventory layout using the drug relation
    if not hasattr(instance, 'drug') or not instance.drug:
        return
        
    drug_inventory_item = instance.drug

    # 5. Guard check: Prevent billing for expired medications
    if drug_inventory_item.is_expired:
        return

    # 6. Extract the dynamic cost matrix components directly from the Drug model attributes
    retail_rate = drug_inventory_item.selling_price_kes
    billing_item_name = f"Medication: {drug_inventory_item.name} ({drug_inventory_item.strength})"
    dispensed_quantity = getattr(instance, 'quantity', 1) # Fallback to 1 if unspecified

    # 7. Locate your fallback pharmacy service SKU to maintain database integrity
    fallback_pharmacy_service = Service.objects.filter(dept='PHA', active=True).first()

    # 8. Look up if this particular drug has already been billed for this visit context
    already_billed = PatientBillableItem.objects.filter(
        invoice=invoice,
        name=billing_item_name
    ).exists()

    if not already_billed:
        extra_fields = {}
        
        # Populate operational parameters conditionally depending on schema attributes
        if hasattr(PatientBillableItem, 'unit_price'):
            extra_fields['unit_price'] = retail_rate
        if hasattr(PatientBillableItem, 'name'):
            extra_fields['name'] = billing_item_name
            
        if hasattr(PatientBillableItem, 'drug'):
            extra_fields['drug'] = drug_inventory_item

        # 9. Commit the item to the billing matrix ledger
        PatientBillableItem.objects.create(
            invoice=invoice,
            service=fallback_pharmacy_service,  
            quantity=dispensed_quantity,
            **extra_fields
        )


@receiver(post_save, sender='core.PatientInvoice')
def auto_compile_corporate_insurance_claim(sender, instance, created, **kwargs):
    """
    Automated Hook: Intercepts changes to PatientInvoices. If the outpatient visit 
    is backed by an insurance policy, it compiles or updates the outbound claims registry automatically.
    """
    import random
    from django.utils import timezone
    from core.models import InsuranceClaim

    visit = instance.visit
    
    # 1. Operational Guard: Only handle if the visit was registered as an INSURANCE encounter
    if not visit or visit.payment_mode != "INSURANCE" or not visit.insurance_company:
        return

    # 2. Extract current calculated totals from your dynamic model @property
    # Using a safety fallback of 0.00 if no items are present yet
    calculated_total = instance.total_payable or 0.00

    # 3. Prevent Duplication: Check if a claims entry is already tracking this invoice structure
    claim = InsuranceClaim.objects.filter(patient_invoice=instance).first()

    if not claim:
        # If no claim rows exist yet, create a fresh tracking reference record
        short_year = timezone.now().strftime('%y')
        random_suffix = random.randint(1000, 9999)
        
        InsuranceClaim.objects.create(
            patient=instance.patient,
            insurance_company=visit.insurance_company,
            patient_invoice=instance,
            total_amount_billed=calculated_total,
            claim_number=f"CLM-{short_year}-{random_suffix}",
            pre_auth_code=f"AUTH-2026-TMP{random.randint(10000, 99999)}",
            status="PRE_AUTH_PENDING"
        )
    else:
        # If the claim already exists but clinicians have added more tests/medications,
        # update the amount billed dynamically so the dashboard displays the right total!
        if claim.total_amount_billed != calculated_total:
            InsuranceClaim.objects.filter(id=claim.id).update(total_amount_billed=calculated_total)



@receiver([post_save, post_delete], sender='core.PatientBillableItem')
def update_claim_on_billable_item_change(sender, instance, **kwargs):
    """
    Real-Time Total Sync: Whenever a line item (service, drug, lab fee) is added, 
    updated, or removed from an invoice, automatically recalculate the associated 
    Insurance Claim's total value so the Finance Portal stays accurate.
    """
    from core.models import InsuranceClaim
    
    invoice = instance.invoice
    if not invoice:
        return

    # Look up if an insurance claim tracking row exists for this invoice ledger
    claim = InsuranceClaim.objects.filter(patient_invoice=invoice).first()
    
    if claim:
        # Force evaluation of the dynamic @property aggregate sum
        fresh_total = invoice.total_payable or 0.00
        
        # Safely push explicit updates to the database row if the total has shifted
        if claim.total_amount_billed != fresh_total:
            InsuranceClaim.objects.filter(id=claim.id).update(total_amount_billed=fresh_total)