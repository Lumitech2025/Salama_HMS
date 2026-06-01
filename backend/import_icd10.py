# E:\Salama_HMS\backend\import_icd10.py
import os
import csv
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import ICD10Diagnosis

def get_anatomical_site_mapping(code):
    """
    Filters and groups raw ICD codes directly onto anatomical primary sites.
    """
    code = code.strip().upper().replace('.', '')
    
    if code.startswith('C50'): 
        return 'BREAST'
    if code.startswith('C71'): 
        return 'BRAIN TUMOURS'
    if code.startswith(('C00', 'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12', 'C13', 'C14', 'C30', 'C31', 'C32')):
        return 'HEAD & NECK'
    if code.startswith(('C40', 'C41')):
        return 'BONE & NECK'
    if code.startswith(('C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21', 'C22', 'C23', 'C24', 'C25', 'C26')):
        return 'GASTROINTESTINAL'
    if code.startswith(('C33', 'C34')):
        return 'LUNG'
    if code.startswith(('C60', 'C61', 'C62', 'C63', 'C64', 'C65', 'C66', 'C67', 'C68')):
        return 'UROLOGICAL'
    if code.startswith('C46'):
        return 'KAPOSI SARCOMA'
    if code.startswith(('C51', 'C52', 'C53', 'C54', 'C55', 'C56', 'C57', 'C58')):
        return 'GYNAECOLOGICAL'
    if code.startswith(('C91', 'C92', 'C93', 'C94', 'C95')):
        return 'LEUKEMIA'
        
    return None

def run_import():
    csv_file_path = r"C:\Users\Collins\Downloads\ICDCODES.csv"
    export_file_path = r"C:\Users\Collins\Downloads\MAPPED_ICD10_SITES.csv"
    
    if not os.path.exists(csv_file_path):
        print(f"❌ Target source file missing at: {csv_file_path}")
        return

    print(f"🚀 Processing file patterns from: {csv_file_path}")
    
    grouping_stats = {choice[0]: 0 for choice in ICD10Diagnosis.PRIMARY_SITE_CHOICES}
    batch_records = []
    export_rows = []
    seen_codes = set()

    with open(csv_file_path, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = [h.strip().upper() for h in next(reader)]
        
        try:
            code_idx = header.index('CODE')
            desc_idx = -1
            for idx, col in enumerate(header):
                if 'DESCRIPTION' in col:
                    desc_idx = idx
                    break
            if desc_idx == -1:
                desc_idx = 1
        except ValueError:
            print("❌ Processing error: 'CODE' heading column missing from CSV layout structure.")
            return

        for row in reader:
            if not row or len(row) <= max(code_idx, desc_idx):
                continue
                
            raw_code = row[code_idx].strip()
            raw_desc = row[desc_idx].strip()
            clean_code = raw_code.replace('.', '').upper()
            
            site_group = get_anatomical_site_mapping(clean_code)
            
            if site_group and clean_code not in seen_codes:
                seen_codes.add(clean_code)
                grouping_stats[site_group] += 1
                
                display_code = raw_code.upper()
                if '.' not in display_code and len(display_code) > 3:
                    display_code = f"{display_code[:3]}.{display_code[3:]}"

                # Aligned with your new model design
                batch_records.append(
                    ICD10Diagnosis(
                        primary_site=site_group,
                        code=display_code,
                        short_description=raw_desc[:255], # Kept safely within CharField limits
                        long_description=raw_desc          # Takes full text cleanly without truncation
                    )
                )

                export_rows.append({
                    'PRIMARY_SITE': site_group,
                    'CODE': display_code,
                    'DESCRIPTION': raw_desc
                })

    print("\n📊 --- Primary Site Grouping Statistics ---")
    for site, count in grouping_stats.items():
        print(f" 📍 {site.ljust(25)} : Mapped {count} entries")
        
    print(f"\nTotal targeted records extracted: {len(batch_records)}")

    # Write backup mapped file
    if export_rows:
        print(f"💾 Writing filtered anatomical mappings out to file target: {export_file_path}")
        try:
            with open(export_file_path, mode='w', encoding='utf-8', newline='') as out_f:
                fieldnames = ['PRIMARY_SITE', 'CODE', 'DESCRIPTION']
                writer = csv.DictWriter(out_f, fieldnames=fieldnames)
                
                writer.writeheader()
                writer.writerows(export_rows)
            print("💾 CSV export tracking completed successfully.")
        except Exception as e:
            print(f"⚠️ Warning: Could not write file to filesystem destination path: {e}")

    # Write to local PostgreSQL/MySQL/SQLite DB using Bulk Create
    if batch_records:
        print("\n⏳ Reindexing local definitions table...")
        ICD10Diagnosis.objects.all().delete()
        ICD10Diagnosis.objects.bulk_create(batch_records, batch_size=500, ignore_conflicts=True)
        print("✅ Success! Your primary sites now drive options and map long descriptions seamlessly.")

if __name__ == "__main__":
    run_import()