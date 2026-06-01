from django.contrib import admin
from django.contrib.auth import get_user_model
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.http import HttpResponse
from django.utils.safestring import mark_safe

import csv
from datetime import date
from .models import (InsuranceScheme, LabOrder, RegistrationRecord,
    LabInventoryItem, Patient, Protocol, RequisitionItem, Service, StockAdjustment, Treatment, ChemoSession, 
    CancerSite, CancerType, Regimen, RegimenDrug,
    Drug, LabResult, Bill, Appointment, VitalSign, Queue, Requisition,
    Prescription, PrescriptionItem, ClinicalNote, ImagingRecord, PsychologyEnrollment, SessionLog, BereavementLog, 
    OutreachCampaign, ReferralPartner, SocialMediaPost, MarketingRequisitionExtension, LabTestRegistry, LabPanel, ProtocolMaster, ProtocolDrug, DrugGuardrail,
    InsuranceCompany, InsuranceClaim, RemittanceBatch,ClaimDispatchBatch, Service, PatientBillableItem,
    ICD10Diagnosis, PatientDiagnosis,
    Supplier,
    PurchaseOrder, PurchaseOrderItem, 
    GoodsReceivedNote, GRNItem, 
    PurchaseInvoice, PaymentVoucher
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


@admin.register(RegistrationRecord)
class RegistrationRecordAdmin(admin.ModelAdmin):
    list_display = (
        'queue_id', 
        'health_record_badge', 
        'returning_tag',
        'full_name_display', 
        'gender_tag', 
        'age', 
        'urgency_badge', 
        'insurance_tag', 
        'registered_at'
    )
    
    list_filter = ('is_urgent', 'is_returning', 'payment_mode', 'insurance_company', 'registered_at')
    
    search_fields = (
        'queue_id', 
        'health_record_number', 
        'first_name', 
        'middle_name', 
        'last_name', 
        'id_number', 
        'phone', 
        'email'
    )
    
    fieldsets = (
        ('System Identifiers', {
            'fields': ('queue_id', 'health_record_number', 'patient', 'registered_at'),
        }),
        ('Core Demographics', {
            'fields': (('first_name', 'middle_name', 'last_name'), ('id_number', 'phone', 'email'), ('age', 'gender')),
        }),
        ('Next of Kin Matrix', {
            'fields': ('next_of_kin_name', 'next_of_kin_relationship', 'next_of_kin_phone'),
        }),
        ('Financial Allocation & Priority Status', {
            'fields': ('payment_mode', 'insurance_company', 'insurance_number', ('is_urgent', 'is_returning')),
        }),
    )
    
    readonly_fields = ('queue_id', 'health_record_number', 'patient', 'registered_at')

    def health_record_badge(self, obj):
        return format_html(
            '<span style="font-family: monospace; font-weight: bold; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #0f172a;">{}</span>',
            obj.health_record_number
        )
    health_record_badge.short_description = "Health Record No"

    def full_name_display(self, obj):
        return obj.full_name
    full_name_display.short_description = "Patient Name"

    def urgency_badge(self, obj):
        # 🚀 FIXED: Dynamic rendering to satisfy format_html
        text = "URGENT" if obj.is_urgent else "NORMAL"
        bg_color = "#dc3545" if obj.is_urgent else "#e9ecef"
        text_color = "white" if obj.is_urgent else "#6c757d"
        weight = "900" if obj.is_urgent else "700"
        
        return format_html(
            '<span style="background: {}; color: {}; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: {};">{}</span>',
            bg_color, text_color, weight, text
        )
    urgency_badge.short_description = "Priority"

    def returning_tag(self, obj):
        if obj.is_returning:
            return mark_safe('<span style="color: #28a745; font-weight: bold;">🔄 Returning</span>')
        return mark_safe('<span style="color: #007bff; font-weight: bold;">✨ New</span>')
    returning_tag.short_description = "Type"

    def gender_tag(self, obj):
        colors = {'M': '#007bff', 'F': '#e83e8c', 'O': '#6c757d'}
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.gender, '#000'), obj.get_gender_display()
        )
    gender_tag.short_description = "Gender"

    def insurance_tag(self, obj):
        # 🚀 FIXED: Swapped static cash branch to mark_safe to bypass format_html argument requirements
        if obj.payment_mode == "CASH":
            return mark_safe(
                '<span style="background: #ffc107; color: black; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">CASH</span>'
            )
        
        display_name = obj.insurance_company.name if obj.insurance_company else "INSURANCE"
        return format_html(
            '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">{}</span>',
            display_name
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
    search_fields = ('patient__name', 'patient__registrations__health_record_number')
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

class LabResultInline(admin.TabularInline):
    model = LabResult
    extra = 0
    readonly_fields = ('test_name', 'status_badge', 'is_critical', 'display_parameters', 'technician_notes', 'created_at')
    fields = ('test_name', 'status_badge', 'is_critical', 'display_parameters', 'technician_notes', 'created_at')

    def display_parameters(self, obj):
        if not obj.parameters or not isinstance(obj.parameters, dict):
            return "Results pending..."
        
        html_rows = []
        for key, value in obj.parameters.items():
            clean_key = key.replace("_", " ").upper()
            html_rows.append(
                f'<div style="margin-bottom: 5px;">'
                f'<b style="font-size: 9px; color: #64748b;">{clean_key}:</b> '
                f'<span style="font-weight: 800; color: #0f172a; margin-left: 5px;">{value}</span>'
                f'</div>'
            )
        return mark_safe("".join(html_rows))
    display_parameters.short_description = "Diagnostic Data"

    def status_badge(self, obj):
        status_map = {
            'PENDING': ('#f59e0b', 'Waiting'),
            'COMPLETED': ('#10b981', 'Finalized'),
            'CANCELLED': ('#ef4444', 'Voided'),
        }
        bg_color, label = status_map.get(obj.status, ('#64748b', obj.status))
        return mark_safe(
            f'<span style="background: {bg_color}; color: white; padding: 3px 10px; border-radius: 20px; '
            f'font-size: 9px; font-weight: 900; text-transform: uppercase;">{label}</span>'
        )
    status_badge.short_description = "Status"

class ClinicalNoteInline(admin.TabularInline):
    model = ClinicalNote
    extra = 0
    readonly_fields = ('author_role', 'author', 'note_type', 'content_display', 'created_at')
    fields = ('author_role', 'author', 'note_type', 'content_display', 'created_at')
    verbose_name = "Clinical Narrative"
    verbose_name_plural = "Clinical Narratives & Observations"

    def author_role(self, obj):
        if not obj.author: return "-"
        role = "STAFF"
        if obj.author.groups.filter(name__icontains='ONCOLOGIST').exists(): role = "ONCOLOGIST"
        elif obj.author.groups.filter(name__icontains='NURSE').exists(): role = "NURSE"
        elif obj.author.groups.filter(name__icontains='LAB').exists(): role = "LAB TECH"
        
        colors = {'ONCOLOGIST': '#2563eb', 'NURSE': '#db2777', 'LAB TECH': '#0d9488', 'STAFF': '#64748b'}
        bg = colors.get(role, '#64748b')
        return mark_safe(
            f'<span style="background: {bg}; color: white; padding: 3px 10px; border-radius: 6px; '
            f'font-size: 10px; font-weight: 900; text-transform: uppercase;">{role}</span>'
        )
    author_role.short_description = "Department"

    def content_display(self, obj):
        if not obj.content:
            return mark_safe('<span style="color: #94a3b8; font-style: italic;">No narrative recorded</span>')
        return mark_safe(
            f'<div style="max-width: 450px; font-weight: 600; color: #1e293b; border-left: 3px solid #e2e8f0; '
            f'padding-left: 10px; line-height: 1.5;">{obj.content}</div>'
        )
    content_display.short_description = "Clinical Observation"

class PrescriptionInline(admin.TabularInline):
    model = Prescription
    extra = 0
    readonly_fields = ('prescribed_by', 'status_badge', 'medication_summary', 'created_at')
    fields = ('prescribed_by', 'status_badge', 'medication_summary', 'created_at')
    can_delete = False
    show_change_link = True

    def medication_summary(self, obj):
        items = obj.prescriptionitem_set.all() 
        if not items: return "No items recorded"
        
        html = "".join([
            f'<div style="margin-bottom:4px; font-size:11px;">'
            f'<b style="color:#0f172a;">• {item.drug.name}</b> '
            f'<span style="color:#64748b;">({item.dosage} - {item.duration})</span>'
            f'</div>' for item in items
        ])
        return mark_safe(html)
    medication_summary.short_description = "Items"

    def status_badge(self, obj):
        color = "#10b981" if obj.status == 'DISPENSED' else "#3b82f6"
        return mark_safe(
            f'<span style="background: {color}; color: white; padding: 2px 8px; '
            f'border-radius: 6px; font-size: 9px; font-weight: 900;">{obj.status}</span>'
        )
    status_badge.short_description = "Status"

class LabOrderInline(admin.TabularInline):
    model = LabOrder
    extra = 0
    fields = ('formatted_tests', 'status_badge', 'doctor_notes', 'created_at')
    readonly_fields = ('formatted_tests', 'status_badge', 'doctor_notes', 'created_at')
    can_delete = False
    show_change_link = True

    def formatted_tests(self, obj):
        if not obj.requested_tests: return "-"
        return ", ".join(obj.requested_tests)
    formatted_tests.short_description = "Tests"

    def status_badge(self, obj):
        color = "#f59e0b" if obj.status == 'PENDING' else "#10b981"
        return mark_safe(f'<b style="color: {color};">{obj.status}</b>')
    status_badge.short_description = "Status"

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['latest_health_record_number', 'name', 'gender', 'cancer_type', 'created_at']
    search_fields = ('name', 'registrations__health_record_number', 'phone')
    list_filter = ('gender', 'cancer_type', 'staging')
    inlines = [VitalSignInline, LabResultInline, ClinicalNoteInline, LabOrderInline, PrescriptionInline]
    
    fieldsets = (
        ('Core Identity', {'fields': ('name', 'gender', 'phone', 'email')}),
        ('Oncology Profile', {'fields': ('cancer_type', 'staging')}),
    )

    def latest_health_record_number(self, obj):
        # Fetches the structural operational code assigned during their encounter checkout sequence
        latest_reg = obj.registrations.order_by('id').last()
        if latest_reg and latest_reg.health_record_number:
            return format_html('<span style="font-family: monospace; font-weight: bold; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #1e293b;">{}</span>', latest_reg.health_record_number)
        return mark_safe('<span style="color: #94a3b8; font-style: italic;">No Active Record</span>')
    latest_health_record_number.short_description = "Health Record No"

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

# --- 7. LAB INVENTORY ---

@admin.register(LabInventoryItem)
class LabInventoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'stock', 'min_stock')

