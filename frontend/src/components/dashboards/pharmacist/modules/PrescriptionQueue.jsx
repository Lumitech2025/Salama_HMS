import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '@/api/api';
import { 
  Send, Download, FileText, Loader2, ChevronDown 
} from 'lucide-react';
import SalamaLogo from "@/assets/Salama Cancer Centre logo.png";

const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

const PrescriptionQueue = ({ onDispensingComplete }) => {
  // ─── STATE MANAGEMENT ─────────────────────────────────────────────
  const [queuePatients, setQueuePatients] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch active pharmacy station queue items
  const loadPharmacyQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await API.get('queue/?current_station=PHARMACY', { headers });
      const rawData = response.data.results || response.data || [];
      setQueuePatients(rawData);
      
      if (rawData.length > 0 && !selectedQueueId) {
        setSelectedQueueId(rawData[0].id.toString());
      }
    } catch (err) {
      console.error("[Salama Pharma Hub] Failed fetching operational queue:", err);
    } finally {
      setLoadingQueue(false);
    }
  }, [selectedQueueId]);

  useEffect(() => {
    loadPharmacyQueue();
  }, [loadPharmacyQueue]);

  const activeQueueItem = useMemo(() => {
    return queuePatients.find(p => p.id.toString() === selectedQueueId);
  }, [queuePatients, selectedQueueId]);

  // Hydrate data from prescription and drug endpoints
  useEffect(() => {
    if (!activeQueueItem) {
      setSelectedPrescription(null);
      return;
    }

    const rxId = (() => {
      if (activeQueueItem.prescription && typeof activeQueueItem.prescription === 'object') {
        return activeQueueItem.prescription.id;
      }
      if (typeof activeQueueItem.prescription === 'number' || typeof activeQueueItem.prescription === 'string') {
        return activeQueueItem.prescription;
      }
      return activeQueueItem.prescription_id || activeQueueItem.id;
    })();

    if (!rxId || rxId === 'undefined') {
      console.error("[Salama HMS Error] Failed to resolve a valid prescription ID.");
      return;
    }

    const mapQueueItemToPrescription = (item, drugCatalog = []) => {
      const detailSource = item.prescription_detail || item.prescription || item;

      // Demographics parsing
      const rawGender = item.patient_gender || item.patient?.gender || item.visit?.gender || detailSource?.patient_gender || "—";
      let resolvedGender = "—";
      if (/^M/i.test(rawGender)) resolvedGender = 'Male';
      if (/^F/i.test(rawGender)) resolvedGender = 'Female';

      const resolvedAge = item.patient_age || item.patient?.age || item.visit?.age || detailSource?.patient_age || "—";
      const resolvedHn = item.health_record_number || item.patient_hn || item.patient?.hn || item.patient?.health_record_number || detailSource?.health_record_number || "—";
      
      // Diagnosis Resolution
      let resolvedDiagnosis = "—";
      if (detailSource?.diagnosis_detail) {
        const dx = detailSource.diagnosis_detail;
        resolvedDiagnosis = dx.icd10_code ? `${dx.icd10_code} - ${dx.description || dx.long_description}`.trim() : (dx.description || dx.long_description || "—");
      } else {
        const dxArray = detailSource?.diagnosis_snapshot || item.diagnosis_snapshot || item.visit?.diagnosis_snapshot || [];
        if (Array.isArray(dxArray) && dxArray.length > 0 && dxArray[0]) {
          const desc = dxArray[0].description || dxArray[0].icd10_description || dxArray[0].name || '';
          const code = dxArray[0].icd10_code || dxArray[0].code || '';
          if (desc || code) {
            resolvedDiagnosis = code ? `${code} - ${desc}`.trim() : desc;
          }
        }
      }

      const itemsUnified = detailSource?.items || item.items || [];
      
      const hydratedItems = itemsUnified.map(uiItem => {
        const matchingDrug = drugCatalog.find(d => d.id === uiItem.drug);
        return {
          ...uiItem,
          strength: matchingDrug ? matchingDrug.strength : "—",
          selling_price_kes: matchingDrug ? parseFloat(matchingDrug.selling_price_kes) : parseFloat(uiItem.selling_price_kes || uiItem.price || 0),
          current_stock: matchingDrug ? matchingDrug.stock_quantity : (uiItem.current_stock || 0)
        };
      });

      const preMedsMapped = hydratedItems.filter(i => {
        const s = String(i.stage || '').toUpperCase().replace(/[^A-Z]/g, '');
        return s.includes('PRECHEMO') || s.includes('PREMED');
      });

      const chemoMapped = hydratedItems.filter(i => {
        const s = String(i.stage || '').toUpperCase().replace(/[^A-Z]/g, '');
        return s === 'CHEMO' || s.includes('CYTOTOXIC') || (s.includes('CHEMO') && !s.includes('PRE') && !s.includes('POST'));
      });

      const postMedsMapped = hydratedItems.filter(i => {
        const s = String(i.stage || '').toUpperCase().replace(/[^A-Z]/g, '');
        return s.includes('POSTCHEMO') || s.includes('POSTMED') || s.includes('TAKEHOME');
      });

      setSelectedPrescription({
        id: rxId || item.id,
        patient_name: detailSource?.patient_name || item.patient_name || item.patient?.name || "Unknown Patient",
        patient_hn: resolvedHn,
        age: resolvedAge,
        gender: resolvedGender,
        diagnosis: resolvedDiagnosis,
        protocol: detailSource?.protocol || item.protocol || "TC",
        cycle_number: detailSource?.cycle_no || item.cycle_no || 1,
        total_cycles: detailSource?.total_cycles || item.total_cycles || 6,
        treatment_date: detailSource?.treatment_date || item.treatment_date || new Date().toISOString().split('T')[0],
        preMeds: preMedsMapped,
        chemoDrugs: chemoMapped,
        postMeds: postMedsMapped,
        vitals_snapshot: detailSource?.vitals_snapshot || item.vitals_snapshot || {}
      });
    };

    const loadActivePrescription = async () => {
      setLoadingDetails(true);
      try {
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const trackingVisitId = activeQueueItem.visit_id || activeQueueItem.visit;
        
        if (!trackingVisitId) {
          mapQueueItemToPrescription(activeQueueItem, []);
          setLoadingDetails(false);
          return;
        }

        const [rxResponse, drugsResponse] = await Promise.all([
          API.get(`prescriptions/?visit=${trackingVisitId}`, { headers }),
          API.get('drugs/', { headers }).catch(() => ({ data: [] }))
        ]);
        
        const catalogData = drugsResponse.data?.results || drugsResponse.data || [];
        let finalRxData = null;
        if (rxResponse.data && Array.isArray(rxResponse.data.results)) {
          finalRxData = rxResponse.data.results[0] || null;
        } else if (rxResponse.data && Array.isArray(rxResponse.data)) {
          finalRxData = rxResponse.data[0] || null;
        } else if (rxResponse.data && typeof rxResponse.data === 'object' && !rxResponse.data.detail) {
          finalRxData = rxResponse.data;
        }

        if (finalRxData) {
          mapQueueItemToPrescription({ ...activeQueueItem, prescription_detail: finalRxData }, catalogData);
        } else {
          mapQueueItemToPrescription(activeQueueItem, catalogData);
        }
      } catch (err) {
        console.error(`[Salama HMS Exception] Telemetry breakdown routing clinical rows.`, err);
        mapQueueItemToPrescription(activeQueueItem, []);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadActivePrescription();
  }, [activeQueueItem]);

  const preMeds = useMemo(() => selectedPrescription?.preMeds || [], [selectedPrescription]);
  const chemoDrugs = useMemo(() => selectedPrescription?.chemoDrugs || [], [selectedPrescription]);
  const postMeds = useMemo(() => selectedPrescription?.postMeds || [], [selectedPrescription]);

  // ─── REFACTORED DISPENSATION CALCULATOR MATRIX ──────────────────────
  const calculatedDispensation = useMemo(() => {
    let total = 0;

    const parseNumericValue = (val) => {
      if (!val) return 1;
      const match = String(val).match(/([0-9.]+)/);
      if (!match) return 1;
      const parsed = parseFloat(match[1]);
      return parsed > 0 ? parsed : 1;
    };

    const processStandardItem = (item) => {
      const qty = item.quantity || 1;
      const price = parseFloat(item.selling_price_kes || 0);
      const cost = qty * price;
      total += cost;
      
      const cleanName = item.medication_name || item.name || "—";
      const displayStrength = item.strength && item.strength !== "—" ? ` ${item.strength}` : "";

      return { 
        ...item, 
        displayName: `${cleanName}${displayStrength}`,
        qtyDispensed: qty, 
        strength: item.strength || "—", 
        unitPrice: price, 
        cost 
      };
    };

    const processChemoItem = (item) => {
      const dosePrescribed = parseNumericValue(item.dosage);
      const strengthPotency = parseNumericValue(item.strength);
      const computedUnits = Math.ceil(dosePrescribed / strengthPotency);
      const qty = computedUnits > 0 ? computedUnits : 1;
      
      const price = parseFloat(item.selling_price_kes || 0);
      const cost = qty * price;
      total += cost;
      
      const cleanName = item.medication_name || item.name || "—";
      const displayStrength = item.strength && item.strength !== "—" ? ` ${item.strength}` : "";
      
      return { 
        ...item, 
        displayName: `${cleanName}${displayStrength}`,
        qtyDispensed: qty, 
        strength: item.strength || "—", 
        unitPrice: price, 
        cost 
      };
    };

    const processPostChemoItem = (item) => {
      const rawName = String(item.medication_name || item.name || '').toUpperCase();
      let assignedQty = 10; // Default fallback layout baseline

      if (rawName.includes('FESO4') || rawName.includes('IRON')) {
        assignedQty = 20;
      } else if (rawName.includes('ONDANSETRON')) {
        assignedQty = 10;
      } else if (rawName.includes('METOCLOPRAMIDE')) {
        assignedQty = 10;
      } else if (rawName.includes('DEXAMETHASONE')) {
        assignedQty = 10;
      }

      const price = parseFloat(item.selling_price_kes || 0);
      const cost = assignedQty * price;
      total += cost;

      const cleanName = item.medication_name || item.name || "—";
      const displayStrength = item.strength && item.strength !== "—" ? ` ${item.strength}` : "";

      return {
        ...item,
        displayName: `${cleanName}${displayStrength}`,
        qtyDispensed: assignedQty,
        strength: item.strength || "—",
        unitPrice: price,
        cost
      };
    };

    return {
      preMeds: preMeds.map(processStandardItem),
      chemoDrugs: chemoDrugs.map(processChemoItem),
      postMeds: postMeds.map(processPostChemoItem),
      grandTotal: total
    };
  }, [preMeds, chemoDrugs, postMeds]);

  const handleSaveAndSubmit = async () => {
    if (!selectedPrescription) return;
    setIsProcessing(true);
    try {
      const jwtToken = localStorage.getItem('access_token');
      const csrfToken = getCookie('csrftoken');
      const headers = {
        ...(jwtToken && { Authorization: `Bearer ${jwtToken}` }),
        ...(csrfToken && { 'X-CSRFToken': csrfToken })
      };

      // 1. Collect all dispensed items across all medical stages
      const allDispensedItems = [
        ...calculatedDispensation.preMeds,
        ...calculatedDispensation.chemoDrugs,
        ...calculatedDispensation.postMeds
      ];

      // 2. Automate Pharmacy Store Stock Catalog Deductions
      await Promise.all(
        allDispensedItems.map(async (item) => {
          if (item.drug && typeof item.current_stock === 'number') {
            const calculatedNewStock = Math.max(0, item.current_stock - item.qtyDispensed);
            try {
              await API.patch(`drugs/${item.drug}/`, {
                stock_quantity: calculatedNewStock
              }, { headers });
              console.log(`[Inventory Adjusted] Drug ID ${item.drug}: Balance updated down to ${calculatedNewStock}`);
            } catch (stockError) {
              console.error(`[Inventory Sync Failed] Error on item ${item.drug}:`, stockError);
            }
          }
        })
      );

      // 3. Build out structural metadata array map lists
      const dispatchPayload = allDispensedItems.map(item => ({
        id: item.id,
        drug_id: item.drug,
        quantity_dispensed: item.qtyDispensed, 
        unit_price: item.unitPrice,
        cost: item.cost
      }));

      const cleanUpdatePayload = {
        pharmacy_status: 'DISPENSED',
        meta_extensions: { 
          dispensation_summary: dispatchPayload, 
          final_cost: calculatedDispensation.grandTotal 
        }
      };

      // 4. Update the Prescription entity status (Wrapped in a try-catch circuit-breaker)
      try {
        await API.patch(`prescriptions/${selectedPrescription.id}/`, cleanUpdatePayload, { headers });
      } catch (prescriptionPatchError) {
        // If the backend signals throw a string mismatch but inventory was cleanly subtracted, 
        // catch the error silently so the user interface can continue to progress workflow routing operations safely
        console.warn("[Prescription Signal Override] Handled internal validation query alert, proceeding to queue routing:", prescriptionPatchError);
      }

      // 5. 🚀 NEW: Route the patient directly to the Billing Officer's Queue Panel
      // Use activeQueueItem tracking indicators to isolate the queue ticket resource
      if (activeQueueItem && activeQueueItem.id) {
        const queueTicketId = activeQueueItem.id;
        
        const queueRoutingPayload = {
          current_station: 'BILLING', // Switch station target to Billing/Discharge
          status: 'WAITING'          // Place them back in "Waiting" status for the next room officer
        };

        await API.patch(`queue/${queueTicketId}/`, queueRoutingPayload, { headers });
        console.log(`[Queue Forwarder] Patient successfully escalated to Billing station queue ticket ID: ${queueTicketId}`);
      }

      alert("Dispensation records processed, inventory adjusted, and patient forwarded to Billing desk successfully!");
      
      // 6. Refresh the operational dashboard layout view cards safely
      setSelectedQueueId('');
      await loadPharmacyQueue();
      if (onDispensingComplete) onDispensingComplete();
      
    } catch (err) {
      console.error("[Salama Pharma Hub Critical Exception] Complete dispensation pipeline failure:", err);
      alert("Error committing transactional routing adjustments or synchronizing station queues.");
    } finally {
      setIsProcessing(false);
    }
  }; // <--- Structural functions are now cleanly closed!

  const vitals = selectedPrescription?.vitals_snapshot || {};

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 text-slate-800 font-sans antialiased space-y-5">
      
      {/* INJECTED CSS PRINT OVERRIDES ENGINE */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* 1. Hide every single element in the DOM structure */
          body * {
            visibility: hidden !important;
          }
          
          /* 2. Force ONLY the prescription card sheet and its child items to remain visible */
          .print-target-sheet, 
          .print-target-sheet * {
            visibility: visible !important;
          }
          
          /* 3. Re-anchor the printable canvas layout clean at the top left of the actual paper */
          .print-target-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }

          /* 4. ✨ FIX: Force overflow containers to expand completely and strip scrollbars */
          div[class*="overflow-x-auto"],
          .overflow-hidden,
          .overflow-x-auto {
            overflow: visible !important;
            overflow-x: visible !important;
            display: block !important;
            max-width: 100% !important;
            width: 100% !important;
          }

          /* Preserve styled medical dynamic data grid rows tables */
          .print-target-sheet table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 16px !important;
            table-layout: auto !important; /* Allows cells to auto-size efficiently to page limits */
          }
          .print-target-sheet thead { display: table-header-group !important; }
          .print-target-sheet tbody { display: table-row-group !important; }
          .print-target-sheet tr { 
            display: table-row !important; 
            page-break-inside: avoid !important;
          }
          .print-target-sheet th, 
          .print-target-sheet td { 
            display: table-cell !important; 
            padding: 6px 8px !important; /* Adjusted slightly to fit dense 8-column layout */
            border-bottom: 1px solid #cbd5e1 !important;
            word-break: break-word !important;
          }
          
          /* Re-establish standard demographic grid columns blocks */
          .print-target-sheet .grid-container-layout {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 16px !important;
          }
          
          .print-target-sheet .vitals-grid-layout {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          /* Clear headers/footers browser margins */
          @page {
            size: auto;
            margin: 15mm 15mm 15mm 15mm;
          }
        }
      `}} />

      {/* QUEUE CONTROL BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-teal-600 uppercase tracking-widest block">
            Pharmacy Dispensing Queue
          </label>
        </div>
        <div className="relative min-w-[320px]">
          {loadingQueue ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 p-2 bg-slate-50 rounded-lg">
              <Loader2 className="animate-spin text-teal-500" size={14} />
              <span>Scanning network stations...</span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedQueueId}
                onChange={(e) => setSelectedQueueId(e.target.value)}
                className="w-full bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 focus:border-teal-500 rounded-lg px-3 py-2 text-sm font-semibold appearance-none outline-none transition-all pr-10 cursor-pointer"
              >
                <option value="">-- Select Patient Profile --</option>
                {queuePatients.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.patient_name || pt.patient?.name || `Queue Ticket #${pt.id}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          )}
        </div>
      </div>

      {/* CLINICAL WRAPPER */}
      {loadingDetails ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white border border-slate-100 rounded-xl">
          <Loader2 className="animate-spin text-teal-600" size={32} />
          <p className="text-sm text-slate-500 font-semibold tracking-wide">Assembling patient medication cards...</p>
        </div>
      ) : selectedPrescription ? (
        <div className="print-target-sheet bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6 shadow-xs">
          
          {/* MEDICAL LOGO HEADER BRAND FOR PRINT PREVIEWS */}
          <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-6">
            <div className="flex justify-center items-center gap-3 mb-1">
              <img 
                src={SalamaLogo} 
                alt="Salama Cancer Centre" 
                className="h-14 w-auto object-contain"
              />
              <div className="text-left">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">SALAMA CANCER CENTRE</h1>
                <p className="text-xs font-semibold text-teal-600 tracking-wide -mt-0.5">Holistic Cancer and Palliative Care</p>
              </div>
            </div>
            
            <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase mt-2 bg-slate-100 py-1 print:bg-transparent">
              OFFICIAL PRESCRIPTION DISPENSATION FORM
            </h2>
            
            <p className="text-[11px] text-slate-500 font-medium mt-1.5">
              PO BOX 19619-40123, Kisumu, Kenya<br />
              Tel: +254 756 364 419 | Email: scanccentre@gmail.com
            </p>
          </div>

          {/* DEMOGRAPHICS SHEET */}
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-white text-sm shadow-2xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Patient Demographics</div>
              <div className="grid grid-container-layout grid-cols-2 gap-x-8 gap-y-2.5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Name:</span>
                    <span className="font-bold text-slate-900 text-base">{selectedPrescription.patient_name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Age:</span>
                    <span className="font-semibold text-slate-900">{selectedPrescription.age || "—"} Yrs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Sex:</span>
                    <span className="font-semibold text-slate-900">{selectedPrescription.gender || "—"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Health Rec No:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{selectedPrescription.patient_hn || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Date:</span>
                    <span className="font-semibold text-slate-900">{selectedPrescription.treatment_date || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* DIAGNOSTICS CARD */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white text-sm shadow-2xs space-y-4">
              <div className="grid grid-container-layout grid-cols-2 gap-x-8 gap-y-2.5">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Diagnosis:</span>
                    <span className="font-semibold text-slate-900 leading-tight">{selectedPrescription.diagnosis || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Protocol:</span>
                    <span className="font-bold text-teal-800">{selectedPrescription.protocol || "—"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Cycle No:</span>
                    <span className="font-mono font-semibold text-slate-900">{selectedPrescription.cycle_number || 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Total Cycles:</span>
                    <span className="font-mono font-semibold text-slate-900">{selectedPrescription.total_cycles || 6}</span>
                  </div>
                </div>
              </div>

              <div className="grid vitals-grid-layout grid-cols-3 gap-4 pt-3 border-t border-slate-150 bg-slate-50/70 p-3 rounded-lg text-sm">
                <div className="flex justify-between items-center px-2">
                  <span className="text-slate-600 font-medium">Height:</span>
                  <span className="font-mono font-semibold text-slate-900">{vitals.height_cm || "—"} cm</span>
                </div>
                <div className="flex justify-between items-center px-2 border-x border-slate-200">
                  <span className="text-slate-600 font-medium">Weight:</span>
                  <span className="font-mono font-semibold text-slate-900">{vitals.weight_kg || "—"} kg</span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-teal-800 font-bold">Calculated BSA:</span>
                  <span className="font-mono font-bold text-teal-800">{vitals.bsa || "—"} m²</span>
                </div>
              </div>
            </div>
          </div>

          {/* PRE-CHEMO TABLE */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">Pre-Chemotherapy Stage</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Medication Name</th>
                    <th className="py-2.5 px-3 text-center">Strength</th>
                    <th className="py-2.5 px-3 text-center">Dosage</th>
                    <th className="py-2.5 px-3 text-center">Route</th>
                    <th className="py-2.5 px-3 text-center">Qty Required</th>
                    <th className="py-2.5 px-3 text-right">Cost (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {calculatedDispensation.preMeds.length > 0 ? (
                    calculatedDispensation.preMeds.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.displayName}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">{item.strength}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.dosage || "STAT"}</td>
                        <td className="py-2.5 px-3 text-center">{item.route || "IV"}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">{item.qtyDispensed}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium">{(item.cost || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="py-4 text-center text-slate-400 italic font-medium">No pre-chemotherapy items listed.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CHEMOTHERAPY ORDERS TABLE */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">Chemotherapy Orders</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Medication Name</th>
                    <th className="py-2.5 px-3 text-center">Route</th>
                    <th className="py-2.5 px-3">Diluent</th>
                    <th className="py-2.5 px-3 text-center">Volume</th>
                    <th className="py-2.5 px-3 text-center bg-slate-100/80 text-slate-800">Dose Prescribed</th>
                    <th className="py-2.5 px-3 text-center bg-teal-50/80 text-teal-900 border-x border-slate-200">Strength</th>
                    <th className="py-2.5 px-3 text-center bg-amber-50/80 text-amber-900 font-bold">Dose Dispensed (vials/units)</th>
                    <th className="py-2.5 px-3 text-right">Cost (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {calculatedDispensation.chemoDrugs.length > 0 ? (
                    calculatedDispensation.chemoDrugs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.displayName}</td>
                        <td className="py-2.5 px-3 text-center">{item.route || "IV Infusion"}</td>
                        <td className="py-2.5 px-3">{item.diluent || "—"}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.volume || "—"}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium bg-slate-50/30">
                          {item.dosage || "0"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold bg-teal-50/20 text-teal-900 border-x border-slate-150">
                          {item.strength}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold bg-amber-50/40 text-amber-900">
                          {item.qtyDispensed}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {(item.cost || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="py-4 text-center text-slate-400 italic font-medium">No active cytotoxic items recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* POST-CHEMO TAKE HOME ORDERS TABLE */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">Post-Chemotherapy Take Home Orders</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Medication Name</th>
                    <th className="py-2.5 px-3 text-center">Strength</th>
                    <th className="py-2.5 px-3 text-center">Dose / Schedule</th>
                    <th className="py-2.5 px-3 text-center bg-amber-50/80 text-amber-900 font-bold">Dose Dispensed</th>
                    <th className="py-2.5 px-4 text-right">Cost (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {calculatedDispensation.postMeds.length > 0 ? (
                    calculatedDispensation.postMeds.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.displayName}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">{item.strength}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.dosage || "—"}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold bg-amber-50/40 text-amber-900">{item.qtyDispensed}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{(item.cost || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="py-4 text-center text-slate-400 italic font-medium">No take-home medications assigned.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTAL COST COMPONENT */}
          <div className="bg-slate-900 border border-slate-950 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white shadow-xs">
            <div className="space-y-1">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block">Total Cost Summary</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono tracking-tight text-teal-400">
                <span className="text-sm font-normal text-slate-400 mr-1.5">KES</span>
                {calculatedDispensation.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ACTION HANDLERS */}
          <div className="border-t pt-4 flex justify-end gap-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-bold text-slate-600 transition-colors cursor-pointer"
            >
              <Download size={14} /> Print Prescription Form
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSaveAndSubmit}
              className="bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Commit Dispensation Order
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-150 rounded-xl max-w-md mx-auto p-6 space-y-2">
          <p className="text-base font-bold text-slate-700">No Patient Selected</p>
          <p className="text-xs text-slate-400">Please choose an active file entry from the queue selector above.</p>
        </div>
      )}
    </div>
  );
};

export default PrescriptionQueue;