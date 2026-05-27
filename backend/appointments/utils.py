import logging
import threading
from django.core.mail import send_mail
from django.conf import settings
import requests

logger = logging.getLogger(__name__)

def _execute_notification_delivery(phone, email, message_body, subject):
    """
    Synchronous worker executing network I/O calls for SMS and Email.
    """
    # 1. Handle Email Dispatch
    if email:
        try:
            logger.info(f"Initiating email dispatch to: {email}")
            send_mail(
                subject=subject,
                message=message_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            logger.info(f"Email successfully delivered to {email}")
        except Exception as e:
            logger.error(f"Failed to dispatch email to {email}. Error: {str(e)}")

    # 2. Handle SMS Dispatch
    if phone:
        try:
            api_key = str(settings.HTTPSMS_API_KEY).strip().replace('"', '').replace("'", "")
            
            payload = {
                "from": "+254714326105",       # Your authorized sending SIM
                "to": phone,                   # Target patient number
                "content": message_body        # Valid parameter expected by gateway
            }
            
            headers = {
                "x-api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            response = requests.post(
                "https://api.httpsms.com/v1/messages/send", 
                json=payload, 
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"SMS transaction acknowledged by gateway for {phone}")
            else:
                logger.error(f"SMS Gateway rejected payload for {phone}. Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            logger.error(f"Failed to execute SMS routing for {phone}. Error: {str(e)}")


def dispatch_async_notifications(phone, email, message_body, subject):
    """
    Entry point function. Spins up a lightweight background thread
    to prevent blocking your Django/React API response cycles.
    """
    worker_thread = threading.Thread(
        target=_execute_notification_delivery,
        args=(phone, email, message_body, subject),
        daemon=True
    )
    worker_thread.start()