@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('item', 'quantity_used', 'remaining_stock', 'technician', 'created_at')

# --- 8. LAB DIAGNOSTICS & PARAMETERS (RESTRUCTURED) ---

@admin.register(LabPanel)
class LabPanelAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


@admin.register(LabTestRegistry)
class LabTestRegistryAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_panel_name', 'get_range', 'price_kes', 'updated_at')
    list_filter = ('parent_panel__name', 'unit')
    search_fields = ('name', 'parent_panel__name', 'recommendation_below_minimum', 'recommendation_above_maximum')
    
    fieldsets = (
        ('Core Matrix Profile', {
            'fields': ('name', 'parent_panel', 'unit', 'price')
        }),
        ('Clinical Target Constraints', {
            'fields': ('lower_range', 'upper_range')
        }),
        ('Automated Oncological Clinical Guidelines', {
            'classes': ('collapse',),
            'fields': ('recommendation_below_minimum', 'recommendation_above_maximum'),
        }),
    )

    def get_panel_name(self, obj):
        return obj.parent_panel.name if obj.parent_panel else "—"
    get_panel_name.short_description = "Master Group Profile"
    get_panel_name.admin_order_field = 'parent_panel__name'

    def get_range(self, obj):
        return f"{obj.lower_range} — {obj.upper_range} {obj.unit}"
    get_range.short_description = "Reference Baseline"

    def price_kes(self, obj):
        return f"KES {obj.price:,}"
    price_kes.short_description = "Charge Profile"


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    # 1. Added select_related optimization here too so loading the admin list is fast
    list_display = ('id', 'patient_link', 'visit_token', 'formatted_tests', 'status_badge', 'created_at')
    list_filter = ('status', 'created_at')
    
    # Kept your excellent deep search indexing across registration workflows intact
    search_fields = ('patient__name', 'patient__registrations__health_record_number', 'visit__queue_id', 'id')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Order Framework Context', {
            'fields': ('patient', 'visit', 'status')
        }),
        # 2. Replaced the missing requested_tests with the explicit boolean toggles
        ('Diagnostic Directives (Select Tests)', {
            'fields': (
                'has_cbc', 
                'has_ue', 
                'has_lft', 
                'has_psa', 
                'has_urine', 
                'has_bg_cross', 
                'has_bs_mp', 
                'doctor_notes'
            ),
        }),
        ('System Audit Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def patient_link(self, obj):
        if obj.patient:
            # Note: Ensure "core_patient_change" matches your actual patient app name layout
            url = reverse("admin:core_patient_change", args=(obj.patient.id,))
            latest_reg = obj.patient.registrations.order_by('id').last()
            hrn = latest_reg.health_record_number if latest_reg else "N/A"
            return format_html(
                '<a href="{}"><b>{}</b> <span style="font-size: 11px; color: #64748b; font-family: monospace;">({})</span></a>', 
                url, obj.patient.name, hrn
            )
        return "No Patient"
    patient_link.short_description = "Patient"

    def visit_token(self, obj):
        if obj.visit:
            token = getattr(obj.visit, 'queue_id', 'N/A')
            return format_html('<span style="font-family: monospace; font-weight: bold; color: #2563eb;">#{}</span>', token)
        return "-"
    visit_token.short_description = "Visit Token"

    def status_badge(self, obj):
        colors = {'PENDING': '#f59e0b', 'COMPLETED': '#10b981'}
        bg_color = colors.get(obj.status, '#64748b')
        style = f"background: {bg_color}; color: white; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 800;"
        return format_html('<span style="{}">{}</span>', style, obj.status)
    status_badge.short_description = "Status"

    def formatted_tests(self, obj):
        """
        3. Updated to dynamically read our clean model property helper.
        This loops through whatever booleans are checked and builds your exact design!
        """
        tests = obj.selected_test_list
        if not tests:
            return mark_safe('<span style="color: #94a3b8; font-style: italic;">No panels selected</span>')
        
        badges = []
        for test in tests:
            badges.append(
                f'<span style="background: #e2e8f0; color: #1e293b; padding: 2px 6px; '
                f'border-radius: 4px; font-weight: bold; font-size: 10px; margin-right: 4px; display: inline-block; margin-bottom: 2px;">{test}</span>'
            )
        return mark_safe("".join(badges))
    formatted_tests.short_description = "Requested Panels"

    def get_queryset(self, request):
        """Optimizes Admin dashboard performance by joining patient and visit queries together"""
        return super().get_queryset(request).select_related('patient', 'visit')
    
    
@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ('test_name_display', 'patient_link', 'visit_token', 'formatted_metrics_inline', 'status_tag', 'is_critical', 'created_at')
    list_filter = ('status', 'is_critical', 'test_name', 'created_at')
    search_fields = ('patient__name', 'patient__registrations__health_record_number', 'test_name', 'technician_notes')
    
    fieldsets = (
        ('Encounter Context', {
            'fields': ('patient', 'visit', 'test_name', 'status', 'is_critical')
        }),
        ('Full Blood Count (CBC Panel Indicators)', {
            'fields': (('cbc_hb', 'cbc_wbc'), ('cbc_neut', 'cbc_plt'), 'cbc_mcv'),
            'classes': ('collapse',), 
        }),
        ('Urea, Electrolytes & Renal Clearance (U&E)', {
            'fields': (('ue_na', 'ue_k'), ('ue_urea', 'ue_creatinine')),
            'classes': ('collapse',),
        }),
        ('Liver Function Assays (LFT)', {
            'fields': (('lft_alt', 'lft_ast'), ('lft_tbil', 'lft_dbil'), ('lft_alp', 'lft_albumin')),
            'classes': ('collapse',),
        }),
        ('Prostate Specific Biomarkers (PSA)', {
            'fields': ('psa_total',),
            'classes': ('collapse',),
        }),
        ('Urinalysis Properties Matrix', {
            'fields': (('urine_color', 'urine_clarity'), ('urine_glucose', 'urine_protein'), ('urine_nitrites', 'urine_blood')),
            'classes': ('collapse',),
        }),
        ('ABO Blood Grouping & Cross Match', {
            'fields': (('bg_abo', 'bg_rhesus'), 'bg_compatibility'),
            'classes': ('collapse',),
        }),
        ('Parasitology Slide Index', {
            'fields': (('malaria_mps', 'malaria_species'),),
            'classes': ('collapse',),
        }),
        ('Technical Diagnostics Remarks', {
            'fields': ('technician_notes', 'recorded_by'),
        }),
    )

    readonly_fields = ('created_at',)

    def test_name_display(self, obj):
        return obj.get_test_name_display() if hasattr(obj, 'get_test_name_display') else obj.test_name
    test_name_display.short_description = "Investigation"

    def patient_link(self, obj):
        if obj.patient:
            url = reverse("admin:core_patient_change", args=(obj.patient.id,))
            latest_reg = obj.patient.registrations.order_by('id').last()
            hrn = latest_reg.health_record_number if latest_reg else "N/A"
            return format_html('<a href="{}"><b>{}</b> <span style="font-size:11px; color:#0d9488; font-family:monospace;">[{}]</span></a>', url, obj.patient.name, hrn)
        return "No Patient"
    patient_link.short_description = "Patient"

    def visit_token(self, obj):
        if obj.visit:
            token = getattr(obj.visit, 'token_id', getattr(obj.visit, 'queue_id', 'N/A'))
            return format_html('<span style="font-family: monospace; font-weight: bold; color: #0d9488;">#{}</span>', token)
        return "-"
    visit_token.short_description = "Token"

    def status_tag(self, obj):
        colors = {'PENDING': '#f59e0b', 'COLLECTED': '#06b6d4', 'COMPLETED': '#0d9488'}
        bg_color = colors.get(obj.status, '#64748b')
        style = f"background: {bg_color}; color: white; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800;"
        return format_html('<span style="{}">{}</span>', style, obj.status)
    status_tag.short_description = "Status"

    def formatted_metrics_inline(self, obj):
        try:
            if obj.test_name == 'CBC':
                hb = getattr(obj, 'cbc_hb', None) or '—'
                neut = getattr(obj, 'cbc_neut', None) or '—'
                plt = getattr(obj, 'cbc_plt', None) or '—'
                return format_html('<span style="font-family: monospace;"><b>Hb:</b> {} g/dL | <b>ANC:</b> {} | <b>PLT:</b> {}</span>', hb, neut, plt)
                
            elif obj.test_name == 'UE':
                cr = getattr(obj, 'ue_creatinine', None) or '—'
                urea = getattr(obj, 'ue_urea', None) or '—'
                return format_html('<span style="font-family: monospace;"><b>Cr:</b> {} µmol/L | <b>Urea:</b> {}</span>', cr, urea)
                
            elif obj.test_name == 'LFT':
                alt = getattr(obj, 'lft_alt', None) or '—'
                ast = getattr(obj, 'lft_ast', None) or '—'
                alb = getattr(obj, 'lft_albumin', None) or '—'
                return format_html('<span style="font-family: monospace;"><b>ALT:</b> {} U/L | <b>AST:</b> {} | <b>ALB:</b> {}</span>', alt, ast, alb)
                
            elif obj.test_name == 'PSA':
                psa = getattr(obj, 'psa_total', None) or '—'
                return format_html('<span style="font-family: monospace; font-weight: bold; color: #b91c1c;">PSA: {} ng/mL</span>', psa)
        except Exception as e:
            return format_html('<span style="color: #ef4444; font-style: italic;">Formatting Error</span>')
        
        return format_html('<span style="color: #94a3b8; font-style: italic;">{}</span>', "No metrics registered")
    formatted_metrics_inline.short_description = "Observed Findings Summary"


# --- 9. SUPPORT, PSYCHOLOGY & CAMPAIGNS ---

@admin.register(PsychologyEnrollment)
class PsychologyEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('medical_record_no', 'patient_name', 'current_stage', 'status', 'location_department', 'consent_form_signed', 'created_at')
    list_filter = ('current_stage', 'status', 'location_department', 'consent_form_signed')
    search_fields = ('patient_name', 'medical_record_no', 'diagnosis')
    readonly_fields = ('created_at', 'updated_at', 'enrolled_by')
    
    fieldsets = (
        ('Patient Identity & Intake Context', {
            'fields': ('patient_name', 'medical_record_no', 'diagnosis', 'initial_intake_note')
        }),
        ('Clinical Status Tracking', {
            'fields': ('current_stage', 'status', 'location_department')
        }),
        ('Institutional Pre-Requisites', {
            'fields': ('consent_form_signed',)
        }),
        ('System Metadata Audit Logs', {
            'fields': ('enrolled_by', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(SessionLog)
class SessionLogAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'session_date', 'is_synced_with_hro')
    list_filter = ('is_synced_with_hro', 'session_date')
    search_fields = ('enrollment__patient_name', 'enrollment__medical_record_no', 'clinical_notes')
    readonly_fields = ('session_date',)


@admin.register(BereavementLog)
class BereavementLogAdmin(admin.ModelAdmin):
    list_display = ('primary_contact_name', 'contact_phone', 'support_status', 'total_sessions_conducted', 'last_contact_date')
    list_filter = ('support_status', 'last_contact_date')
    search_fields = ('primary_contact_name', 'contact_phone', 'enrollment__patient_name')
    readonly_fields = ('last_contact_date',)


@admin.register(OutreachCampaign)
class OutreachCampaignAdmin(admin.ModelAdmin):
    list_display = ('title', 'campaign_type', 'target_region_location', 'start_date', 'actual_turnout', 'patients_referred_to_salama', 'status')
    list_filter = ('campaign_type', 'status', 'start_date')
    search_fields = ('title', 'target_region_location', 'notes_summary')
    
    fieldsets = (
        ('Campaign Core Metadata', {
            'fields': ('title', 'campaign_type', 'target_region_location', 'status')
        }),
        ('Timeline Framework', {
            'fields': ('start_date', 'end_date')
        }),
        ('Financial & Influx Impact Metrics', {
            'fields': ('allocated_budget', 'actual_spent', 'estimated_attendance', 'actual_turnout', 'patients_referred_to_salama')
        }),
        ('Strategic Notes', {
            'fields': ('notes_summary',),
        }),
    )


@admin.register(ReferralPartner)
class ReferralPartnerAdmin(admin.ModelAdmin):
    list_display = ('facility_or_doctor_name', 'partner_type', 'location_base', 'contact_phone', 'total_patients_referred', 'is_active_engagement')
    list_filter = ('partner_type', 'is_active_engagement', 'location_base')
    search_fields = ('facility_or_doctor_name', 'contact_phone', 'location_base')


@admin.register(SocialMediaPost)
class SocialMediaPostAdmin(admin.ModelAdmin):
    list_display = ('target_platform', 'status', 'schedule_date', 'schedule_time', 'consent_verified', 'medical_signoff', 'created_at')
    list_filter = ('target_platform', 'status', 'consent_verified', 'medical_signoff')
    search_fields = ('content',)
    
    fieldsets = (
        ('Media Content Copy', {
            'fields': ('content', 'target_platform', 'status')
        }),
        ('Deployment Schedule Vectors', {
            'fields': ('schedule_date', 'schedule_time')
        }),
        ('Clinical Governance & Policy Safeguards', {
            'fields': ('consent_verified', 'medical_signoff'),
        }),
    )




# 1. Create an inline view for marketing extensions
class MarketingExtensionInline(admin.StackedInline):
    model = MarketingRequisitionExtension
    can_delete = False
    verbose_name_plural = "Marketing Metadata Extension"

# 2. Create an inline view for itemized lines (Lab/Pharmacy)
class RequisitionItemInline(admin.TabularInline):
    model = RequisitionItem
    extra = 0
    readonly_fields = ['unit_price', 'line_total']

# 3. Create the parent Admin Manager
@admin.register(Requisition)
class RequisitionAdmin(admin.ModelAdmin):
    # Fixed list_display fields to pull valid columns from the parent Requisition model
    list_display = ['id', 'department', 'reason', 'requested_by', 'status', 'total_cost', 'created_at']
    list_filter = ['department', 'status', 'created_at', 'is_viewed_by_finance']
    search_fields = ['reason', 'requested_by__first_name', 'requested_by__last_name', 'id']
    ordering = ['-created_at']
    
    # Attaches both clinical line arrays and marketing tags into a single clean admin panel view
    inlines = [MarketingExtensionInline, RequisitionItemInline]


@admin.register(Protocol)
class ProtocolAdmin(admin.ModelAdmin):
    list_display = (
        'name', 
        'get_primary_site', 
        'get_cancer_type', 
        'get_cycles', 
        'get_duration',
        'get_stages'
    )
    
    search_fields = ('name',) 
    ordering = ('name',)

    @admin.display(description='Primary Site')
    def get_primary_site(self, obj):
        if getattr(obj, 'primary_site', None) and hasattr(obj.primary_site, 'name'):
            return obj.primary_site.name.upper()
        if hasattr(obj, 'primary_site_name') and obj.primary_site_name:
            return str(obj.primary_site_name).upper()
        return str(getattr(obj, 'primary_site_id', getattr(obj, 'primary_site', '—'))).upper()

    @admin.display(description='Cancer Type')
    def get_cancer_type(self, obj):
        if getattr(obj, 'cancer_type', None) and hasattr(obj.cancer_type, 'name'):
            return obj.cancer_type.name
        if hasattr(obj, 'cancer_type_name') and obj.cancer_type_name:
            return obj.cancer_type_name
        return str(getattr(obj, 'cancer_type_id', getattr(obj, 'cancer_type', '—')))

    @admin.display(description='Cycles')
    def get_cycles(self, obj):
        return getattr(obj, 'cycles', getattr(obj, 'total_cycles', '—'))

    @admin.display(description='Duration')
    def get_duration(self, obj):
        days = getattr(obj, 'cycle_duration_days', getattr(obj, 'duration', getattr(obj, 'cycle_duration', None)))
        return f"{days} Days" if days else "—"

    @admin.display(description='Stages')
    def get_stages(self, obj):
        stages_data = getattr(obj, 'applicable_stages', getattr(obj, 'stages', []))
        if not stages_data:
            return format_html('<span style="color: #94a3b8; font-style: italic;">None</span>')
        
        # Safe string list conversion handling if stored as raw text separation commas
        if isinstance(stages_data, str):
            stages_data = [s.strip() for s in stages_data.split(',') if s.strip()]
            
        # FIXED: Building safe standalone html blocks via explicit format mapping arguments
        badges = []
        for stage in stages_data:
            badges.append(
                format_html(
                    '<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; '
                    'margin: 2px; border-radius: 4px; font-size: 11px; font-weight: 500; '
                    'border: 1px solid #e2e8f0; display: inline-block;">{}</span>',
                    stage
                )
            )
        
        # Combine using safe HTML joining methods to prevent rendering literal escape characters
        return mark_safe(''.join(badges))
    
admin.site.register(ChemoSession)
admin.site.register(Treatment)


class DrugGuardrailInline(admin.StackedInline):
    """
    Allows editing cascading guardrails directly within the Medication panel
    """
    model = DrugGuardrail
    extra = 1  
    classes = ['collapse']  
    fieldsets = (
        (None, {
            'fields': (('parameter', 'operator', 'value'), ('action', 'action_value'))
        }),
    )


class ProtocolDrugInline(admin.StackedInline):
    """
    Allows managing medications dynamically inside the main Protocol Master interface
    """
    model = ProtocolDrug
    extra = 1
    show_change_link = True  
    fieldsets = (
        (None, {
            'fields': (('drug_name', 'base_dose', 'unit'), ('route', 'administration_day'))
        }),
    )


@admin.register(ProtocolMaster)
class ProtocolMasterAdmin(admin.ModelAdmin):
    """
    The Ultimate Engine Control Center Panel
    """
    list_display = ('protocol_name', 'cancer_type', 'total_cycles', 'days_per_cycle', 'created_at')
    list_filter = ('cancer_type', 'created_at')
    search_fields = ('protocol_name', 'cancer_type', 'clinical_signs')
    
    fieldsets = (
        ('System Classification Core', {
            'fields': (('protocol_name', 'cancer_type'),)
        }),
        ('Diagnostic Vectors & Flags', {
            'fields': ('stages', 'biomarkers', 'clinical_signs'),
            'description': 'Input arrays are maintained directly as valid JSON tracking strings.'
        }),
    )


class InsuranceSchemeInline(admin.TabularInline):
    """
    Allows inline creation and editing of nested sub-plans directly 
    inside the parent Insurance Company detail view.
    """
    model = InsuranceScheme
    extra = 1  # Provides one empty row by default for adding a new scheme
    fields = (
        'name', 'classification', 'preauth_threshold', 
        'copay_amount', 'shif_coordination', 'is_active'
    )
    classes = ('collapse',)  # Keeps the form clean by allowing the matrix to toggle open/closed


@admin.register(InsuranceCompany)
class InsuranceCompanyAdmin(admin.ModelAdmin):
    """
    Control panel for managing medical insurance payers and corporate accounts.
    Enriched with nested operational schemes and advanced corporate attributes.
    """
    list_display = (
        'name', 'payer_type', 'kra_pin', 'contact_person', 
        'phone', 'view_portal', 'is_active'
    )
    search_fields = ('name', 'payer_code', 'kra_pin', 'contact_person', 'email')
    list_filter = ('payer_type', 'is_active', 'contract_end_date')
    ordering = ('name',)
    
    # Wire up the inline manager to handle nested layout schemes concurrently
    inlines = [InsuranceSchemeInline]

    fieldsets = (
        ('Corporate Identity', {
            'fields': ('name', 'payer_code', 'payer_type', 'kra_pin', 'api_endpoint')
        }),
        ('Contact & Address Parameters', {
            # 👇 FIXED: Swapped out non-existent portal_link with api_endpoint field mapping reference
            'fields': ('contact_person', 'contact_role', 'email', 'phone', 'physical_address', 'postal_address')
        }),
        ('Contract SLA & Tariff Management', {
            'fields': ('contract_start_date', 'contract_end_date', 'claim_submission_window', 'corporate_discount_rate', 'price_list_tariff', 'sla_document'),
            'description': 'Contract terms matching valid Service Level Agreements (SLA) signed with the provider.'
        }),
    )

    def view_portal(self, obj):
        """Generates a secure shortcut link directly to the payer portal in a new tab."""
        # 👇 FIXED: Points cleanly to real api_endpoint column values
        if obj.api_endpoint:
            return format_html('<a href="{}" target="_blank" style="font-weight: bold; color: #00796b;">Verify Sync API ↗</a>', obj.api_endpoint)
        return "No API Linked"
    view_portal.short_description = 'Payer Portal Integration'


@admin.register(InsuranceClaim)
class InsuranceClaimAdmin(admin.ModelAdmin):
    """
    Audit ledger tracking hospital treatment invoices routed to medical insurers.
    """
    list_display = (
        'claim_number', 'patient', 'insurance_company', 
        'total_amount_billed', 'amount_paid', 'shortfall_amount', 'status_tag', 'date_submitted'
    )
    list_filter = ('status', 'insurance_company', 'date_submitted')
    search_fields = ('claim_number', 'pre_auth_code', 'patient__first_name', 'patient__last_name')
    ordering = ('-date_submitted',)
    
    # Enforces explicit data entry safety loops on critical financial records
    readonly_fields = ('date_submitted', 'reconciled_at')
    
    # Optimizes DB overhead by replacing massive dropdowns with a sleek search modal box
    raw_id_fields = ('patient', 'insurance_company')

    # Color code execution pathways for insurance claims in the admin index table
    def status_tag(self, obj):
        # 👇 FIXED: Aligned keys perfectly with your InsuranceClaim model's real database choices
        status_colors = {
            'DRAFT': '#757575',               # Neutral Slate Gray
            'SUBMITTED': '#0288d1',           # Vibrant Informational Blue
            'ADJUDICATION': '#f57c00',        # Amber Alert/In Review Warning
            'DISPUTED': '#d32f2f',            # Danger Crimson Red
            'REMITTED': '#388e3c',            # Success Field Emerald Green
            'PARTIALLY_REMITTED': '#7b1fa2'   # Deep Purple Shortfall Warning
        }
        color = status_colors.get(obj.status, '#757575')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; text-transform: uppercase;">{}</span>',
            color, obj.get_status_display() # Use get_status_display() to show clean frontend wording ("Paid/Remitted") instead of raw DB keys
        )
    status_tag.short_description = 'Claim Status'


@admin.register(InsuranceScheme)
class InsuranceSchemeAdmin(admin.ModelAdmin):
    """
    Standalone registry fallback to view or modify specific benefit matrix rules directly.
    """
    list_display = ('name', 'company', 'classification', 'copay_amount', 'shif_coordination', 'is_active')
    list_filter = ('classification', 'shif_coordination', 'is_active', 'company')
    search_fields = ('name', 'company__name')
    raw_id_fields = ('company',)


@admin.register(RemittanceBatch)
class RemittanceBatchAdmin(admin.ModelAdmin):
    """
    Financial batch tracking module for processed bulk electronic funds transfers (EFT).
    """
    list_display = (
        'payment_reference', 'insurance_company', 'total_amount_received', 
        'date_received', 'reconciled_by', 'has_file'
    )
    list_filter = ('insurance_company', 'date_received')
    search_fields = ('payment_reference', 'insurance_company__name')
    ordering = ('-date_received', '-id')
    readonly_fields = ('created_at', 'reconciled_by')
    raw_id_fields = ('insurance_company',)

    def has_file(self, obj):
        """Visual checkmark in the list view showing if a spreadsheet document is present."""
        return bool(obj.remittance_file)
    has_file.boolean = True
    has_file.short_description = 'Statement File'

    def save_model(self, request, obj, form, change):
        """Automatically stamp the administrative auditor's user ID onto newly registered bank files."""
        if not change: # If creating a record via admin site
            obj.reconciled_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(ClaimDispatchBatch)
class ClaimDispatchBatchAdmin(admin.ModelAdmin):
    """
    Hospital Ledger interface tracking structured claim invoices 
    batched and physically or electronically dispatched to insurance providers.
    """
    list_display = (
        'batch_reference', 'insurance_company', 'total_batch_value', 
        'date_dispatched', 'claims_count_display', 'is_acknowledged', 'created_by'
    )
    list_filter = ('is_acknowledged', 'insurance_company', 'date_dispatched')
    search_fields = ('batch_reference', 'insurance_company__name')
    ordering = ('-date_dispatched', '-id')
    
    # Pre-emptively block dangerous edits on audited transactional properties
    readonly_fields = ('date_dispatched', 'created_by')
    raw_id_fields = ('insurance_company',)
    
    def claims_count_display(self, obj):
        """Displays total number of patient files nested inside this batch record."""
        count = obj.claims.count()
        if count == 0:
            return format_html('<span style="color: #c62828; font-weight: bold;">0 Claims (Empty)</span>')
        return format_html('<span style="color: #2e7d32; font-weight: bold;">{} Claims</span>', count)
    claims_count_display.short_description = 'Claims Count'

    def save_model(self, request, obj, form, change):
        """Automatically audit-stamps the logged-in billing specialist compile signature."""
        if not change:  # On record creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

# --- Inline View for Billable Items inside Patient/Visit views if needed ---
class PatientBillableItemInline(admin.TabularInline):
    model = PatientBillableItem
    extra = 0
    raw_id_fields = ['patient', 'visit']
    readonly_fields = [
        'service_sku_snapshot', 'service_name_snapshot', 
        'price_snap', 'total_amount', 'ordered_by', 'created_at'
    ]
    can_delete = False


# --- Admin Configuration for Master Service Catalog ---

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'dept', 'price', 'active', 'created_at']
    list_filter = ['dept', 'active', 'created_at']
    search_fields = ['sku', 'name']
    ordering = ['sku']
    list_editable = ['price', 'active']  # Allows quick baseline adjustments right from the table row
    
    fieldsets = (
        ('Core Identifier', {
            'fields': ('sku', 'name', 'dept')
        }),
        ('Financial Configuration', {
            'fields': ('price', 'active')
        }),
    )

    def save_model(self, request, obj, form, change):
        """Force uppercase SKUs on save via Django Admin interface."""
        if obj.sku:
            obj.sku = obj.sku.strip().upper()
        super().save_model(request, obj, form, change)


# --- Admin Configuration for Point-of-Care Billing Transactions ---

@admin.register(PatientBillableItem)
class PatientBillableItemAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'get_queue_id', 'get_patient_name', 'service_sku_snapshot', 
        'service_name_snapshot', 'station_charged', 'qty', 'price_snap', 
        'total_amount', 'billing_status', 'created_at'
    ]
    list_filter = ['billing_status', 'station_charged', 'created_at']
    search_fields = [
        'service_sku_snapshot', 'service_name_snapshot', 
        'patient__name', 'visit__queue_id', 'visit__health_record_number'
    ]
    ordering = ['-created_at']
    list_editable = ['billing_status']  # Enables billing supervisors to quickly toggle status overrides (PAID/WAIVED)
    
    # Critical: Keep snapshot details strictly read-only to prevent back-end financial manipulation
    readonly_fields = [
        'service_sku_snapshot', 'service_name_snapshot', 
        'price_snap', 'total_amount', 'ordered_by', 'created_at'
    ]
    
    raw_id_fields = ['patient', 'visit', 'service']  # Use search glass popups instead of resource-heavy select boxes

    fieldsets = (
        ('Encounter Linkage', {
            'fields': ('patient', 'visit', 'service')
        }),
        ('Transaction Snapshot Data', {
            'description': 'Immutable point-of-care financial snapshots preserved for historical auditing purposes.',
            'fields': ('service_sku_snapshot', 'service_name_snapshot', 'price_snap')
        }),
        ('Quantities & Financials', {
            'fields': ('qty', 'total_amount', 'billing_status', 'station_charged')
        }),
        ('Audit Metadata', {
            'fields': ('ordered_by', 'created_at')
        }),
    )

    # Custom columns to resolve performance-friendly relational field strings on your table matrix
    @admin.display(ordering='visit__queue_id', description='Queue Token')
    def get_queue_id(self, obj):
        return obj.visit.queue_id if obj.visit else "N/A"

    @admin.display(ordering='patient__name', description='Patient Name')
    def get_patient_name(self, obj):
        return obj.patient.name
    
class RegimenDrugInline(admin.TabularInline):
    model = RegimenDrug
    extra = 0  # Prevents empty placeholder rows from cluttering the screen
    # ✨ FIX: Included metric_unit and route_pathway fields
    fields = ['name', 'base_value', 'metric_unit', 'route_pathway', 'cycle_cost_kes']


# 2. Inline to see Regimen acronyms listed right inside a Cancer Subtype view
class RegimenInline(admin.TabularInline):
    model = Regimen
    extra = 0
    show_change_link = True  # Adds a direct link to open the full Regimen configuration window


# 3. Registering the Primary Sites
@admin.register(CancerSite)
class CancerSiteAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']
    search_fields = ['name']


# 4. Registering the Cancer Types / Subtypes
@admin.register(CancerType)
class CancerTypeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'site']
    list_filter = ['site']
    search_fields = ['name']
    inlines = [RegimenInline]
    # ✨ PERFORMANCE: Optimizes loading the parent CancerSite row
    list_select_related = ['site']


