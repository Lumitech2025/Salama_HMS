# E:\Salama_HMS\backend\core\mpesa.py
import requests
import base64
from datetime import datetime
from django.conf import settings

class MpesaClient:
    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.shortcode = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        self.env = settings.MPESA_ENVIRONMENT
        
        if self.env == "production":
            self.base_url = "https://api.safaricom.co.ke"
        else:
            self.base_url = "https://sandbox.safaricom.co.ke"

    def get_access_token(self):
        """Fetches the secure OAuth authentication token from Safaricom."""
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        try:
            response = requests.get(url, auth=(self.consumer_key, self.consumer_secret), timeout=10)
            if response.status_code == 200:
                return response.json().get("access_token")
            raise Exception(f"OAuth token fetch failed: {response.text}")
        except Exception as e:
            print(f"M-Pesa Auth Error: {str(e)}")
            return None

    def format_phone_number(self, phone):
        """Formats Kenyan numbers cleanly to 2547XXXXXXXX or 2541XXXXXXXX."""
        phone = str(phone).strip().replace(" ", "").replace("+", "")
        if phone.startswith("0"):
            return f"254{phone[1:]}"
        elif phone.startswith("7") or phone.startswith("1"):
            return f"254{phone}"
        return phone

    def send_stk_push(self, phone, amount, invoice_id):
        """Fires the STK push payload directly to the patient's phone."""
        token = self.get_access_token()
        if not token:
            return {"status": "failed", "message": "Failed to authenticate with Daraja gateway"}

        formatted_phone = self.format_phone_number(phone)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Safaricom password formulation rule
        password_str = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_str.encode()).decode("utf-8")

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(float(amount)),
            "PartyA": formatted_phone,
            "PartyB": self.shortcode,
            "PhoneNumber": formatted_phone,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": f"INV-{invoice_id}",
            "TransactionDesc": f"Salama HMS Payment {invoice_id}"
        }

        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            response_data = response.json()
            
            if response_data.get("ResponseCode") == "0":
                return {
                    "status": "success", 
                    "checkout_request_id": response_data.get("CheckoutRequestID")
                }
            return {"status": "failed", "message": response_data.get("CustomerMessage", "STK push rejected.")}
        except Exception as e:
            return {"status": "failed", "message": str(e)}