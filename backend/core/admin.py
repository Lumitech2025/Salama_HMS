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

# --- 1. SCHEDULING & TRIAGE ---

class VitalSignInline(admin.StackedInline):
    model = VitalSign
    extra = 0
    readonly_fields = ('created_at', 'recorded_by')
    classes = ('collapse',)

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('appointment_date', 'appointment_time', 'get_patient_name', 'practitioner', 'visit_type', 'status', 'status_tag')
    list_filter = ('status', 'visit_type', 'appointment_date', 'practitioner')
    search_fields = ('patient__name', 'manual_patient_name', 'patient__registry_no')
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
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.status
        )
    status_tag.short_description = "Visual Status"

@admin.register(VitalSign)
class VitalSignAdmin(admin.ModelAdmin):
    list_display = ('patient', 'triage_summary', 'recorded_by', 'created_at')
    readonly_fields = ('created_at', 'recorded_by', 'bmi', 'bsa')
    
    def triage_summary(self, obj):
        bg_color = "white"
        text_color = "black"
        
        # Clinical red flags: Fever or low oxygen saturation
        if (obj.temperature and obj.temperature >= 38.0) or (obj.spo2 and obj.spo2 < 92):
            bg_color = "#ffebee"
            text_color = "#c62828"
            
        return format_html(
            '<div style="background: {}; color: {}; padding: 5px; border-radius: 4px; font-family: monospace;">'
            'BP: {}/{} | Temp: {}°C | SpO2: {}% | BSA: {} m²'
            '</div>',
            bg_color, text_color, 
            obj.systolic_bp or '--', 
            obj.diastolic_bp or '--', 
            obj.temperature or '--', 
            obj.spo2 or '--', 
            obj.bsa or '--'
        )
    triage_summary.short_description = "Triage Overview"

# --- 2. PATIENT ADMIN ---

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    # FIXED: Using 'name', 'registry_no', and 'phone' to match your model exactly
    list_display = [
        'name', 
        'registry_no', 
        'phone', 
        'verification_status', 
        'view_history_link'    
    ]
    search_fields = ('name', 'registry_no', 'cancer_type', 'phone', 'insurance_no')
    list_filter = ('insurance_verified', 'cancer_type', 'staging', 'gender')
    readonly_fields = ('insurance_verified', 'last_verification_date', 'benefit_balance', 'created_at')
    inlines = [VitalSignInline] 
    
    fieldsets = (
        ('Core Identity', {
            'fields': ('name', 'registry_no', 'dob', 'gender', 'phone', 'email', 'blood_group')
        }),
        ('Oncology & Performance', {
            'fields': ('cancer_type', 'staging', 'ecog_status', 'biomarkers')
        }),
        ('Insurance Audit', {
            'description': "Data synchronized via the Salama Insurance Gateway",
            'fields': ('insurance_type', 'insurance_no', 'insurance_verified', 'last_verification_date', 'benefit_balance')
        }),
        ('Emergency & Metadata', {
            'fields': ('emergency_contact', 'created_at'),
            'classes': ('collapse',)
        }),
    )

    def verification_status(self, obj):
        if obj.insurance_verified:
            return format_html('<span style="color: green; font-weight: bold;">Verified</span>')
        return format_html('<span style="color: red;">{}</span>', "Pending")

    def view_history_link(self, obj):
        url = reverse('admin:core_treatment_changelist') + f'?patient__id__exact={obj.id}'
        return format_html('<a href="{}" class="button" style="padding: 2px 5px; background: #6c757d; color: white; border-radius: 3px; text-decoration: none; font-size: 10px;">View History</a>', url)

# --- 3. TREATMENT & CYCLES ---

class ChemoSessionInline(admin.TabularInline):
    model = ChemoSession
    extra = 0 
    readonly_fields = ('date', 'administered_by')

@admin.register(Treatment)
class TreatmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'protocol', 'oncologist', 'status', 'start_date')
    list_filter = ('status', 'protocol', 'start_date')
    search_fields = ('patient__name', 'patient__registry_no')
    inlines = [ChemoSessionInline]

# --- 4. DIAGNOSTICS & FINANCE ---

@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ('patient', 'test_name', 'critical_flag', 'test_date')
    list_filter = ('is_critical', 'test_date')
    readonly_fields = ('test_date', 'recorded_by')

    def critical_flag(self, obj):
        if obj.is_critical:
            return format_html(
                '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">CRITICAL: {}</span>', 
                obj.result_value
            )
        return obj.result_value
    critical_flag.short_description = 'Result Value'

@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('patient', 'total_amount', 'payment_status_tag', 'payment_method', 'created_at')
    list_filter = ('is_paid', 'payment_method', 'created_at')
    readonly_fields = ('created_at', 'billing_officer')
    actions = ['mark_as_paid']

    def payment_status_tag(self, obj):
        color = "#28a745" if obj.is_paid else "#dc3545"
        status = "PAID" if obj.is_paid else "UNPAID"
        return format_html('<b style="color: {};">{}</b>', color, status)
    payment_status_tag.short_description = "Status"

    @admin.action(description="Confirm Payment")
    def mark_as_paid(self, request, queryset):
        queryset.filter(is_paid=False).update(is_paid=True, billing_officer=request.user)

# --- 5. SUPPORTING REGISTRY ---

@admin.register(Drug)
class DrugAdmin(admin.ModelAdmin):
    list_display = ('name', 'batch_no', 'stock_quantity', 'expiry_status')
    list_filter = ('expiry_date',)
    search_fields = ('name', 'batch_no')

    def expiry_status(self, obj):
        if obj.expiry_date and obj.expiry_date <= timezone.now().date():
            return format_html('<b style="color: #dc3545;">EXPIRED</b>')
        return obj.expiry_date

admin.site.register(Protocol)