# 5. Registering the Regimen Protocols (Displays the 3-step hierarchy cleanly)
@admin.register(Regimen)
class RegimenAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'get_cancer_type', 'get_primary_site', 'default_cycles']
    list_filter = ['cancer_type__site', 'cancer_type']
    search_fields = ['name', 'cancer_type__name']
    inlines = [RegimenDrugInline]
    
    # ✨ PERFORMANCE: Solves the N+1 database problem by pre-fetching foreign data in 1 query
    list_select_related = ['cancer_type', 'cancer_type__site']

    # Helper columns to display parental data directly on the main summary list
    @admin.display(ordering='cancer_type__name', description='Cancer Subtype')
    def get_cancer_type(self, obj):
        return obj.cancer_type.name

    @admin.display(ordering='cancer_type__site__name', description='Primary Site')
    def get_primary_site(self, obj):
        return obj.cancer_type.site.name


# 6. Standalone view for individual drugs if needed
@admin.register(RegimenDrug)
class RegimenDrugAdmin(admin.ModelAdmin):
    # ✨ FIX: Added metric_unit and route_pathway columns to the overview list
    list_display = ['id', 'name', 'base_value', 'metric_unit', 'route_pathway', 'cycle_cost_kes', 'get_regimen_name']
    list_filter = ['regimen__cancer_type__site']
    search_fields = ['name', 'regimen__name']
    
    # ✨ PERFORMANCE: Optimizes multi-level nested string serialization
    list_select_related = ['regimen', 'regimen__cancer_type', 'regimen__cancer_type__site']

    @admin.display(ordering='regimen__name', description='Protocol Regimen')
    def get_regimen_name(self, obj):
        return obj.regimen.name
    

@admin.register(ICD10Diagnosis)
class ICD10DiagnosisAdmin(admin.ModelAdmin):
    # Columns to display in the admin change-list grid layout
    list_display = ('code', 'primary_site', 'short_description')
    
    # Left sidebar filters to quickly slice records by anatomical site
    list_filter = ('primary_site',)
    
    # Enables a global search box targeting the code or descriptions
    search_fields = ('code', 'short_description', 'long_description')
    
    # Alphabetical ordering by primary site group, then code sequence
    ordering = ('primary_site', 'code')
    
    # Optimizes pagination speeds by showing 50 entries per page
    list_per_page = 50

    # Read-only fields layout configurations for safety
    fieldsets = (
        ('Anatomical Classification', {
            'fields': ('primary_site', 'code')
        }),
        ('Clinical Content Definitions', {
            'fields': ('short_description', 'long_description'),
        }),
    )

@admin.register(PatientDiagnosis)
class PatientDiagnosisAdmin(admin.ModelAdmin):
    # 1. Columns displayed in the change list dashboard grid
    list_display = (
        'get_health_record_number', 
        'patient', 
        'primary_site', 
        'icd10_code', 
        'icd10_description', 
        'created_at'
    )
    
    # 2. Sidebar filter widgets to narrow down records instantly
    list_filter = ('primary_site', 'created_at')
    
    # 3. Dynamic search bar mapping across codes, descriptions, and linked models
    search_fields = (
        'icd10_code', 
        'icd10_description', 
        'visit__health_record_number',
        'patient__first_name',
        'patient__last_name'
    )
    
    # 4. Protect the auto-timestamp from being manually edited inside the detail view
    readonly_fields = ('created_at',)
    
    # 5. Default sorting layout to prioritize the newest clinical records
    ordering = ('-created_at',)

    # ⭐ Custom display function to safely map and show the Health Record Number
    @admin.display(ordering='visit__health_record_number', description='Health Record Number')
    def get_health_record_number(self, obj):
        return obj.visit.health_record_number
    

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    # Searchable and filterable fields for quick audit
    list_display = (
        'name', 
        'category', 
        'is_compliant', 
        'tax_compliance_expiry', 
        'is_active'
    )
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'tin_number', 'contact_person')
    
    # Keep sensitive banking and meta data separate in the UI
    fieldsets = (
        ('Corporate Identity', {
            'fields': ('name', 'category', 'contact_person', 'email', 'phone', 'tin_number', 'license_number', 'is_active')
        }),
        ('Compliance Documents', {
            'fields': (
                'kra_pin_doc', 
                'incorporation_doc', 
                'regulatory_license_doc', 
                'bank_confirmation_doc', 
                'tax_compliance_doc', 
                'tax_compliance_expiry'
            )
        }),
        ('Financial Details', {
            'fields': ('bank_name', 'account_name', 'account_number', 'branch_code', 'swift_code', 'payment_terms', 'performance_rating')
        }),
        ('Administrative', {
            'fields': ('notes', 'contract_document', 'contract_start', 'contract_end')
        }),
    )

    # Custom logic to show compliance status in the Admin list view
    def is_compliant(self, obj):
        from django.utils import timezone
        if not obj.tax_compliance_expiry:
            return False
        return obj.tax_compliance_expiry >= timezone.now().date()
    
    is_compliant.boolean = True
    is_compliant.short_description = 'Tax Compliant'


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    fields = ('item_name', 'category', 'quantity', 'unit_cost', 'get_total_cost')
    readonly_fields = ('get_total_cost',)

    def get_total_cost(self, obj):
        if obj.id:
            return f"KES {obj.total_cost:,.2f}"
        return "KES 0.00"
    get_total_cost.short_description = "Total Cost"


