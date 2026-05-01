# authentication/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User) # Using the decorator is cleaner
class SalamaUserAdmin(UserAdmin):
    # 1. Columns shown in the staff list view
    list_display = ['employee_id', 'username', 'email', 'role', 'is_staff', 'is_active']
    
    # 2. Sidebar filters (Essential for large hospital staff)
    list_filter = ['role', 'is_staff', 'is_active', 'is_password_change_required']
    
    # 3. Searchable fields
    search_fields = ['username', 'email', 'employee_id', 'first_name', 'last_name']
    
    # 4. Fieldsets for Editing existing users
    fieldsets = UserAdmin.fieldsets + (
        ('Hospital Specific Metadata', {
            'fields': ('role', 'designation', 'employee_id', 'phone_number', 'is_password_change_required')
        }),
    )

    # 5. Fieldsets for Adding NEW users (Crucial: Prevents IntegrityErrors)
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Hospital Specific Metadata', {
            'fields': ('role', 'employee_id', 'phone_number'),
        }),
    )

    # 6. Default ordering
    ordering = ['employee_id']