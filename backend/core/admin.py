from django.contrib import admin
from django.contrib.auth import get_user_model
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.http import HttpResponse
from django.utils.safestring import mark_safe

import csv
from .models import (LabOrder, RegistrationRecord,
    LabInventoryItem, Patient, Protocol, StockAdjustment, Treatment, ChemoSession, 
    Drug, LabResult, Bill, Appointment, VitalSign, Queue,
    Prescription, PrescriptionItem, ClinicalNote, ImagingRecord, PsychologyEnrollment, SessionLog, BereavementLog, 
    OutreachCampaign, ReferralPartner, SocialMediaPost, MarketingRequisition, LabTestRegistry, LabPanel, ProtocolMaster, ProtocolDrug, DrugGuardrail
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
    list_display = ('queue_id', 'urgency_badge', 'patient', 'insurance', 'registered_at')
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
    list_display = ['registry_no', 'name', 'gender', 'cancer_type', 'staging', 'created_at']
    search_fields = ('name', 'registry_no', 'phone')
    list_filter = ('gender', 'cancer_type', 'staging')
    inlines = [VitalSignInline, LabResultInline, ClinicalNoteInline, LabOrderInline, PrescriptionInline]
    
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
    list_display = ('id', 'patient_link', 'visit_token', 'formatted_tests', 'status_badge', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('patient__name', 'visit__queue_id', 'id')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Order Framework Context', {
            'fields': ('patient', 'visit', 'status')
        }),
        ('Diagnostic Directives', {
            'fields': ('requested_tests', 'doctor_notes'),
        }),
        ('System Audit Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def patient_link(self, obj):
        if obj.patient:
            url = reverse("admin:core_patient_change", args=(obj.patient.id,))
            return format_html('<a href="{}"><b>{}</b></a>', url, obj.patient.name)
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
        if not obj.requested_tests:
            return mark_safe('<span style="color: #94a3b8; font-style: italic;">No panels selected</span>')
        
        badges = []
        for test in obj.requested_tests:
            badges.append(
                f'<span style="background: #e2e8f0; color: #1e293b; padding: 2px 6px; '
                f'border-radius: 4px; font-weight: bold; font-size: 10px; margin-right: 4px;">{test}</span>'
            )
        return mark_safe("".join(badges))
    formatted_tests.short_description = "Requested Panels"


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ('test_name_display', 'patient_link', 'visit_token', 'formatted_metrics_inline', 'status_tag', 'is_critical', 'created_at')
    list_filter = ('status', 'is_critical', 'test_name', 'created_at')
    search_fields = ('patient__name', 'test_name', 'technician_notes')
    
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
            return format_html('<a href="{}"><b>{}</b></a>', url, obj.patient.name)
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


@admin.register(MarketingRequisition)
class MarketingRequisitionAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'campaign', 'requested_amount', 'status', 'created_at')
    list_filter = ('category', 'status', 'created_at')
    search_fields = ('title', 'justification_notes')


admin.site.register(Protocol)
admin.site.register(ChemoSession)
admin.site.register(Treatment)




class DrugGuardrailInline(admin.StackedInline):
    """
    Allows editing cascading guardrails directly within the Medication panel
    """
    model = DrugGuardrail
    extra = 1  # Provides 1 empty form slot by default for rapid additions
    classes = ['collapse']  # Keeps the rule sets collapsible to avoid visual clutter
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
    show_change_link = True  # Useful if you want to jump to this specific row's detail screen
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
    # High-level overview table layout columns
    list_display = ('protocol_name', 'cancer_type', 'total_cycles', 'days_per_cycle', 'created_at')
    
    # Left-side quick-filtering sidebar widgets
    list_filter = ('cancer_type', 'created_at')
    
    # Omnibox target indexing fields
    search_fields = ('protocol_name', 'cancer_type', 'clinical_signs')
    
    # Organizes the structural properties layout elegantly using bold headers
    fieldsets = (
        ('System Classification Core', {
            'fields': (('protocol_name', 'cancer_type'),)
        }),
        ('Diagnostic Vectors & Flags', {
            'fields': ('stages', 'biomarkers', 'clinical_signs'),
            'description': 'Input arrays are maintained directly as valid JSON tracking strings.'
        }),
        ('Temporal Scheduling Parameters', {
            'fields': (('total_cycles', 'days_per_cycle'),)
        }),
    )

    inlines = [ProtocolDrugInline]


# Also register the child objects directly in case admins need a standalone bird's-eye view of them
@admin.register(ProtocolDrug)
class ProtocolDrugAdmin(admin.ModelAdmin):
    list_display = ('drug_name', 'protocol', 'base_dose', 'unit', 'route')
    list_filter = ('route', 'unit')
    search_fields = ('drug_name', 'protocol__protocol_name')
    inlines = [DrugGuardrailInline]


@admin.register(DrugGuardrail)
class DrugGuardrailAdmin(admin.ModelAdmin):
    list_display = ('get_drug_name', 'get_protocol_name', 'parameter', 'operator', 'value', 'action')
    list_filter = ('parameter', 'action', 'operator')
    search_fields = ('drug__drug_name', 'drug__protocol__protocol_name')

    # Custom model field getters to show linked relational values in columns cleanly
    def get_drug_name(self, obj):
        return obj.drug.drug_name
    get_drug_name.short_description = 'Medication Target'

    def get_protocol_name(self, obj):
        return obj.drug.protocol.protocol_name
    get_protocol_name.short_description = 'Parent Protocol Code'