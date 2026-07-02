import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  Layers, 
  CheckCircle2, 
  Hash, 
  FileText,
  Search,
  RefreshCw
} from 'lucide-react';

const dosageUnits = ["mg/m²", "mg", "mcg", "g", "mg/kg"];
const administrationRoutes = ["IV Infusion", "Oral", "Subcutaneous", "Intrathecal", "IM Injection"];
const clinicalStages = ["Stage I", "Stage II", "Stage III", "Stage IV", "Recurrent", "Metastatic"];

const RegimenTab = () => {
  const [primarySite, setPrimarySite] = useState('');
  const [cancerType, setCancerType] = useState('');
  const [regimenName, setRegimenName] = useState('');
  const [cycles, setCycles] = useState(6);
  const [cycleDuration, setCycleDuration] = useState(21); 
  const [selectedStages, setSelectedStages] = useState([]);
  
  const [allSites, setAllSites] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  const [protocolsList, setProtocolsList] = useState([]);
  
  const [medications, setMedications] = useState([
    { medicationName: '', dosageValue: '', unit: 'mg/m²', route: 'IV Infusion' }
  ]);
  
  const [drugSearchTerm, setDrugSearchTerm] = useState('');
  const [formStatus, setFormStatus] = useState({ type: '', message: '' });

  const getAuthHeaders = (contentType = 'application/json') => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    
    const headers = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const getPrimarySiteName = (item) => {
    if (item.primary_site_name) return item.primary_site_name;
    const targetId = parseInt(item.primary_site_id || item.primary_site);
    const site = allSites.find(s => s.id === targetId);
    return site ? site.name : (targetId ? `Site ID: ${targetId}` : '—');
  };

  const getCancerTypeName = (item) => {
    if (item.cancer_type_name) return item.cancer_type_name;
    const targetId = parseInt(item.cancer_type_id || item.cancer_type);
    const variant = availableVariants.find(v => v.id === targetId);
    return variant ? variant.name : (targetId ? `Type ID: ${targetId}` : '—');
  };

  useEffect(() => {
    fetch('/api/cancer-sites/', {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve primary sites');
        return res.json();
      })
      .then(data => setAllSites(data))
      .catch(err => setFormStatus({ type: 'error', message: err.message }));

    fetch('/api/protocols/', {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data)) {
          setProtocolsList(data);
        }
      })
      .catch(err => console.error("Error fetching protocols initialization:", err));
  }, []);

  const handleSiteChange = (siteId) => {
    setPrimarySite(siteId);
    setCancerType('');
    setRegimenName('');
    setAvailableVariants([]);
    setAvailableTemplates([]);
    setSelectedTemplateId('');
    setMedications([{ medicationName: '', dosageValue: '', unit: 'mg/m²', route: 'IV Infusion' }]);

    if (!siteId) return;

    fetch(`/api/cancer-sites/${siteId}/types/`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve variant types');
        return res.json();
      })
      .then(data => setAvailableVariants(data))
      .catch(err => setFormStatus({ type: 'error', message: err.message }));
  };

  const handleVariantChange = (typeId) => {
    setCancerType(typeId);
    setRegimenName('');
    setAvailableTemplates([]);
    setSelectedTemplateId('');
    setMedications([{ medicationName: '', dosageValue: '', unit: 'mg/m²', route: 'IV Infusion' }]);

    if (!typeId) return;

    fetch(`/api/cancer-types/${typeId}/regimens/`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve protocol definitions');
        return res.json();
      })
      .then(data => setAvailableTemplates(data))
      .catch(err => setFormStatus({ type: 'error', message: err.message }));
  };

  const handleTemplateSelectionChange = (regimenId) => {
    setSelectedTemplateId(regimenId);
    if (!regimenId) {
      setRegimenName('');
      return;
    }

    const contextTemplate = availableTemplates.find(t => t.id === parseInt(regimenId));
    if (contextTemplate) {
      setRegimenName(contextTemplate.name);
    }

    fetch(`/api/regimens/${regimenId}/drugs/`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve medication details');
        return res.json();
      })
      .then(data => {
        if (data.default_cycles) {
          setCycles(data.default_cycles);
        }
        if (data.default_cycle_duration) {
          setCycleDuration(data.default_cycle_duration);
        }
        
        if (data.drugs && data.drugs.length > 0) {
          const compiledMeds = data.drugs.map(drug => ({
            medicationName: drug.name || '',
            dosageValue: drug.base_value || '',
            unit: drug.metric_unit || 'mg/m²',
            route: drug.route_pathway || 'IV Infusion'
          }));
          setMedications(compiledMeds);
        } else {
          setMedications([{ medicationName: '', dosageValue: '', unit: 'mg/m²', route: 'IV Infusion' }]);
        }
      })
      .catch(err => setFormStatus({ type: 'error', message: err.message }));
  };

  const handleStageToggle = (stage) => {
    if (selectedStages.includes(stage)) {
      setSelectedStages(selectedStages.filter(s => s !== stage));
    } else {
      setSelectedStages([...selectedStages, stage]);
    }
  };

  const handleAddMedicationRow = () => {
    setMedications([
      ...medications, 
      { medicationName: '', dosageValue: '', unit: 'mg/m²', route: 'IV Infusion' }
    ]);
  };

  const handleRemoveMedicationRow = (index) => {
    if (medications.length === 1) return;
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index, field, value) => {
    const updatedMedications = [...medications];
    updatedMedications[index][field] = value;
    setMedications(updatedMedications);
  };

  const clearFormState = () => {
    setPrimarySite('');
    setCancerType('');
    setRegimenName('');
    setCycles(6);
    setCycleDuration(21); 
    setSelectedStages([]);
    setAvailableVariants([]);
    setAvailableTemplates([]);
    setSelectedTemplateId('');
    setMedications([{ medicationName: '', dosageValue: '', unit: 'mg/m²', route: 'IV Infusion' }]);
    setDrugSearchTerm('');
    setFormStatus({ type: '', message: '' });
  };

  const handleSubmitRegimenBlueprint = (e) => {
    if (e) e.preventDefault();
    
    if (!primarySite || !cancerType || !regimenName || selectedStages.length === 0) {
      setFormStatus({ type: 'error', message: 'Please select a Site, Cancer Type, Regimen Name, and at least one Stage.' });
      return;
    }

    const invalidMeds = medications.some(m => !m.medicationName || !m.dosageValue);
    if (invalidMeds) {
      setFormStatus({ type: 'error', message: 'Please complete all rows with valid medication names and dosages.' });
      return;
    }

    const targetSiteObj = allSites.find(s => s.id === parseInt(primarySite));
    const explicitSiteName = targetSiteObj ? targetSiteObj.name : `Site ID: ${primarySite}`;

    const targetVariantObj = availableVariants.find(v => v.id === parseInt(cancerType));
    const explicitTypeName = targetVariantObj ? targetVariantObj.name : `Type ID: ${cancerType}`;

    const protocolPayload = {
      name: regimenName.toUpperCase().trim(),
      description: "", // Fallback empty description
      total_cycles: Number(cycles),
      cycle_duration_days: Number(cycleDuration),
      
      primary_site_id: parseInt(primarySite),
      cancer_type_id: parseInt(cancerType),
      regimen_template_id: selectedTemplateId ? parseInt(selectedTemplateId) : null,
      
      applicable_stages: selectedStages,
      total_cost_per_cycle: 0.00, 

      components: medications.map(m => ({
        medication_name: m.medicationName.trim(),
        base_dosage: parseFloat(m.dosageValue),
        dosage_unit: m.unit,
        route_of_administration: m.route,
        cost_per_cycle: null
      }))
    };

    fetch('/api/protocols/', {
      method: 'POST',
      headers: getAuthHeaders(), 
      body: JSON.stringify(protocolPayload)
    })
      .then(async (res) => {
  
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const systemMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
          throw new Error(systemMessage || 'Failed to save the treatment regimen configuration.');
        }
        return res.json();
      })
      .then((savedData) => {
        setFormStatus({ 
          type: 'success', 
          message: `Regimen [${protocolPayload.name}] saved successfully.` 
        });
        
        const UIReadyRecord = {
          ...savedData,
          primary_site_name: explicitSiteName,
          cancer_type_name: explicitTypeName
        };

        setProtocolsList(prev => [UIReadyRecord, ...prev]);
        clearFormState();
      })
      .catch(err => setFormStatus({ type: 'error', message: `API Error: ${err.message}` }));
  };

  const filteredMedications = medications.filter(med => 
    med.medicationName.toLowerCase().includes(drugSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left w-full max-w-none px-2 pb-12 font-sans">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Treatment Regimen Setup</h2>
          <p className="text-sm text-slate-500 mt-0.5">Create, edit, and map standard cancer treatment protocols and drug cycles.</p>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={clearFormState}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
          >
            <RefreshCw size={15} />
            Clear Form
          </button>
          <button 
            type="button"
            onClick={handleSubmitRegimenBlueprint}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
          >
            <Save size={16} />
            Save Regimen
          </button>
        </div>
      </div>

      {formStatus.message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border text-sm ${
          formStatus.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
        }`}>
          {formStatus.type === 'error' ? <AlertCircle className="shrink-0 mt-0.5" size={18} /> : <CheckCircle2 className="shrink-0 mt-0.5" size={18} />}
          <span className="font-medium">{formStatus.message}</span>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: REGIMEN SELECTION DETAILS */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Layers size={16} className="text-blue-600" />
              Regimen Classification
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">1. Primary Body Site</label>
              <select 
                value={primarySite}
                onChange={(e) => handleSiteChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">-- Select Body Site --</option>
                {allSites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">2. Cancer Type</label>
              <select 
                value={cancerType}
                onChange={(e) => handleVariantChange(e.target.value)}
                disabled={!primarySite}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Select Cancer Type --</option>
                {availableVariants.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">
                3. Regimen
              </label>
              <select 
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelectionChange(e.target.value)}
                disabled={!cancerType || availableTemplates.length === 0}
                className="w-full bg-blue-50/50 border border-blue-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!cancerType ? "-- Select Cancer Type First --" : availableTemplates.length === 0 ? "-- No matching templates --" : "-- Select Template --"}
                </option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Protocol</label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="e.g., AC-T, FOLFOX-6"
                  value={regimenName}
                  onChange={(e) => setRegimenName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Default Number of Cycles</label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input 
                  type="number"
                  min="1"
                  max="24"
                  value={cycles}
                  onChange={(e) => setCycles(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Duration of Cycle (Days)</label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input 
                  type="number"
                  min="1"
                  max="90"
                  placeholder="e.g., 14, 21, 28"
                  value={cycleDuration}
                  onChange={(e) => setCycleDuration(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>


            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Applicable Cancer Stages</label>
              <div className="flex flex-wrap gap-2">
                {clinicalStages.map((stage, i) => {
                  const isSelected = selectedStages.includes(stage);
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => handleStageToggle(stage)}
                      className={`text-xs px-3 py-2 font-medium rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-600/10' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

   
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Plus size={16} className="text-blue-600" />
                  Medications & Drugs
                </h3>
                <button
                  type="button"
                  onClick={handleAddMedicationRow}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Add New Medication Row
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                
                {medications.length > 3 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Filter medications below..."
                      value={drugSearchTerm}
                      onChange={(e) => setDrugSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                )}

                {(drugSearchTerm ? filteredMedications : medications).map((med, idx) => {
                  return (
                    <div key={idx} className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl relative space-y-3">
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md uppercase">Drug #{idx + 1}</span>
                        {medications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicationRow(idx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
                        
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase block">Drug Name</label>
                          <input 
                            type="text"
                            placeholder="Enter medication name"
                            value={med.medicationName}
                            onChange={(e) => handleMedicationChange(idx, 'medicationName', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase block">Dosage Value</label>
                          <input 
                            type="number"
                            placeholder="e.g. 75"
                            value={med.dosageValue}
                            onChange={(e) => handleMedicationChange(idx, 'dosageValue', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase block">Unit</label>
                          <select 
                            value={med.unit}
                            onChange={(e) => handleMedicationChange(idx, 'unit', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            {dosageUnits.map((unit, i) => (
                              <option key={i} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase block">Route</label>
                          <select 
                            value={med.route}
                            onChange={(e) => handleMedicationChange(idx, 'route', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            {administrationRoutes.map((route, i) => (
                              <option key={i} value={route}>{route}</option>
                            ))}
                          </select>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
            

          </div>
        </div>

      </form>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-1200 uppercase tracking-wider">
            Active Protocols
          </h2>
         
        </div>

        <div className="overflow-x-auto">
          {protocolsList.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400 font-medium">
              No clinical protocols configured yet. Fill out the master setup above to populate this matrix view.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-6">Protocol Name</th>
                  <th className="py-3 px-6">Primary Site</th>
                  <th className="py-3 px-6">Cancer Type</th>
                  <th className="py-3 px-6 text-center">Cycles</th>
                  <th className="py-3 px-6 text-center">Duration</th>
                  <th className="py-3 px-6">Applicable Cancer Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {protocolsList.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-blue-600 tracking-wide">
                      {item.name || item.regimen_name}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600">
                      {getPrimarySiteName(item)}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600">
                      {getCancerTypeName(item)}
                    </td>
                    <td className="py-3.5 px-6 text-center font-semibold text-slate-900">
                      {item.total_cycles || item.cycles || 0}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] px-2 py-0.5 rounded-md font-bold border border-amber-100/70 tracking-wide">
                        {item.cycle_duration_days || item.cycle_duration || 21} Days
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(item.applicable_stages) ? (
                          item.applicable_stages.map((stage, sIdx) => (
                            <span key={sIdx} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded">
                              {stage}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">None Selected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};

export default RegimenTab;