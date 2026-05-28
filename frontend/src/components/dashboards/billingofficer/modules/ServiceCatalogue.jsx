import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, CheckCircle2, Layers, X, Activity, Microscope, Archive, Syringe, BrainCircuit, Pill, AlertCircle, Loader2 } from 'lucide-react';

const ServiceCatalogue = () => {
  const [activeDepartment, setActiveDepartment] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // --- New API-Driven State Managers ---
  const [catalogue, setCatalogue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const departments = [
    { id: 'ALL', name: 'All Departments', icon: <Layers size={16} /> },
    { id: 'ONC', name: 'Oncology Center', icon: <Activity size={16} /> },
    { id: 'LAB', name: 'Laboratory', icon: <Microscope size={16} /> },
    { id: 'RAD', name: 'Radiology & Imaging', icon: <Archive size={16} /> },
    { id: 'NUR', name: 'Nursing & Procedures', icon: <Syringe size={16} /> },
    { id: 'PSY', name: 'Counselling Psychology', icon: <BrainCircuit size={16} /> },
    { id: 'PHA', name: 'Pharmacy', icon: <Pill size={16} /> },
  ];

  const [formData, setFormData] = useState({
    dept: 'ONC',
    sku: '',
    name: '',
    price: ''
  });

  // --- Helper: Retrieve Auth Tokens cleanly ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token'); 
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // --- Read: Fetch Price Book Catalogue from DRF Viewset ---
  const fetchCatalogue = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const response = await fetch('/api/services/', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }
      
      const data = await response.json();
      setCatalogue(data);
    } catch (err) {
      setApiError(err.message || 'Failed to pull master price book from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogue();
  }, []);

  const handlePriceChange = (id, value) => {
    setCatalogue(prev => prev.map(item => 
      item.id === id ? { ...item, price: Number(value) || 0 } : item
    ));
  };

  const handleToggleActive = (id) => {
    if (!isEditMode) return;
    setCatalogue(prev => prev.map(item => 
      item.id === id ? { ...item, active: !item.active } : item
    ));
  };

  // --- Update: Save inline changes (Modified tariffs & Active states) ---
  const commitPricingChanges = async () => {
    setSaveStatus('saving');
    setApiError(null);

    try {
      // Fetch the unmodified data template to check what shifted if optimizing, 
      // or save updates sequentially/concurrently via standard promise loops.
      const updatePromises = catalogue.map(item => 
        fetch(`/api/services/${item.id}/`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            sku: item.sku,
            name: item.name,
            dept: item.dept,
            price: item.price,
            active: item.active
          })
        })
      );

      const responses = await Promise.all(updatePromises);
      const failedResponse = responses.find(res => !res.ok);
      
      if (failedResponse) {
        throw new Error(`Failed to commit one or more items. Server status: ${failedResponse.status}`);
      }

      setSaveStatus('success');
      setIsEditMode(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
      fetchCatalogue(); // Re-sync local model layout state with server values
    } catch (err) {
      setSaveStatus('idle');
      setApiError(err.message || 'Failed to sync batch pricing records back to the database.');
    }
  };

  // --- Create: Register a brand new service item matrix via Modal ---
  const handleAddService = async (e) => {
    e.preventDefault();
    if (!formData.sku || !formData.name || !formData.price) return;

    setIsSubmitting(true);
    setApiError(null);

    const payload = {
      dept: formData.dept,
      sku: formData.sku.toUpperCase().trim(),
      name: formData.name,
      price: Number(formData.price) || 0,
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
        throw new Error(errData.detail || JSON.stringify(errData) || `Error code: ${response.status}`);
      }

      setFormData({ dept: 'ONC', sku: '', name: '', price: '' });
      setIsModalOpen(false);
      fetchCatalogue(); // Instant view table sync down
    } catch (err) {
      setApiError(err.message || 'Could not register new medical catalog entity.');
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-['Inter'] text-slate-700 pb-16">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Service Catalogue</h2>
          <p className="text-sm text-slate-400">
            Configure hospital base tariffs, adjust active billing rates, and register new medical procedures.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          {isEditMode ? (
            <>
              <button 
                onClick={() => { setIsEditMode(false); fetchCatalogue(); }} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white/10 text-slate-200 hover:bg-white/20 transition-all"
                disabled={saveStatus === 'saving'}
              >
                Discard
              </button>
              <button 
                onClick={commitPricingChanges} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2 transition-all disabled:opacity-50"
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving...
                  </>
                ) : 'Publish Updates'}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditMode(true)} 
              className="px-6 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm transition-all"
              disabled={isLoading}
            >
              <Edit3 size={16} /> Edit Base Prices
            </button>
          )}
        </div>
      </div>

      {/* Real-time Alerts Block */}
      {saveStatus === 'success' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 font-bold text-sm">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          Service catalogue tariffs updated globally.
        </div>
      )}

      {apiError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-900 font-bold text-sm">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <div className="flex-1">
            <span className="block font-black text-rose-800">System Interface Error</span>
            <span className="font-normal text-xs font-mono">{apiError}</span>
          </div>
          <button onClick={() => setApiError(null)} className="text-slate-400 hover:text-slate-600 text-xs">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar: Department Filters */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-3">Revenue Centers</span>
            {departments.map(dept => (
              <button
                key={dept.id}
                onClick={() => setActiveDepartment(dept.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                  activeDepartment === dept.id 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={activeDepartment === dept.id ? 'text-indigo-400' : 'text-slate-400'}>{dept.icon}</span>
                  {dept.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Area: Pricing Table */}
        <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by SKU or Service Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Plus size={16} className="text-indigo-400" /> Add New Service
            </button>
          </div>

          {/* Dynamic Loading Table Wrapper */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <span className="text-xs font-bold font-mono tracking-wider uppercase">Loading Base Tariffs...</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="py-4 px-6">Internal SKU</th>
                    <th className="py-4 px-6">Service Name</th>
                    <th className="py-4 px-6 text-right">Selling Price (KES)</th>
                    <th className="py-4 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {filteredCatalogue.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center font-medium text-slate-400 bg-slate-50/30">
                        No matching records found.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalogue.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-slate-500 text-xs">
                          {item.sku}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-800">
                          {item.name}
                        </td>

                        {/* Selling Price */}
                        <td className="py-4 px-6 text-right">
                          {isEditMode ? (
                            <input 
                              type="number" 
                              value={item.price} 
                              onChange={(e) => handlePriceChange(item.id, e.target.value)}
                              className="w-28 text-right bg-indigo-50/50 border border-indigo-200 rounded-lg p-2 font-black text-indigo-800 outline-none focus:border-indigo-500"
                            />
                          ) : (
                            <span className="font-mono font-black text-indigo-700">{(item.price || 0).toLocaleString()}</span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-4 px-6 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item.id)}
                            disabled={!isEditMode}
                            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                              item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
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

      {/* Add New Service Modal Component */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add New Service Card</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600" disabled={isSubmitting}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-4 text-sm font-semibold text-slate-600">
              <div className="flex flex-col gap-1.5">
                <label>Assigned Department</label>
                <select 
                  value={formData.dept}
                  onChange={(e) => setFormData(prev => ({ ...prev, dept: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-medium text-slate-800"
                  disabled={isSubmitting}
                >
                  {departments.filter(d => d.id !== 'ALL').map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label>Unique SKU Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. LAB-HEM-05"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-mono text-xs uppercase"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label>Service / Procedure Name</label>
                <input 
                  type="text" 
                  placeholder="Describe the medical service..."
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 text-slate-800"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label>Base Tariff Rate (KES)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-mono"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 transition-all"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Save Service
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