class GRNItemInline(admin.TabularInline):
    model = GRNItem
    extra = 0
    fields = ('item_name', 'ordered_quantity', 'quantity_received', 'damaged_quantity', 'satisfaction_level')
    # Prevent tampering with delivery logs once saved
    readonly_fields = ('item_name', 'ordered_quantity', 'quantity_received', 'damaged_quantity', 'satisfaction_level')
    can_delete = False


# ----------------------------------------------------------------------
# Purchase Orders, Goods Received Notes, Invoices, and Payment Vouchers Admin Configurations
# ----------------------------------------------------------------------

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'supplier', 'issue_date', 'delivery_date', 'status', 'get_total_amount')
    list_filter = ('status', 'issue_date', 'payment_terms')
    search_fields = ('po_number', 'supplier__name')
    readonly_fields = ('po_number', 'issue_date', 'get_total_amount')
    inlines = [PurchaseOrderItemInline]
    actions = ['approve_selected_orders', 'cancel_selected_orders']

    def get_total_amount(self, obj):
        return f"KES {obj.total_amount:,.2f}"
    get_total_amount.short_description = "Estimated Total Value"

    # Custom Admin Actions for quick overrides
    @admin.action(description="Mark selected orders as Approved & Sent")
    def approve_selected_orders(self, request, queryset):
        updated = queryset.update(status='APPROVED')
        self.message_user(request, f"{updated} purchase orders successfully moved to APPROVED state.")

    @admin.action(description="Mark selected orders as Cancelled")
    def cancel_selected_orders(self, request, queryset):
        updated = queryset.update(status='CANCELLED')
        self.message_user(request, f"{updated} purchase orders successfully cancelled.")


