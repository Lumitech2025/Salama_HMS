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

  // Fetch active station queue items 
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

  // Hydrate full treatment details from database mapping layout
  useEffect(() => {
    if (!activeQueueItem) {
      setSelectedPrescription(null);
      return;
    }

    const rxId = activeQueueItem.prescription?.id || activeQueueItem.prescription || activeQueueItem.prescription_id;
    const fallbackTargetId = rxId || activeQueueItem.patient?.id || activeQueueItem.id;

    if (!fallbackTargetId) {
      setSelectedPrescription(null);
      return;
    }

    const loadActivePrescription = async () => {
      setLoadingDetails(true);
      try {
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await API.get(`prescriptions/${fallbackTargetId}/`, { headers });
        setSelectedPrescription(response.data);
      } catch (err) {
        console.error(`[Salama Exception] Using structured telemetry fallback for ID #${fallbackTargetId}`);
        setSelectedPrescription({
          id: activeQueueItem.id,
          patient_name: activeQueueItem.patient_name || activeQueueItem.patient?.name || "Unknown Patient",
          patient_hn: activeQueueItem.patient_hn || activeQueueItem.patient?.hn || "—",
          age: activeQueueItem.age || activeQueueItem.patient?.age || "—",
          gender: activeQueueItem.gender || activeQueueItem.patient?.gender || "—",
          diagnosis: activeQueueItem.diagnosis || "—",
          protocol: activeQueueItem.protocol || "TC",
          cycle_number: activeQueueItem.cycle_number || 1,
          total_cycles: activeQueueItem.total_cycles || 6,
          treatment_date: activeQueueItem.treatment_date || new Date().toISOString().split('T')[0],
          items: activeQueueItem.items || [],
          vitals_snapshot: activeQueueItem.vitals_snapshot || {}
        });
      } finally {
        setLoadingDetails(false);
      }
    };

    loadActivePrescription();
  }, [activeQueueItem]);

  // Process dynamic operational math
  const items = useMemo(() => selectedPrescription?.items || [], [selectedPrescription]);

  const { preMeds, chemoDrugs, postMeds } = useMemo(() => {
    return {
      preMeds: items.filter(i => i.stage === 'PRE_CHEMO'),
      chemoDrugs: items.filter(i => i.stage === 'CHEMO'),
      postMeds: items.filter(i => i.stage === 'POST_CHEMO')
    };
  }, [items]);

  const calculatedDispensation = useMemo(() => {
    let total = 0;
    const processItem = (item) => {
      const dosageMatch = item.dosage ? item.dosage.match(/\d+/) : null;
      const qty = dosageMatch ? parseInt(dosageMatch[0], 10) : 1;
      const price = parseFloat(item.selling_price_kes || item.price || 0);
      const cost = qty * price;
      total += cost;
      return { ...item, qtyDispensed: qty, cost };
    };

    return {
      preMeds: preMeds.map(processItem),
      chemoDrugs: chemoDrugs.map(item => {
        const targetMg = parseFloat(item.dosage || 0);
        const strengthMg = item.available_stock ? parseFloat(item.available_stock) : 1;
        const qty = Math.ceil(targetMg / (strengthMg || 1)) || 1;
        const price = parseFloat(item.selling_price_kes || item.price || 0);
        const cost = qty * price;
        total += cost;
        return { ...item, qtyDispensed: qty, cost };
      }),
      postMeds: postMeds.map(processItem),
      grandTotal: total
    };
  }, [preMeds, chemoDrugs, postMeds]);

  const handleSaveAndSubmit = async () => {
    if (!selectedPrescription) return;
    setIsProcessing(true);
    try {
      const dispatchPayload = [
        ...calculatedDispensation.preMeds,
        ...calculatedDispensation.chemoDrugs,
        ...calculatedDispensation.postMeds
      ].map(item => ({
        id: item.id,
        quantity_dispensed: item.qtyDispensed,
        cost: item.cost
      }));

      const jwtToken = localStorage.getItem('access_token');
      const csrfToken = getCookie('csrftoken');

      await API.patch(`prescriptions/${selectedPrescription.id}/`, {
        pharmacy_status: 'DISPENSED',
        meta_extensions: { dispensation_summary: dispatchPayload, final_cost: calculatedDispensation.grandTotal }
      }, {
        headers: {
          ...(jwtToken && { Authorization: `Bearer ${jwtToken}` }),
          ...(csrfToken && { 'X-CSRFToken': csrfToken })
        }
      });

      alert("Dispensation records processed successfully.");
      setSelectedQueueId('');
      await loadPharmacyQueue();
      if (onDispensingComplete) onDispensingComplete();
    } catch (err) {
      console.error(err);
      alert("Error committing transactional adjustments.");
    } finally {
      setIsProcessing(false);
    }
  };

  const vitals = selectedPrescription?.vitals_snapshot || {};

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 text-slate-800 font-sans antialiased space-y-5">
      
      {/* ─── PRINT MEDIA CSS ENGINE ───────────────────────────── */}
      <style>{`
        @media print {
          html, body, #root, min-h-screen, main, .app-layout-wrapper {
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          aside, nav, header, sidebar, .print\\:hidden, button, select, icon, .no-print {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }

          .print-target-sheet {
            display: block !important;
            border: none !important;
            padding: 15px !important;
            margin: 0px !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
        }
      `}</style>

      {/* ACTIVE QUEUE SELECTOR CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-teal-600 uppercase tracking-widest block">
            <h2>Pharmacy Dispensing Queue</h2>
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

      {/* MEDICAL DOCUMENT CONTENT BOX */}
      {loadingDetails ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white border border-slate-100 rounded-xl">
          <Loader2 className="animate-spin text-teal-600" size={32} />
          <p className="text-sm text-slate-500 font-semibold tracking-wide">Assembling patient medication cards...</p>
        </div>
      ) : selectedPrescription ? (
        <div className="print-target-sheet bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6 shadow-xs">
          
          {/* DYNAMIC REPORT BANNER HEADER — INSTANTIATES ONLY VIA PRINT ENGINE */}
          <div className="hidden print:flex justify-between items-center border-b-2 border-slate-400 pb-3 mb-4">
            <div className="flex items-center gap-4">
              <img src={SalamaLogo} alt="Salama Cancer Centre" className="h-12 w-auto object-contain" />
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">SALAMA CANCER CENTRE</h1>
                <p className="text-xs text-slate-600 font-medium tracking-wide">Holistic Cancer and Palliative Care</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                CHEMOTHERAPY PRESCRIPTION FORM
              </h2>
              <p className="text-xs font-mono text-slate-600 mt-0.5">Rx ID Ref: #{selectedPrescription.id}</p>
            </div>
          </div>

          {/* TWO SEPARATE TILES FOR DEMOGRAPHICS & CLINICAL DATA */}
          <div className="space-y-4">
            
            {/* TILE 1: PATIENT BASE DEMOGRAPHICS */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white text-sm shadow-2xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Patient Demographics</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
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

            {/* TILE 2: CLINICAL CONTEXT, DIAGNOSIS & VITALS BAND */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white text-sm shadow-2xs space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Staging & Diagnostics</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
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

              {/* VITALS BAND ATTACHED TO BOTTOM OF CLINICAL TILE */}
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-150 bg-slate-50/70 p-3 rounded-lg text-sm">
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

          {/* PRE-CHEMOTHERAPY STAGE */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">Pre-Chemotherapy Stage</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Medication Name</th>
                    <th className="py-2.5 px-3 text-center">Dosage Formula</th>
                    <th className="py-2.5 px-3 text-center">Route</th>
                    <th className="py-2.5 px-3 text-center">Duration</th>
                    <th className="py-2.5 px-3 text-right">Cost (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {calculatedDispensation.preMeds.length > 0 ? (
                    calculatedDispensation.preMeds.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.medication_name || item.name}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.dosage || "STAT"}</td>
                        <td className="py-2.5 px-3 text-center">{item.route || "IV"}</td>
                        <td className="py-2.5 px-3 text-center">{item.duration || "—"}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium">{(item.cost || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="py-4 text-center text-slate-400 italic font-medium">No pre-chemotherapy items listed.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CYTOTOXIC CHEMOTHERAPY ORDERS */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">Chemotherapy Orders</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Medication Name</th>
                    <th className="py-2.5 px-3">Formulation</th>
                    <th className="py-2.5 px-3 text-center">Route</th>
                    <th className="py-2.5 px-3">Diluent Carrier</th>
                    <th className="py-2.5 px-3 text-center">Volume</th>
                    <th className="py-2.5 px-3 text-center bg-slate-100/60">Dose Prescribed</th>
                    <th className="py-2.5 px-3 text-center bg-teal-50/60 text-teal-900">Unit Stock Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {calculatedDispensation.chemoDrugs.length > 0 ? (
                    calculatedDispensation.chemoDrugs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.medication_name || item.name}</td>
                        <td className="py-2.5 px-3">{item.dosage_form || "Vial"}</td>
                        <td className="py-2.5 px-3 text-center">{item.route || "IV Infusion"}</td>
                        <td className="py-2.5 px-3">{item.diluent || "—"}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.volume || "—"}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium bg-slate-50/50">{item.dosage || "0"} mg</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold bg-teal-50/10 text-teal-800">{item.qtyDispensed}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">{(item.cost || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="py-4 text-center text-slate-400 italic font-medium">No active cytotoxic items recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* POST-CHEMO TAKE HOME ORDERS */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">Post-Chemotherapy Take Home Orders</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Medication Name</th>
                    <th className="py-2.5 px-3 text-center">Dose / Strength</th>
                    <th className="py-2.5 px-3 text-center">Calculated Units</th>
                    <th className="py-2.5 px-4 text-right">Cost (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {calculatedDispensation.postMeds.length > 0 ? (
                    calculatedDispensation.postMeds.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.medication_name || item.name}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.dosage || "—"}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-900">{item.qtyDispensed}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">{(item.cost || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="py-4 text-center text-slate-400 italic font-medium">No take-home medications assigned.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTALS SEPARATOR FOOTER BLOCK */}
          <div className="bg-slate-900 border border-slate-950 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white shadow-xs">
            <div className="space-y-1">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block">Total Cost</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono tracking-tight text-teal-400">
                <span className="text-sm font-normal text-slate-400 mr-1.5">KES</span>
                {calculatedDispensation.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* CONTAINER ACTIONS PANEL */}
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
              onClick={handleSaveAndSubmit}
              disabled={isProcessing || calculatedDispensation.grandTotal === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send size={14} /> Commit Dispensation
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl py-24 text-center max-w-sm mx-auto space-y-2 shadow-xs">
          <FileText className="text-slate-300 mx-auto" size={36} />
          <p className="text-sm text-slate-800 font-semibold tracking-tight">No active clinical row targeted.</p>
          <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed">Please choose an arrived patient candidate from the pharmacy queue dropdown above to populate medication metrics.</p>
        </div>
      )}
    </div>
  );
};

export default PrescriptionQueue;