import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, CheckCircle2, Layers, X, Activity, Microscope, Archive, Syringe, BrainCircuit, Pill, AlertCircle, Loader2, Clock } from 'lucide-react';

const ServiceCatalogue = () => {
  const [activeDepartment, setActiveDepartment] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [catalogue, setCatalogue] = useState([]);
  const [originalCatalogue, setOriginalCatalogue] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clinical Patient Care Revenue Centers
  const departments = [
    { id: 'ONC', name: 'Oncology Department', icon: <Activity size={16} /> },
    { id: 'LAB', name: 'Laboratory', icon: <Microscope size={16} /> },
    { id: 'RAD', name: 'Radiology & Imaging', icon: <Archive size={16} /> },
    { id: 'NUR', name: 'Nursing & Procedures', icon: <Syringe size={16} /> },
    { id: 'PHA', name: 'Pharmacy', icon: <Pill size={16} /> },
    { id: 'PSY', name: 'Counselling Psychology', icon: <BrainCircuit size={16} /> },
  ];

  // Standardized Lab Profile Configurations
  const TEST_CHOICES = [
    { code: 'CBC', name: 'Full Blood Count (CBC)' },
    { code: 'UE', name: 'Urea, Electrolytes & Creatinine (U&E)' },
    { code: 'LFT', name: 'Liver Function Test (LFT)' },
    { code: 'PSA', name: 'Prostate Specific Antigen (PSA)' },
    { code: 'URINE', name: 'Urinalysis (Routine)' },
    { code: 'BG_CROSS', name: 'Blood Group & Cross Match' },
    { code: 'BS_MP', name: 'Blood Slide (Malaria Parasite)' },
  ];

  // System Presets Configuration Matrix for structural consistency
  const DEPARTMENT_PRESETS = {
    ONC: [
      { code: 'CONS_ONCO', name: 'Oncologist Consultation Fee' }
    ],
    RAD: [
      { code: 'CT_SCAN', name: 'CT Scan' },
      { code: 'CT_ANGIO', name: 'CT Angiography' },
      { code: 'MRI', name: 'Magnetic Resonance Imaging (MRI)' },
      { code: 'ULTRASOUND', name: 'Ultrasound Scan' },
      { code: 'ECG', name: 'Electrocardiogram (ECG)' },
      { code: 'ECHO', name: 'Echocardiogram (ECHO)' }
    ],
    NUR: [
      { code: 'WOUND_DRESS', name: 'Wound Dressing' }
    ],
    PHA: [
      { code: 'INV_DISPENSE', name: 'Pharmaceutical Dispensation (Dynamic Inventory Cost)' }
    ],
    PSY: [
      { code: 'CONS_COUNS', name: 'Counseling Psychotherapy Consultation' }
    ]
  };

  const [formData, setFormData] = useState({
    dept: 'ONC',
    sku: 'ONC-CONS_ONCO',
    name: 'Oncologist Consultation Fee',
    price: '',
    charge_type: 'TRIGGERED'
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token'); 
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchCatalogue = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const response = await fetch('/api/services/', { headers: getAuthHeaders() });
      if (!response.ok) throw new Error(`Server status code: ${response.status}`);
      const data = await response.json();
      setCatalogue(data);
      setOriginalCatalogue(JSON.parse(JSON.stringify(data))); 
    } catch (err) {
      setApiError(err.message || 'Failed to pull master price records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogue();
  }, []);

  // Intercept Department adjustments to assign clean presets across all operational areas
  const handleFormDeptChange = (deptId) => {
    if (deptId === 'LAB') {
      const firstTest = TEST_CHOICES[0];
      setFormData(prev => ({
        ...prev,
        dept: deptId,
        sku: `LAB-${firstTest.code}`,
        name: firstTest.name,
        price: '',
        charge_type: 'TRIGGERED'
      }));
    } else {
      const presets = DEPARTMENT_PRESETS[deptId] || [];
      if (presets.length > 0) {
        const isPharmacy = deptId === 'PHA';
        setFormData(prev => ({
          ...prev,
          dept: deptId,
          sku: `${deptId}-${presets[0].code}`,
          name: presets[0].name,
          price: isPharmacy ? '0' : '',
          charge_type: isPharmacy ? 'VARIABLE' : 'TRIGGERED'
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          dept: deptId,
          sku: '',
          name: '',
          price: '',
          charge_type: 'TRIGGERED'
        }));
      }
    }
  };

  // Handles dropdown assignment choices for standard system presets
  const handlePresetChoiceChange = (deptId, itemCode) => {
    const presets = DEPARTMENT_PRESETS[deptId] || [];
    const selectedItem = presets.find(item => item.code === itemCode);
    if (selectedItem) {
      const isPharmacy = deptId === 'PHA';
      setFormData(prev => ({
        ...prev,
        sku: `${deptId}-${selectedItem.code}`,
        name: selectedItem.name,
        price: isPharmacy ? '0' : prev.price,
        charge_type: isPharmacy ? 'VARIABLE' : prev.charge_type
      }));
    }
  };

  // Intercept Lab Dropdown selections to update both matching SKU layouts and descriptors
  const handleLabTestChange = (testCode) => {
    const selectedTest = TEST_CHOICES.find(t => t.code === testCode);
    if (selectedTest) {
      setFormData(prev => ({
        ...prev,
        sku: `LAB-${selectedTest.code}`,
        name: selectedTest.name
      }));
    }
  };

  const handleFieldChange = (id, field, value) => {
    setCatalogue(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const commitPricingChanges = async () => {
    setSaveStatus('saving');
    setApiError(null);

    const payloadDeltas = catalogue.filter(item => {
      const original = originalCatalogue.find(o => o.id === item.id);
      if (!original) return false;
      return (
        original.price !== Number(item.price) ||
        original.active !== item.active ||
        original.charge_type !== item.charge_type
      );
    });

    if (payloadDeltas.length === 0) {
      setIsEditMode(false);
      setSaveStatus('idle');
      return;
    }

    try {
      const response = await fetch('/api/services/bulk_update/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ services: payloadDeltas })
      });

      if (!response.ok) throw new Error(`Server returned code: ${response.status}`);

      setSaveStatus('success');
      setIsEditMode(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
      fetchCatalogue(); 
    } catch (err) {
      setSaveStatus('idle');
      setApiError(err.message || 'Failed to sync modifications.');
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!formData.sku || !formData.name || (formData.dept !== 'PHA' && !formData.price)) return;

    setIsSubmitting(true);
    setApiError(null);

    const payload = {
      ...formData,
      sku: formData.sku.toUpperCase().trim(),
      price: formData.dept === 'PHA' ? 0 : (Number(formData.price) || 0),
      active: true
    };

    try {
      const response = await fetch('/api/services/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || JSON.stringify(errData) || 'Failed to register service.');
      }

      setFormData({
        dept: 'ONC',
        sku: 'ONC-CONS_ONCO',
        name: 'Oncologist Consultation Fee',
        price: '',
        charge_type: 'TRIGGERED'
      });
      setIsModalOpen(false);
      fetchCatalogue(); 
    } catch (err) {
      setApiError(err.message || 'Could not save catalogue item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCatalogue = catalogue.filter(item => {
    const matchesDept = activeDepartment === 'ALL' || item.dept === activeDepartment;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const getDeptLabel = (code) => {
    return departments.find(d => d.id === code)?.name || code;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-['Inter'] text-slate-700 pb-16">
      
      {/* Top Banner section */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Service Catalogue</h2>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          {isEditMode ? (
            <>
              <button 
                onClick={() => { setIsEditMode(false); fetchCatalogue(); }} 
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 text-slate-200 hover:bg-white/20 transition-all"
                disabled={saveStatus === 'saving'}
              >
                Cancel
              </button>
              <button 
                onClick={commitPricingChanges} 
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2 transition-all"
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving...</>
                ) : 'Save Updates'}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditMode(true)} 
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm transition-all"
              disabled={isLoading}
            >
              <Edit3 size={14} /> Edit Base Prices
            </button>
          )}
        </div>
      </div>

      {saveStatus === 'success' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-950 font-medium text-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          Catalogue updates successfully synchronized.
        </div>
      )}

      {apiError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-950 font-medium text-xs">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <div className="flex-1">
            <span className="block font-bold text-rose-900">System Request Failed</span>
            <span className="font-mono text-[11px] font-normal">{apiError}</span>
          </div>
          <button onClick={() => setApiError(null)} className="text-slate-400 hover:text-slate-600 text-xs">Dismiss</button>
        </div>
      )}

      {/* Main Structural Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Interactive Sidebar Filters */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">Clinical Units</span>
            <button
              onClick={() => setActiveDepartment('ALL')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeDepartment === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Layers size={14} className={activeDepartment === 'ALL' ? 'text-indigo-400' : 'text-slate-400'} />
              All Care Areas
            </button>
            {departments.map(dept => (
              <button
                key={dept.id}
                onClick={() => setActiveDepartment(dept.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeDepartment === dept.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className={activeDepartment === dept.id ? 'text-indigo-400' : 'text-slate-400'}>
                  {dept.icon}
                </span>
                {dept.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Pricing Catalog Matrix Grid View */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search SKU or procedure name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <button 
              onClick={() => {
                handleFormDeptChange('ONC');
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={14} className="text-indigo-400" /> Add New Service
            </button>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono">Loading core tariffs...</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-5">SKU Code</th>
                    <th className="py-3.5 px-5">Department</th>
                    <th className="py-3.5 px-5">Service</th>
                    <th className="py-3.5 px-5">Billing Rule</th>
                    <th className="py-3.5 px-5 text-right">Price (KES)</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredCatalogue.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center font-medium text-slate-400 bg-slate-50/20">
                        No active records match the selected clinical scope.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalogue.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-bold text-slate-500">{item.sku}</td>
                        <td className="py-3.5 px-5 font-semibold text-slate-600">{getDeptLabel(item.dept)}</td>
                        <td className="py-3.5 px-5 font-bold text-slate-900">{item.name}</td>
                        
                        {/* Dynamic Billing Logic Field Parameter configurations */}
                        <td className="py-3.5 px-5">
                          {isEditMode ? (
                            item.dept === 'PHA' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[11px] font-bold">
                                Inventory Linked
                              </span>
                            ) : (
                              <select
                                value={item.charge_type}
                                onChange={(e) => handleFieldChange(item.id, 'charge_type', e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg p-1 text-xs font-medium text-slate-700 outline-none"
                              >
                                <option value="TRIGGERED">Triggered Event</option>
                                <option value="DAILY_RECURRING">Daily Midnight</option>
                                <option value="VARIABLE">Variable Fee</option>
                              </select>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-slate-600 text-[11px] font-medium">
                              <Clock size={10} /> {item.dept === 'PHA' ? 'INVENTORY_PULL' : item.charge_type}
                            </span>
                          )}
                        </td>

                        {/* Live Pricing Variable Inputs */}
                        <td className="py-3.5 px-5 text-right">
                          {isEditMode ? (
                            item.dept === 'PHA' ? (
                              <span className="text-[11px] font-mono font-semibold text-slate-400 italic">Auto Pull</span>
                            ) : (
                              <input 
                                type="number" 
                                value={item.price} 
                                onChange={(e) => handleFieldChange(item.id, 'price', Number(e.target.value) || 0)}
                                className="w-24 text-right bg-indigo-50/50 border border-indigo-200 rounded-lg p-1 font-bold text-indigo-900 outline-none"
                              />
                            )
                          ) : (
                            <span className="font-mono font-bold text-indigo-600">
                              {item.dept === 'PHA' ? '—' : (item.price || 0).toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* Status Configuration Controllers */}
                        <td className="py-3.5 px-5 text-center">
                          <button
                            type="button"
                            onClick={() => handleFieldChange(item.id, 'active', !item.active)}
                            disabled={!isEditMode}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                              item.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            } ${isEditMode ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                          >
                            {item.active ? 'Active' : 'Suspended'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Creation Modal View Container */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">Configure Billing Parameter</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600" disabled={isSubmitting}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-3 text-xs font-semibold text-slate-600">
              <div className="flex flex-col gap-1">
                <label>Target Clinical Area</label>
                <select 
                  value={formData.dept}
                  onChange={(e) => handleFormDeptChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none text-slate-800 font-medium"
                  disabled={isSubmitting}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Conditional Selection Rendering for Preset-Heavy Departments */}
              {formData.dept === 'LAB' ? (
                <div className="flex flex-col gap-1">
                  <label>Select Standard Lab Profile</label>
                  <select
                    onChange={(e) => handleLabTestChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none text-slate-800 font-medium"
                    disabled={isSubmitting}
                  >
                    {TEST_CHOICES.map(t => (
                      <option key={t.code} value={t.code}>{t.name}</option>
                    ))}
                  </select>
                </div>
              ) : DEPARTMENT_PRESETS[formData.dept] ? (
                <div className="flex flex-col gap-1">
                  <label>Select Standard Procedure / Option</label>
                  <select
                    onChange={(e) => handlePresetChoiceChange(formData.dept, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none text-slate-800 font-medium"
                    disabled={isSubmitting}
                  >
                    {DEPARTMENT_PRESETS[formData.dept].map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label>Service</label>
                  <input 
                    type="text" 
                    placeholder="Enter explicit service title..."
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none text-slate-800"
                    required disabled={isSubmitting}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label>SKU</label>
                  <input 
                    type="text" 
                    value={formData.sku}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2 outline-none font-mono uppercase text-[11px] text-slate-500 cursor-not-allowed"
                    disabled
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>Base Tariff Cost (KES)</label>
                  <input 
                    type="number" 
                    placeholder={formData.dept === 'PHA' ? 'Linked to Stock' : '0.00'}
                    value={formData.dept === 'PHA' ? '' : formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className={`w-full border border-slate-200 rounded-xl p-2 outline-none font-mono ${
                      formData.dept === 'PHA' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'
                    }`}
                    required={formData.dept !== 'PHA'} 
                    disabled={isSubmitting || formData.dept === 'PHA'}
                  />
                </div>
              </div>

              {/* Automation Rules Configuration Section */}
              <div className="flex flex-col gap-2.5 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-800 font-bold flex items-center gap-1"><Clock size={11}/> Automation Trigger Rule</span>
                  </div>
                  {formData.dept === 'PHA' ? (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Dynamic Inventory Pull
                    </span>
                  ) : (
                    <select
                      value={formData.charge_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, charge_type: e.target.value }))}
                      className="bg-white border border-slate-200 rounded-lg p-1 text-[11px] font-bold text-slate-700 outline-none"
                      disabled={isSubmitting}
                    >
                      <option value="TRIGGERED">Triggered Event</option>
                      <option value="DAILY_RECURRING">Daily Midnight</option>
                      <option value="VARIABLE">Variable Entry</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 transition-all"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                  Register Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ServiceCatalogue;