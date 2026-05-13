from django.contrib import admin
from django.contrib.auth import get_user_model
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.http import HttpResponse

import csv
from .models import (RegistrationRecord,
    LabInventoryItem, Patient, Protocol, StockAdjustment, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign, Queue,
    Prescription, PrescriptionItem, ClinicalNote, ImagingRecord
)


User = get_user_model()

# --- 0. GLOBAL SETTINGS & UTILITIES ---
admin.site.site_header = "Salama HMS Administration"
admin.site.site_title = "Salama HMS Portal"
admin.site.index_title = "Hospital Management & Clinical Audit"

def export_as_csv(self, request, queryset):
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
    list_display = ('token_id', 'patient', 'current_station', 'status', 'priority', 'entered_at')
    list_filter = ('current_station', 'status', 'priority')
    search_fields = ('token_id', 'patient__name')
    readonly_fields = ('token_id', 'entered_at')
    
    def live_wait_time(self, obj):
        wait = obj.wait_time
        color = "#28a745" if wait < 30 else "#fd7e14" if wait < 60 else "#dc3545"
        return format_html('<b style="color: {};">{} min</b>', color, wait)

    def status_tag(self, obj):
        colors = {
            'WAITING': '#6c757d',
            'UNDER_CONSULTATION': '#007bff',
            'AWAITING_MEDICATION': '#17a2b8',
            'COMPLETED': '#28a745'
        }
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#6c757d'), obj.status.replace('_', ' ')
        )

    def priority_tag(self, obj):
        colors = {'NORMAL': '#6c757d', 'HIGH': '#fd7e14', 'EMERGENCY': '#dc3545'}
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">{}</span>',
            colors.get(obj.priority, '#6c757d'), obj.priority
        )

# --- Find your RegistrationRecordAdmin and update it to this: ---

@admin.register(RegistrationRecord)
class RegistrationRecordAdmin(admin.ModelAdmin):
    # Updated list_display to include new KPIs
    list_display = ('queue_id', 'urgency_badge', 'patient', 'insurance', 'registered_at')
    
    # Updated filters to include new flags
    list_filter = ('is_urgent', 'is_returning', 'gender', 'insurance', 'registered_at')
    
    list_filter = ('is_urgent', 'insurance', 'registered_at')
    search_fields = ('queue_id', 'patient__name', 'id_number')

    readonly_fields = ('queue_id', 'registered_at')

    

    def urgency_badge(self, obj):
        if obj.is_urgent:
            return format_html(
                '<span style="background: #dc3545; color: white; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 900;">{}</span>',
                "URGENT"
            )
        return format_html(
            '<span style="background: #e9ecef; color: #6c757d; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700;">{}</span>',
            "NORMAL"
        )
    
    urgency_badge.short_description = "Priority"

    # Tag for Returning vs New
    def returning_tag(self, obj):
        if obj.is_returning:
            return format_html('<span style="color: #28a745; font-weight: bold;">🔄 Returning</span>')
        return format_html('<span style="color: #007bff; font-weight: bold;">✨ New</span>')
    returning_tag.short_description = "Type"

    def gender_tag(self, obj):
        colors = {'M': '#007bff', 'F': '#e83e8c', 'O': '#6c757d'}
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.gender, '#000'), obj.get_gender_display()
        )
    gender_tag.short_description = "Gender"

    def insurance_tag(self, obj):
        color = "#28a745" if obj.insurance != "CASH" else "#ffc107"
        return format_html(
            '<span style="background: {}; color: {}; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">{}</span>',
            color, "white" if obj.insurance != "CASH" else "black", obj.insurance
        )
    insurance_tag.short_description = "Billing Mode"



# --- 2. PHARMACY & PRESCRIPTIONS ---

class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'prescribed_by', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('patient__name', 'patient__registry_no')
    inlines = [PrescriptionItemInline]
    actions = [export_as_csv]

# --- 3. DRUG INVENTORY (THE SHOP & MAIN STORE) ---

@admin.register(Drug)
class DrugAdmin(admin.ModelAdmin):
    list_display = ('name', 'manufacturer', 'strength', 'store_location', 'stock_status', 'expiry_status', 'price_tag')
    list_filter = ('store_location', 'is_hazardous', 'expiry_date')
    search_fields = ('name', 'generic_name', 'batch_number', 'manufacturer')
    list_editable = ('store_location',)

    def stock_status(self, obj):
        if obj.quantity_in_stock <= obj.reorder_level:
            return format_html('<b style="color: #dc3545;">🚨 {} (Low)</b>', obj.quantity_in_stock)
        return format_html('<span style="color: #28a745;">{}</span>', obj.quantity_in_stock)
    stock_status.short_description = "Qty in Stock"

    def expiry_status(self, obj):
        if obj.is_expired:
            return format_html('<b style="color: white; background: #dc3545; padding: 2px 5px; border-radius: 3px;">EXPIRED</b>')
        return obj.expiry_date
    expiry_status.short_description = "Expiry"

    def price_tag(self, obj):
        return format_html('<b>Ksh {:,.2f}</b>', obj.selling_price_kes)
    price_tag.short_description = "Price"

# --- 4. LONGITUDINAL EMR ---


@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    # Change 'doctor' to 'author'
    list_display = ('patient', 'note_type', 'author', 'created_at') 
    list_filter = ('note_type', 'created_at', 'author')
    search_fields = ('patient__name', 'content')

@admin.register(ImagingRecord)
class ImagingRecordAdmin(admin.ModelAdmin):
    list_display = ('patient', 'scan_type', 'created_at', 'has_image')
    list_filter = ('scan_type', 'created_at')
    
    def has_image(self, obj):
        return bool(obj.image_url)
    has_image.boolean = True

# --- 5. PATIENT REGISTRY & TRIAGE ---

class VitalSignInline(admin.StackedInline):
    model = VitalSign
    extra = 0
    readonly_fields = ('created_at', 'recorded_by')
    classes = ('collapse',)

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['registry_no', 'name', 'gender', 'cancer_type', 'staging', 'created_at']
    search_fields = ('name', 'registry_no', 'phone')
    list_filter = ('gender', 'cancer_type', 'staging')
    inlines = [VitalSignInline]
    
    fieldsets = (
        ('Core Identity', {'fields': ('name', 'registry_no', 'dob', 'gender', 'phone', 'email', 'blood_group')}),
        ('Oncology Profile', {'fields': ('cancer_type', 'staging', 'ecog_status', 'biomarkers')}),
        ('Insurance & Finance', {'fields': ('insurance_type', 'insurance_no', 'benefit_balance')}),
    )

# --- 6. SCHEDULING & REVENUE ---

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('appointment_date', 'appointment_time', 'patient', 'practitioner', 'status')
    list_editable = ('status',) 
    search_fields = ('patient__name', 'manual_patient_name')
    date_hierarchy = 'appointment_date'

@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('bill_no', 'patient', 'total_amount', 'is_paid', 'created_at')
    list_filter = ('is_paid', 'payment_method')
    actions = ['mark_as_paid']

    @admin.action(description="Confirm Payment")
    def mark_as_paid(self, request, queryset):
        queryset.update(is_paid=True, billing_officer=request.user)

# --- 7. LAB & OTHERS ---

@admin.register(LabInventoryItem)
class LabInventoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'stock', 'min_stock')

@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('item', 'quantity_used', 'remaining_stock', 'technician', 'created_at')

admin.site.register(Protocol)
admin.site.register(LabResult)
admin.site.register(ChemoSession)
admin.site.register(Treatment)
admin.site.register(VitalSign)