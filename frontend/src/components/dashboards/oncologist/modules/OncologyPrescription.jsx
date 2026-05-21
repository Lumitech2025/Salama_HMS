import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '@/api/api';
import { 
  Pill, Plus, Trash2, Send, Calculator, AlertTriangle, CheckCircle,
  User, ChevronDown, Save, Loader2, RefreshCcw, Activity, Clock, FileText
} from 'lucide-react';

const OncologyPrescription = ({ selectedPatientFromParent, onTabSwitch }) => {
  // --- 1. STATE MANAGEMENT ---
  const [queue, setQueue] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(selectedPatientFromParent || null);
  const [selectedProtocolId, setSelectedProtocolId] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Local state for manually tracking a custom drug if needed outside the protocol
  const [manualDrug, setManualDrug] = useState({
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

  // --- 2. BACKEND CONNECTIONS ---
  const fetchQueueAndProtocols = useCallback(async () => {
    try {
      const [queueRes, protocolsRes] = await Promise.all([
        API.get('/queue?current_station=DOCTOR'),
        API.get('/protocols/') // Fetch your ProtocolMaster records
      ]);
      setQueue(queueRes.data.results || queueRes.data || []);
      setProtocols(protocolsRes.data.results || protocolsRes.data || []);
    } catch (err) {
      console.error("Initialization fetch error", err);
    }
  }, []);

  useEffect(() => {
    fetchQueueAndProtocols();
  }, [fetchQueueAndProtocols]);

  useEffect(() => {
    if (selectedPatientFromParent) setSelectedPatient(selectedPatientFromParent);
  }, [selectedPatientFromParent]);

  // --- 3. MEDICAL CALCULATION & GUARDRAIL CORE LOGIC ---
  const activePatientMetrics = useMemo(() => {
    if (!selectedPatient) return null;
    
    // Fallbacks mimic real patient data structures coming from Triage/Vitals
    const weight = parseFloat(selectedPatient.weight || 70);
    const height = parseFloat(selectedPatient.height || 170);
    const age = parseInt(selectedPatient.age || 55);
    const gender = selectedPatient.gender || 'M';
    const creatinine = parseFloat(selectedPatient.serum_creatinine || 1.1);

    // Most standard oncology calculations use the Mosteller Formula for BSA:
    // BSA = \sqrt{ (Height(cm) * Weight(kg)) / 3600 }
    const bsa = Math.sqrt((height * weight) / 3600);

    // Cockcroft-Gault Equation for CrCl
    let crcl = ((140 - age) * weight) / (72 * creatinine);
    if (gender === 'F') crcl *= 0.85;

    // GFR estimate (Simplified CKD-EPI approximation or direct proxy here)
    const gfr = crcl * 0.93; 

    return {
      age,
      weight,
      height,
      gender,
      creatinine,
      bsa: parseFloat(bsa.toFixed(2)),
      crcl: parseFloat(crcl.toFixed(1)),
      gfr: parseFloat(gfr.toFixed(1)),
      anc: parseFloat(selectedPatient.anc || 1800), // Absolute Neutrophil Count proxy
      platelets: parseFloat(selectedPatient.platelets || 250000),
      bilirubin: parseFloat(selectedPatient.total_bilirubin || 0.8)
    };
  }, [selectedPatient]);

  // Handle auto-populating drugs and checking guardrails when a protocol is selected
  const handleProtocolChange = (protocolId) => {
    setSelectedProtocolId(protocolId);
    if (!protocolId) {
      setPrescriptions([]);
      return;
    }

    const proto = protocols.find(p => p.id === parseInt(protocolId));
    if (!proto || !activePatientMetrics) return;

    // Transform blueprint database definitions into real calculated prescriptions
    const autoCalculatedMeds = proto.drugs.map(drug => {
      const baseDoseValue = parseFloat(drug.base_dose);
      let calculatedDose = baseDoseValue;
      let evaluationLogs = [];
      let adjustmentFactor = 1.0; 
      let isHalted = false;

      // Evaluate rules against patient parameters
      if (drug.rules && drug.rules.length > 0) {
        drug.rules.forEach(rule => {
          let patientVal = 0;
          // Map backend parameter keys cleanly
          if (rule.parameter.includes('CrCl')) patientVal = activePatientMetrics.crcl;
          else if (rule.parameter.includes('Bilirubin')) patientVal = activePatientMetrics.bilirubin;
          else if (rule.parameter.includes('ANC')) patientVal = activePatientMetrics.anc;
          else if (rule.parameter.includes('Platelets')) patientVal = activePatientMetrics.platelets;

          // Check logical operator condition
          let conditionMet = false;
          const threshold = parseFloat(rule.value);
          if (rule.operator === '<' && patientVal < threshold) conditionMet = true;
          if (rule.operator === '<=' && patientVal <= threshold) conditionMet = true;
          if (rule.operator === '>' && patientVal > threshold) conditionMet = true;
          if (rule.operator === '>=' && patientVal >= threshold) conditionMet = true;

          if (conditionMet) {
            if (rule.action === 'BLOCK') {
              isHalted = true;
              evaluationLogs.push(`CRITICAL: Halted due to ${rule.parameter} (${patientVal} ${rule.operator} ${rule.value})`);
            } else if (rule.action === 'REDUCE_PCT') {
              const reduction = parseFloat(rule.action_value || 0);
              adjustmentFactor *= (1 - (reduction / 100));
              evaluationLogs.push(`Toxicity Warning: Dose reduced by ${reduction}% due to ${rule.parameter}`);
            }
          }
        });
      }

      // Compute actual absolute value based on measurement unit scalar
      if (!isHalted) {
        if (drug.unit === 'mg/m²') {
          calculatedDose = baseDoseValue * activePatientMetrics.bsa;
        } else if (drug.unit === 'mg/kg') {
          calculatedDose = baseDoseValue * activePatientMetrics.weight;
        } else if (drug.unit === 'AUC') {
          // Calvert Formula for Carboplatin: Dose (mg) = Target AUC * (GFR + 25)
          calculatedDose = baseDoseValue * (activePatientMetrics.gfr + 25);
        }
        // Multiply by any triggered guardrail dose reductions
        calculatedDose = calculatedDose * adjustmentFactor;
      }

      return {
        id: Date.now() + Math.random(),
        medication_name: drug.drug_name,
        baseDose: drug.base_dose,
        unit: drug.unit,
        dosage: isHalted ? 'HALTED / HOLD' : `${calculatedDose.toFixed(1)} mg`,
        route: drug.route,
        frequency: 'Once',
        duration: proto.days_per_cycle ? `${proto.days_per_cycle} Days` : '1 Cycle',
        instructions: drug.administration_day ? `Administer on ${drug.administration_day}.` : '',
        guardrailAlerts: evaluationLogs,
        isBlocked: isHalted
      };
    });

    setPrescriptions(autoCalculatedMeds);
  };

  // --- 4. FORM ACTIONS ---
  const addManualDrug = () => {
    if (!manualDrug.medication_name || !manualDrug.dosage) return;
    setPrescriptions([...prescriptions, { ...manualDrug, id: Date.now(), guardrailAlerts: [] }]);
    setManualDrug({ medication_name: '', dosage: '', route: 'IV Infusion', frequency: 'Once', duration: '1 Day', instructions: '' });
  };

  const removeDrug = (id) => setPrescriptions(prescriptions.filter(p => p.id !== id));

  const handleSendToPharmacy = async () => {
    if (prescriptions.length === 0) return alert("Please include at least one calculated item.");
    if (!selectedPatient) return alert("Select patient entity to deploy order pipeline.");
    
    const containsBlockers = prescriptions.some(p => p.isBlocked);
    if (containsBlockers) {
      const proceed = window.confirm("Warning: Your current order array contains medications that have triggered a strict safety HALT check. Do you wish to override and clear this package?");
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      const patientId = selectedPatient.patient || selectedPatient.id;
      
      const payload = {
        patient: patientId,
        protocol: selectedProtocolId ? parseInt(selectedProtocolId) : null,
        status: 'PENDING',
        notes: clinicalNotes,
        items: prescriptions.map(p => ({
          medication_name: p.medication_name,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          route: p.route,
          instructions: `${p.instructions || ''} ${p.guardrailAlerts?.join(' | ') || ''}`.trim()
        }))
      };

      await API.post('/prescriptions/', payload);

      await API.patch(`/queue/${selectedPatient.id}/`, { 
        current_station: 'PHARMACY',
        status: 'AWAITING_MEDICATION' 
      });

      alert("Success: Order transmitted and safety variables logged.");
      onTabSwitch('home'); 
    } catch (err) {
      console.error("Transmission Error:", err.response?.data);
      alert("Pipeline alignment failure: " + (err.response?.data?.detail || "Check structural properties."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-['Inter'] pb-20 max-w-[1600px] mx-auto p-4">
      
      {/* HEADER PATIENT HUB & LAB DISCOVERY ENGINE */}
      <div className="bg-[#020617] border border-white/5 rounded-3xl p-6 shadow-xl text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><User size={20} /></div>
              <div className="flex-1 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Active Medical Recipient</label>
                <select 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 font-bold text-white text-xs outline-none focus:border-blue-500 appearance-none cursor-pointer"
                  onChange={(e) => {
                    const p = queue.find(item => item.id === parseInt(e.target.value));
                    setSelectedPatient(p);
                    setSelectedProtocolId('');
                    setPrescriptions([]);
                  }}
                  value={selectedPatient?.id || ''}
                >
                  <option value="" disabled>Choose patient from clinic workflow queue...</option>
                  {queue.map(p => (
                    <option key={p.id} value={p.id}>{p.patient_name} ({p.token_id})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 bottom-3 text-slate-400 pointer-events-none" size={14} />
              </div>
              <button onClick={fetchQueueAndProtocols} className="p-3 hover:bg-white/5 rounded-xl transition-all self-end"><RefreshCcw size={16} className="text-slate-400" /></button>
            </div>
          </div>

          {/* DYNAMIC BIO-METRIC AND LAB VALUES RENDERING */}
          {activePatientMetrics && (
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-6">
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase block">Calculated BSA</span>
                <span className="text-sm font-mono font-black text-cyan-400">{activePatientMetrics.bsa} <span className="text-[10px] font-sans font-medium text-slate-400">m²</span></span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase block">Renal Clearance (CrCl)</span>
                <span className="text-sm font-mono font-black text-amber-400">{activePatientMetrics.crcl} <span className="text-[10px] font-sans font-medium text-slate-400">mL/min</span></span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase block">Glomerular (GFR)</span>
                <span className="text-sm font-mono font-black text-emerald-400">{activePatientMetrics.gfr} <span className="text-[10px] font-sans font-medium text-slate-400">mL/min</span></span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase block">Absolute Neutrophils</span>
                <span className="text-sm font-mono font-black text-purple-400">{activePatientMetrics.anc} <span className="text-[10px] font-sans font-medium text-slate-400">/µL</span></span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase block">Hematological Plt</span>
                <span className="text-sm font-mono font-black text-rose-400">{activePatientMetrics.platelets.toLocaleString()}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase block">Age / Gender</span>
                <span className="text-sm font-bold text-slate-200">{activePatientMetrics.age}y <span className="text-xs text-slate-400">({activePatientMetrics.gender})</span></span>
              </div>
            </div>
          )}

        </div>
      </div>

      {selectedPatient ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* LEFT INTERACTIVE CONFIGURATION FORM CONTAINER */}
          <div className="xl:col-span-5 space-y-6">
            
            {/* PROTOCOL MATCHER COMPONENT MODULE */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calculator size={18} className="text-blue-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Step 1: Core Protocol Blueprint Link</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mb-4">Select a master configuration blueprint architecture to cross-evaluate clinical values against database safety margins.</p>
              
              <div className="relative">
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-800 text-sm outline-none focus:border-blue-500 focus:bg-white appearance-none cursor-pointer"
                  value={selectedProtocolId}
                  onChange={(e) => handleProtocolChange(e.target.value)}
                >
                  <option value="">-- Direct Manual Entry Mode (No Protocol) --</option>
                  {protocols.map(proto => (
                    <option key={proto.id} value={proto.id}>{proto.protocolName} — ({proto.cancerType})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 bottom-4 text-slate-500 pointer-events-none" size={18} />
              </div>
            </div>

            {/* AD-HOC EXTRA MEDICINE BUILDER */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Pill size={18} className="text-slate-700" />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Step 2: Inject Supportive / Ad-hoc Medication</h4>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Medication Generic Name</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:bg-white" 
                  placeholder="e.g., Ondansetron"
                  value={manualDrug.medication_name}
                  onChange={(e) => setManualDrug({...manualDrug, medication_name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Absolute Absolute Dosage</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none" 
                    placeholder="e.g., 8 mg"
                    value={manualDrug.dosage}
                    onChange={(e) => setManualDrug({...manualDrug, dosage: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Route</label>
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

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Clinical Administration Instructions</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-700 outline-none resize-none"
                  rows="2"
                  placeholder="e.g., Administer IV push 30 minutes prior to chemotherapy infusion sequence."
                  value={manualDrug.instructions}
                  onChange={(e) => setManualDrug({...manualDrug, instructions: e.target.value})}
                />
              </div>

              <button 
                type="button"
                onClick={addManualDrug}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-wider text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14}/> Inject Into Order Queue
              </button>
            </div>

            {/* EXPANDED SYSTEM CLINICAL REMARKS & TITRATION NOTES */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-700" />
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider">Step 3: Protocol Remarks & Titration Exceptions Log</label>
              </div>
              <textarea
                className="w-full border border-slate-200 rounded-2xl p-4 bg-slate-50 font-medium text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none"
                rows="4"
                placeholder="Document clinical reasons for any specialized dose scaling overrides, cycles extensions, or physiological mutations encountered..."
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
              />
            </div>

          </div>

          {/* RIGHT LIVE ORDER PACKAGE COMPILE PANEL */}
          <div className="xl:col-span-7 space-y-6">
            <div className="bg-[#020617] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden min-h-[600px] border border-white/5 flex flex-col justify-between">
              
              <div>
                <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-6">
                  <div>
                    <span className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] block mb-1">Target Treatment Payload Summary</span>
                    <h4 className="text-white font-bold text-sm">Patient: {selectedPatient.patient_name}</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-900 border border-white/10 text-amber-400 px-3 py-1 rounded-lg uppercase">
                    {selectedProtocolId ? protocols.find(p => p.id === parseInt(selectedProtocolId))?.protocolName : "MANUAL REGIMEN"}
                  </span>
                </div>

                {/* THE LIVE RUNTIME RENDER LIST OF PHARMACOLOGICAL PRESCRIPTIONS */}
                {prescriptions.length === 0 ? (
                  <div className="text-center py-24 opacity-25 border border-dashed border-white/20 rounded-2xl my-4">
                    <Pill size={48} className="mx-auto text-white mb-3 animate-bounce" />
                    <p className="text-white text-xs font-black uppercase tracking-widest">No Active Medications Generated</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {prescriptions.map((drug) => (
                      <div 
                        key={drug.id} 
                        className={`border p-5 rounded-2xl flex flex-col gap-3 transition-all ${
                          drug.isBlocked 
                            ? 'bg-rose-950/20 border-rose-900/50' 
                            : drug.guardrailAlerts?.length > 0 
                              ? 'bg-amber-950/20 border-amber-900/40' 
                              : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl mt-0.5 ${drug.isBlocked ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              <Pill size={18}/>
                            </div>
                            <div>
                              <p className="text-white font-black text-base tracking-tight uppercase">{drug.medication_name}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-slate-400 mt-0.5">
                                <span className="text-white bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-amber-400">{drug.dosage}</span>
                                <span>• {drug.route}</span>
                                <span>• {drug.frequency}</span>
                                <span>• {drug.duration}</span>
                              </div>
                            </div>
                          </div>
                          <button type="button" onClick={() => removeDrug(drug.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors">
                            <Trash2 size={16}/>
                          </button>
                        </div>

                        {/* RENDER ACTIVE RISK ALERTS OR INSTRUCTIONS METRIC BOXES */}
                        {drug.guardrailAlerts && drug.guardrailAlerts.map((alert, idx) => (
                          <div key={idx} className={`flex items-center gap-2 text-[10px] font-mono font-bold p-2 rounded border ${drug.isBlocked ? 'bg-rose-950/40 border-rose-800 text-rose-400' : 'bg-amber-950/40 border-amber-800 text-amber-400'}`}>
                            <AlertTriangle size={12} className="shrink-0" />
                            <span>{alert}</span>
                          </div>
                        ))}

                        {drug.instructions && (
                          <p className="text-[11px] text-slate-500 bg-black/20 p-2 rounded-xl italic border border-white/[0.02]">
                            <span className="font-bold text-slate-400 not-italic">Directions:</span> {drug.instructions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTION FOOTER DISPATCH CONTROLS */}
              {prescriptions.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-white/10 relative z-10">
                  <button className="bg-white/5 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <Save size={14} /> Hold Draft Payload
                  </button>
                  <button 
                    onClick={handleSendToPharmacy}
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={14}/> : <Send size={14}/>}
                    Transmit Order Package
                  </button>
                </div>
              )}

              <Activity size={200} className="absolute -right-16 -bottom-16 text-white/[0.01] pointer-events-none" />
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-200 rounded-[2.5rem] p-24 text-center shadow-sm">
          <Clock size={48} className="mx-auto text-slate-200 mb-4 animate-pulse" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">Awaiting recipient selection map. Please bind a patient profile stream using the selector hub to authorize drug scaling equations.</p>
        </div>
      )}
    </div>
  );
};

export default OncologyPrescription;