from django.shortcuts import render

from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Patient, Protocol, Treatment, ChemoSession, Drug, LabResult, Bill
from .serializers import (
    PatientSerializer, ProtocolSerializer, TreatmentSerializer, 
    ChemoSessionSerializer, DrugSerializer, LabResultSerializer, BillSerializer
)

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    # Adding search and filter so the Receptionist can find patients easily
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'registry_no', 'cancer_type']

class ProtocolViewSet(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer

class TreatmentViewSet(viewsets.ModelViewSet):
    queryset = Treatment.objects.all()
    serializer_class = TreatmentSerializer
    filterset_fields = ['patient', 'status']

class ChemoSessionViewSet(viewsets.ModelViewSet):
    queryset = ChemoSession.objects.all()
    serializer_class = ChemoSessionSerializer

class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    search_fields = ['name', 'batch_no']

class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer
    filterset_fields = ['patient', 'is_critical']

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    filterset_fields = ['patient', 'is_paid']
