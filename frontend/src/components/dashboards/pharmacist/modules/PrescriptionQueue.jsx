import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '@/api/api';
import { 
  User, Pill, ChevronDown, CheckCircle2, 
  Loader2, Send, Clock, ShieldAlert, 
  Activity, Receipt, Printer, PackageCheck, AlertTriangle
} from 'lucide-react';

const PrescriptionQueue = ({ onTabSwitch }) => {
  const [completedOrders, setCompletedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isDispensing, setIsDispensing] = useState(false);
  const [dispenseQuantities, setDispenseQuantities] = useState({});

  // 1. Fetch completed lab orders pipeline
  const fetchCompletedLabOrders = useCallback(async () => {
    try {
      const res = await API.get('/lab-orders?status=COMPLETED');
      const orders = res.data.results || res.data || [];
      setCompletedOrders(orders);
    } catch (err) {
      console.error("Error pulling clinical lab pipeline:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchCompletedLabOrders();
    const interval = setInterval(fetchCompletedLabOrders, 15000); 
    return () => clearInterval(interval);
  }, [fetchCompletedLabOrders]);

  // 2. Hydrate prescription details
  const handleSelectOrder = useCallback(async (orderItem) => {
    setLoading(true);
    setSelectedOrder(orderItem);
    try {
      const patientId = orderItem.patient; 
      const res = await API.get(`/prescriptions?patient=${patientId}&pharmacy_status=PENDING`);
      const results = res.data.results || res.data;
      
      if (results.length > 0) {
        const primaryPrescription = results[0];
        setPrescriptionData(primaryPrescription);
        
        const defaultQtys = {};
        primaryPrescription.items?.forEach(item => {
          defaultQtys[item.id] = parseInt(item.quantity_requested || item.quantity || 1);
        });
        setDispenseQuantities(defaultQtys);
      } else {
        setPrescriptionData(null);
        setDispenseQuantities({});
      }
    } catch (err) {
      console.error("Prescription hydration error:", err);
      setPrescriptionData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (completedOrders.length > 0 && !selectedOrder && !loadingOrders) {
      handleSelectOrder(completedOrders[0]);
    }
  }, [completedOrders, selectedOrder, loadingOrders, handleSelectOrder]);

  const handleQuantityChange = (itemId, val) => {
    const cleanVal = Math.max(0, parseInt(val) || 0);
    setDispenseQuantities(prev => ({ ...prev, [itemId]: cleanVal }));
  };

  // --- Sorting & Calculations Phase Arrays ---
  const items = useMemo(() => prescriptionData?.items || [], [prescriptionData]);

  const { preMeds, chemoDrugs, postMeds } = useMemo(() => {
    return {
      preMeds: items.filter(i => i.category?.toUpperCase() === 'PRE_MEDICATION' || i.is_pre_med),
      chemoDrugs: items.filter(i => i.category?.toUpperCase() === 'CHEMOTHERAPY' || (!i.category && !i.is_pre_med && !i.is_post_med)),
      postMeds: items.filter(i => i.category?.toUpperCase() === 'POST_MEDICATION' || i.is_post_med)
    };
  }, [items]);

  const calculateSectionCost = useCallback((medGroup) => {
    return medGroup.reduce((sum, item) => {
      const unitPrice = parseFloat(item.drug?.price || item.unit_price || 0);
      const actualQty = dispenseQuantities[item.id] ?? parseInt(item.quantity_requested || item.quantity || 1);
      return sum + (unitPrice * actualQty);
    }, 0);
  }, [dispenseQuantities]);

  const preMedsCost = useMemo(() => calculateSectionCost(preMeds), [preMeds, calculateSectionCost]);
  const chemoCost = useMemo(() => calculateSectionCost(chemoDrugs), [chemoDrugs, calculateSectionCost]);
  const postMedsCost = useMemo(() => calculateSectionCost(postMeds), [postMeds, calculateSectionCost]);
  const grandTotalCost = preMedsCost + chemoCost + postMedsCost;

  const handleCompleteDispense = async () => {
    if (!prescriptionData || !selectedOrder) return;
    setIsDispensing(true);
    try {
      const finalItemsPayload = items.map(item => ({
        id: item.id,
        quantity_dispensed: dispenseQuantities[item.id] || 0,
        unit_price: parseFloat(item.drug?.price || item.unit_price || 0),
        total_price: (dispenseQuantities[item.id] || 0) * parseFloat(item.drug?.price || item.unit_price || 0)
      }));

      await API.patch(`/prescriptions/${prescriptionData.id}/`, { 
        pharmacy_status: 'DISPENSED',
        dispensed_items_override: finalItemsPayload,
        actual_total_cost: grandTotalCost
      });
      
      if (selectedOrder.visit) {
        try {
          await API.patch(`/queue/update-by-visit/${selectedOrder.visit}/`, { 
            status: 'WAITING',
            current_station: 'BILLING' 
          });
        } catch (e) { console.warn("Queue track change skipped."); }
      }

      if (onTabSwitch) {
        onTabSwitch('billing', {
          patientId: selectedOrder.patient,
          invoiceNo: `INV-ONC-${prescriptionData.id}`,
          grandTotalCost
        });
      }

      setSelectedOrder(null);
      setPrescriptionData(null);
      fetchCompletedLabOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDispensing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-2 pb-16 text-slate-700 font-sans antialiased">
      
      {/* CLEAN USER SELECTOR BLOCK */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
            <User size={20} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Awaiting Dispense Pipeline</h4>
            <p className="text-sm font-bold text-slate-800">Select Lab-Cleared Recipient</p>
          </div>
        </div>
        <div className="relative min-w-[280px]">
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-slate-800 appearance-none outline-none focus:border-teal-500 transition-all cursor-pointer"
            onChange={(e) => {
              const order = completedOrders.find(o => o.id === parseInt(e.target.value));
              if(order) handleSelectOrder(order);
            }}
            value={selectedOrder?.id || ''}
          >
            <option value="" disabled>
              {loadingOrders ? "Scanning workflow servers..." : "Choose Patient Chart..."}
            </option>
            {completedOrders.map(order => (
              <option key={order.id} value={order.id}>{order.patient_name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" size={16} />
        </div>
      </div>

      {selectedOrder ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm space-y-8">
          
          {/* PROFILE SUMMARY HERO ROW */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {prescriptionData?.regimen_name || "Custom Therapy Protocol"}
                </h2>
                <span className="bg-teal-50 text-teal-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-teal-100">
                  Cycle {prescriptionData?.cycle_number || 1} of {prescriptionData?.total_cycles || 6}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Patient: <span className="font-semibold text-slate-700">{selectedOrder.patient_name}</span>
              </p>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Target BSA</span>
                <span className="font-mono font-bold text-slate-800">{prescriptionData?.bsa || "1.75"} m²</span>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2">
                <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider block">Fulfillment Status</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1"><PackageCheck size={14}/> Allocations Verified</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="animate-spin text-teal-600 mx-auto" size={36} />
              <p className="text-xs text-slate-400 font-medium">Re-calculating pricing arrays matrix...</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* PHASES LIST GENERATOR */}
              <MedicationSection 
                title="Phase 1: Pre-Medication Protocols" 
                icon={<ShieldAlert size={16} className="text-amber-500" />}
                items={preMeds}
                quantities={dispenseQuantities}
                onQtyChange={handleQuantityChange}
                accentColor="amber"
              />

              <MedicationSection 
                title="Phase 2: Cytotoxic Drug Pipeline" 
                icon={<Pill size={16} className="text-rose-500" />}
                items={chemoDrugs}
                quantities={dispenseQuantities}
                onQtyChange={handleQuantityChange}
                accentColor="rose"
              />

              <MedicationSection 
                title="Phase 3: Post-Chemo Take-Home Elements" 
                icon={<CheckCircle2 size={16} className="text-indigo-500" />}
                items={postMeds}
                quantities={dispenseQuantities}
                onQtyChange={handleQuantityChange}
                accentColor="indigo"
              />

              {/* STATS AND SUMMARY INVOICE FOOTER */}
              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-500">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Pharmacy Claims Breakdown</h4>
                    <p className="text-xs text-slate-400">Values update in real-time based on active inventory dispense overrides.</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Payable Valuation</span>
                  <div className="text-2xl font-black font-mono text-slate-900">
                    <span className="text-xs font-bold text-slate-400 mr-1 font-sans text-teal-600">KES</span>
                    {grandTotalCost.toLocaleString()}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* DISPENSING ACTION ROW */}
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold"><Clock size={14}/> Live Syncing Active</span>
              <span>•</span>
              <button onClick={() => window.print()} type="button" className="hover:text-slate-800 inline-flex items-center gap-1.5 transition-colors">
                <Printer size={14}/> Print Manifest
              </button>
            </div>

            <button 
              onClick={handleCompleteDispense}
              disabled={isDispensing || !prescriptionData || grandTotalCost === 0}
              className="w-full sm:w-auto bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm shadow-teal-600/10 transition-all flex items-center justify-center gap-2"
            >
              {isDispensing ? <Loader2 className="animate-spin" size={16}/> : <Send size={14} />}
              Finalize Dispense & Send To Invoice
            </button>
          </div>

        </div>
      ) : (
        /* LIGHTWEIGHT STANDARD EMPTY STATE */
        <div className="bg-white border border-slate-100 rounded-2xl py-24 text-center shadow-sm max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
            <Pill size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Pharmacy Pipe Awaiting Selection</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Please choose a patient from the top laboratory clearance pipeline to pull records, quantify medications, and generate billable items.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- LIGHTWEIGHT SUB-SECTION TABLE GENERATOR ---
const MedicationSection = ({ title, icon, items, quantities, onQtyChange, accentColor }) => {
  if (items.length === 0) return null;

  const themes = {
    amber: 'border-amber-100 text-amber-700 bg-amber-50/50',
    rose: 'border-rose-100 text-rose-700 bg-rose-50/50',
    indigo: 'border-indigo-100 text-indigo-700 bg-indigo-50/50'
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
        {icon}
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
      </div>
      
      <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
              <th className="py-3 px-4 font-semibold">Medication Compound Name</th>
              <th className="py-3 px-4 font-semibold">Administration Order</th>
              <th className="py-3 px-4 font-semibold text-center w-36">Dispense Qty</th>
              <th className="py-3 px-4 font-semibold text-right w-44">Itemized Valuation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const basePrice = parseFloat(item.drug?.price || item.unit_price || 0);
              const activeQty = quantities[item.id] ?? 0;
              const lineCost = basePrice * activeQty;
              const isModified = parseInt(item.quantity_requested || item.quantity) !== activeQty;

              return (
                <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-bold text-slate-800 text-sm">
                      {item.medication_name || item.drug?.name || "Therapeutic Compound"}
                    </p>
                    {isModified && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 mt-1">
                        <AlertTriangle size={10} /> Ordered: {item.quantity_requested || item.quantity}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 border rounded ${themes[accentColor]}`}>
                        {item.dosage || "Standard Dose"}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {item.route || "IV"} • {item.frequency || "STAT"}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <input 
                      type="number" 
                      min="0"
                      value={activeQty} 
                      onChange={(e) => onQtyChange(item.id, e.target.value)}
                      className="w-20 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg px-2 py-1 text-center font-mono font-bold text-slate-800 text-xs outline-none transition-all"
                    />
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    <span className="text-xs text-slate-800 font-bold">KES {lineCost.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 block font-normal">({activeQty} × {basePrice})</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrescriptionQueue;