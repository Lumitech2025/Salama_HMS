from django.contrib import admin
from django.contrib.auth import get_user_model
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from .models import (
    Patient, Protocol, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign
)

User = get_user_model()

# Global Admin Headers
admin.site.site_header = "Salama HMS Administration"
admin.site.site_title = "Salama HMS Portal"
admin.site.index_title = "Hospital Management & Clinical Audit"

# --- 1. Scheduling & Triage: The Front-Line Audit ---

class VitalSignInline(admin.StackedInline):
    model = VitalSign
    extra = 0
    readonly_fields = ('created_at', 'recorded_by')
    classes = ('collapse',)

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    # FIX: We added 'status' to list_display so that list_editable can find it.
    list_display = ('appointment_date', 'appointment_time', 'get_patient_name', 'practitioner', 'visit_type', 'status', 'status_tag')
    list_filter = ('status', 'visit_type', 'appointment_date', 'practitioner')
    search_fields = ('patient__name', 'manual_patient_name', 'patient__registry_no')
    
    # This now works because 'status' is in the list_display above
    list_editable = ('status',) 

    def get_patient_name(self, obj):
        if obj.patient:
            return format_html('<b>{}</b>', obj.patient.name)
        return format_html('<i>{} (Unregistered)</i>', obj.manual_patient_name)
    get_patient_name.short_description = "Patient"

    def status_tag(self, obj):
        colors = {
            'PENDING': '#FFA500',   
            'CONFIRMED': '#007bff', 
            'CHECKED_IN': '#17a2b8',
            'COMPLETED': '#28a745', 
            'CANCELLED': '#dc3545', 
        }
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 10px; font-size: 10px;">{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.status
        )
    status_tag.short_description = "Visual Status"

@admin.register(VitalSign)
class VitalSignAdmin(admin.ModelAdmin):
    list_display = ('patient', 'triage_summary', 'recorded_by', 'created_at')
    readonly_fields = ('created_at', 'recorded_by')
    
    def triage_summary(self, obj):
        """Visual cues for high-risk vitals"""
        bg_color = "white"
        text_color = "black"
        
        # Expert Insight: In oncology, weight loss or fever is a major red flag
        if obj.temperature >= 38.0 or obj.spo2 < 92:
            bg_color = "#ffebee"
            text_color = "#c62828"
            
        return format_html(
            '<div style="background: {}; color: {}; padding: 5px; border-radius: 4px;">'
            'BP: {} | Temp: {}°C | Weight: {}kg | SpO2: {}%'
            '</div>',
            bg_color, text_color, obj.blood_pressure, obj.temperature, obj.weight, obj.spo2
        )
    triage_summary.short_description = "Triage Results"

# --- 2. Patient Admin: The Verification Watchtower ---

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('registry_no', 'name', 'cancer_type', 'verification_status', 'view_history_link', 'created_at')
    search_fields = ('name', 'registry_no', 'cancer_type', 'phone', 'insurance_no')
    list_filter = ('insurance_verified', 'cancer_type', 'staging', 'gender')
    readonly_fields = ('insurance_verified', 'last_verification_date', 'benefit_balance', 'created_at')
    inlines = [VitalSignInline] # See triage history directly in patient file
    
    fieldsets = (
        ('Core Identity', {
            'fields': ('name', 'registry_no', 'dob', 'gender', 'phone', 'blood_group')
        }),
        ('Oncology & Performance', {
            'fields': ('cancer_type', 'staging', 'ecog_status', 'biomarkers')
        }),
        ('Insurance Audit (Frontend Filled)', {
            'description': "Updated via the React Insurance Gateway",
            'fields': ('insurance_type', 'insurance_no', 'insurance_verified', 'last_verification_date', 'benefit_balance')
        }),
        ('Emergency & Metadata', {
            'fields': ('emergency_contact', 'created_at'),
            'classes': ('collapse',)
        }),
    )

    def verification_status(self, obj):
        """Fixed format_html by passing the text as an argument"""
        if obj.insurance_verified:
            # Use {} as a placeholder and pass the string as the second argument
            return format_html('<b style="color: green;">{}</b>', "✔ VERIFIED")
        return format_html('<b style="color: red;">{}</b>', "✘ PENDING")
    verification_status.short_description = 'Ins. Status'

    def view_history_link(self, obj):
        url = reverse('admin:core_treatment_changelist') + f'?patient__id__exact={obj.id}'
        return format_html('<a href="{}" style="text-decoration: underline;">Treatments</a>', url)
    view_history_link.short_description = "Clinical History"

# --- 3. Treatment & Cycles: The Clinical Audit ---

class ChemoSessionInline(admin.TabularInline):
    model = ChemoSession
    extra = 0 
    readonly_fields = ('date', 'administered_by')
    fields = ('date', 'cycle_no', 'administered_by', 'pre_auth_code', 'notes')

@admin.register(Treatment)
class TreatmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'protocol', 'oncologist', 'status', 'start_date')
    list_filter = ('status', 'protocol', 'start_date')
    search_fields = ('patient__name', 'patient__registry_no')
    inlines = [ChemoSessionInline]

# --- 4. Diagnostics & Finance ---

@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ('patient', 'test_name', 'critical_flag', 'test_date', 'recorded_by')
    list_filter = ('is_critical', 'test_date')
    readonly_fields = ('test_date', 'recorded_by')

    def critical_flag(self, obj):
        if obj.is_critical:
            return format_html(
                '<span style="background: red; color: white; padding: 2px 5px; border-radius: 3px;">CRITICAL: {}</span>', 
                obj.result_value
            )
        return obj.result_value
    critical_flag.short_description = 'Result Value'

@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('patient', 'amount', 'payment_status_tag', 'payment_method', 'billing_officer', 'created_at')
    list_filter = ('is_paid', 'payment_method', 'created_at')
    readonly_fields = ('created_at', 'billing_officer')
    actions = ['mark_as_paid']

    def payment_status_tag(self, obj):
        color = "green" if obj.is_paid else "red"
        status = "PAID" if obj.is_paid else "UNPAID"
        return format_html('<b style="color: {};">{}</b>', color, status)
    payment_status_tag.short_description = "Status"

    @admin.action(description="Manual override: Mark as paid")
    def mark_as_paid(self, request, queryset):
        updated = queryset.filter(is_paid=False).update(is_paid=True, billing_officer=request.user)
        self.message_user(request, f"Updated {updated} bills as paid.")

# --- 5. Supporting Registry ---

@admin.register(Drug)
class DrugAdmin(admin.ModelAdmin):
    list_display = ('name', 'batch_no', 'stock_status', 'expiry_status')
    list_filter = ('expiry_date',)
    
    def stock_status(self, obj):
        color = "green" if obj.stock_quantity > 10 else "orange"
        return format_html('<b style="color: {};">{} units</b>', color, obj.stock_quantity)

    def expiry_status(self, obj):
        if obj.expiry_date <= timezone.now().date():
            return format_html('<b style="color: red;">EXPIRED</b>')
        return obj.expiry_date

admin.site.register(Protocol)