import React, { useState, useEffect } from 'react';

const ProtocolMaster = () => {
  // --- BASE API URL CONFIGURATION ---
  const API_BASE_URL = 'http://localhost:8000/api/protocols/';

  // --- 1. STATE MANAGEMENT ---
  const [currentStep, setCurrentStep] = useState(1);
  const [biomarkerInput, setBiomarkerInput] = useState('');
  const [savedProtocols, setSavedProtocols] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track if we are editing an existing record or saving a new one
  const [editingProtocolId, setEditingProtocolId] = useState(null);

  // Entire protocol schema configuration state
  const [formData, setFormData] = useState({
    cancerType: '',
    stages: [],
    biomarkers: [], 
    clinicalSigns: '',
    protocolName: '',
    totalCycles: 6,
    daysPerCycle: 14,
    drugs: [], 
  });

  // Temporarily holds a single drug input before adding to the protocol array
  const [tempDrug, setTempDrug] = useState({
    drugName: '',
    baseDose: '',
    unit: 'mg/m²',
    route: 'IV Infusion',
    administrationDay: 'Day 1',
    rules: [] 
  });

  // Local UI state to build a brand new custom guardrail inside Step 3
  const [activeRuleTargetDrugId, setActiveRuleTargetDrugId] = useState(null);
  const [tempRule, setTempRule] = useState({
    parameter: 'CrCl (Renal)',
    operator: '<',
    value: '',
    action: 'REDUCE_PCT',
    actionValue: ''
  });

  // --- 2. BACKEND API INTEGRATION LIFECYCLES ---
  
  // Fetch all saved protocols from database when component loads
  const fetchProtocols = async () => {
    setIsLoading(true);
    
    // 🌟 1. Grab the correct token from localStorage
    const token = localStorage.getItem('access_token'); 
    
    try {
      // 🌟 2. Add the headers block with your Bearer token
      const response = await fetch(API_BASE_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });

      if (!response.ok) {
        throw new Error('Network error loading database indices');
      }

      const data = await response.json();
      setSavedProtocols(data);
    } catch (error) {
      console.error("Fetch Error:", error);
    
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocols();
  }, []);

  // Hydrate form inputs with chosen saved blueprint record for full updates
  const handleLoadEditMode = (protocol) => {
  setEditingProtocolId(protocol.id);
  
  setFormData({
    protocolName: protocol.name || protocol.protocol_name || "",
    cancerType: protocol.cancer_type || "",
    stages: protocol.stages || [],
    biomarkers: protocol.biomarkers || [],
    clinicalSigns: protocol.clinical_signs || "",
    totalCycles: protocol.total_cycles || "",
    daysPerCycle: protocol.days_per_cycle || "",
    
    // 🌟 Add defensive fallback checks here:
    drugs: (protocol.drugs || []).map(drug => ({
      id: drug.id,
      drugName: drug.drug_name || "",
      baseDose: drug.base_dose || "",
      unit: drug.unit || "",
      route: drug.route || "",
      administrationDay: drug.administration_day || "",
      rules: (drug.rules || []).map(rule => ({
        id: rule.id,
        parameter: rule.parameter || "",
        operator: rule.operator || "",
        value: rule.value || "",
        action: rule.action || "",
        actionValue: rule.action_value || ""
      }))
    }))
  });
    setCurrentStep(1); // Reset workflow step back to start for validation editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dispatch full relational configuration data package to Django engine
  const handleSubmitAll = async () => {
    if (!formData.protocolName || !formData.cancerType) {
      return alert("Protocol Identity and Malignancy Type must be populated to save.");
    }

    setIsLoading(true);
    const targetUrl = editingProtocolId ? `${API_BASE_URL}${editingProtocolId}/` : API_BASE_URL;
    const httpMethod = editingProtocolId ? 'PUT' : 'POST';

    // 🔄 Clean payload translation layer
    const backendPayload = {
      name: formData.protocolName,
      protocol_name: formData.protocolName,
      cancer_type: formData.cancerType,
      description: `Regimen profile for ${formData.cancerType}`,
      stages: formData.stages,
      biomarkers: formData.biomarkers,
      clinical_signs: formData.clinicalSigns,
      total_cycles: parseInt(formData.totalCycles) || 0,
      days_per_cycle: parseInt(formData.daysPerCycle) || 0,
      
      // Map drugs safely
      drugs: formData.drugs.map(drug => {
        const drugData = {
          drug_name: drug.drugName,
          base_dose: parseFloat(drug.baseDose) || 0,
          unit: drug.unit,
          route: drug.route,
          administration_day: drug.administrationDay,
          rules: drug.rules.map(rule => {
            const ruleData = {
              parameter: rule.parameter,
              operator: rule.operator,
              value: rule.value,
              action: rule.action,
              action_value: rule.actionValue ? parseInt(rule.actionValue) : null
            };
            // Only include integer primary keys if editing an existing entry
            if (editingProtocolId && rule.id && String(rule.id).length <= 10) {
              ruleData.id = parseInt(rule.id);
            }
            return ruleData;
          })
        };
        // Only include integer primary keys if editing an existing entry
        if (editingProtocolId && drug.id && String(drug.id).length <= 10) {
          drugData.id = parseInt(drug.id);
        }
        return drugData;
      })
    };

    const token = localStorage.getItem('access_token'); 

    try {
      const response = await fetch(targetUrl, {
        method: httpMethod,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(backendPayload) 
      });

      const responseData = await response.json();

      // 🚨 CRITICAL STAGE GUARD: If it's not a 200 or 201, do NOT proceed!
      if (!response.ok) {
        console.error("❌ BACKEND VALIDATION FAILED:", responseData);
        alert(`Database rejected save: ${JSON.stringify(responseData)}`);
        return; // Break execution immediately
      }
      
      // ✅ If we get here, it actually saved!
      alert(editingProtocolId ? "Protocol Architecture modified successfully!" : "New Protocol Blueprint successfully written to Database!");
      handleClearForm();
      fetchProtocols();
    } catch (error) {
      console.error("Submission Error:", error);
      alert(`Network Pipeline Failure: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearForm = () => {
    setEditingProtocolId(null);
    setFormData({
      cancerType: '',
      stages: [],
      biomarkers: [],
      clinicalSigns: '',
      protocolName: '',
      totalCycles: 6,
      daysPerCycle: 14,
      drugs: []
    });
    setCurrentStep(1);
  };

  // --- 3. FRONTEND DATA HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStageToggle = (stage) => {
    setFormData(prev => {
      const stages = prev.stages.includes(stage)
        ? prev.stages.filter(s => s !== stage)
        : [...prev.stages, stage];
      return { ...prev, stages };
    });
  };

  const handleAddBiomarker = (e) => {
    if (e) e.preventDefault();
    const cleanValue = biomarkerInput.trim();
    if (!cleanValue) return;
    if (formData.biomarkers.includes(cleanValue)) return alert("Biomarker already assigned.");

    setFormData(prev => ({ ...prev, biomarkers: [...prev.biomarkers, cleanValue] }));
    setBiomarkerInput('');
  };

  const handleRemoveBiomarker = (targetMarker) => {
    setFormData(prev => ({ ...prev, biomarkers: prev.biomarkers.filter(m => m !== targetMarker) }));
  };

  const handleAddDrug = () => {
    if (!tempDrug.drugName || !tempDrug.baseDose) return alert('Enter Drug Name and Base Dose');
    setFormData(prev => ({
      ...prev,
      drugs: [...prev.drugs, { ...tempDrug, id: Date.now() }] // Fresh items receive temp numeric IDs
    }));
    setTempDrug({ drugName: '', baseDose: '', unit: 'mg/m²', route: 'IV Infusion', administrationDay: 'Day 1', rules: [] });
  };

  const handleRemoveDrug = (id) => {
    setFormData(prev => ({ ...prev, drugs: prev.drugs.filter(d => d.id !== id) }));
  };

  const handleAddGuardrail = (drugId) => {
    if (!tempRule.value) return alert('Specify threshold value limit');
    setFormData(prev => ({
      ...prev,
      drugs: prev.drugs.map(drug => {
        if (drug.id === drugId) {
          return { ...drug, rules: [...drug.rules, { ...tempRule, id: Date.now() }] };
        }
        return drug;
      })
    }));
    setTempRule({ parameter: 'CrCl (Renal)', operator: '<', value: '', action: 'REDUCE_PCT', actionValue: '' });
    setActiveRuleTargetDrugId(null);
  };

  const handleRemoveGuardrail = (drugId, ruleId) => {
    setFormData(prev => ({
      ...prev,
      drugs: prev.drugs.map(drug => {
        if (drug.id === drugId) {
          return { ...drug, rules: drug.rules.filter(r => r.id !== ruleId) };
        }
        return drug;
      })
    }));
  };

  return (
    <div className="space-y-6 p-4 bg-slate-50 min-h-screen font-['Inter']">
      
      {/* ========================================================
          TOP UTILITY: DIRECTORY OVERVIEW DRAWER PANEL
         ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Saved Protocol Libraries</h3>
            <p className="text-xs text-slate-400 font-medium">Select an existing configuration package profile below to modify or audit properties live.</p>
          </div>
          {editingProtocolId && (
            <button type="button" onClick={handleClearForm} className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all">
              Cancel Edit Mode ✕
            </button>
          )}
        </div>

        {isLoading && savedProtocols.length === 0 ? (
          <div className="text-xs text-slate-400 italic py-2">Polling system database channels...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {savedProtocols.map(proto => (
              <div key={proto.id} className={`border p-4 rounded-2xl flex justify-between items-start transition-all ${editingProtocolId === proto.id ? 'border-blue-500 bg-blue-50/20' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'}`}>
                <div>
                  <span className="text-[10px] bg-slate-900 text-amber-400 font-mono font-bold px-2 py-0.5 rounded-md uppercase">{proto.protocolName}</span>
                  <h4 className="text-xs font-black text-slate-800 mt-2">{proto.cancerType}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{proto.drugs?.length || 0} Compounds Layered</p>
                </div>
                <button type="button" onClick={() => handleLoadEditMode(proto)} className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 rounded-xl text-[10px] font-black uppercase shadow-sm transition-all">
                  ✍️ Load / Edit
                </button>
              </div>
            ))}
            {savedProtocols.length === 0 && (
              <div className="text-xs text-slate-400 italic py-4 col-span-3 text-center border border-dashed border-slate-200 rounded-2xl">No configurations saved in cloud database yet. Complete form wizard to establish first protocol.</div>
            )}
          </div>
        )}
      </div>

      {/* MAIN CONTAINER CONFIGURATOR WORKSPACE */}
      <div className="flex flex-col lg:flex-row gap-6 bg-white p-2 rounded-3xl">
        
        {/* LEFT PANEL: WORKFLOW FORM WIZARD */}
        <div className="flex-1 border border-slate-100 rounded-3xl p-6 flex flex-col justify-between bg-white">
          <div>
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-blue-600 tracking-[0.2em] uppercase">
                  {editingProtocolId ? `Modifying Sequence Asset ID: #${editingProtocolId}` : 'System Engine Training'}
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Protocol Master Configuration</h2>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map(step => (
                  <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${currentStep === step ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-400'}`}>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 1: BASE DIAGNOSTICS MAPPING */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">1. Disease & Staging Filters</h3>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Cancer Type</label>
                  <select name="cancerType" value={formData.cancerType} onChange={handleInputChange} className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 font-medium text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all">
                    <option value="">-- Select Malignancy Type --</option>
                    <option value="Breast Cancer">Breast Cancer</option>
                    <option value="Colorectal Cancer">Colorectal Cancer</option>
                    <option value="Prostate Cancer">Prostate Cancer</option>
                    <option value="Lung Cancer">Lung Cancer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Clinical Stages</label>
                  <div className="flex flex-wrap gap-2">
                    {['Stage I', 'Stage II', 'Stage III', 'Stage IV'].map(stage => (
                      <button key={stage} type="button" onClick={() => handleStageToggle(stage)} className={`px-5 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${formData.stages.includes(stage) ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10' : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'}`}>
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Required Molecular Biomarkers</label>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={biomarkerInput} onChange={(e) => setBiomarkerInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddBiomarker(e)} placeholder="e.g., KRAS Wild-Type" className="flex-1 border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all" />
                    <button type="button" onClick={handleAddBiomarker} className="bg-slate-900 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest px-6 rounded-2xl shadow-md transition-all flex items-center">+ Add</button>
                  </div>
                  {formData.biomarkers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      {formData.biomarkers.map((marker, index) => (
                        <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl shadow-sm">
                          {marker}
                          <button type="button" onClick={() => handleRemoveBiomarker(marker)} className="w-4 h-4 rounded-full bg-slate-100 hover:bg-rose-100 flex items-center justify-center text-[10px] font-black">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Clinical Presentation Notes & Signs</label>
                  <textarea name="clinicalSigns" value={formData.clinicalSigns} onChange={handleInputChange} rows="4" placeholder="Describe symptoms or warnings..." className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500 transition-all resize-none"></textarea>
                </div>
              </div>
            )}

            {/* STEP 2: REGIMEN & MEDICATION ARCHITECTURE */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">2. Protocol Regimen Setup</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Protocol Code</label>
                    <input type="text" name="protocolName" value={formData.protocolName} onChange={handleInputChange} placeholder="e.g., FOLFOX6" className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-sm font-medium outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Cycles</label>
                    <input type="number" name="totalCycles" value={formData.totalCycles} onChange={handleInputChange} className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-sm font-medium outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (Days)</label>
                    <input type="number" name="daysPerCycle" value={formData.daysPerCycle} onChange={handleInputChange} className="w-full border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-sm font-medium outline-none" />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 space-y-4">
                  <span className="text-xs font-black text-slate-500 block uppercase tracking-wider">Add Medication Array</span>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Drug Name</label>
                      <input type="text" placeholder="Oxaliplatin" value={tempDrug.drugName} onChange={(e) => setTempDrug({...tempDrug, drugName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-sm font-medium outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Base Dose</label>
                      <input type="number" placeholder="85" value={tempDrug.baseDose} onChange={(e) => setTempDrug({...tempDrug, baseDose: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-sm font-medium outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Unit</label>
                      <select value={tempDrug.unit} onChange={(e) => setTempDrug({...tempDrug, unit: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-sm font-bold text-slate-700 outline-none">
                        <option value="mg/m²">mg/m²</option>
                        <option value="mg/kg">mg/kg</option>
                        <option value="AUC">Target AUC</option>
                        <option value="mg (Fixed)">mg (Fixed)</option>
                      </select>
                    </div>
                    <div>
                      <button type="button" onClick={handleAddDrug} className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest py-3.5 px-4 rounded-xl shadow-md transition-all">+ Push Drug</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-slate-200">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Route</label>
                      <select value={tempDrug.route} onChange={(e) => setTempDrug({...tempDrug, route: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-xs font-bold text-slate-700 outline-none">
                        <option value="IV Infusion">Intravenous Infusion</option>
                        <option value="IV Push">IV Push</option>
                        <option value="PO (Oral)">PO (Oral Pill)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Target Day</label>
                      <input type="text" value={tempDrug.administrationDay} onChange={(e) => setTempDrug({...tempDrug, administrationDay: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-xs font-medium outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SAFETY GUARDRAILS */}
            {currentStep === 3 && (
              <div className="space-y-6 max-h-[520px] overflow-y-auto pr-2">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">3. Dynamic Guardrail Constructor</h3>
                {formData.drugs.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm italic">No medications staged yet.</div>
                ) : (
                  formData.drugs.map((drug) => (
                    <div key={drug.id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200/80 pb-3">
                        <span className="font-black text-xs text-slate-700 uppercase tracking-wider">{drug.drugName} Logic Matrix</span>
                        <button type="button" onClick={() => handleRemoveDrug(drug.id)} className="text-[10px] font-black text-rose-500 uppercase px-2 py-1 rounded-md">Remove Molecule</button>
                      </div>

                      {drug.rules.length > 0 && (
                        <div className="space-y-2">
                          {drug.rules.map((rule, idx) => (
                            <div key={rule.id || idx} className="flex justify-between items-center bg-white border border-slate-100 rounded-xl p-3 shadow-sm text-xs text-slate-700">
                              <div>IF <span className="font-bold text-blue-600">{rule.parameter}</span> {rule.operator} <span className="font-bold">{rule.value}</span>, THEN <span className="font-bold text-slate-900">{rule.action === 'BLOCK' ? 'HALT' : `REDUCE ${rule.actionValue}%`}</span></div>
                              <button type="button" onClick={() => handleRemoveGuardrail(drug.id, rule.id)} className="text-slate-400 hover:text-rose-500 font-bold px-2 text-xs">✕ Remove</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeRuleTargetDrugId === drug.id ? (
                        <div className="bg-white border border-blue-100 p-4 rounded-xl space-y-3 shadow-sm border-l-4 border-l-blue-500">
                          <div className="flex flex-wrap gap-2 items-center text-xs text-slate-600">
                            <span>If metrics for</span>
                            <select value={tempRule.parameter} onChange={(e) => setTempRule({...tempRule, parameter: e.target.value})} className="border border-slate-200 rounded-lg p-1.5 font-bold outline-none">
                              <option value="CrCl (Renal)">CrCl (Renal Function)</option>
                              <option value="Total Bilirubin">Total Bilirubin (Hepatic)</option>
                              <option value="ANC (Neutrophils)">ANC (Absolute Neutrophils)</option>
                              <option value="Platelets">Platelets (Hematological)</option>
                            </select>
                            <span>is</span>
                            <select value={tempRule.operator} onChange={(e) => setTempRule({...tempRule, operator: e.target.value})} className="border border-slate-200 rounded-lg p-1.5 font-bold">
                              <option value="<">&lt;</option>
                              <option value="<=">&le;</option>
                              <option value=">">&gt;</option>
                              <option value=">=">&ge;</option>
                            </select>
                            <input type="text" placeholder="30" value={tempRule.value} onChange={(e) => setTempRule({...tempRule, value: e.target.value})} className="border border-slate-200 rounded-lg p-1.5 w-20 text-center font-bold" />
                            <span>execute</span>
                            <select value={tempRule.action} onChange={(e) => setTempRule({...tempRule, action: e.target.value})} className="border border-slate-200 rounded-lg p-1.5 font-bold">
                              <option value="REDUCE_PCT">Reduce Dose By</option>
                              <option value="BLOCK">BLOCK PRESCRIPTION</option>
                            </select>
                            {tempRule.action === 'REDUCE_PCT' && (
                              <div className="flex items-center gap-1">
                                <input type="number" placeholder="25" value={tempRule.actionValue} onChange={(e) => setTempRule({...tempRule, actionValue: e.target.value})} className="border border-slate-200 rounded-lg p-1.5 w-14 text-center font-bold" />
                                <span className="font-bold text-slate-400">%</span>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button type="button" onClick={() => setActiveRuleTargetDrugId(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold uppercase">Cancel</button>
                            <button type="button" onClick={() => handleAddGuardrail(drug.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold uppercase">Save Vector</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setActiveRuleTargetDrugId(drug.id)} className="w-full py-3 border border-dashed border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all">➕ Add Dynamic Safety Guardrail Rule</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer Navigation Buttons */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-8">
            <button type="button" disabled={currentStep === 1} onClick={() => setCurrentStep(prev => prev - 1)} className="px-5 py-3 border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-30">Back</button>
            {currentStep < 3 ? (
              <button type="button" onClick={() => setCurrentStep(prev => prev + 1)} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase">Continue Step</button>
            ) : (
              <button type="button" disabled={isLoading} onClick={handleSubmitAll} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg disabled:opacity-50">
                {isLoading ? 'Processing Pipeline...' : editingProtocolId ? 'Commit Modifications' : 'Deploy & Train System'}
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT PANEL: LIVE BLUEPRINT PREVIEW
           ======================================================== */}
        <div className="w-full lg:w-[360px] bg-[#020617] text-slate-200 border border-white/5 rounded-3xl shadow-xl p-5 sticky top-6 h-fit flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Live Blueprint Compiler</span>
            </div>

            <div className="space-y-5 text-xs">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Diagnostic Mapping Criteria</span>
                <p className="font-bold text-white tracking-tight mt-1 text-sm">{formData.cancerType || 'Unassigned Malignancy'}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.stages.map(stg => <span key={stg} className="text-[10px] bg-slate-900 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded-md font-bold uppercase">{stg}</span>)}
                  {formData.biomarkers.map((m, i) => <span key={i} className="text-[10px] bg-slate-900/60 text-cyan-400 border border-cyan-950 px-2 py-0.5 rounded-md font-bold uppercase">{m}</span>)}
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Protocol Identity & Schedule</span>
                <p className="font-mono font-black text-base text-amber-400 tracking-tight mt-1 uppercase">{formData.protocolName || 'REGIMEN_CODE'}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-1">Scope: {formData.totalCycles} Cycles | Every {formData.daysPerCycle} Days</p>
              </div>

              <div className="border-t border-white/5 pt-4">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block mb-2">Calculated Medication Payload</span>
                {formData.drugs.length === 0 ? (
                  <p className="text-[11px] text-slate-600 italic">No molecules pushed into stream...</p>
                ) : (
                  <ul className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {formData.drugs.map((drug, i) => (
                      <li key={drug.id || i} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-[11px]">
                        <div className="flex justify-between font-bold text-slate-200">
                          <span>• {drug.drugName}</span>
                          <span className="text-amber-400 font-mono">{drug.baseDose} {drug.unit}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                          <span>{drug.route}</span>
                          <span>{drug.administrationDay}</span>
                        </div>
                        {drug.rules?.map((rule, rIdx) => (
                          <div key={rule.id || rIdx} className="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-2 py-0.5 rounded font-mono mt-1">
                            ⚠️ Limit: {rule.parameter.split(' ')[0]} {rule.operator} {rule.value} ➔ {rule.action === 'BLOCK' ? 'HALT' : `-${rule.actionValue}%`}
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/5 text-[10px] text-slate-600 font-mono flex justify-between">
            <span>Salama Medical Engine v2.1</span>
            <span>Status: Connected</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProtocolMaster;