from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import Patient, Protocol, Treatment, ChemoSession, Drug, LabResult, Bill

User = get_user_model()

# 1. Patient Admin with Clinical & Billing Focus
@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    # Added 'phone' and 'ecog_status' to the display for quick reference
    list_display = ('registry_no', 'name', 'phone', 'cancer_type', 'ecog_status', 'gender', 'created_at')
    # search_fields now includes phone and insurance_no for administrative lookups
    search_fields = ('name', 'registry_no', 'cancer_type', 'phone', 'insurance_no')
    list_filter = ('gender', 'cancer_type', 'staging', 'insurance_type')
    readonly_fields = ('created_at',)
    
    # Organizing fields into sections for better readability
    fieldsets = (
        ('Core Identity', {
            'fields': ('name', 'registry_no', 'dob', 'gender', 'phone', 'blood_group')
        }),
        ('Oncology Data', {
            'fields': ('cancer_type', 'staging', 'ecog_status', 'biomarkers')
        }),
        ('Billing & Emergency', {
            'fields': ('insurance_type', 'insurance_no', 'emergency_contact')
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

# 2. Treatment and Sessions (Inline)
class ChemoSessionInline(admin.TabularInline):
    model = ChemoSession
    extra = 1
    # Ensuring we see who administered the session in the treatment view
    fields = ('date', 'cycle_no', 'administered_by', 'notes')

@admin.register(Treatment)
class TreatmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'protocol', 'oncologist', 'status', 'start_date')
    list_filter = ('status', 'protocol', 'start_date')
    search_fields = ('patient__name', 'patient__registry_no')
    inlines = [ChemoSessionInline]

# 3. Inventory/Pharmacy Management
@admin.register(Drug)
class DrugAdmin(admin.ModelAdmin):
    list_display = ('name', 'batch_no', 'stock_quantity', 'expiry_date')
    list_filter = ('expiry_date',)
    search_fields = ('name', 'batch_no')
    
    def save_model(self, request, obj, form, change):
        if obj.stock_quantity < 10:
            self.message_user(request, f"Warning: {obj.name} stock is critically low!", level='WARNING')
        super().save_model(request, obj, form, change)

# 4. Diagnostic Results
@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ('patient', 'test_name', 'result_value', 'is_critical', 'test_date')
    list_filter = ('is_critical', 'test_date')
    search_fields = ('patient__name', 'test_name')

# 5. Financial Management
@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('patient', 'amount', 'is_paid', 'insurance_info', 'created_at')
    list_filter = ('is_paid', 'created_at')
    actions = ['mark_as_paid']

    # Helper method to show insurance details in the billing list
    def insurance_info(self, obj):
        return f"{obj.patient.insurance_type} ({obj.patient.insurance_no})"
    insurance_info.short_description = 'Insurance Details'

    @admin.action(description="Mark selected bills as paid")
    def mark_as_paid(self, request, queryset):
        queryset.update(is_paid=True)

admin.site.register(Protocol)