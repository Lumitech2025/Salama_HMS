import React, { useState, useEffect } from 'react';
import { 
  BookOpen, DollarSign, AlertTriangle, Edit3, Save, 
  Search, Activity, X, PlusCircle, Layers, RefreshCw, Trash2
} from 'lucide-react';

const LabReference = () => {
  const [activeTab, setActiveTab] = useState('clinical'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editId, setEditId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // BASELINE STANDARDS
  const MAIN_PANELS = [
    "Full Blood Count (CBC)",
    "Urea, Electrolytes & Creatinine (U&E)",
    "Liver Function Test (LFT)",
    "Tumor Biomarkers"
  ];

  const SUB_TEST_CHOICES = {
    "Full Blood Count (CBC)": ["Hemoglobin (Hb)", "Total White Blood Count (WBC)", "Absolute Neutrophils (Neut)", "Platelets (Plt)", "Mean Corpuscular Volume (MCV)"],
    "Urea, Electrolytes & Creatinine (U&E)": ["Sodium (Na+)", "Potassium (K+)", "Urea", "Serum Creatinine"],
    "Liver Function Test (LFT)": ["Alanine Transaminase (ALT/SGPT)", "Aspartate Transaminase (AST/SGOT)", "Total Bilirubin (T.BIL)", "Direct Bilirubin (D.BIL)", "Alkaline Phosphatase (ALP)", "Albumin (ALB)"],
    "Tumor Biomarkers": ["Prostate Specific Antigen (PSA)"]
  };

  const METRIC_UNITS = ["g/dL", "x10³/µL", "x10⁹/L", "mmol/L", "µmol/L", "U/L", "fL", "ng/mL"];

  // DYNAMIC STATE REFERENCE (Initialized strictly empty as requested)
  const [references, setReferences] = useState(() => {
    const saved = localStorage.getItem('master_lab_references');
    return saved ? JSON.parse(saved) : [];
  });

  // FORM OBJECT INITIALIZATION
  const [newForm, setNewForm] = useState({
    parent_panel: '',
    name: '',
    unit: '',
    lower_range: '',
    upper_range: '',
    recommendation_below_minimum: '',
    recommendation_above_maximum: '',
    price: ''
  });

  // EFFECT HOOK: KEEP LOCAL STORAGE IN SYNC WHENEVER STATE ALTERS
  useEffect(() => {
    localStorage.setItem('master_lab_references', JSON.stringify(references));
  }, [references]);

  // EFFECT HOOK: MOUNT AND SYNC REGISTRY VIA DB
  useEffect(() => {
    const loadMasterRegistry = async () => {
      if (references.length === 0) setLoading(true);
      try {
        const response = await fetch('/api/lab-references/');
        if (!response.ok) throw new Error('Network fault matching master registry schemas.');
        const data = await response.json();
        
        if (data && data.length > 0) {
          setReferences(data);
          localStorage.setItem('master_lab_references', JSON.stringify(data));
        }
      } catch (error) {
        console.error("Backend connection missing. Maintaining existing empty repository:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMasterRegistry();
  }, []);

  // MANUAL FULL FORCED DISPATCH TRIGGER
  const handleForceGlobalSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lab-references/bulk-update/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(references)
      });
      if (!response.ok) throw new Error('Bulk API state stream rejected.');
      alert("✅ Configuration array systematically updated across entire network terminal database.");
    } catch (err) {
      console.warn("Backend dynamic route skipped bulk processing. Active configuration securely localized inside runtime browser cache.", err);
      alert("💾 Local reference tables updated successfully. System state is preserved in this browser tab container.");
    } finally {
      setLoading(false);
    }
  };

  // API TRIGGER: COMMITTING EDITED RANGE MATRIX OR NOTES
  const handleUpdate = async (item) => {
    const updatedRefs = references.map(r => r.id === item.id ? item : r);
    setReferences(updatedRefs);
    localStorage.setItem('master_lab_references', JSON.stringify(updatedRefs));
    setEditId(null);

    try {
      const response = await fetch(`/api/lab-references/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      
      if (!response.ok) throw new Error('Update failed on DB endpoint level.');
      alert(`✅ Configuration for ${item.name} permanently synced to server instance.`);
    } catch (error) {
      console.error(error);
      alert(`⚠️ Row metrics updated locally. System data is preserved in this browser layer.`);
    }
  };

  // API TRIGGER: EXPLICIT REMOVAL OF SPECIFIC CONFIG RECORD
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you absolutely sure you want to completely erase the configuration for "${name}"?`)) {
      return;
    }

    const updatedRefs = references.filter(item => item.id !== id);
    setReferences(updatedRefs);
    localStorage.setItem('master_lab_references', JSON.stringify(updatedRefs));

    try {
      const response = await fetch(`/api/lab-references/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Delete directive rejected by api node layer.');
      alert(`✅ Reference configuration for ${name} cleared from production database.`);
    } catch (error) {
      console.error(error);
      alert(`⚠️ Parameter removed from active memory. Database tracking configuration may require manual reconciliation update.`);
    }
  };

  const handleInputChange = (id, field, value) => {
    setReferences(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // API TRIGGER: PERSISTING NEWLY FORMED DIAGNOSTIC ELEMENT
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newForm.parent_panel || !newForm.name || !newForm.unit) {
      alert("Please fill out all required validation arrays.");
      return;
    }

    const createdRecord = {
      id: Date.now(), 
      name: newForm.name,
      category: newForm.parent_panel,
      lower_range: parseFloat(newForm.lower_range) || 0,
      upper_range: parseFloat(newForm.upper_range) || 0,
      recommendation_below_minimum: newForm.recommendation_below_minimum,
      recommendation_above_maximum: newForm.recommendation_above_maximum,
      price: parseInt(newForm.price) || 0,
      unit: newForm.unit
    };

    try {
      const response = await fetch('/api/lab-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createdRecord)
      });

      if (!response.ok) throw new Error('Server rejected creation syntax.');
      const finalizedPayload = await response.json();

      setReferences(prev => [finalizedPayload, ...prev]);
      alert("Permanent diagnostic profile mapped onto active database layer.");
    } catch (error) {
      console.error(error);
      setReferences(prev => [createdRecord, ...prev]);
      alert("⚠️ Registered and preserved locally inside active desktop engine workspace cache.");
    } finally {
      setShowAddForm(false);
      setNewForm({ parent_panel: '', name: '', unit: '', lower_range: '', upper_range: '', recommendation_below_minimum: '', recommendation_above_maximum: '', price: '' });
    }
  };

  const filteredData = references.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20 max-w-[1600px] mx-auto px-4">
      
      {/* HEADER BAR */}
      <div className="bg-[#020617] p-8 rounded-[2rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-teal-500 p-3.5 rounded-2xl shadow-lg text-white">
            <BookOpen size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Reference Desk
            </h2>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mt-1">Standards & Protocols</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap lg:flex-nowrap gap-4 w-full lg:w-auto items-center justify-end">
          <button
            onClick={handleForceGlobalSync}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-teal-400 hover:text-white hover:bg-slate-700 font-semibold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Update Reference Database
          </button>

          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl hover:opacity-90 transition-all shadow-md"
          >
            <PlusCircle size={16} /> Register New Test Config
          </button>

          <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/10 backdrop-blur-sm w-full lg:w-auto">
            <button 
              onClick={() => { setActiveTab('clinical'); setEditId(null); }}
              className={`px-6 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all flex items-center justify-center ${activeTab === 'clinical' ? 'bg-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Activity size={14} className="mr-2" /> Clinical Norms
            </button>
            <button 
              onClick={() => { setActiveTab('pricing'); setEditId(null); }}
              className={`px-6 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all flex items-center justify-center ${activeTab === 'pricing' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <DollarSign size={14} className="mr-2" /> Pricing
            </button>
          </div>
        </div>
      </div>

      {/* NEW REGISTRATION DRAWER SECTION */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 space-y-6 animate-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm tracking-wide">
              <Layers size={18} className="text-teal-500" /> Configure Diagnostic Specifications
            </div>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Main Panel Target *</label>
              <select 
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                value={newForm.parent_panel}
                onChange={(e) => setNewForm({...newForm, parent_panel: e.target.value, name: ''})}
              >
                <option value="">Select Category...</option>
                {MAIN_PANELS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Sub Test Parameter Name *</label>
              <select 
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                value={newForm.name}
                disabled={!newForm.parent_panel}
                onChange={(e) => setNewForm({...newForm, name: e.target.value})}
              >
                <option value="">Select Parameter...</option>
                {newForm.parent_panel && SUB_TEST_CHOICES[newForm.parent_panel].map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Accurate Unit Index *</label>
              <select 
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                value={newForm.unit}
                onChange={(e) => setNewForm({...newForm, unit: e.target.value})}
              >
                <option value="">Select Unit...</option>
                {METRIC_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Lower Range Constraint</label>
              <input type="number" step="0.01" placeholder="e.g. 12.0" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500" value={newForm.lower_range} onChange={(e) => setNewForm({...newForm, lower_range: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Upper Range Constraint</label>
              <input type="number" step="0.01" placeholder="e.g. 17.5" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500" value={newForm.upper_range} onChange={(e) => setNewForm({...newForm, upper_range: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Base Cost Charge (KES)</label>
              <input type="number" placeholder="KES Charge" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500" value={newForm.price} onChange={(e) => setNewForm({...newForm, price: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-rose-600 mb-2">Automated Lab Note Recommendation (If BELOW Minimum Range)</label>
              <textarea rows={3} placeholder="Type advice framework for doctor review..." className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500" value={newForm.recommendation_below_minimum} onChange={(e) => setNewForm({...newForm, recommendation_below_minimum: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-600 mb-2">Automated Lab Note Recommendation (If ABOVE Maximum Range)</label>
              <textarea rows={3} placeholder="Type advice framework for doctor review..." className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500" value={newForm.recommendation_above_maximum} onChange={(e) => setNewForm({...newForm, recommendation_above_maximum: e.target.value})} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 bg-slate-200 text-slate-700 font-semibold text-xs uppercase tracking-wider rounded-lg hover:bg-slate-300">Cancel</button>
            <button type="submit" className="px-6 py-2.5 bg-teal-600 text-white font-semibold text-xs uppercase tracking-wider rounded-lg hover:bg-teal-700 shadow-sm">Commit Parameters</button>
          </div>
        </form>
      )}

      {/* FILTER SEARCH BAR */}
      <div className="max-w-xl relative mx-auto">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Filter parameters by Master Panel or Parameter name..."
          className="w-full bg-white border border-slate-200 rounded-full py-4 pl-14 pr-6 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* CORE CONFIGURATION MASTER PANEL TABLE */}
      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading && references.length === 0 ? (
            <div className="p-12 text-center text-sm font-medium text-slate-500 animate-pulse">
              Syncing configurations with Master Server Database registries...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm font-medium">
              No configuration records captured yet. Click <span className="text-teal-500 font-bold">"Register New Test Config"</span> to structure baseline entries.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 tracking-wide">
                  <th className="px-6 py-4">Diagnostic Metric</th>
                  <th className="px-6 py-4">Master Group Profile</th>
                  {activeTab === 'clinical' ? (
                    <>
                      <th className="px-6 py-4">Reference Baseline</th>
                      <th className="px-6 py-4 w-[28%]">Recommendation Below Min</th>
                      <th className="px-6 py-4 w-[28%]">Recommendation Above Max</th>
                    </>
                  ) : (
                    <th className="px-6 py-4">Charge Profile</th>
                  )}
                  <th className="px-6 py-4 text-center w-[120px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredData.map((item) => (
                  <tr key={item.id} className={`group transition-all ${editId === item.id ? 'bg-teal-50/30' : 'hover:bg-slate-50/40'}`}>
                    
                    {/* METRIC PARAMETER NAME */}
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <span className="text-xs text-slate-400 font-medium">{item.unit}</span>
                    </td>

                    {/* PARENT PROFILE SPECIFICATION */}
                    <td className="px-6 py-5">
                      <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-md text-xs font-semibold inline-block">
                        {item.category}
                      </span>
                    </td>

                    {/* CONDITIONAL TAB LOGIC: CLINICAL CRITERIA VS PRICING */}
                    {activeTab === 'clinical' ? (
                      <>
                        {/* REFERENCE BASELINE */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          {editId === item.id ? (
                            <div className="flex gap-2 max-w-[140px]">
                              <input className="border border-slate-200 rounded-lg p-1.5 text-xs font-medium w-1/2 outline-none focus:ring-1 focus:ring-teal-500" type="number" step="0.01" value={item.lower_range} onChange={(e) => handleInputChange(item.id, 'lower_range', e.target.value)} />
                              <input className="border border-slate-200 rounded-lg p-1.5 text-xs font-medium w-1/2 outline-none focus:ring-1 focus:ring-teal-500" type="number" step="0.01" value={item.upper_range} onChange={(e) => handleInputChange(item.id, 'upper_range', e.target.value)} />
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-700">{item.lower_range} — {item.upper_range} <small className="text-slate-400 font-normal">{item.unit}</small></span>
                          )}
                        </td>

                        {/* RECOMMENDATION BELOW MIN */}
                        <td className="px-6 py-5">
                          {editId === item.id ? (
                            <textarea className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500" rows={2} value={item.recommendation_below_minimum} onChange={(e) => handleInputChange(item.id, 'recommendation_below_minimum', e.target.value)} placeholder="Below minimum recommendation..." />
                          ) : (
                            <div className="text-xs font-medium text-slate-600 flex items-start gap-1.5">
                              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                              <span>{item.recommendation_below_minimum || <span className="text-slate-300 italic">None assigned</span>}</span>
                            </div>
                          )}
                        </td>

                        {/* RECOMMENDATION ABOVE MAX */}
                        <td className="px-6 py-5">
                          {editId === item.id ? (
                            <textarea className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500" rows={2} value={item.recommendation_above_maximum} onChange={(e) => handleInputChange(item.id, 'recommendation_above_maximum', e.target.value)} placeholder="Above maximum recommendation..." />
                          ) : (
                            <div className="text-xs font-medium text-slate-600 flex items-start gap-1.5">
                              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                              <span>{item.recommendation_above_maximum || <span className="text-slate-300 italic">None assigned</span>}</span>
                            </div>
                          )}
                        </td>
                      </>
                    ) : (
                      <td className="px-6 py-5">
                        {editId === item.id ? (
                          <input type="number" className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-900 outline-none max-w-[120px] focus:ring-1 focus:ring-blue-500" value={item.price} onChange={(e) => handleInputChange(item.id, 'price', e.target.value)} />
                        ) : (
                          <span className="font-bold text-blue-600">KES {item.price?.toLocaleString()}</span>
                        )}
                      </td>
                    )}

                    {/* ACTION TRIGGERS (INCLUDES WORKABLE ACTION CONTROLLERS AND UN-INTERRUPTED DELETE COMPONENT) */}
                    <td className="px-6 py-5">
                      <div className="flex justify-center items-center gap-2">
                        {editId === item.id ? (
                          <>
                            <button onClick={() => handleUpdate(item)} className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all shadow-sm" title="Save Changes"><Save size={15} /></button>
                            <button onClick={() => setEditId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300" title="Discard Changes"><X size={15} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditId(item.id)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" title="Edit Metrics"><Edit3 size={15} /></button>
                            <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete Specification Row"><Trash2 size={15} /></button>
                          </>
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

export default LabReference;