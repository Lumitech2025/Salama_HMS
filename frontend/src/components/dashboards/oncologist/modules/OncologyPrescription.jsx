import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Pill, Plus, Trash2, Send, Calculator, 
  User, ChevronDown, Save, Loader2, RefreshCcw, FileText, AlertTriangle
} from 'lucide-react';

const OncologyPrescription = ({ selectedPatientFromParent, onTabSwitch }) => {
  // --- STATE MANAGEMENT ---
  const [queue, setQueue] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [drugsMasterList, setDrugsMasterList] = useState([]); 
  const [selectedPatient, setSelectedPatient] = useState(selectedPatientFromParent || null);
  const [selectedProtocolId, setSelectedProtocolId] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Local state for tracking a regimen/medication adding entry
  const [manualDrug, setManualDrug] = useState({
    drug_id: '', 
    medication_name: '',
    dosage: '',
    route: 'IV Infusion',
    frequency: 'Once',
    duration: '1 Day',
    instructions: ''
  });

  const routes = ["IV Infusion", "IV Push", "Oral", "SC Injection"];
  const frequencies = ["Once", "Daily", "Twice Daily", "Weekly", "Every 14 Days", "Every 21 Days"];
  const durations = ["1 Day", "3 Days", "5 Days", "7 Days", "14 Days", "1 Cycle"];

  // --- INITIALIZATION DATA FETCH ---
  const fetchSystemData = useCallback(async () => {
    try {
      const [queueRes, protocolsRes, drugsRes] = await Promise.all([
        API.get('/queue?current_station=DOCTOR'),
        API.get('/protocols/'),
        API.get('/drugs/') 
      ]);
      setQueue(queueRes.data.results || queueRes.data || []);
      setProtocols(protocolsRes.data.results || protocolsRes.data || []);
      setDrugsMasterList(drugsRes.data.results || drugsRes.data || []);
    } catch (err) {
      console.error("Error loading prescription system dependencies", err);
    }
  }, []);

  useEffect(() => {
    fetchSystemData();
  }, [fetchSystemData]);

  useEffect(() => {
    if (selectedPatientFromParent) {
      setSelectedPatient(selectedPatientFromParent);
    }
  }, [selectedPatientFromParent]);

  const handleProtocolChange = (protocolId) => {
    setSelectedProtocolId(protocolId);
    if (!protocolId) {
      setPrescriptions([]);
      return;
    }

    const proto = protocols.find(p => p.id === parseInt(protocolId));
    if (!proto || !proto.components) return;

    const templateMeds = proto.components.map(comp => {
      const compNameLower = comp.medication_name.toLowerCase();
      const matchedDrug = drugsMasterList.find(d => {
        const drugNameLower = d.name.toLowerCase();
        return (
          drugNameLower === compNameLower ||
          drugNameLower.includes(compNameLower) ||
          compNameLower.includes(drugNameLower)
        );
      });
      
      return {
        id: Date.now() + Math.random(),
        drug_id: matchedDrug ? matchedDrug.id : null,
        medication_name: comp.medication_name,
        dosage: `${comp.base_dosage} ${comp.dosage_unit}`,
        route: comp.route_of_administration || 'IV Infusion',
        frequency: 'Once',
        duration: proto.cycle_duration_days ? `${proto.cycle_duration_days} Days` : '1 Cycle',
        instructions: matchedDrug 
          ? `Batch No: ${matchedDrug.batch_no} | Current Stock: ${matchedDrug.stock_quantity || matchedDrug.quantity_in_stock || 0}`
          : '⚠️ ALERT: Unbound drug item! Not linked to live inventory tracking.'
      };
    });

    setPrescriptions(templateMeds);
  };

  // Explicitly binds an inline selection fallback to avoid throwing away cards
  const handleInlineItemLink = (uniqueCardId, inventoryDrugId) => {
    const targetInvItem = drugsMasterList.find(d => d.id === parseInt(inventoryDrugId));
    if (!targetInvItem) return;

    setPrescriptions(prev => prev.map(item => {
      if (item.id === uniqueCardId) {
        return {
          ...item,
          drug_id: targetInvItem.id,
          instructions: `Batch No: ${targetInvItem.batch_no} | Current Stock: ${targetInvItem.stock_quantity || targetInvItem.quantity_in_stock || 0}`
        };
      }
      return item;
    }));
  };

  // --- ACTIONS ---
  const handleSelectDrugItem = (drugId) => {
    const selectedDrug = drugsMasterList.find(d => d.id === parseInt(drugId));
    if (selectedDrug) {
      setManualDrug({
        ...manualDrug,
        drug_id: selectedDrug.id,
        medication_name: selectedDrug.name,
        instructions: `Batch No: ${selectedDrug.batch_no} | Current Stock: ${selectedDrug.stock_quantity || selectedDrug.quantity_in_stock || 0}`
      });
    }
  };

  const addManualDrug = () => {
    if (!manualDrug.medication_name || !manualDrug.dosage) {
      alert("Please specify drug items and amount values before processing.");
      return;
    }
    setPrescriptions([...prescriptions, { ...manualDrug, id: Date.now() }]);
    setManualDrug({ drug_id: '', medication_name: '', dosage: '', route: 'IV Infusion', frequency: 'Once', duration: '1 Day', instructions: '' });
  };

  const removeDrug = (id) => setPrescriptions(prescriptions.filter(p => p.id !== id));

  const handleSendToPharmacy = async () => {
    if (prescriptions.length === 0) return alert("Please include at least one medication item.");
    if (!selectedPatient) return alert("Select patient profile to execute operation.");

    const hasUnboundDrugs = prescriptions.some(p => !p.drug_id);
    if (hasUnboundDrugs) {
      return alert("Validation Error: One or more medications are not linked to an inventory item. Please link or remove unmapped records before transmitting.");
    }

    setIsSubmitting(true);
    try {
      // Safely split Patient ID vs Queue Row Primary Keys
      const targetPatientModelId = selectedPatient.patient || selectedPatient.patient_id || selectedPatient.id;
      const targetQueueRowId = selectedPatient.id;
      const targetVisitEncounterId = selectedPatient.visit || selectedPatient.visit_id || null;
      
      const payload = {
        patient: parseInt(targetPatientModelId),
        visit: targetVisitEncounterId ? parseInt(targetVisitEncounterId) : null,
        protocol: selectedProtocolId ? parseInt(selectedProtocolId) : null,
        status: 'PENDING',
        notes: clinicalNotes || "", 
        clinical_notes: clinicalNotes || "",         
        items: prescriptions.map(p => ({
          drug_id: parseInt(p.drug_id), 
          medication_name: p.medication_name,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          route: p.route,
          instructions: p.instructions
        }))
      };

      // 1. Fire prescription collection block
      await API.post('/prescriptions/', payload);

      // 2. Update tracking state directly referencing queue index position
      await API.patch(`/queue/${targetQueueRowId}/`, { 
        current_station: 'PHARMACY',
        status: 'AWAITING_MEDICATION' 
      });

      alert("Success: Prescriptions generated and stock values adjusted.");
      onTabSwitch('home'); 
    } catch (err) {
      console.error("Submission error details:", err.response?.data);
      const backendErrors = err.response?.data 
        ? JSON.stringify(err.response.data) 
        : "Verify network connection variables.";
      alert("Pipeline failure: " + backendErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-['Inter'] pb-20 max-w-[1600px] mx-auto p-4">
      
      {/* HEADER PATIENT SELECTION CONTAINER */}
      <div className="bg-[#020617] border border-white/5 rounded-3xl p-6 shadow-xl text-white">
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="w-full md:w-1/2 flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><User size={20} /></div>
            <div className="flex-1 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Active Patient Context</label>
              <select 
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 font-bold text-white text-xs outline-none focus:border-blue-500 appearance-none cursor-pointer"
                onChange={(e) => {
                  const p = queue.find(item => item.id === parseInt(e.target.value));
                  setSelectedPatient(p);
                  setSelectedProtocolId('');
                  setPrescriptions([]);
                }}
                value={selectedPatient?.id || ''}
              >
                <option value="" disabled>Choose active patient file...</option>
                {queue.map(p => (
                  <option key={p.id} value={p.id}>{p.patient_name} ({p.token_id || `ID: ${p.id}`})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 bottom-3.5 text-slate-400 pointer-events-none" size={14} />
            </div>
            <button type="button" onClick={fetchSystemData} className="p-3 hover:bg-white/5 rounded-xl transition-all mt-4">
              <RefreshCcw size={16} className="text-slate-400" />
            </button>
          </div>
          {selectedPatient && (
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Active File Profile</p>
              <h2 className="text-xl font-bold text-white">{selectedPatient.patient_name}</h2>
            </div>
          )}
        </div>
      </div>

      {selectedPatient ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* LEFT INTERACTIVE CONFIGURATION FORM CONTAINER */}
          <div className="xl:col-span-5 space-y-6">
            
            {/* PROTOCOL MATCHER BLOCK */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calculator size={18} className="text-blue-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Step 1: Select Treatment Protocol Blueprint</h3>
              </div>
              
              <div className="relative">
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-800 text-sm outline-none focus:border-blue-500 focus:bg-white appearance-none cursor-pointer"
                  value={selectedProtocolId}
                  onChange={(e) => handleProtocolChange(e.target.value)}
                >
                  <option value="">-- Manual Regimen Assembly (No Template) --</option>
                  {protocols.map(proto => (
                    <option key={proto.id} value={proto.id}>{proto.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 bottom-4 text-slate-500 pointer-events-none" size={18} />
              </div>
            </div>

            {/* AD-HOC EXTRA MEDICINE BUILDER */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Pill size={18} className="text-slate-700" />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Step 2: Add Medication & Intake Details</h4>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Select Drug from Inventory</label>
                <div className="relative">
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none appearance-none cursor-pointer"
                    value={manualDrug.drug_id}
                    onChange={(e) => handleSelectDrugItem(e.target.value)}
                  >
                    <option value="">-- Choose matching item registry entry --</option>
                    {drugsMasterList.map(drug => {
                      const stock = drug.stock_quantity ?? drug.quantity_in_stock ?? 0;
                      return (
                        <option key={drug.id} value={drug.id} disabled={stock <= 0}>
                          {drug.name} (Qty Available: {stock} | Form: {drug.dosage_form})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Medication Formulation Name</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:bg-white" 
                  placeholder="e.g., Cisplatin Infusion"
                  value={manualDrug.medication_name}
                  onChange={(e) => setManualDrug({...manualDrug, medication_name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Amount / Quantity Issued</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none" 
                    placeholder="e.g., 50 mg or 2 Tablets"
                    value={manualDrug.dosage}
                    onChange={(e) => setManualDrug({...manualDrug, dosage: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Intake Mode (Route)</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none"
                    value={manualDrug.route}
                    onChange={(e) => setManualDrug({...manualDrug, route: e.target.value})}
                  >
                    {routes.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Frequency</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none"
                    value={manualDrug.frequency}
                    onChange={(e) => setManualDrug({...manualDrug, frequency: e.target.value})}
                  >
                    {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Duration</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none"
                    value={manualDrug.duration}
                    onChange={(e) => setManualDrug({...manualDrug, duration: e.target.value})}
                  >
                    {durations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <button 
                type="button"
                onClick={addManualDrug}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-wider text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14}/> Inject Medication Into Queue
              </button>
            </div>

            {/* CLINICAL REMARKS */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-700" />
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider">Step 3: Protocol Remarks</label>
              </div>
              <textarea
                className="w-full border border-slate-200 rounded-2xl p-4 bg-slate-50 font-medium text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none"
                rows="3"
                placeholder="Document clinical reasons for special modifications or instructions..."
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
              />
            </div>

          </div>

          {/* RIGHT LIVE COMPILING VIEW */}
          <div className="xl:col-span-7 space-y-6">
            <div className="bg-[#020617] rounded-[2.5rem] p-8 shadow-2xl min-h-[500px] border border-white/5 flex flex-col justify-between">
              
              <div>
                <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-6">
                  <div>
                    <span className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] block mb-1">Prescription Items Summary</span>
                    <h4 className="text-white font-bold text-sm">Patient Context: {selectedPatient.patient_name}</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-900 border border-white/10 text-amber-400 px-3 py-1 rounded-lg uppercase">
                    {selectedProtocolId ? protocols.find(p => p.id === parseInt(selectedProtocolId))?.name : "MANUAL BUILD"}
                  </span>
                </div>

                {prescriptions.length === 0 ? (
                  <div className="text-center py-24 opacity-25 border border-dashed border-white/20 rounded-2xl my-4">
                    <Pill size={48} className="mx-auto text-white mb-3" />
                    <p className="text-white text-xs font-black uppercase tracking-widest">No Active Medications Added</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {prescriptions.map((drug) => (
                      <div key={drug.id} className={`border p-5 rounded-2xl flex flex-col gap-3 bg-white/5 ${!drug.drug_id ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10'}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`p-3 rounded-xl ${!drug.drug_id ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              <Pill size={18}/>
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-black text-base tracking-tight uppercase">{drug.medication_name}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-slate-400 mt-0.5">
                                <span className="text-white bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-amber-400">{drug.dosage}</span>
                                <span>• Route: {drug.route}</span>
                                <span>• {drug.frequency}</span>
                                <span>• {drug.duration}</span>
                              </div>
                            </div>
                          </div>
                          <button type="button" onClick={() => removeDrug(drug.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors">
                            <Trash2 size={16}/>
                          </button>
                        </div>

                        {/* INLINE LINK FALLBACK PANEL */}
                        {!drug.drug_id && (
                          <div className="bg-slate-900/80 border border-amber-500/20 p-3 rounded-xl flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                              <AlertTriangle size={13} /> Unbound blueprint medication. Link item to inventory:
                            </div>
                            <div className="relative">
                              <select 
                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-[11px] font-bold text-slate-300 outline-none appearance-none"
                                onChange={(e) => handleInlineItemLink(drug.id, e.target.value)}
                                defaultValue=""
                              >
                                <option value="" disabled>-- Select dynamic stock link item --</option>
                                {drugsMasterList.map(dm => (
                                  <option key={dm.id} value={dm.id}>{dm.name} (Available: {dm.stock_quantity ?? dm.quantity_in_stock ?? 0})</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" size={12} />
                            </div>
                          </div>
                        )}

                        {drug.instructions && (
                          <p className="text-[11px] text-slate-400 bg-black/25 p-2 rounded-xl italic">
                            {drug.instructions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {prescriptions.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-white/10">
                  <button type="button" className="bg-white/5 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/10 transition-all">
                    Hold Draft Payload
                  </button>
                  <button 
                    type="button"
                    onClick={handleSendToPharmacy}
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={14}/> : <Send size={14}/>}
                    Transmit Order Package
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-200 rounded-[2.5rem] p-24 text-center shadow-sm">
          <Pill size={48} className="mx-auto text-slate-200 mb-4 animate-pulse" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">Please select a patient profile from the drop-down menu above to start crafting the prescription package.</p>
        </div>
      )}
    </div>
  );
};

export default OncologyPrescription;