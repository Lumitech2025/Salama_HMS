import os
import sys
import django
import requests
from pathlib import Path
from dotenv import load_dotenv

# Initialize paths and configurations
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from django.core.mail import send_mail

def run_diagnostic():
    print("\n" + "="*50)
    print(" SALAMA HMS - OUTBOUND PIPELINE DIAGNOSTIC")
    print("="*50)
    
    test_email = "Collinskim317@gmail.com"
    test_phone = "+254714326105"
    message_text = "Salama HMS System Check - Outbound channels operational."
    
    # ------------------------------------------------------------------
    # PHASE 1: EMAIL SMTP CHECK (Already verified)
    # ------------------------------------------------------------------
    print("\n[Phase 1] Testing SMTP Connection to Gmail...")
    try:
        send_mail(
            subject="Salama HMS System Check",
            message=message_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[test_email],
            fail_silently=False,
        )
        print(" 🎉 EMAIL SUCCESS: Delivered cleanly.")
    except Exception as e:
        print(f" ❌ EMAIL FAILURE: {str(e)}")

    # ------------------------------------------------------------------
    # PHASE 2: SMS API GATEWAY CHECK (Fixed implementation)
    # ------------------------------------------------------------------
    print("\n[Phase 2] Testing HttpSMS Endpoint Authorization...")
    
    # Strip quotes or whitespace out of the environment string
    api_key = str(settings.HTTPSMS_API_KEY).strip().replace('"', '').replace("'", "")
    print(f" -> Testing Key Prefix: {api_key[:7]}...")
    
    # HttpSMS strictly expects payload body parameters named 'from', 'to', and 'content'
    payload = {
        "from": "+254714326105",       # Your mobile device phone number
        "to": test_phone,              # Recipient number
        "content": message_text        # Explicit parameter name required by HttpSMS schema
    }
    
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    try:
        response = requests.post(
            "https://api.httpsms.com/v1/messages/send", 
            json=payload, 
            headers=headers,
            timeout=10
        )
        print(f" -> Gateway HTTP Status Code: {response.status_code}")
        print(f" -> Server Response Body: {response.text}")
        
        if response.status_code in [200, 201]:
            print(" 🎉 SMS SUCCESS: Payload accepted by HttpSMS routing engine!")
        else:
            print(" ❌ SMS FAILURE: API Gateway turned away request.")
    except Exception as e:
        print(f" ❌ SMS NETWORK ERROR: {str(e)}")
        
    print("\n" + "="*50 + "\n")

if __name__ == "__main__":
    run_diagnostic()