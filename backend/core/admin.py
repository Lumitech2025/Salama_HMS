from django.contrib import admin

# Register your models here.

from django.contrib import admin
from .models import LabResult, Patient, Protocol, Treatment, Drug, Bill

admin.site.register(Patient)
admin.site.register(Protocol)
admin.site.register(Treatment)
admin.site.register(Drug)
admin.site.register(LabResult)
admin.site.register(Bill)