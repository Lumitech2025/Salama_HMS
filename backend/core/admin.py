from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import Patient, Protocol, Treatment, ChemoSession, Drug, LabResult, Bill

User = get_user_model()

# 1. Patient Admin with Clinical Focus
@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('registry_no', 'name', 'cancer_type', 'staging', 'gender', 'created_at')
    search_fields = ('name', 'registry_no', 'cancer_type')
    list_filter = ('gender', 'cancer_type', 'staging')
    readonly_fields = ('created_at',)

# 2. Treatment and Sessions (Inline)
class ChemoSessionInline(admin.TabularInline):
    model = ChemoSession
    extra = 1

@admin.register(Treatment)
class TreatmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'protocol', 'oncologist', 'status', 'start_date')
    list_filter = ('status', 'protocol')
    inlines = [ChemoSessionInline]

# 3. Inventory/Pharmacy Management
@admin.register(Drug)
class DrugAdmin(admin.ModelAdmin):
    list_display = ('name', 'batch_no', 'stock_quantity', 'expiry_date')
    list_filter = ('expiry_date',)
    
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
    list_display = ('patient', 'amount', 'is_paid', 'created_at')
    list_filter = ('is_paid', 'created_at')
    actions = ['mark_as_paid']

    @admin.action(description="Mark selected bills as paid")
    def mark_as_paid(self, request, queryset):
        queryset.update(is_paid=True)

admin.site.register(Protocol)