@admin.register(GoodsReceivedNote)
class GoodsReceivedNoteAdmin(admin.ModelAdmin):
    list_display = ('grn_number', 'purchase_order', 'delivery_note_ref', 'date_received')
    list_filter = ('date_received',)
    search_fields = ('grn_number', 'purchase_order__po_number', 'delivery_note_ref')
    readonly_fields = ('grn_number', 'date_received')
    inlines = [GRNItemInline]


@admin.register(PurchaseInvoice)
class PurchaseInvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'purchase_order', 'total_billed', 'due_date', 'status', 'view_invoice_file')
    list_filter = ('status', 'due_date')
    search_fields = ('invoice_number', 'purchase_order__po_number')
    readonly_fields = ('created_at',)

    def view_invoice_file(self, obj):
        """Generates a secure anchor link in Django admin to inspect uploaded file scans"""
        if obj.invoice_file:
            return format_html('<a href="{}" target="_blank" style="font-weight: bold; color: #2563eb;">View File</a>', obj.invoice_file.url)
        return "No Upload"
    view_invoice_file.short_description = "Physical Scan"


@admin.register(PaymentVoucher)
class PaymentVoucherAdmin(admin.ModelAdmin):
    list_display = ('voucher_number', 'purchase_invoice', 'amount_paid', 'payment_mode', 'payment_reference', 'date_issued')
    list_filter = ('payment_mode', 'date_issued')
    search_fields = ('voucher_number', 'payment_reference', 'purchase_invoice__invoice_number')
    readonly_fields = ('voucher_number', 'date_issued')