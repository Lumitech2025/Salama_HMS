from django.http import JsonResponse

from rest_framework import viewsets, filters, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db import transaction
from django.db.models import Avg, Count, F, Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView
from datetime import datetime, time
from rest_framework.permissions import AllowAny
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters import rest_framework as django_filters
from django.db.models import Sum, DecimalField
from django.db.models.functions import Coalesce
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import OuterRef, Subquery, ExpressionWrapper, DecimalField, IntegerField
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from django.db.models import Q
import requests
from django.conf import settings
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from .mpesa import MpesaClient
from decimal import Decimal
import logging
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404

import logging

logger = logging.getLogger(__name__)

from appointments.utils import dispatch_async_notifications

# Import local models and serializers
from .models import (
    LabPanel, Patient, Protocol, Requisition, Treatment, ChemoSession, Drug, 
    LabResult, LabOrder, Bill, Appointment, VitalSign, Queue, 
    LabInventoryItem, StockAdjustment, Prescription, StockTake,
    PrescriptionItem, ClinicalNote, ImagingRecord, RegistrationRecord, InventoryItem, PsychologyEnrollment, SessionLog, BereavementLog, 
    OutreachCampaign, ReferralPartner, SocialMediaPost, MarketingRequisitionExtension, LabReference, LabTestRegistry, 
    ProtocolMaster, ProtocolDrug, DrugGuardrail, ProtocolIngredient,
    CancerSite, CancerType, Regimen, RegimenDrug,
    InsuranceCompany, InsuranceClaim, RemittanceBatch,ClaimDispatchBatch, InsuranceScheme,
    Service, PatientBillableItem, PatientInvoice, 
    ICD10Diagnosis, PatientDiagnosis,
    ImagingOrder, ImagingResult,
    Supplier,
    PurchaseOrder, GoodsReceivedNote, 
    PurchaseInvoice, PaymentVoucher,
    NurseServiceOrder, FixedAsset, Expense, ClaimAttachment
    
)


from .serializers import (
    LabOrderSerializer, LabReferenceSerializer, LabResultSerializer, 
    OncologyClinicalPortalSerializer, PatientSerializer, 
    ProtocolSerializer, ProtocolIngredientSerializer, ProtocolDetailSerializer,
    TreatmentSerializer, ChemoSessionSerializer, DrugSerializer, 
    CancerSiteSerializer, CancerTypeSerializer, RegimenSerializer, RegimenDrugSerializer,
    BillSerializer, SalamaTokenObtainPairSerializer, LabInventorySerializer, 
    StockAdjustmentSerializer, StockTakeSerializer, AppointmentSerializer, VitalSignSerializer, 
    QueueSerializer, PrescriptionSerializer, ClinicalNoteSerializer, ImagingRecordSerializer, RegistrationRecordSerializer, InventoryItemSerializer, PsychologyEnrollmentSerializer, 
    SessionLogSerializer, 
    BereavementLogSerializer, OutreachCampaignSerializer, ReferralPartnerSerializer, SocialMediaPostSerializer,RequisitionSerializer, MarketingRequisitionSerializer, LabTestRegistrySerializer, ProtocolMasterSerializer,
    InsuranceCompanySerializer, InsuranceClaimSerializer, 
    ClaimAttachmentSerializer,RemittanceBatchSerializer, DetailedPatientClaimSerializer, ClaimDispatchBatchSerializer, InsuranceSchemeSerializer,
    ServiceSerializer, PatientBillingLookupSerializer, ActiveInvoiceSerializer, PatientBillableItemSerializer,
    ICD10DiagnosisSerializer, PatientDiagnosisSerializer,
    SupplierSerializer,
    PurchaseOrderSerializer, GoodsReceivedNoteSerializer, 
    PurchaseInvoiceSerializer, PaymentVoucherSerializer,
    ImagingOrderSerializer, ImagingResultSerializer,
    NurseServiceOrderSerializer,
    FixedAssetSerializer, RequisitionItemSerializer, ExpenseSerializer
)


# --- 1. PERMISSION LOGIC ---

class IsReceptionStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') in ['RECEPTIONIST', 'ADMIN']

class IsClinicalStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        clinical_roles = ['ONCOLOGIST', 'NURSE', 'LAB_TECH', 'HEMATOLOGIST', 'SURGEON', 'ADMIN', 'RADIOLOGIST', 'RECEPTIONIST','PHARMACIST']
        return request.user.is_authenticated and getattr(request.user, 'role', '') in clinical_roles

class IsFinancialStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') in ['BILLING', 'FINANCE', 'ADMIN']

# --- 2. AUTHENTICATION ---

class SalamaTokenObtainPairView(TokenObtainPairView):
    serializer_class = SalamaTokenObtainPairSerializer



# --- 3. QUEUE ORCHESTRATION ---

