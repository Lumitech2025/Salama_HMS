from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Appointment
from .utils import dispatch_async_notifications

@receiver(post_save, sender=Appointment)
def trigger_appointment_notifications(sender, instance, created, **kwargs):
    """
    Automated signal hook that captures newly saved records to send alerts.
    """
    if created:  # Only fire when the appointment record is first generated
        
        # Determine target name fallback
        patient_name = getattr(instance, 'manual_patient_name', None) or "Valued Patient"
        app_date = getattr(instance, 'appointment_date', 'Scheduled Date')
        app_time = getattr(instance, 'appointment_time', 'Scheduled Time')
        
        # Build out personalized clinical copy
        subject = "Appointment Confirmation - Salama Cancer Care"
        message_body = (
            f"Dear {patient_name},\n\n"
            f"Your clinical appointment at Salama Cancer Care has been successfully confirmed for "
            f"{app_date} at {app_time}.\n\n"
            f"Please arrive 15 minutes early for vitals sorting. Thank you."
        )
        
        # Extract phone and email dynamically from the saved instance
        phone = getattr(instance, 'phone_number', None)
        email = getattr(instance, 'email_address', None)

        # Offload immediately to background delivery execution thread
        if phone or email:
            dispatch_async_notifications(phone, email, message_body, subject)