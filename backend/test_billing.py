import os
import django

# Setup Django environment context
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings') 
django.setup()

from core.models import PatientInvoice, PatientBillableItem

def run_diagnostic():
    print("\n" + "="*50)
    print("🚀 RUNNING BILLING DATA DIAGNOSTIC")
    print("="*50)

    # 1. Grab the last 3 invoices to see what's actually saving
    latest_invoices = PatientInvoice.objects.order_by('-id')[:3]
    
    if not latest_invoices.exists():
        print("❌ No invoices found in the database.")
        return

    for invoice in latest_invoices:
        print(f"\n📑 INVOICE ID: #{invoice.id} | Status: {invoice.status}")
        
        # Get patient name safely
        patient = getattr(invoice, 'patient', None)
        if patient:
            name = getattr(patient, 'name', None) or getattr(patient, 'first_name', 'Unknown')
            print(f"👤 Patient: {name}")
        
        # Pull associated billable items
        items = PatientBillableItem.objects.filter(invoice=invoice)
        print(f"📊 Rows found in database for this invoice: {items.count()}")
        
        for item in items:
            # Check if there's a linked service or if it's orphaned
            service = getattr(item, 'service', None)
            service_name = service.name if service else "No Linked Service Model"
            sku = service.sku if service else "N/A"
            
            # Look at prices
            item_price = getattr(item, 'price', 'N/A')
            catalog_price = service.price if (service and hasattr(service, 'price')) else 'N/A'
            
            print(f"   -> [SKU: {sku}] {service_name}")
            print(f"      Row Price: KES {item_price} | Catalogue Master Price: KES {catalog_price}")
            
    print("\n" + "="*50 + "\n")

if __name__ == '__main__':
    run_diagnostic()