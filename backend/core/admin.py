from django.contrib import admin
from django.contrib.auth import get_user_model
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.http import HttpResponse
import csv
from .models import (
    LabInventoryItem, Patient, Protocol, StockAdjustment, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign, Queue
)


User = get_user_model()

# --- 0. GLOBAL SETTINGS & UTILITIES ---
admin.site.site_header = "Salama HMS Administration"
admin.site.site_title = "Salama HMS Portal"
admin.site.index_title = "Hospital Management & Clinical Audit"

def export_as_csv(self, request, queryset):
    """Utility for Clinical Audits & Financial Reporting"""
    meta = self.model._meta
    field_names = [field.name for field in meta.fields]
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename={meta}.csv'
    writer = csv.writer(response)
    writer.writerow(field_names)
    for obj in queryset:
        writer.writerow([getattr(obj, field) for field in field_names])
    return response
export_as_csv.short_description = "Export Selected to CSV"

# --- 1. QUEUE & ORCHESTRATION ---

@admin.register(Queue)
class QueueAdmin(admin.ModelAdmin):
    list_display = ('token_id', 'patient', 'current_station', 'status', 'priority_tag', 'live_wait_time')
    list_filter = ('current_station', 'status', 'priority', 'entered_at')
    search_fields = ('token_id', 'patient__name', 'patient__registry_no')
    readonly_fields = ('token_id', 'entered_at', 'updated_at')
    
    def live_wait_time(self, obj):
        wait = obj.wait_time
        color = "#28a745" # Green
        if wait > 30: color = "#fd7e14" # Orange
        if wait > 60: color = "#dc3545" # Red
        return format_html('<b style="color: {};">{} min</b>', color, wait)
    live_wait_time.short_description = "Wait Time"

    def priority_tag(self, obj):
        colors = {'NORMAL': '#6c757d', 'HIGH': '#fd7e14', 'EMERGENCY': '#dc3545'}
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">{}</span>',
            colors.get(obj.priority, '#6c757d'), obj.priority
        )
    priority_tag.short_description = "Priority"

# --- 2. SCHEDULING & TRIAGE ---

class VitalSignInline(admin.StackedInline):
    model = VitalSign
    extra = 0
    readonly_fields = ('created_at', 'recorded_by', 'bmi', 'bsa')
    classes = ('collapse',)

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    # FIXED: Added 'status' to list_display so list_editable works
    list_display = ('appointment_date', 'appointment_time', 'get_patient_name', 'practitioner', 'status', 'status_tag')
    list_editable = ('status',) 
    search_fields = ('patient__name', 'patient__registry_no', 'manual_patient_name')
    date_hierarchy = 'appointment_date'
    actions = [export_as_csv]

    def get_patient_name(self, obj):
        if obj.patient:
            return format_html('<b>{}</b> <small style="color:#666;">({})</small>', obj.patient.name, obj.patient.registry_no)
        return format_html('<i style="color:#ffa500;">{} (Unregistered)</i>', obj.manual_patient_name)
    get_patient_name.short_description = "Patient (ID)"

    def status_tag(self, obj):
        colors = {
            'PENDING': '#FFA500', 
            'CONFIRMED': '#007bff', 
            'WAITING_TRIAGE': '#6f42c1',
            'TRIAGED': '#17a2b8',
            'COMPLETED': '#28a745', 
            'CANCELLED': '#dc3545', 
        }
        return format_html(
            '<span style="background: {}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase;">{}</span>',
            colors.get(obj.status, '#6c757d'), obj.status.replace('_', ' ')
        )
    status_tag.short_description = "Flow Status"

@admin.register(VitalSign)
class VitalSignAdmin(admin.ModelAdmin):
    list_display = ('patient', 'triage_summary', 'recorded_by', 'created_at')
    readonly_fields = ('created_at', 'recorded_by', 'bmi', 'bsa')
    search_fields = ('patient__name', 'patient__registry_no')
    
    def triage_summary(self, obj):
        is_fever = obj.temperature and obj.temperature >= 38.0
        is_low_spo2 = obj.spo2 and obj.spo2 < 92
        bg_color = "#ffebee" if is_fever or is_low_spo2 else "#f8f9fa"
        border_color = "#c62828" if is_fever or is_low_spo2 else "#ddd"
            
        return format_html(
            '<div style="background: {}; border-left: 5px solid {}; padding: 5px 10px; border-radius: 4px; font-family: monospace; font-size: 11px;">'
            'BP: {}/{} | Temp: {}°C | SpO2: {}% | BSA: {}m²'
            '</div>',
            bg_color, border_color,
            obj.systolic_bp or '--', obj.diastolic_bp or '--', 
            obj.temperature or '--', obj.spo2 or '--', obj.bsa or '--'
        )
    triage_summary.short_description = "Vitals Analysis"

