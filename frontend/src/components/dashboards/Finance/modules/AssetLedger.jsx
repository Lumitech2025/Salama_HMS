import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Package, Plus, Search, X, Save, Box, TrendingUp, Laptop, ArrowDownCircle
} from 'lucide-react';

const AssetLedger = () => {
  const [activeDeptFilter, setActiveDeptFilter] = useState('ALL'); 
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track whether we are creating a new asset or updating an existing one
  const [editId, setEditId] = useState(null);

  // Explicit helper function to construct clean Auth Config objects manually
  const getAuthConfig = () => {
    const token = localStorage.getItem('access_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  // Fields tracking asset setups with explicit percentage rates instead of asset years
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    department: 'PHARMACY',
    quantity: '',
    unit_cost: '',
    salvage_value: '0', 
    depreciation_rate: '20' 
  });

  const departmentTabs = [
    { key: 'ALL', label: 'All Departments' },
    { key: 'PHARMACY', label: 'Pharmacy' },
    { key: 'LAB', label: 'Laboratory' },
    { key: 'NURSING', label: 'Nursing' },
    { key: 'RADIOLOGY', label: 'Radiology' },
    { key: 'ADMIN', label: 'General Admin' }
  ];

  useEffect(() => {
    fetchAssets();
  }, []);

  // Automatic SKU Generator (Only auto-generates if we are NOT editing an existing asset)
  useEffect(() => {
    if (formData.name && !editId) {
      const cleanName = formData.name.replace(/\s+/g, '').toUpperCase().substring(0, 6);
      const cleanDept = formData.department.substring(0, 3);
      const computedSku = `AST-${cleanDept}-${cleanName}`;

      setFormData(prev => ({
        ...prev,
        sku: computedSku
      }));
    }
  }, [formData.name, formData.department, editId]);

  const fetchAssets = async () => {
    try {
      const res = await API.get('/fixed-assets/', getAuthConfig());
      const extractedData = res.data?.results || res.data || [];
      setAssets(Array.isArray(extractedData) ? extractedData : []);
    } catch (err) {
      console.error("Asset database connection error:", err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Triggers when a row is clicked on the table
  const handleEditClick = (item) => {
    setEditId(item.id);
    setFormData({
      name: item.name || '',
      sku: item.sku || '',
      department: item.department || 'PHARMACY',
      quantity: item.quantity?.toString() || '',
      unit_cost: item.unit_cost?.toString() || '',
      salvage_value: item.salvage_value?.toString() || '0',
      depreciation_rate: item.depreciation_rate?.toString() || '20'
    });
    setShowModal(true);
  };

  // Clears out active asset modifications when closing modal windows
  const closeModalHandler = () => {
    setShowModal(false);
    setEditId(null);
    setFormData({ 
      name: '', 
      sku: '',
      department: 'PHARMACY', 
      quantity: '', 
      unit_cost: '',
      salvage_value: '0',
      depreciation_rate: '20'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submitPayload = {
      ...formData,
      quantity: parseInt(formData.quantity) || 0,
      unit_cost: parseFloat(formData.unit_cost) || 0,
      salvage_value: parseFloat(formData.salvage_value) || 0,
      depreciation_rate: parseFloat(formData.depreciation_rate) || 20
    };

    try {
      if (editId) {
        // Dynamic routing strategy routing directly to target row ID instances
        await API.put(`/fixed-assets/${editId}/`, submitPayload, getAuthConfig());
      } else {
        await API.post('/fixed-assets/', submitPayload, getAuthConfig());
      }
      
      closeModalHandler();
      fetchAssets();
    } catch (err) {
      alert(editId ? "Error updating asset details." : "Error saving asset details to system.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(item => {
    const matchesDept = activeDeptFilter === 'ALL' || item.department === activeDeptFilter;
    const matchesSearch = !searchQuery || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const calculateTotalValue = (item) => {
    return (Number(item.quantity || 0) * Number(item.unit_cost || 0));
  };

  const calculateAnnualDepreciation = (item) => {
    const cost = Number(item.unit_cost || 0);
    const salvage = Number(item.salvage_value || 0);
    const ratePercentage = Number(item.depreciation_rate || 20) / 100;
    return Math.max(0, (cost - salvage) * ratePercentage * Number(item.quantity || 0));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] text-left">
      
      {/* 1. COMPACT KPI PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-teal-500 transition-all">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl w-fit mb-4"><TrendingUp size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
            {activeDeptFilter === 'ALL' ? 'Total Asset Value' : `${activeDeptFilter} Assets Value`}
          </p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            KES {filteredAssets.reduce((acc, curr) => acc + calculateTotalValue(curr), 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-amber-500 transition-all text-left">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit mb-4"><Box size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Registered Quantities</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            {filteredAssets.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0).toLocaleString()} <span className="text-sm">Units</span>
          </h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-rose-500 transition-all text-left">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl w-fit mb-4"><ArrowDownCircle size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Annual Value Loss Drag</p>
          <h3 className="text-3xl font-black text-rose-500 tracking-tighter italic uppercase leading-none">
             KES {filteredAssets.reduce((acc, curr) => acc + calculateAnnualDepreciation(curr), 0).toLocaleString()}
          </h3>
        </div>
      </div>

      {/* 2. ACTIONS AND FILTERS ROW */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-4 rounded-[2.5rem] border border-slate-50 shadow-sm">
        <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap gap-1 max-w-full">
          {departmentTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveDeptFilter(tab.key)}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeDeptFilter === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full xl:max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text"
            placeholder="Search equipment database..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 pl-10 pr-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-teal-500"
          />
        </div>

        <button 
          onClick={() => { setEditId(null); setShowModal(true); }} 
          className="bg-slate-900 text-teal-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 shadow-xl transition-all w-full xl:w-auto justify-center"
        >
          <Laptop size={16} /> New Asset Entry
        </button>
      </div>

      {/* 3. MAIN LEDGER DATA GRID */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[500px]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <th className="p-8 px-10">Item Name & Department</th>
              <th className="p-8 text-center">SKU Code</th>
              <th className="p-8 text-center">Quantity</th>
              <th className="p-8 text-center">Cost / Unit</th>
              <th className="p-8 text-center">Value Loss Rate (%)</th>
              <th className="p-8 text-right pr-10">Total Asset Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-left">
            {filteredAssets.length > 0 ? filteredAssets.map((item, idx) => (
              <tr 
                key={item.id || idx} 
                onClick={() => handleEditClick(item)}
                className="hover:bg-teal-50/30 cursor-pointer transition-all groupSample animate-in fade-in duration-300"
                title="Click row to modify asset"
              >
                <td className="p-8 px-10">
                  <p className="font-black text-slate-900 uppercase italic text-sm group-hover:text-teal-600 transition-colors">{item.name}</p>
                  <p className="text-[9px] font-bold text-teal-600 uppercase tracking-widest mt-1 italic">
                    {item.department === 'LAB' ? 'LABORATORY' : item.department === 'ADMIN' ? 'GENERAL ADMIN' : item.department}
                  </p>
                </td>
                <td className="p-8 text-center">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100/70 px-3 py-1.5 rounded-xl">
                    {item.sku}
                  </span>
                </td>
                <td className="p-8 text-center font-black text-slate-900 italic text-base">
                  {Number(item.quantity || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">Units</span>
                </td>
                <td className="p-8 text-center text-xs font-bold text-slate-500 italic uppercase tracking-tighter">
                  KES {Number(item.unit_cost || 0).toLocaleString()}
                </td>
                <td className="p-8 text-center text-xs font-bold text-rose-600 italic tracking-tighter">
                  - KES {calculateAnnualDepreciation(item).toLocaleString()} / yr
                  <p className="text-[8px] text-slate-400 font-bold uppercase not-italic mt-0.5">yearly loss rate: {item.depreciation_rate || 20}%</p>
                </td>
                <td className="p-8 text-right pr-10">
                  <p className="font-black text-slate-900 italic text-sm">
                    KES {calculateTotalValue(item).toLocaleString()}
                  </p>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="p-40 text-center text-slate-300 font-black uppercase italic tracking-[0.3em]">
                  No asset logging entries found under {activeDeptFilter === 'ALL' ? 'any clinical pool' : `the ${activeDeptFilter} group`}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. FORM OVERLAY PANEL CONTAINER */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 text-left">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={closeModalHandler}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center px-12">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                {editId ? <>Modify <span className="text-amber-500">Asset Record</span></> : <>Asset <span className="text-teal-600">Onboarding</span></>}
              </h3>
              <button onClick={closeModalHandler} className="p-3 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-12 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Asset Name</label>
                <input required name="name" type="text" placeholder="e.g. Siemens Ultrasound Pro" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.name} onChange={handleInputChange} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Department Allocation</label>
                  <select name="department" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none appearance-none cursor-pointer focus:border-teal-500" value={formData.department} onChange={handleInputChange}>
                    <option value="PHARMACY">PHARMACY</option>
                    <option value="LAB">LABORATORY</option>
                    <option value="NURSING">NURSING</option>
                    <option value="RADIOLOGY">RADIOLOGY</option>
                    <option value="ADMIN">GENERAL ADMIN</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">SKU Code {editId && '(Locked)'}</label>
                  <input readOnly type="text" className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 px-6 font-mono text-xs font-bold text-slate-500 outline-none" value={formData.sku} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Quantity</label>
                  <input required name="quantity" type="number" min="1" placeholder="0" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.quantity} onChange={handleInputChange} />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Cost per Unit</label>
                  <input required name="unit_cost" type="number" min="0" placeholder="KES" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.unit_cost} onChange={handleInputChange} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Expected Resale Scrap Value</label>
                  <input required name="salvage_value" type="number" min="0" placeholder="KES" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.salvage_value} onChange={handleInputChange} />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Yearly Value Loss Rate (%)</label>
                  <select name="depreciation_rate" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none appearance-none cursor-pointer focus:border-teal-500" value={formData.depreciation_rate} onChange={handleInputChange}>
                    <option value="10">10% loss per year (10 yr life cycle)</option>
                    <option value="20">20% loss per year (5 yr life cycle)</option>
                    <option value="25">25% loss per year (4 yr life cycle)</option>
                    <option value="33.3">33.3% loss per year (3 yr life cycle)</option>
                  </select>
                </div>
              </div>

              <button disabled={loading} className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl flex items-center justify-center gap-4 transition-all disabled:opacity-50 mt-4 ${editId ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-slate-900 text-teal-400 hover:bg-slate-800'}`}>
                {loading ? "SAVING RECORD..." : editId ? "Update Asset Record" : "Commit Asset to Balance Sheet"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetLedger;