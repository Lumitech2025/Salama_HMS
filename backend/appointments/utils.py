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

    if phone:
        try:
            # Force strip whitespace, tabs, and potential hidden Windows \r breaks
            api_key = str(settings.HTTPSMS_API_KEY).replace('"', '').replace("'", "").strip()
            
            payload = {
                "from": "+254714326105",       # Must exactly match your active device in HttpSMS dashboard
                "to": phone,                   # Target patient number
                "content": message_body        # Content payload
            }
            
            headers = {
                "x-api-key": api_key,          # Sent raw without dynamic alteration strings
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            # Debug tracking statement (you can remove this after it works)
            logger.info(f"Sending SMS with key length {len(api_key)} ending in: {api_key[-3:]}")

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