# --- 3. PATIENT REGISTRY ---

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['registry_no', 'name', 'gender', 'get_age', 'verification_status', 'view_history_link']
    search_fields = ('name', 'registry_no', 'phone', 'insurance_no')
    list_filter = ('gender', 'insurance_verified', 'cancer_type', 'staging', 'blood_group')
    readonly_fields = ('insurance_verified', 'last_verification_date', 'benefit_balance', 'created_at')
    inlines = [VitalSignInline]
    actions = [export_as_csv]
    
    fieldsets = (
        ('Core Identity', {'fields': ('name', 'registry_no', 'dob', 'gender', 'phone', 'email', 'blood_group')}),
        ('Oncology Profile', {'fields': ('cancer_type', 'staging', 'ecog_status', 'biomarkers')}),
        ('Insurance & Finance', {'fields': ('insurance_type', 'insurance_no', 'insurance_verified', 'last_verification_date', 'benefit_balance')}),
        ('Emergency Contact', {'fields': ('emergency_contact', 'created_at'), 'classes': ('collapse',)}),
    )

    def get_age(self, obj): return obj.current_age
    get_age.short_description = "Age"

    def verification_status(self, obj):
        icon, color = ("✅ Verified", "green") if obj.insurance_verified else ("❌ Pending", "#dc3545")
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, icon)

    def view_history_link(self, obj):
        url = reverse('admin:core_treatment_changelist') + f'?patient__id__exact={obj.id}'
        return format_html('<a href="{}" class="button" style="background:#444; color:white; padding: 3px 8px; border-radius: 5px; text-decoration:none;">History</a>', url)

# --- 4. ONCOLOGY, REVENUE & INVENTORY ---

@admin.register(Treatment)
class TreatmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'protocol', 'oncologist', 'status', 'cycle_progress')
    list_filter = ('status', 'protocol')
    raw_id_fields = ('patient',)

    def cycle_progress(self, obj):
        return format_html('<b>{} sessions</b>', obj.sessions.count())

@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('bill_no', 'patient', 'total_amount', 'payment_status_tag', 'created_at')
    list_filter = ('is_paid', 'payment_method', 'created_at')
    search_fields = ('bill_no', 'patient__name', 'patient__registry_no')
    readonly_fields = ('created_at', 'billing_officer')
    raw_id_fields = ('patient',)
    actions = ['mark_as_paid', export_as_csv]

    def payment_status_tag(self, obj):
        color, status = ("#28a745", "PAID") if obj.is_paid else ("#dc3545", "UNPAID")
        return format_html('<b style="color: {};">{}</b>', color, status)

    @admin.action(description="Confirm Payment")
    def mark_as_paid(self, request, queryset):
        queryset.update(is_paid=True, billing_officer=request.user)

@admin.register(Drug)
class DrugAdmin(admin.ModelAdmin):
    list_display = ('name', 'batch_no', 'stock_quantity', 'expiry_status')
    search_fields = ('name', 'batch_no')

    def expiry_status(self, obj):
        if obj.expiry_date and obj.expiry_date <= timezone.now().date():
            return format_html('<b style="color: #dc3545;">🚨 EXPIRED</b>')
        return obj.expiry_date
    
 

@admin.register(LabInventoryItem)
class LabInventoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'stock', 'min_stock', 'unit', 'updated_at')
    list_filter = ('category',)
    search_fields = ('name',)
    list_editable = ('stock', 'min_stock')

@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('item', 'quantity_used', 'remaining_stock', 'technician', 'created_at')
    readonly_fields = ('created_at',)

admin.site.register(Protocol)
admin.site.register(LabResult)
admin.site.register(ChemoSession)