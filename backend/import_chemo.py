import os
import sys
import pandas as pd
import django

# Setup Django configuration 
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import CancerSite, CancerType, Regimen, RegimenDrug # Change your_app to your actual app name

def import_chemo_protocols(file_path):
    print(f"Starting import from: {file_path}")
    
    df = pd.read_csv(file_path)
    df.columns = [str(col).strip() for col in df.columns]
    
    current_site = None
    current_type = None
    current_regimen = None
    inserted_count = 0

    for index, row in df.iterrows():
        site_name = str(row.get('Primary Site', '')).strip()
        type_name = str(row.get('Cancer Type', '')).strip()
        regimen_name = str(row.get('Regimen', '')).strip()
        description = str(row.get('Description', '')).strip()
        dosage = str(row.get('Dosage', '')).strip()
        cost_raw = str(row.get('Cost per cycle', '')).strip()
        cycles_raw = str(row.get('Cycles', '')).strip()

        # Update active Primary Site group
        if site_name and site_name.lower() != 'nan':
            current_site, _ = CancerSite.objects.get_or_create(name=site_name.upper())

        # Update active Subtype group
        if type_name and type_name.lower() != 'nan' and current_site:
            current_type, _ = CancerType.objects.get_or_create(site=current_site, name=type_name)

        # Update active Protocol/Regimen group
        if regimen_name and regimen_name.lower() != 'nan' and current_type:
            try:
                cycles_val = int(float(cycles_raw))
            except ValueError:
                cycles_val = 6 
                
            current_regimen, _ = Regimen.objects.get_or_create(
                cancer_type=current_type,
                name=regimen_name,
                defaults={'default_cycles': cycles_val}
            )

        # Only insert actual drug rows
        if description and description.lower() != 'nan' and 'capture' not in description.lower():
            if current_regimen:
                # Clean up pricing numbers safely and prevent 'nan' strings from breaking the decimal field
                clean_cost = cost_raw.replace(',', '').strip()
                if not clean_cost or clean_cost.lower() == 'nan':
                    cost_val = 0.0
                else:
                    try:
                        cost_val = float(clean_cost)
                    except ValueError:
                        cost_val = 0.0

                # Clear placeholder instruction texts from the dosage column
                final_dosage = dosage if 'capture' not in dosage.lower() else ''

                RegimenDrug.objects.create(
                    regimen=current_regimen,
                    name=description,
                    base_value=final_dosage if final_dosage.lower() != 'nan' else '',
                    cycle_cost_kes=cost_val
                )
                inserted_count += 1

    print(f"Success! Imported all cancer sites and {inserted_count} drug protocol items.")

if __name__ == '__main__':
    csv_path = r"C:\Users\Collins\Downloads\Chemo protocols.csv"
    import_chemo_protocols(csv_path)