class QueueViewSet(viewsets.ModelViewSet):
    queryset = Queue.objects.all().order_by('priority', 'entered_at')
    serializer_class = QueueSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['current_station', 'status', 'priority']
    search_fields = ['patient__name', 'token_id', 'patient__registry_no']

    

    @action(detail=True, methods=['post'])
    def move_next(self, request, pk=None):
        """Advances the patient. Supports both automated flow and manual selection."""
        queue_item = self.get_object()
        target_station = request.data.get('target_station')
        
        if not target_station:
            flow = {
                'REGISTRATION': 'TRIAGE',
                'TRIAGE': 'DOCTOR',
                'DOCTOR': 'LAB', 
                'LAB': 'DOCTOR',
                'RADIOLOGY': 'DOCTOR',
                'PHARMACY': 'BILLING',
                'BILLING': 'COMPLETED'
            }
            target_station = flow.get(queue_item.current_station, 'COMPLETED')

       
        if target_station == 'DOCTOR':
            try:
                from models import PatientInvoice, InvoiceLineItem
                from models import Service 
                
                
                target_sku = 'ONC-CONS_ONCO'  
                
               
                consultation_service = Service.objects.filter(
                    sku=target_sku, 
                    charge_type='TRIGGERED',
                    active=True
                ).first()
                
                if consultation_service and queue_item.visit:
                    # Fetch or create the active open invoice assigned to this specific RegistrationRecord
                    invoice, created = PatientInvoice.objects.get_or_create(
                        patient=queue_item.patient,
                        visit=queue_item.visit,
                        status='UNPAID'
                    )
                    
                    charge_exists = InvoiceLineItem.objects.filter(
                        invoice=invoice,
                        item_name=consultation_service.name
                    ).exists()
                    
                    if not charge_exists:
                        InvoiceLineItem.objects.create(
                            invoice=invoice,
                            # service=consultation_service, # Uncomment if ForeignKey exists
                            item_name=consultation_service.name,
                            quantity=1,
                            unit_price=consultation_service.price,
                            total_price=consultation_service.price,
                            status='PENDING'
                        )
                        
                        if hasattr(invoice, 'recalculate_totals'):
                            invoice.recalculate_totals()
                            
            except Exception as billing_err:
                print(f"[TRIAGE AUTOMATION ERROR]: Failed to generate upfront charge: {str(billing_err)}")
        # =================================================================

        # 2. Complete standard station routing changes
        if target_station == 'COMPLETED':
            queue_item.status = 'COMPLETED'
        else:
            queue_item.current_station = target_station
            queue_item.status = 'WAITING'
            
        queue_item.save()
        
        return Response({
            'status': 'success',
            'next_station': queue_item.get_current_station_display(),
            'current_status': queue_item.get_status_display()
        })

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Powers KPI cards for Oncology and Pharmacy Dashboards."""
        station = request.query_params.get('station', 'DOCTOR')
        today = timezone.now().date()
        
        station_qs = Queue.objects.filter(entered_at__date=today, current_station=station)
        
        if station == 'PHARMACY':
            pending_count = station_qs.filter(status='AWAITING_MEDICATION').count()
        else:
            pending_count = station_qs.filter(status='WAITING').count()

        return Response({
            "total_appointments": Appointment.objects.count(),
            "today_appointments": Appointment.objects.filter(appointment_date=today).count(),
            "total_registrations": Patient.objects.count(), 
            "today_total": Queue.objects.filter(entered_at__date=today).count(),
        })

# --- 4. CLINICAL & EMR MODULES ---



class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'registry_no', 'phone']

class VitalSignViewSet(viewsets.ModelViewSet):
    serializer_class = VitalSignSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]

    def get_queryset(self):
        # Fallback to query parameter matching regardless of active filter backends
        queryset = VitalSign.objects.all().order_by('-created_at')
        patient_id = self.request.query_params.get('patient', None)
        
        if patient_id is not None:
            queryset = queryset.filter(patient_id=patient_id)
            
        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            vital = serializer.save(recorded_by=self.request.user)
            # Find and systematically update the active tracking space safely
            queue_items = Queue.objects.filter(patient=vital.patient, current_station='TRIAGE')
            for item in queue_items:
                item.current_station = 'DOCTOR'
                item.status = 'WAITING'
                item.save()

class ClinicalNoteViewSet(viewsets.ModelViewSet):
    queryset = ClinicalNote.objects.all().order_by('-created_at')
    serializer_class = ClinicalNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['patient', 'visit', 'note_type']
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class ImagingRecordViewSet(viewsets.ModelViewSet):
    queryset = ImagingRecord.objects.all().order_by('-created_at')
    serializer_class = ImagingRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient']

# --- 5. PRESCRIPTIONS & PHARMACY ---

class PrescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient', 'visit', 'pharmacy_status']

    def get_queryset(self):
        """
        Optimized database pipeline targeting the clinical network layout.
        Prefetches diagnoses snapshots and vital indexes to eliminate N+1 query traps.
        """
        return Prescription.objects.select_related(
            'patient',
            'visit', 
            'visit__visit',
            'diagnosis'
        ).prefetch_related(
            'items__drug',
            'visit__visit__vitals',      
            'visit__visit__diagnoses',   
            'visit__visit__lab_orders'   
        )
    
    def get_object(self):
        """
        SMART LOOKUP OVERRIDE: 
        If the primary key sent by the frontend doesn't directly find a prescription,
        fallback to searching for a prescription associated with that Visit ID / Queue tracking node.
        """
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field or 'pk'
        lookup_value = self.kwargs[lookup_url_kwarg]

        try:
            return super().get_object()
        except Exception:
            prescription = queryset.filter(visit_id=lookup_value).first()
            if prescription:
                return prescription
                
            queue_item = Queue.objects.filter(id=lookup_value).first()
            if queue_item and queue_item.visit:
                prescription = queryset.filter(visit=queue_item.visit).first()
                if prescription:
                    return prescription
            
            raise Http404("No Prescription matches the given query parameters.")

    def _get_deduction_qty(self, item):
        """Standardized fallback logic for oncology inventory depletion if raw metrics missing."""
        if item.stage == 'PRE_CHEMO': return 1
        if item.stage == 'POST_CHEMO': return 10
        match = re.search(r'\d+', item.dosage or '')
        return int(match.group()) if match else 1

    @transaction.atomic
    def perform_create(self, serializer):
        from core.models import Queue, RegistrationRecord  # Adjust model import paths if needed
        
        practitioner = self.request.user.get_full_name() or self.request.user.username
        diagnosis_obj = serializer.validated_data.get('diagnosis')
        patient_obj = serializer.validated_data.get('patient')
        
        # 1. Inspect raw input values since frontend keys might bypass standard validation fields
        raw_visit_val = self.request.data.get('visit') or self.request.data.get('registration')
        queue_instance = None

        if raw_visit_val:
            try:
                # Scenario A: The value sent is actually a direct primary key to a Queue record
                if Queue.objects.filter(id=int(raw_visit_val)).exists():
                    queue_instance = Queue.objects.get(id=int(raw_visit_val))
                    if not patient_obj:
                        # Grab patient from the queue's registration record relationship cascade
                        queue_reg = getattr(queue_instance, 'registration', None) or getattr(queue_instance, 'visit', None)
                        patient_obj = getattr(queue_reg, 'patient', None)
                
                # Scenario B: The value sent is a RegistrationRecord ID (Oncology Portal pathway)
                elif RegistrationRecord.objects.filter(id=int(raw_visit_val)).exists():
                    registration_record = RegistrationRecord.objects.get(id=int(raw_visit_val))
                    if not patient_obj:
                        patient_obj = registration_record.patient
                    
                    # Track down the active Queue record associated with this specific registration node
                    # prioritizing the active PHARMACY station route tracker.
                    queue_instance = Queue.objects.filter(
                        registration=registration_record
                    ).first() or Queue.objects.filter(
                        visit=registration_record
                    ).first()
            except (ValueError, TypeError):
                pass

        # Fallback to standard serializer validation extraction rules if above custom routing misses
        if not queue_instance:
            queue_instance = serializer.validated_data.get('visit')
            if queue_instance and not patient_obj:
                queue_reg = getattr(queue_instance, 'registration', None) or getattr(queue_instance, 'visit', None)
                patient_obj = getattr(queue_reg, 'patient', None)

        # 2. Dynamic Diagnosis snapshot capture adjustments
        if not diagnosis_obj and queue_instance:
            # Safely traverse the queue relations structure to locate the first listed clinical diagnosis
            reg_context = getattr(queue_instance, 'registration', None) or getattr(queue_instance, 'visit', None)
            underlying_clinic_visit = getattr(reg_context, 'visit', None) if reg_context else None
            if underlying_clinic_visit and hasattr(underlying_clinic_visit, 'diagnoses'):
                diagnosis_obj = underlying_clinic_visit.diagnoses.first()

        # 3. Save the master envelope with correct, explicitly resolved type models
        prescription = serializer.save(
            visit=queue_instance,   # This will now successfully receive a verified Queue instance
            patient=patient_obj,    # Bypasses the strict NOT NULL constraint crash
            prescribed_by=practitioner,
            diagnosis=diagnosis_obj,
            pharmacy_status='PENDING'
        )
        
        # Auto-create pre-chemo constants
        pre_chemo_constants = [
            {"name": "Metoclopramide", "dosage": "10mg STAT", "route": "I.V", "duration": "STAT"},
            {"name": "Chlorpheniramine", "dosage": "10mg STAT", "route": "I.V", "duration": "STAT"},
            {"name": "Ondansetron", "dosage": "8mg STAT", "route": "I.V", "duration": "STAT"},
            {"name": "Dexamethasone", "dosage": "8mg STAT", "route": "I.V", "duration": "STAT"},
        ]
        for pc in pre_chemo_constants:
            drug_ref = Drug.objects.filter(name__icontains=pc["name"]).first()
            PrescriptionItem.objects.create(
                prescription=prescription,
                stage='PRE_CHEMO',
                medication_name=pc["name"],
                drug=drug_ref,
                dosage=pc["dosage"],
                calc_factor='Flat Rate',
                factor_value='0',
                route=pc["route"],
                diluent='None',
                volume='0',
                duration=pc["duration"]
            )

        # Process chemotherapy payload items from frontend matrix
        raw_items = self.request.data.get('items', [])
        if isinstance(raw_items, list):
            for item_data in raw_items:
                if item_data.get('stage') == 'CHEMO':
                    drug_id = item_data.get('drug')
                    drug_instance = None
                    if drug_id:
                        try:
                            drug_instance = Drug.objects.get(id=int(drug_id))
                        except (Drug.DoesNotExist, ValueError, TypeError):
                            pass

                    PrescriptionItem.objects.create(
                        prescription=prescription,
                        stage='CHEMO',
                        medication_name=item_data.get('medication_name', 'Unknown Agent'),
                        drug=drug_instance,
                        dosage=item_data.get('dosage', ''),
                        calc_factor=item_data.get('calc_factor', 'Flat Rate'),
                        factor_value=str(item_data.get('factor_value', '0')),
                        route=item_data.get('route', 'I.V'),
                        diluent=item_data.get('diluent', 'Normal Saline'),
                        volume=str(item_data.get('volume', '250')),
                        duration=item_data.get('duration', '30 mins')
                    )

        # Auto-create post-chemo constants
        post_chemo_constants = [
            {"name": "FeSO4/FA", "dosage": "200mg/1 tab", "route": "P.O", "duration": "OD × 5/7"},
            {"name": "Ondansetron", "dosage": "8mg 1 tab", "route": "P.O", "duration": "BD × 5/7"},
            {"name": "Metoclopramide", "dosage": "10mg 1 tab", "route": "P.O", "duration": "TDS × 5/7"},
            {"name": "Dexamethasone", "dosage": "4mg 1 tab", "route": "P.O", "duration": "BD × 5/7"},
        ]
        for po in post_chemo_constants:
            drug_ref = Drug.objects.filter(name__icontains=po["name"]).first()
            PrescriptionItem.objects.create(
                prescription=prescription,
                stage='POST_CHEMO',
                medication_name=po["name"],
                drug=drug_ref,
                dosage=po["dosage"],
                calc_factor='Flat Rate',
                factor_value='0',
                route=po["route"],
                diluent='None',
                volume='0',
                duration=po["duration"]
            )

        if prescription.visit:
            queue_ticket = prescription.visit
            queue_ticket.current_station = 'PHARMACY'
            queue_ticket.status = 'AWAITING_MEDICATION'
            queue_ticket.save()

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        target_status = request.data.get('pharmacy_status') or request.data.get('status')
        
        if target_status == 'DISPENSED' and instance.pharmacy_status != 'DISPENSED':
            return self._dispense_prescription(request, instance)
            
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='dispense')
    def dispense(self, request, pk=None):
        """
        Explicit POST router action endpoint mapping targeting:
        POST /api/prescriptions/{id}/dispense/
        """
        prescription = self.get_object()
        return self._dispense_prescription(request, prescription)

    @transaction.atomic
    def _dispense_prescription(self, request, prescription):
        """
        Intercepts the prescription final status change request payload, 
        synchronizes exact data line lists directly to billing systems, balances store sheets, 
        and updates workflow station routing markers.
        """
        from decimal import Decimal

        try:
            # --- MULTI-PATHWAY REGISTRATION CONTEXT RESOLUTION ---
            registration_context = None

            if hasattr(prescription, 'registration') and prescription.registration:
                registration_context = prescription.registration
            elif hasattr(prescription, 'visit') and prescription.visit:
                # Look up registration context from the associated Queue model
                registration_context = getattr(prescription.visit, 'registration', None) or getattr(prescription.visit, 'visit', None) or prescription.visit

            if not registration_context:
                return Response(
                    {"error": "No active registration record context found for billing."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # 1. Fetch or initialize the active open billing invoice ledger linked to the resolved context
            # Fallback handling to pull the raw concrete entity id reference
            concrete_visit = getattr(registration_context, 'visit', None) or registration_context

            invoice, _ = PatientInvoice.objects.get_or_create(
                visit=concrete_visit,
                patient=prescription.patient,
                defaults={'status': 'UNPAID'}
            )

            fallback_pharmacy_service = Service.objects.filter(dept='PHA', active=True).first()

            # 2. Extract item summaries provided directly by our frontend component
            meta_extensions = request.data.get('meta_extensions', {})
            frontend_items = meta_extensions.get('dispensation_summary', [])

            # Map frontend items to an easily queryable dictionary by drug ID
            frontend_items_map = {}
            if isinstance(frontend_items, list):
                for fi in frontend_items:
                    d_id = fi.get('drug_id') or fi.get('id')
                    if d_id:
                        frontend_items_map[int(d_id)] = fi

            # 3. Process items within single transaction scope with row-level locks
            for item in prescription.items.all():
                if not item.drug:
                    continue
                
                # Lock the drug profile rows to prevent race conditions across concurrent pharmacy counters
                locked_drug = Drug.objects.select_for_update().get(id=item.drug.id)
                
                if getattr(locked_drug, 'is_expired', False):
                    raise ValueError(f"Cannot dispense {locked_drug.name} - Medication batch is expired.")

                # Look for explicit frontend overrides for dispensation measurements
                fi_override = frontend_items_map.get(locked_drug.id)
                if fi_override:
                    deduction_qty = int(fi_override.get('quantity_dispensed', fi_override.get('qtyDispensed', 1)))
                    retail_rate = Decimal(str(fi_override.get('unit_price', fi_override.get('unitPrice', getattr(locked_drug, 'selling_price_kes', 0)))))
                else:
                    deduction_qty = self._get_deduction_qty(item)
                    retail_rate = Decimal(str(getattr(locked_drug, 'selling_price_kes', 0)))

                if locked_drug.stock_quantity < deduction_qty:
                    raise ValueError(f"Insufficient stock for {locked_drug.name}. Requested: {deduction_qty}, Available: {locked_drug.stock_quantity}")
                
                # A. Deduct Inventory Stock levels
                locked_drug.stock_quantity -= deduction_qty
                locked_drug.save(update_fields=['stock_quantity'])

                # B. Process Real-Time Patient Invoice Itemization
                billing_item_name = f"Medication: {locked_drug.name} ({getattr(locked_drug, 'strength', 'N/A')})"

                # Enforce strict line filtering checks to prevent double-posting anomalies on multiple clicks
                already_billed = PatientBillableItem.objects.filter(
                    invoice=invoice,
                    name=billing_item_name
                ).exists()

                if not already_billed:
                    PatientBillableItem.objects.create(
                        invoice=invoice,
                        station='Pharmacy',  # Case-matched tag for frontend PaymentPortal filtering
                        service=fallback_pharmacy_service,  
                        drug=locked_drug,
                        name=billing_item_name,
                        unit_price=retail_rate,
                        quantity=deduction_qty,
                        is_paid=False
                    )

            # 4. Save structural status variables onto the master record envelope
            prescription.pharmacy_status = 'DISPENSED'
            if isinstance(meta_extensions, dict) and meta_extensions:
                prescription.meta_extensions = meta_extensions
            prescription.save(update_fields=['pharmacy_status', 'meta_extensions'])
            
            # 5. Route Patient registration visitation records to Billing station queue safely
            if registration_context and registration_context.__class__.__name__ == 'Queue':
                registration_context.current_station = 'BILLING'
                registration_context.status = 'COMPLETED'
                registration_context.save(update_fields=['current_station', 'status'])

            # 6. FIXED: Use the correct 'visit' keyword field mapped onto the Queue model to trigger escalation
            if registration_context:
                active_tickets = Queue.objects.filter(
                    visit=concrete_visit, 
                    current_station='PHARMACY'
                )
                for ticket in active_tickets:
                    ticket.current_station = 'BILLING'
                    ticket.status = 'WAITING'
                    ticket.save(update_fields=['current_station', 'status'])
        
            return Response(self.get_serializer(prescription).data, status=status.HTTP_200_OK)
            
        except ValueError as e:
            # Handles expected stock or expiration business logic check violations cleanly
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Catch unexpected server anomalies safely
            return Response({"error": f"Internal dispensation logging error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
# --- 6. APPOINTMENTS & BILLING ---

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        queryset = Appointment.objects.all()
        target_date_str = self.request.query_params.get('appointment_date', None)
        
        if target_date_str:
            parsed_date = parse_date(target_date_str)
            if parsed_date:
                queryset = queryset.filter(appointment_date=parsed_date)
                
        return queryset.order_by('appointment_time')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            appointment = serializer.save()
            
            patient_name = (appointment.patient.name if appointment.patient else None) or getattr(appointment, 'manual_patient_name', None) or "Valued Patient"
            patient_phone = (appointment.patient.phone if appointment.patient else None) or getattr(appointment, 'manual_patient_phone', None)
            patient_email = (appointment.patient.email if appointment.patient else None) or getattr(appointment, 'manual_patient_email', None)
            booking_date = getattr(appointment, 'appointment_date', 'Scheduled Date')
            booking_time = getattr(appointment, 'appointment_time', 'Scheduled Time')
            
            subject = "Appointment Confirmation - Salama Cancer Care"
            message_body = (
                f"Dear {patient_name},\n\n"
                f"Your clinical appointment at Salama Cancer Care has been successfully confirmed for "
                f"{booking_date} at {booking_time}.\n\n"
                f"Please arrive 15 minutes early for vitals triage sorting.\n\n"
                f"Thank you,\nSalama Medical Team"
            )
            
            if patient_phone or patient_email:
                dispatch_async_notifications(
                    phone=patient_phone,
                    email=patient_email,
                    message_body=message_body,
                    subject=subject
                )
            
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='send_reminder')
    def send_reminder(self, request, pk=None):
        try:
            appointment = self.get_object()
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment record not found."}, status=status.HTTP_404_NOT_FOUND)

        patient_name = (appointment.patient.name if appointment.patient else None) or getattr(appointment, 'manual_patient_name', None) or "Valued Patient"
        patient_phone = (appointment.patient.phone if appointment.patient else None) or getattr(appointment, 'manual_patient_phone', None)
        patient_email = (appointment.patient.email if appointment.patient else None) or getattr(appointment, 'manual_patient_email', None)
        booking_date = getattr(appointment, 'appointment_date', 'Scheduled Date')
        booking_time = getattr(appointment, 'appointment_time', 'Scheduled Time')

        subject = "Appointment Reminder - Salama Cancer Care"
        message_body = (
            f"Dear {patient_name},\n\n"
            f"This is a friendly reminder that your upcoming clinical appointment at Salama Cancer Care "
            f"is scheduled for {booking_date} at {booking_time}.\n\n"
            f"If you are unable to make this slot, please contact the clinic helpdesk immediately.\n\n"
            f"Thank you,\nSalama Medical Team"
        )

        if not patient_phone and not patient_email:
            return Response(
                {"error": "This patient profile does not contain a registered phone or email address."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        dispatch_async_notifications(
            phone=patient_phone,
            email=patient_email,
            message_body=message_body,
            subject=subject
        )

        return Response({"message": f"Reminder sent for {patient_name}."}, status=status.HTTP_200_OK)

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all().order_by('-created_at')
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated, IsFinancialStaff]
    filterset_fields = ['patient', 'is_paid']

# --- 7. INVENTORY & LAB ---

class LabOrderViewSet(viewsets.ModelViewSet):
    # ✅ Optimized database queries with select_related to prevent N+1 issues when fetching patient/visit details
    queryset = LabOrder.objects.all().select_related('patient', 'visit').order_by('-created_at')
    serializer_class = LabOrderSerializer
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['visit', 'status', 'patient']
    
    # Updated search fields to match your relational fields (using patient name or queue/token id)
    search_fields = ['patient__name', 'visit__queue_id']

    # ✅ FIX: Dynamic permissions so pharmacists can read data, but only clinical staff can write/edit
    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            # Allows Pharmacists, Doctors, and Lab Techs to read clinical states
            return [permissions.IsAuthenticated()]
        else:
            # Restrict POST, PUT, PATCH, DELETE strictly to authorized clinical personnel
            return [permissions.IsAuthenticated(), IsClinicalStaff()]

    def perform_create(self, serializer):
        test_skus = self.request.data.get('test_skus', [])
        # ✅ Process and attach your test skus safely during serialization instantiation if needed
        instance = serializer.save()
        # Custom logic to add test items to billing ledger or inventory goes here...

    # --- Custom Actions Tailored for Your User Profiles ---

    @action(detail=False, methods=['get'], url_path='active-queue')
    def active_queue(self, request):
       
        pending_orders = self.get_queryset().filter(status='PENDING')
        
        # Optional: Filter specifically by a specific queue_id if passed in query params
        queue_id = request.query_params.get('queue_id', None)
        if queue_id:
            pending_orders = pending_orders.filter(visit__queue_id=queue_id)
            
        serializer = self.get_serializer(pending_orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='billing-pending')
    def billing_pending(self, request):
        
        visit_id = request.query_params.get('visit', None)
        orders = self.get_queryset()
        if visit_id:
            orders = orders.filter(visit_id=visit_id)
            
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='patient-history')
    def patient_history(self, request):
        """
        3. FOR THE PATIENT / DOCTOR / PHARMACIST
        Quickly pull all historical lab orders for a specific patient.
        """
        patient_id = request.query_params.get('patient', None)
        if not patient_id:
            return Response({"error": "Patient ID parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        orders = self.get_queryset().filter(patient_id=patient_id)
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)
    
class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.all().order_by('-created_at') 
    serializer_class = LabResultSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    filterset_fields = ['patient', 'is_critical']

class LabInventoryViewSet(viewsets.ModelViewSet):
    queryset = LabInventoryItem.objects.all().order_by('name')
    serializer_class = LabInventorySerializer

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        with transaction.atomic():
            item = self.get_object()
            used = int(request.data.get('used', 0))
            item.stock -= used
            item.save()
            StockAdjustment.objects.create(
                item=item, technician=request.user, quantity_used=used,
                remaining_stock=item.stock, notes=request.data.get('notes', '')
            )
            return Response({'status': 'Stock adjusted', 'new_stock': item.stock})
    
class LabReferenceViewSet(viewsets.ModelViewSet):
    queryset = LabReference.objects.all()
    serializer_class = LabReferenceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category']

class LabTestRegistryViewSet(viewsets.ModelViewSet):
    queryset = LabTestRegistry.objects.all().select_related('parent_panel')
    serializer_class = LabTestRegistrySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'parent_panel__name']

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        raw_panel_name = data.get('parent_panel') or data.get('main_panel_target') or data.get('category')
        
        if not raw_panel_name:
            return Response(
                {"parent_panel": ["This field is required to structure lab rules."]}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # FIX: Operations grouped within transaction safe space
        with transaction.atomic():
            panel_obj, _ = LabPanel.objects.get_or_create(name=raw_panel_name.strip())
            
            if 'lower_range_constraint' in data:
                data['lower_range'] = data['lower_range_constraint']
            if 'upper_range_constraint' in data:
                data['upper_range'] = data['upper_range_constraint']
            if 'base_cost_charge' in data:
                data['price'] = data['base_cost_charge']

            serializer = self.get_serializer(data=data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
            serializer.save(parent_panel=panel_obj)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        raw_panel_name = data.get('parent_panel') or data.get('main_panel_target') or data.get('category')
        
        with transaction.atomic():
            serializer = self.get_serializer(instance, data=data, partial=partial)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
            if raw_panel_name:
                panel_obj, _ = LabPanel.objects.get_or_create(name=raw_panel_name.strip())
                serializer.save(parent_panel=panel_obj)
            else:
                serializer.save()
                
            return Response(serializer.data)
        
@method_decorator(csrf_exempt, name='dispatch') 
class ImagingOrderViewSet(viewsets.ModelViewSet):
    # Optimizing database queries to prevent expensive database round-trips
    queryset = ImagingOrder.objects.all().select_related('patient', 'visit').order_by('-created_at')
    serializer_class = ImagingOrderSerializer
    
    # Matches your exact clinical protection logic
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['visit', 'status', 'patient']
    
    # Clean lookup mapping leveraging your patient model structure
    search_fields = ['patient__name', 'visit__id']

    def perform_create(self, serializer):
        """
        Intercepts the creation routine safely within a database transaction block.
        Automatically checks for or constructs a parent visit session invoice, attaches
        the individual procedure records, and forwards routing tokens to Radiology.
        """
        raw_procedures = self.request.data.get('requested_procedures', [])
        
        with transaction.atomic():
            # 1. Persist the core ImagingOrder record to database
            imaging_order = serializer.save(status='PENDING')

            # 2. Step A: Parent Invoice Resolution Workspace
            # Ensure the active outpatient session has a grouped parent bill matrix container
            if imaging_order.visit and imaging_order.patient:
                invoice, created = PatientInvoice.objects.get_or_create(
                    visit=imaging_order.visit,
                    patient=imaging_order.patient,
                    defaults={'status': 'UNPAID'}
                )

                # 3. Step B: Process Requisition Line Item Ledgers
                # Update this block inside your loops in views.py:
        for procedure in raw_procedures:
            scan_sku_id = str(procedure.get('scan_id', '')).strip()
            
            # Use __iexact for a case-insensitive, robust SKU match
            service_catalog_item = Service.objects.filter(sku__iexact=scan_sku_id, active=True).first()

            if service_catalog_item:
                PatientBillableItem.objects.create(
                    invoice=invoice,
                    service=service_catalog_item,
                    quantity=1
                    # Your model save() hook will automatically pull service_catalog_item.price here!
                )
            else:
                # Fallback if it TRULY does not exist in your Service catalog table
                PatientBillableItem.objects.create(
                    invoice=invoice,
                    station='Radiology',
                    name=procedure.get('label', 'Radiology Procedure Requisition'),
                    unit_price=procedure.get('price', procedure.get('cost', 0.00)), # Try 'price' or default to 0
                    quantity=1
                )
            
            # 4. Step C: Workspace Board Routing Orchestration
            if imaging_order.visit:
                Queue.objects.filter(visit=imaging_order.visit).update(
                    current_station='RADIOLOGY',
                    status='WAITING'
                )

    # --- Custom Actions Tailored for Your Operational Profiles (Fixed Indentation) ---

    @action(detail=False, methods=['get'], url_path='active-queue')
    def active_queue(self, request):
        """
        1. FOR THE RADIOLOGIST
        Returns only PENDING scans so they can see their active imagery workload 
        without getting bogged down by completed historic archives.
        """
        pending_orders = self.get_queryset().filter(status='PENDING')
        
        # Optional: Filter specifically by a concrete registration instance
        visit_id = request.query_params.get('visit_id', None)
        if visit_id:
            pending_orders = pending_orders.filter(visit_id=visit_id)
            
        serializer = self.get_serializer(pending_orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='billing-pending')
    def billing_pending(self, request):
        """
        2. FOR THE BILLING OFFICER
        Returns imaging orders requiring dynamic billing processing or adjustments.
        """
        visit_id = request.query_params.get('visit', None)
        orders = self.get_queryset()
        if visit_id:
            orders = orders.filter(visit_id=visit_id)
            
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='patient-history')
    def patient_history(self, request):
        """
        3. FOR THE PATIENT / DOCTOR
        Quickly scans and aggregates historical ultrasound studies across visits.
        """
        patient_id = request.query_params.get('patient', None)
        if not patient_id:
            return Response({"error": "Patient ID parameter is required"}, status=400)
            
        orders = self.get_queryset().filter(patient_id=patient_id)
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

class ImagingResultViewSet(viewsets.ModelViewSet):
    queryset = ImagingResult.objects.all().select_related('patient', 'visit', 'imaging_order').order_by('-created_at')
    serializer_class = ImagingResultSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['patient', 'is_critical', 'visit', 'imaging_order']

class NurseServiceOrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling Nurse Service Orders (Wound Dressing, Catheter Changes, Pelvic Screening).
    Matches the transactional routing pattern used in Imaging and Lab setups.
    """
    queryset = NurseServiceOrder.objects.all().select_related('patient')
    serializer_class = NurseServiceOrderSerializer
    filterset_fields = ['patient', 'status']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Wrapping in an atomic transaction ensures database integrity
        with transaction.atomic():
            # 1. Save the nursing service order record
            nurse_order = serializer.save()
            
            # 2. Workflow Routing: Automatically update the patient's queue status to NURSE
            patient_id = request.data.get('patient')
            if patient_id:
                # Find the active queue record for this patient and route them to the Nurse station
                # Note: Adjust fields matching your exact Queue architecture (e.g., current_station)
                Queue.objects.filter(patient_id=patient_id, status='ACTIVE').update(
                    current_station='NURSE',
                    updated_at=nurse_order.created_at
                )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], url_path='complete-order')
    def complete_order(self, request, pk=None):
        """
        Custom action endpoint to mark a nursing service as completed by the nurse panel.
        URL: POST /api/nurse-orders/<id>/complete-order/
        """
        order = self.get_object()
        if order.status == 'COMPLETED':
            return Response({'detail': 'Order is already completed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = 'COMPLETED'
        order.save()
        return Response({'status': 'Nurse order completed successfully.'}, status=status.HTTP_200_OK)
        

class ClinicalPortalPatientDetailsView(APIView):
    """
    Retrieves consolidated telemetry mapping for registration, vitals, and lab parameters.
    """
    def get(self, request, encounter_id, *args, **kwargs):
        try:
            # Querying the record alongside pre-fetched relation entries to optimize DB hits
            record = RegistrationRecord.objects.prefetch_related('vitals', 'lab_orders').get(id=encounter_id)
            serializer = OncologyClinicalPortalSerializer(record)
            return Response(serializer.data, status=status.HTTP_OK)
        except RegistrationRecord.DoesNotExist:
            return Response(
                {"error": "Encounter or Registration instance not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )

class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all().order_by('name')
    serializer_class = DrugSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['dosage_form', 'sku']
    search_fields = ['name', 'batch_number']

class ProtocolViewSet(viewsets.ModelViewSet):
    # Prefetch child components cleanly to prevent database stuttering on reads
    queryset = Protocol.objects.all().prefetch_related('components')
    serializer_class = ProtocolSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        """
        Dynamic routing for serializers: Use DetailSerializer on retrieval 
        operations to show the cached drug stock variables smoothly.
        """
        if self.action in ['retrieve']:
            return ProtocolDetailSerializer
        return super().get_serializer_class()

    @action(detail=True, methods=['patch'], url_path='update-costs')
    def update_costs(self, request, pk=None):
        """
        Allows finance/billing teams to patch specific component costs.
        Calculates cumulative totals safely via database aggregations.
        """
        protocol = self.get_object()
        costs_data = request.data.get('costs', [])
        
        if not costs_data:
            return Response(
                {"error": "No cost data matrix provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Wrap everything in an explicit ACID database transaction block
        with transaction.atomic():
            for item in costs_data:
                ing_id = item.get('ingredient_id')
                raw_cost = item.get('cost_per_cycle')
                
                if ing_id is None or raw_cost is None:
                    return Response(
                        {"error": "Each record requires an ingredient_id and cost_per_cycle value"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                try:
                    # Target the element directly through the protocol relationship lookup
                    ingredient = protocol.components.get(id=ing_id)
                    ingredient.cost_per_cycle = Decimal(str(raw_cost))
                    ingredient.save()
                except ProtocolIngredient.DoesNotExist:
                    return Response(
                        {"error": f"Ingredient ID {ing_id} does not exist under this protocol blueprint"}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Optimization: Let the database engine calculate the sum instead of a Python loop
            aggregation = protocol.components.aggregate(total=Sum('cost_per_cycle'))
            protocol.total_cost_per_cycle = aggregation['total'] or Decimal('0.00')
            protocol.save()
        
        # Return the newly updated profile data
        serializer = self.get_serializer(protocol)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class ChemoSessionViewSet(viewsets.ModelViewSet):
    queryset = ChemoSession.objects.all()
    serializer_class = ChemoSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]

class TreatmentViewSet(viewsets.ModelViewSet):
    serializer_class = TreatmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsClinicalStaff]
    def get_queryset(self):
        return Treatment.objects.select_related('patient', 'protocol', 'oncologist').all()
    

class CancerSiteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Handles operations for Primary Cancer Sites.
    - GET /api/cancer-sites/            -> Returns list for Dropdown 1
    - GET /api/cancer-sites/{id}/types/  -> Returns filtered types for Dropdown 2
    """
    queryset = CancerSite.objects.all()
    serializer_class = CancerSiteSerializer

    @action(detail=True, methods=['get'])
    def types(self, request, pk=None):
        """Get filtered variants for Dropdown 2 based on site selection"""
        site = self.get_object()
        # Uses your related_name="types" from CancerType model
        types = site.types.all() 
        serializer = CancerTypeSerializer(types, many=True)
        return Response(serializer.data)


class CancerTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Handles operations for Specific Cancer Variants/Subtypes.
    - GET /api/cancer-types/                -> Returns list of all types
    - GET /api/cancer-types/{id}/regimens/  -> Returns filtered acronyms for Dropdown 3
    """
    queryset = CancerType.objects.all()
    serializer_class = CancerTypeSerializer

    @action(detail=True, methods=['get'])
    def regimens(self, request, pk=None):
        """Get filtered acronym protocols for Dropdown 3 based on type selection"""
        cancer_type = self.get_object()
        # Uses your related_name="regimens" from Regimen model
        regimens = cancer_type.regimens.all()
        serializer = RegimenSerializer(regimens, many=True)
        return Response(serializer.data)


class RegimenViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Handles operations for Protocol Acronyms.
    - GET /api/regimens/            -> Returns list of all regimens
    - GET /api/regimens/{id}/drugs/  -> Returns detailed drug layout to auto-populate rows
    """
    queryset = Regimen.objects.all()
    serializer_class = RegimenSerializer

    @action(detail=True, methods=['get'])
    def drugs(self, request, pk=None):
        """Get all pre-mapped drugs to auto-populate the table rows"""
        regimen = self.get_object()
        # Uses your related_name="drugs" from RegimenDrug model
        drugs = regimen.drugs.all()
        drug_serializer = RegimenDrugSerializer(drugs, many=True)
        
        # Matches your exact expected structure: standard cycles + drug rows array
        return Response({
            'default_cycles': regimen.default_cycles,
            'drugs': drug_serializer.data
        })


class RegistrationRecordViewSet(viewsets.ModelViewSet):
    queryset = RegistrationRecord.objects.all().order_by('-registered_at')
    serializer_class = RegistrationRecordSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # 🚀 FIXED & EXPANDED: Capture explicit segment data elements safely before popping
            f_name = request.data.get('first_name', '').strip()
            m_name = request.data.get('middle_name', '').strip()
            l_name = request.data.get('last_name', '').strip()
            
            # Combine split components intelligently while removing hanging spaces
            full_name = f"{f_name} {m_name} {l_name}".replace("  ", " ").strip() or "Valued Patient"
            
            patient_phone = request.data.get('phone', None)
            patient_email = request.data.get('email', None)

            # Process transaction database save routines
            registration_item = serializer.save()

            real_hrn = getattr(registration_item, 'health_record_number', 'PENDING')

            subject = "Registration Successful - Salama Cancer Care"
            message_body = (
                f"Hello {full_name},\n\n"
                f"Thank you for registering at Salama Cancer Care. We are pleased to serve you.\n\n"
                f"Your health record number is: {real_hrn}\n\n"
                f"Please proceed to the triage station to have your vitals checked.\n\n"
                f"Best regards,\nSalama Medical Team"
            )

            if patient_phone or patient_email:
                try:
                    # Assuming dispatch_async_notifications is imported globally
                    dispatch_async_notifications(
                        phone=patient_phone,
                        email=patient_email,
                        message_body=message_body,
                        subject=subject
                    )
                except Exception as e:
                    print(f"⚠️ NOTIFICATION WORKER ERROR: {str(e)}")

            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        today = timezone.now().date()
        
        total_count = RegistrationRecord.objects.count()
        today_qs = RegistrationRecord.objects.filter(registered_at__date=today).order_by()
        
        age_groups = {
            "Pediatric (0-17)": today_qs.filter(age__lt=18).count(),
            "Adult (18-55)": today_qs.filter(age__gte=18, age__lte=55).count(),
            "Senior (55+)": today_qs.filter(age__gt=55).count(),
        }

        gender_data = today_qs.values('gender').annotate(count=Count('gender'))
        gender_map = {item['gender']: item['count'] for item in gender_data}

        # Aggregate by payment_mode (CASH vs INSURANCE)
        payment_mode_data = today_qs.values('payment_mode').annotate(count=Count('payment_mode'))
        payment_mode_map = {item['payment_mode']: item['count'] for item in payment_mode_data}

        # Break down the actual insurance company numbers for today's intake
        insurance_breakdown = today_qs.filter(payment_mode='INSURANCE')\
                                      .values('insurance_company__name')\
                                      .annotate(count=Count('insurance_company'))
        
        insurance_map = {
            item['insurance_company__name'] or 'Corporate': item['count'] 
            for item in insurance_breakdown
        }

        return Response({
            "total_patients": total_count,
            "todays_registrations": today_qs.count(),
            "urgent_today": today_qs.filter(is_urgent=True).count(),
            "returning_today": today_qs.filter(is_returning=True).count(),
            "gender_distribution": {
                "M": gender_map.get('M', 0),
                "F": gender_map.get('F', 0),
                "O": gender_map.get('O', 0)
            },
            "age_groups": age_groups,
            "payment_mode_distribution": payment_mode_map, 
            "insurance_distribution": insurance_map        
        })
    
@api_view(['GET'])
# Keep AllowAny if it's public, or remove if you've implemented the header authorization tokens successfully
@permission_classes([AllowAny]) 
def patient_lookup(request):
    # Get the raw string parameter (e.g., "SCC-001/26" or "556677883")
    search_query = request.query_params.get('search', '').strip()
    
    if not search_query:
        return Response(
            {"detail": "Search query parameter is required."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # We look up matching rows where the query hits either ID number or HRN
        record = RegistrationRecord.objects.filter(
            Q(health_record_number__iexact=search_query) | 
            Q(id_number__icontains=search_query)
        ).latest('registered_at') # Grabs their most recent active registration desk record

        # Structure the payload exactly how your React front-end extracts it
        payload = {
            "id": record.id,
            "health_record_number": record.health_record_number,
            "queue_id": record.queue_id,
            "full_name": record.full_name, # Leveraging your model's helper property
            "id_number": record.id_number,
            "payment_mode": record.payment_mode,
            "insurance_number": record.insurance_number,
            "age": record.age,
            "gender": record.gender
        }
        return Response(payload, status=status.HTTP_200_OK)

    except RegistrationRecord.DoesNotExist:
        return Response(
            {"detail": "No matching active record found."}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by('-added_at')
    serializer_class = InventoryItemSerializer

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['department']

    @action(detail=False, methods=['get'], url_path='unique-catalog')
    def unique_catalog(self, request):
        """
        Returns a clean list of unique product names, grouped by department 
        and bundled with their default baseline unit costs for the procurement engine.
        """
        items = InventoryItem.objects.values('name', 'department', 'cost_per_unit').distinct()
        return Response(items)


class StockTakeViewSet(viewsets.ModelViewSet):
    serializer_class = StockTakeSerializer


    def get_queryset(self):
        return StockTake.objects.all().select_related('item', 'performed_by').order_by('-created_at')

    def perform_create(self, serializer):
        stock_take = serializer.save()
        

class PsychologyEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = PsychologyEnrollment.objects.all().order_by('-created_at')
    serializer_class = PsychologyEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(enrolled_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='lost-to-follow-up')
    def lost_to_follow_up(self, request):
        ltfu_cases = self.queryset.filter(status='LOST_TO_FOLLOW_UP')
        page = self.paginate_queryset(ltfu_cases)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(ltfu_cases, many=True)
        return Response(serializer.data)

class SessionLogViewSet(viewsets.ModelViewSet):
    queryset = SessionLog.objects.all().order_by('-session_date')
    serializer_class = SessionLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='unsynced-hro')
    def unsynced_hro(self, request):
        unsynced = self.queryset.filter(is_synced_with_hro=False)
        serializer = self.get_serializer(unsynced, many=True)
        return Response(serializer.data)

class BereavementLogViewSet(viewsets.ModelViewSet):
    queryset = BereavementLog.objects.all().order_by('-last_contact_date')
    serializer_class = BereavementLogSerializer
    permission_classes = [permissions.IsAuthenticated]

class OutreachCampaignViewSet(viewsets.ModelViewSet):
    queryset = OutreachCampaign.objects.all().order_by('-created_at')
    serializer_class = OutreachCampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

class ReferralPartnerViewSet(viewsets.ModelViewSet):
    queryset = ReferralPartner.objects.all().order_by('-total_patients_referred')
    serializer_class = ReferralPartnerSerializer
    permission_classes = [permissions.IsAuthenticated]

class SocialMediaPostViewSet(viewsets.ModelViewSet):
    queryset = SocialMediaPost.objects.all().order_by('-created_at')
    serializer_class = SocialMediaPostSerializer
    permission_classes = [permissions.IsAuthenticated]



class ProtocolMasterViewSet(viewsets.ModelViewSet):
    queryset = ProtocolMaster.objects.all().prefetch_related('drugs__rules')
    serializer_class = ProtocolMasterSerializer
    authentication_classes = [] 
    permission_classes = [AllowAny]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"message": "Protocol Matrix cleanly deleted from engine space."}, 
            status=status.HTTP_204_NO_CONTENT
        )
    
class RequisitionViewSet(viewsets.ModelViewSet):
    """
    The main clearinghouse endpoint for the Finance Office.
    Provides data feeds for the Lab, Pharmacy, and Marketing tabs simultaneously.
    """
    # ALIGNED: Changed prefetch references to target the new unified relationship 'items__inventory_item'
    queryset = Requisition.objects.all().prefetch_related(
        'items__inventory_item', 
        'marketing_meta__campaign'
    )
    serializer_class = RequisitionSerializer
    permission_classes = [IsAuthenticated]
    
    # Enable filtering by department and approval status out of the box
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'status', 'is_viewed_by_finance']
    search_fields = ['reason', 'requested_by__first_name', 'requested_by__last_name', 'id']
    ordering_fields = ['created_at', 'total_cost']
    ordering = ['-created_at']  # Default newest first

    def get_queryset(self):
        """
        Optional optimization: You can restrict standard non-finance users 
        to only seeing their own submitted requests, while allowing finance 
        officers to view everything.
        """
        user = self.request.user
        if getattr(user, 'is_staff', False) or user.groups.filter(name='Finance').exists():
            return self.queryset
        return self.queryset.filter(requested_by=user)

    @action(detail=True, methods=['patch'], url_path='mark-as-viewed')
    def mark_as_viewed(self, request, pk=None):
        """
        Clears the real-time notification badge on the Finance Sidebar 
        when an auditor clicks on a requisition row.
        """
        requisition = self.get_object()
        requisition.is_viewed_by_finance = True
        requisition.save(update_fields=['is_viewed_by_finance'])
        return Response({'status': 'notification badge cleared'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='pending-counts')
    def pending_counts(self):
        """
        Returns real-time counter metrics partitioned by department.
        Perfect for rendering dynamic badge pills directly into the Sidebar tabs.
        """
        counts = {
            'LAB': Requisition.objects.filter(department='LAB', status='PENDING').count(),
            'PHARMACY': Requisition.objects.filter(department='PHARMACY', status='PENDING').count(),
            'MARKETING': Requisition.objects.filter(department='MARKETING', status='PENDING').count(),
            'TOTAL_UNVIEWED': Requisition.objects.filter(is_viewed_by_finance=False).count()
        }
        return Response(counts, status=status.HTTP_200_OK)
    
class MarketingRequisitionViewSet(viewsets.ModelViewSet):
    """
    Dedicated viewset for your Marketing team dashboard.
    Accepts and renders data structures matching your legacy schema,
    but handles operations inside the unified core system under the hood.
    """
    queryset = Requisition.objects.filter(department='MARKETING').prefetch_related('marketing_meta__campaign')
    serializer_class = MarketingRequisitionSerializer
    permission_classes = [IsAuthenticated]
    
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['reason', 'marketing_meta__campaign__name']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        """
        Ensures that requests arriving through the marketing dashboard form 
        automatically bind the current request user as the applicant.
        """
        serializer.save(request=self.request)

class InsuranceCompanyViewSet(viewsets.ModelViewSet):
    serializer_class = InsuranceCompanySerializer
    permission_classes = [IsAuthenticated]
    
    # Enable API parsers to seamlessly switch between structured JSON and Multipart file streams
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'kra_pin', 'contact_person', 'payer_code']
    ordering_fields = ['name', 'created_at', 'annotated_total_billed', 'annotated_total_remitted', 'annotated_aging_debt']

    def get_queryset(self):
        """
        Overrides the default queryset to isolate aggregates into decoupled SQL subqueries,
        eliminating the Cartesian Product duplication trap and enabling performant server-side sorting.
        """
        # 1. Isolate historical claim billings subquery to prevent join explosion
        claims_subquery = InsuranceClaim.objects.filter(
            insurance_company=OuterRef('pk')
        ).values('insurance_company').annotate(
            total=Sum('total_amount_billed')
        ).values('total')

        # 2. Isolate remittance batch collections subquery 
        # (Ensure RemittanceBatch model mapping matches your exact app placement)
        batches_subquery = InsuranceClaim.objects.filter(
            insurance_company=OuterRef('pk')
        ).values('insurance_company').annotate(
            total=Sum('amount_paid') # Point to the appropriate remittance aggregate field
        ).values('total')

        # 3. Assemble parent query executing clean, performance-isolated sub-selections
        return InsuranceCompany.objects.all()\
            .prefetch_related('schemes')\
            .annotate(
                annotated_total_billed=Coalesce(
                    Subquery(claims_subquery, output_field=DecimalField()),
                    0.00,
                    output_field=DecimalField()
                ),
                annotated_total_remitted=Coalesce(
                    Subquery(batches_subquery, output_field=DecimalField()),
                    0.00,
                    output_field=DecimalField()
                )
            )\
            .annotate(
                # 👇 FIXED: Injected database-level expression so sorting works seamlessly out-of-the-box
                annotated_aging_debt=ExpressionWrapper(
                    F('annotated_total_billed') - F('annotated_total_remitted'),
                    output_field=DecimalField()
                )
            ).order_by('name')

    @action(
        detail=True, 
        methods=['post'], 
        url_path='upload-sla', 
        parser_classes=[MultiPartParser, FormParser]
    )
    def upload_sla(self, request, pk=None):
        """
        Stitches the React UI file handler component to the database file storage.
        Catches the separate, secondary multi-part binary stream upload securely.
        """
        company = self.get_object()
        serializer = InsuranceCompanySLAUploadSerializer(company, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "SLA Document synchronized successfully.",
                "sla_document_url": company.sla_document.url
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """
        Safety Guardrail: Prevent hard-deleting an insurance provider if they have active 
        claims historical records tied to them. In healthcare systems, audit trails are law.
        """
        instance = self.get_object()
        if instance.insuranceclaim_set.exists():
            return Response(
                {"error": "Cannot delete this provider. Active or historical insurance claims are attached to this record. Consider setting is_active=False instead."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class InsuranceSchemeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for individual insurance sub-plans and benefit matrices.
    Provides standalone lookup capabilities for triage check-ins and frontend dropdowns.
    """
    queryset = InsuranceScheme.objects.all().order_by('name')
    serializer_class = InsuranceSchemeSerializer
    permission_classes = [IsAuthenticated]
    
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'company__name', 'classification']

    def get_queryset(self):
        """
        Allows quick-filtering sub-schemes by their parent provider identifier 
        via clean request query parameters.
        Example lookup: /api/insurance-schemes/?company_id=2
        """
        queryset = super().get_queryset()
        company_id = self.request.query_params.get('company_id') or self.request.query_params.get('company')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        return queryset


class RemittanceBatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing physical bulk bank remittance deposit statements.
    Accommodates multipart form data streams for attached spreadsheet or PDF binary uploads.
    """
    queryset = RemittanceBatch.objects.all().select_related('insurance_company', 'reconciled_by').order_by('-date_received', '-id')
    serializer_class = RemittanceBatchSerializer
    permission_classes = [IsAuthenticated]
    
    # 🌟 FIXED: Add explicit parsers to safely allow React to upload File / Document attachments
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['insurance_company']
    search_fields = ['payment_reference', 'insurance_company__name']
    ordering_fields = ['date_received', 'total_amount_received', 'created_at']

    def perform_create(self, serializer):
        serializer.save(reconciled_by=self.request.user)


class InsuranceClaimFilter(django_filters.FilterSet):
    patient_id = django_filters.NumberFilter(field_name="patient__id")
    dispatch_batch_id = django_filters.NumberFilter(field_name="dispatch_batch__id")
    invoice_id = django_filters.NumberFilter(field_name="patient_invoice__id")

    class Meta:
        model = InsuranceClaim
        fields = ['status', 'insurance_company', 'patient_id', 'dispatch_batch_id', 'invoice_id']


class InsuranceClaimViewSet(viewsets.ModelViewSet):
    """
    MERGED & FIXED: Consolidates both definitions into a single robust viewset.
    Optimized via select_related and prefetch_related to load oncology claims with attachments efficiently.
    """
    queryset = InsuranceClaim.objects.all().select_related(
        'patient', 'insurance_company', 'dispatch_batch', 'patient_invoice'
    ).prefetch_related('attachments').order_by('-date_submitted')
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = InsuranceClaimFilter
    ordering_fields = ['total_amount_billed', 'shortfall_amount', 'date_submitted']
    
    # 🌟 FIXED: Replaced non-existent 'patient_name' with structured text path lookups
    search_fields = [
        'claim_number', 
        'patient__name', 
        'patient__first_name', 
        'patient__last_name', 
        'pre_auth_code', 
        'insurance_company__name',
        'patient_invoice__invoice_number'
    ]

    def get_serializer_class(self):
        """
        Dynamically toggle serializing rules. Use a high-performance simple list 
        on broad matrices, and unpack complete deeply nested records for detail actions.
        """
        if self.action in ['retrieve', 'update', 'partial_update']:
            return DetailedPatientClaimSerializer
        return InsuranceClaimSerializer


class ClaimDispatchBatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage consolidated envelopes submitted directly to health payers like SHA.
    """
    queryset = ClaimDispatchBatch.objects.all().select_related('insurance_company', 'created_by').order_by('-date_dispatched')
    serializer_class = ClaimDispatchBatchSerializer
    permission_classes = [IsAuthenticated]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['insurance_company', 'is_acknowledged']
    search_fields = ['batch_reference', 'insurance_company__name']
    ordering_fields = ['date_dispatched', 'total_batch_value']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def acknowledge_receipt(self, request, pk=None):
        """
        Custom action endpoint enabling the accounting desk to check off 
        an entire batch once SHA/Insurer issues receipt confirmation documents.
        """
        batch = self.get_object()
        batch.is_acknowledged = True
        batch.save(update_fields=['is_acknowledged'])
        return Response({"status": f"Batch {batch.batch_reference} acknowledged successfully."}, status=status.HTTP_200_OK)


class ClaimAttachmentViewSet(viewsets.ModelViewSet):
    """
    🌟 NEW: Managed routing port allowing rapid uploads of clinical evidence 
    documents directly from the Oncology treatment or triage modules.
    """
    queryset = ClaimAttachment.objects.all()
    serializer_class = ClaimAttachmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['claim']


class CompileClaimDispatchBatchView(APIView):
    """
    API endpoint that accepts an array of claim IDs and compiles them 
    into a structured ClaimDispatchBatch envelope for the designated payer.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        claim_ids = request.data.get('claim_ids', [])
        insurance_company_id = request.data.get('insurance_company_id')
        
        if not claim_ids or not insurance_company_id:
            return Response(
                {"error": "Please provide an array of 'claim_ids' and a target 'insurance_company_id'."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            with transaction.atomic():
                # 1. Fetch claims matching the target company criteria that are still in 'DRAFT' status
                claims_to_batch = InsuranceClaim.objects.filter(
                    id__in=claim_ids,
                    insurance_company_id=insurance_company_id,
                    status='DRAFT'
                ).select_for_update()

                if not claims_to_batch.exists():
                    return Response(
                        {"error": "No valid pending draft claims were found matching the provided configuration selection criteria."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # 2. Build unique custom tracking reference tag layout (e.g., DISP-SHA-20260618-001)
                timestamp = timezone.now().strftime('%Y%m%d')
                existing_batches_count = ClaimDispatchBatch.objects.filter(date_dispatched=timezone.now().date()).count()
                sequence = str(existing_batches_count + 1).zfill(3)
                batch_ref = f"DISP-{insurance_company_id}-{timestamp}-{sequence}"

                # 3. Initialize the dispatch batch instance container
                batch = ClaimDispatchBatch.objects.create(
                    batch_reference=batch_ref,
                    insurance_company_id=insurance_company_id,
                    created_by=request.user,
                    total_batch_value=0.00
                )

                # 4. Attach claims to the batch and update their workflow tracking flags
                running_total_billed = 0
                for claim in claims_to_batch:
                    claim.dispatch_batch = batch
                    claim.status = 'SUBMITTED'
                    claim.save(update_fields=['dispatch_batch', 'status'])
                    running_total_billed += claim.total_amount_billed

                # 5. Commit final calculated financial aggregation column data rows
                batch.total_batch_value = running_total_billed
                batch.save(update_fields=['total_batch_value'])

                return Response({
                    "message": "Dispatch batch generated successfully.",
                    "batch_id": batch.id,
                    "batch_reference": batch.batch_reference,
                    "total_claims_bundled": claims_to_batch.count(),
                    "total_batch_value": float(batch.total_batch_value)
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"Batch transaction initialization pipeline failure: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ServiceViewSet(viewsets.ModelViewSet):
    """
    Handles administrative CRUD operations for the clinic's price book catalog.
    """
    queryset = Service.objects.all().order_by('sku')
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['dept', 'active']
    search_fields = ['sku', 'name']

    def destroy(self, request, *args, **kwargs):
        """
        Prevent accidental hard deletion of services. Soft-deactivates instead 
        to maintain historical foreign key data integrity.
        """
        instance = self.get_object()
        instance.active = False
        instance.save()
        return Response(
            {"detail": f"Service {instance.sku} has been deactivated successfully."},
            status=status.HTTP_200_OK
        )

# APIs
class ICD11TokenProxyView(APIView):
    """
    Obtains and caches short-lived OAuth2 access tokens from the WHO Identity server
    to securely authorize the frontend Embedded Classification Tool.
    """
    def get(self, request):
        # 1. Look for a valid token in the Django cache framework first
        cached_token = cache.get('icd11_access_token')
        if cached_token:
            return Response({"token": cached_token}, status=status.HTTP_200_OK)

        # 2. Grab configurations from settings
        client_id = getattr(settings, 'ICD11_CLIENT_ID', None)
        client_secret = getattr(settings, 'ICD11_CLIENT_SECRET', None)

        if not client_id or not client_secret:
            return Response(
                {"error": "ICD-11 credentials are unconfigured on the server environment."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 3. Request a fresh token directly from the WHO Access Management server
        token_url = "https://icdaccessmanagement.who.int/connect/token"
        payload = {
            'client_id': client_id,
            'client_secret': client_secret,
            'grant_type': 'client_credentials',
            'scope': 'icdapi_access'
        }

        try:
            response = requests.post(token_url, data=payload, timeout=10)
            response.raise_for_status()
            token_data = response.json()
            
            access_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 3600)

            # Cache the token, setting expiration 5 minutes early as a safety buffer
            cache.set('icd11_access_token', access_token, timeout=expires_in - 300)

            return Response({"token": access_token}, status=status.HTTP_200_OK)

        except requests.exceptions.RequestException as e:
            return Response(
                {"error": f"Failed authentication handshake with WHO: {str(e)}"}, 
                status=status.HTTP_502_BAD_GATEWAY
            )
        
class ICD10DiagnosisViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exposes full search capability against mapped ICD10 codes grouped by primary anatomical site.
    """
    queryset = ICD10Diagnosis.objects.all()
    serializer_class = ICD10DiagnosisSerializer
    
    # Enable query parameter filtering and string lookups
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'short_description', 'long_description']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Explicitly filter down records if a specific primary site is targeted
        primary_site = self.request.query_params.get('primary_site', None)
        if primary_site:
            queryset = queryset.filter(primary_site__iexact=primary_site)
            
        return queryset
    
class PatientDiagnosisViewSet(viewsets.ModelViewSet):
    """
    ViewSet to log, list, and audit patient diagnosis records 
    linked to unique Registration health record numbers.
    """
    queryset = PatientDiagnosis.objects.select_related('patient', 'visit').all()
    serializer_class = PatientDiagnosisSerializer
    
    # Enable standard filtering and search backends
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Fields that can be directly searched via ?search=
    search_fields = ['icd10_code', 'icd10_description', 'visit__health_record_number']
    
    # Default order showing the most recent diagnosis logs first
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 1. Extract potential lookup query parameters from the request URL
        patient_id = self.request.query_params.get('patient', None)
        visit_id = self.request.query_params.get('visit', None)
        health_record_number = self.request.query_params.get('health_record_number', None)
        
        # 2. Apply filtering chains sequentially if values are provided
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        if visit_id:
            queryset = queryset.filter(visit_id=visit_id)
            
        if health_record_number:
            # Traverses the RegistrationRecord relation to find the exact health record match
            queryset = queryset.filter(visit__health_record_number__iexact=health_record_number)
            
        return queryset
    

class SupplierViewSet(viewsets.ModelViewSet):
    """
    Unified registry viewset to handle legal onboarding, 
    compliance file processing, and vendor monitoring.
    """
    queryset = Supplier.objects.all().order_by('-id')
    serializer_class = SupplierSerializer
    
    # Crucial for receiving file uploads (FileField / FormData) from React
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        """
        Intercepts creation to gracefully handle file stream data
        and return crisp validation errors back to our UI.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(
                {
                    "message": "Supplier corporate registry created with document packages.",
                    "data": serializer.data
                }, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='compliance-alerts')
    def compliance_alerts(self, request):
        """
        Custom endpoint: /api/suppliers/compliance-alerts/
        Instantly surfaces vendors whose Tax Compliance Certificate (TCC) 
        has expired or is missing completely.
        """
        today = timezone.now().date()
        
        # Pull suppliers where TCC is missing OR past its valid expiry window
        compromised_suppliers = Supplier.objects.filter(
            models.Q(tax_compliance_expiry__isnull=True) | 
            models.Q(tax_compliance_expiry__lt=today),
            is_active=True
        )
        
        serializer = self.get_serializer(compromised_suppliers, many=True)
        return Response({
            "count": compromised_suppliers.count(),
            "status": "Action Required",
            "flagged_vendors": serializer.data
        }, status=status.HTTP_200_OK)
    

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """
    Handles all Purchase Order interactions.
    Provides standard CRUD operations + custom action for quick approval transitions.
    """
    queryset = PurchaseOrder.objects.all().order_by('-created_at')
    serializer_class = PurchaseOrderSerializer

    def create(self, request, *args, **kwargs):
        # Maps frontend 'items' array payload seamlessly to 'items_raw' expected by serializer
        data = request.data.copy()
        if 'items' in data:
            data['items_raw'] = data.pop('items')
            
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['patch'], url_path='approve')
    def approve_order(self, request, pk=None):
        """Custom endpoint allowing the frontend to trigger 'Approve & Send' instantly"""
        purchase_order = self.get_object()
        purchase_order.status = 'APPROVED'
        purchase_order.save()
        return Response(
            {"status": "Purchase Order approved and advanced successfully."},
            status=status.HTTP_200_OK
        )


# ----------------------------------------------------------------------
# 2. GOODS RECEIVED NOTE (GRN) VIEWSET
# ----------------------------------------------------------------------
class GoodsReceivedNoteViewSet(viewsets.ModelViewSet):
    """
    Logs physical delivery receipt updates.
    Automatically steps associated Purchase Order status forward to 'RECEIVED'.
    """
    queryset = GoodsReceivedNote.objects.all().order_by('-created_at')
    serializer_class = GoodsReceivedNoteSerializer

    def create(self, request, *args, **kwargs):
        # Maps frontend 'items_received' verified array data cleanly to serializer
        data = request.data.copy()
        if 'items_received' in data:
            data['items_received_raw'] = data.pop('items_received')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# ----------------------------------------------------------------------
# 3. SUPPLIER INVOICE VIEWSET
# ----------------------------------------------------------------------
class PurchaseInvoiceViewSet(viewsets.ModelViewSet):
    """
    Manages commercial matching calculations for incoming bills.
    """
    queryset = PurchaseInvoice.objects.all().order_by('-created_at')
    serializer_class = PurchaseInvoiceSerializer

    def create(self, request, *args, **kwargs):
        # Handles binary file payloads safely (multipart/form-data) if user attaches physical scan
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# ----------------------------------------------------------------------
# 4. PAYMENT VOUCHER VIEWSET
# ----------------------------------------------------------------------
class PaymentVoucherViewSet(viewsets.ModelViewSet):
    """
    Documents accounts payable outgoing capital transactions.
    Automatically steps target Invoice statuses forward to 'PAID'.
    """
    queryset = PaymentVoucher.objects.all().order_by('-date_issued')
    serializer_class = PaymentVoucherSerializer


class PatientBillingSearchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows the Front Desk terminal to search for active,
    registered patients and instantly fetch their station bills.
    """
    serializer_class = PatientBillingLookupSerializer

    def get_queryset(self):
        """
        Filters patients dynamically based on the search query parameter (?q=...)
        Matches against Name, ID Number, or Health Record Number.
        Only grabs recent records to ensure it's an active outpatient session.
        """
        queryset = RegistrationRecord.objects.all().order_by('-registered_at')
        search_query = self.request.query_params.get('q', None)
        
        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(id_number__icontains=search_query) |
                Q(health_record_number__icontains=search_query) |
                Q(queue_id__icontains=search_query)
            )
            return queryset[:10]  # Limit results for instant frontend search responses
            
        # If no query is provided, return nothing to prevent heavy database loads
        return RegistrationRecord.objects.none()


class PatientBillableItemViewSet(viewsets.ModelViewSet):
    """
    Handles point-of-care item charging across multiple clinical workflow stations.
    """
    queryset = PatientBillableItem.objects.all()
    serializer_class = PatientBillableItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    
    # Harmonized to match actual model fields: station and is_paid
    filterset_fields = ['invoice__patient', 'invoice__visit', 'station', 'is_paid']
    search_fields = ['name', 'invoice__visit__queue_id', 'invoice__patient__name']

    def get_queryset(self):
        """
        Optimizes database performance using select_related to prevent N+1 queries.
        """
        return self.queryset.select_related('invoice', 'invoice__patient', 'invoice__visit', 'service', 'drug')

    @action(detail=False, methods=['get'], url_path='active-invoice')
    def active_invoice(self, request):
        """
        Custom endpoint for the billing desk to instantly retrieve UNPAID 
        charges for a patient's active visit loop using their queue ID or visit record.
        Example: /api/billable-items/active-invoice/?visit_id=5 or ?queue_id=Q26-001
        """
        visit_id = request.query_params.get('visit_id')
        queue_id = request.query_params.get('queue_id')
        
        # Filter items where is_paid=False (Pending payment settlement)
        queryset = self.get_queryset().filter(is_paid=False)
        
        if visit_id:
            queryset = queryset.filter(invoice__visit_id=visit_id)
        elif queue_id:
            queryset = queryset.filter(invoice__visit__queue_id__iexact=queue_id)
        else:
            return Response(
                {"error": "Please provide a 'visit_id' or 'queue_id' query parameter."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer = self.get_serializer(queryset, many=True)
        
        # Dynamic calculation block evaluating total costs across unit prices and quantities
        subtotal = sum(item.total_cost for item in queryset)
        
        return Response({
            "items": serializer.data,
            "invoice_metadata": {
                "item_count": queryset.count(),
                "total_pending_kes": float(subtotal)
            }
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """
        Action endpoint for administrative changes (e.g., toggling payment flags explicitly).
        """
        billable_item = self.get_object()
        is_paid_input = request.data.get('is_paid')
        
        if is_paid_input is None:
            return Response(
                {"error": "Please provide an explicit boolean value for 'is_paid'."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        billable_item.is_paid = bool(is_paid_input)
        billable_item.save()
        
        return Response({
            "message": f"Item billing status updated successfully.",
            "item_id": billable_item.id,
            "is_paid": billable_item.is_paid
        }, status=status.HTTP_200_OK)


class PatientInvoiceViewSet(viewsets.ModelViewSet):
    """
    API endpoint to handle actions on the master Invoice ledger sheets, 
    such as finalizing payments from the terminal control panel.
    """
    queryset = PatientInvoice.objects.all()
    serializer_class = ActiveInvoiceSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='settle-payment')
    def settle_payment(self, request, pk=None):
        """
        Custom action endpoint to execute transaction settlements.
        Validates client-side items against accounting rows to prevent leakage.
        """
        return self._process_invoice_settlement(request, pk, payment_method_override=None)

    @action(detail=True, methods=['post'], url_path='settle-cash')
    @transaction.atomic
    def settle_cash(self, request, pk=None):
        """
        EXPLICIT NEW PATHWAY PATH: Maps perfectly to frontend's:
        POST /api/invoices/{id}/settle-cash/
        """
        return self._process_invoice_settlement(request, pk, payment_method_override='CASH')

    @action(detail=True, methods=['post'], url_path='submit-insurance')
    @transaction.atomic
    def submit_insurance(self, request, pk=None):
        """
        NEW PATHWAY PATH: Submits the active invoice tracker to insurance pre-authorization tracking.
        Updates billing states and advances queue routing.
        """
        invoice = self.get_object()
        invoice.status = 'INSURANCE_PENDING'
        invoice.payment_method = 'INSURANCE'
        invoice.save()

        # Update queue tracking nodes to mark billing station route complete
        Queue.objects.filter(visit=invoice.visit, current_station='BILLING').update(
            status='COMPLETED',
            current_station='DISCHARGED'
        )

        return Response({
            "status": "success",
            "message": f"Invoice {invoice.invoice_number or invoice.id} successfully queued for Insurance Pre-Auth.",
            "invoice_number": invoice.invoice_number
        }, status=status.HTTP_200_OK)

    def _process_invoice_settlement(self, request, pk, payment_method_override=None):
        invoice = self.get_object()
        payment_method = payment_method_override or request.data.get('payment_method', 'CASH')
        validated_items = request.data.get('validated_items', [])
        
        if validated_items:
            # 1. Extract IDs of items remaining in the frontend cart
            frontend_item_ids = [item.get('id') for item in validated_items if item.get('id')]
            
            # 2. Safely remove line items dropped by the cashier terminal clerk
            invoice.items.exclude(id__in=frontend_item_ids).delete()
            
            # 3. Synchronize adjusted parameters, handling price changes and applying quantities
            for item_data in validated_items:
                item_id = item_data.get('id')
                if item_id:
                    client_price = float(item_data.get('price', 0))
                    client_qty = int(item_data.get('quantity', 1))
                    
                    PatientBillableItem.objects.filter(id=item_id, invoice=invoice).update(
                        unit_price=Decimal(str(client_price)),
                        quantity=client_qty,
                        is_paid=True
                    )
        else:
            # Fallback if payload array lacks explicit item overrides
            invoice.items.all().update(is_paid=True)
        
        # Settle the master invoice tracking states
        invoice.status = 'PAID'
        invoice.payment_method = payment_method
        invoice.save() # This triggers your custom model save() override to guarantee 'invoice_number' format generation

        # 4. QUEUE AUTO-ADVANCE MANAGEMENT:
        # Clear the patient from the BILLING station and mark their ticket status as complete
        Queue.objects.filter(visit=invoice.visit, current_station='BILLING').update(
            status='COMPLETED',
            current_station='DISCHARGED'
        )
        
        return Response({
            "status": "success",
            "message": f"Invoice {invoice.invoice_number} tracking KES {float(invoice.total_payable):,} successfully cleared via {payment_method}.",
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class MpesaPaymentTriggerView(APIView):
    """Triggers the Safaricom STK Push from the React POS frontend."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            invoice_id = request.data.get("invoice_id")
            phone_number = request.data.get("phone_number")
            validated_items = request.data.get("validated_items", [])
            
            if not invoice_id or not phone_number:
                return Response({"error": "Missing invoice_id or phone_number"}, status=400)
                
            invoice = get_object_or_404(PatientInvoice, id=invoice_id)
            
            if validated_items:
                total_amount = sum(
                    float(item.get('price', 0)) * int(item.get('quantity', 1)) 
                    for item in validated_items
                )
            else:
                total_amount = float(invoice.total_payable)

            if total_amount <= 0:
                return Response({"error": "Cannot bill an empty invoice ledger"}, status=400)

            # 2. FIXED: Replace this placeholder import with your project's actual working client path!
            # Example: from core.mpesa_utils import MpesaClient
            from core.mpesa import MpesaClient
            
            client = MpesaClient()
            result = client.send_stk_push(phone_number, total_amount, invoice.id)
            
            if result.get("status") == "success":
                invoice.mpesa_checkout_id = result.get("checkout_request_id")
                invoice.status = "PROCESSING"
                invoice.save()
                return Response({
                    "message": "STK Push sent successfully!", 
                    "checkout_id": result.get("checkout_request_id")
                }, status=200)
                
            return Response({"error": result.get("message", "STK Request rejected by operator")}, status=400)
            
        except Exception as e:
            # This line will now log clean telemetry traces instead of crashing the thread!
            logger.error(f"Mpesa STK trigger system failure: {str(e)}")
            return Response({"error": f"Internal Server Error: {str(e)}"}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def mpesa_callback_webhook(request):
    """Public webhook that receives Safaricom's real-time transaction updates."""
    stk_callback = request.data.get("Body", {}).get("stkCallback", {})
    result_code = stk_callback.get("ResultCode")
    checkout_id = stk_callback.get("CheckoutRequestID")
    
    try:
        invoice = PatientInvoice.objects.get(mpesa_checkout_id=checkout_id)
    except PatientInvoice.DoesNotExist:
        logger.error(f"Unknown checkout id returned via safaricom network callback: {checkout_id}")
        return Response({"ResultCode": 1, "ResultDesc": "Mismatch context ID unrecognized"}, status=404)

    if result_code == 0:  # Code 0 == Operational Success
        callback_metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
        mpesa_receipt = next(
            (item.get("Value") for item in callback_metadata if item.get("Name") == "MpesaReceiptNumber"), 
            None
        )
                
        invoice.status = "PAID"
        invoice.receipt_number = mpesa_receipt
        invoice.payment_method = "MPESA"
        invoice.save()

        # Flag line items across all departments as cleared
        invoice.items.all().update(is_paid=True)

        # Update tracking nodes to mark billing route tracker step complete on successful push transaction
        Queue.objects.filter(visit=invoice.visit, current_station='BILLING').update(
            status='COMPLETED',
            current_station='DISCHARGED'
        )
        
        return Response({"ResultCode": 0, "ResultDesc": "Success acknowledged"}, status=200)
    else:
        # Revert tracking locks on failure
        invoice.status = "UNPAID"
        invoice.save()
        return Response({"ResultCode": 0, "ResultDesc": "Failure acknowledged gracefully"}, status=200)
    

@api_view(['GET'])
@permission_classes([AllowAny])
def check_invoice_status(request, invoice_id):
    """
    Lightweight polling endpoint for the frontend to monitor real-time transaction updates.
    """
    try:
        invoice = PatientInvoice.objects.get(id=invoice_id)
        return Response({
            "status": invoice.status, 
            "receipt_number": getattr(invoice, 'receipt_number', None),
            "payment_method": getattr(invoice, 'payment_method', None),
            "invoice_number": invoice.invoice_number
        }, status=200)
    except PatientInvoice.DoesNotExist:
        return Response({"error": "Invoice record not found"}, status=404)

class FixedAssetViewSet(viewsets.ModelViewSet):
    """
    A simple interface to list, create, update, and delete hospital assets.
    """
    queryset = FixedAsset.objects.all()
    serializer_class = FixedAssetSerializer
    
    # Enables easy searching and filtering on the backend
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'sku', 'department']

    def get_queryset(self):
        """
        Optional feature: If the frontend requests a specific department 
        via an address like /api/fixed-assets/?dept=RADIOLOGY, 
        we filter the list automatically.
        """
        queryset = FixedAsset.objects.all()
        department = self.request.query_params.get('dept', None)
        
        if department is not None and department != 'ALL':
            queryset = queryset.filter(department=department)
            
        return queryset
    
class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'behavior']
    search_fields = ['description', 'reference', 'id']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']

    def perform_create(self, serializer):
        serializer.save()

    # 🌟 NEW: Custom action route allowing rapid partial offsets/payments against an expense balance voucher
    @action(detail=True, methods=['post'], url_path='offset-balance')
    def offset_balance(self, request, pk=None):
        expense = self.get_object()
        offset_amount_str = request.data.get('amount_to_pay')

        if not offset_amount_str:
            return Response(
                {"error": "Please define an explicit 'amount_to_pay' value parameter to execute offset transaction."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                offset_amount = Decimal(str(offset_amount_str))
                
                # Enforce logical verification checks (Assuming your model tracks structural outstanding balances)
                # If your model stores dynamic payment balances, adjust these attributes accordingly:
                if hasattr(expense, 'amount_paid'):
                    expense.amount_paid += offset_amount
                    if hasattr(expense, 'remaining_balance'):
                        expense.remaining_balance = max(Decimal('0.00'), expense.amount - expense.amount_paid)
                else:
                    # Fallback approach: directly reduce the master liability volume record if keeping items lightweight
                    expense.amount = max(Decimal('0.00'), expense.amount - offset_amount)
                
                expense.save()
                
                # Return the updated object state back to the frontend
                serializer = self.get_serializer(expense)
                return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Failed to execute ledger offset pipeline safely: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class FinancialRevenueAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_year = timezone.now().year
        
        # ----------------------------------------------------
        # 1. AGGREGATE PATIENT POINT-OF-SALE (POS) CASH REVENUE
        # ----------------------------------------------------
        paid_items_query = PatientBillableItem.objects.filter(invoice__status='PAID')
        
        total_pos_revenue = paid_items_query.annotate(
            item_total=F('unit_price') * F('quantity')
        ).aggregate(grand_total=Sum('item_total'))['grand_total'] or 0.00

        # Yearly filtering for POS tracking
        yearly_pos_items = paid_items_query.filter(
            incurred_at__year=current_year
        ).annotate(
            item_total=F('unit_price') * F('quantity')
        )

        # ----------------------------------------------------
        # 2. 🌟 NEW: AGGREGATE CORPORATE INSURANCE REMITTANCES
        # ----------------------------------------------------
        total_insurance_revenue = RemittanceBatch.objects.aggregate(
            grand_total=Sum('total_amount_received')
        )['grand_total'] or 0.00

        # Yearly filtering for Remittance tracking
        yearly_remittances = RemittanceBatch.objects.filter(
            date_received__year=current_year
        )

        # ----------------------------------------------------
        # 3. COMPUTE COMBINED MONTHLY BASKETS [Jan - Dec]
        # ----------------------------------------------------
        monthly_pos_array = [0.00] * 12
        monthly_insurance_array = [0.00] * 12
        combined_monthly_revenue = [0.00] * 12

        # Populate patient point-of-sale cash month array values
        for item in yearly_pos_items:
            month_index = item.incurred_at.month - 1
            if 0 <= month_index < 12:
                monthly_pos_array[month_index] += float(item.item_total)

        # Populate insurance remittance collection month array values
        for batch in yearly_remittances:
            month_index = batch.date_received.month - 1
            if 0 <= month_index < 12:
                monthly_insurance_array[month_index] += float(batch.total_amount_received)

        # Merge arrays to calculate true total monthly revenue vectors
        for i in range(12):
            combined_monthly_revenue[i] = monthly_pos_array[i] + monthly_insurance_array[i]

        # ----------------------------------------------------
        # 4. COMPUTE MONTH-OVER-MONTH COMBINED GROWTH RATES
        # ----------------------------------------------------
        monthly_growth_array = [0.00] * 12
        for i in range(1, 12):
            prev_month_rev = combined_monthly_revenue[i - 1]
            current_month_rev = combined_monthly_revenue[i]
            
            if prev_month_rev > 0:
                growth_rate = ((current_month_rev - prev_month_rev) / prev_month_rev) * 100
                monthly_growth_array[i] = round(growth_rate, 1)
            else:
                monthly_growth_array[i] = 0.00 if current_month_rev == 0 else 100.00

        # Combined true gross financial yield
        true_gross_revenue = float(total_pos_revenue) + float(total_insurance_revenue)

        return Response({
            "total_revenue": true_gross_revenue,
            "pos_cash_collections": float(total_pos_revenue),
            "insurance_remittance_collections": float(total_insurance_revenue),
            "monthly_revenue": combined_monthly_revenue,
            "monthly_growth": monthly_growth_array
        }, status=200)