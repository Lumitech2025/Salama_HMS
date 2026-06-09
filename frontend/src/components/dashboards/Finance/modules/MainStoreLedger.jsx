import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Package, Calendar, Plus, Search, X, Save, Box, TrendingUp, AlertCircle, Layers
} from 'lucide-react';

const MainStoreLedger = () => {
  const [activeDeptFilter, setActiveDeptFilter] = useState('ALL'); 
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields State matching relaxed model conditions
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    dosage_form: 'TABLET',
    strength: '',
    quantity_available: '',
    cost_per_unit: '',
    department: 'PHARMACY',
    batch_number: '',
    expiry_date: ''
  });

  const departmentTabs = [
    { key: 'ALL', label: 'All Departments' },
    { key: 'PHARMACY', label: 'Pharmacy' },
    { key: 'LAB', label: 'Laboratory' },
    { key: 'NURSING', label: 'Nursing' },
    { key: 'RADIOLOGY', label: 'Radiology' },
    { key: 'ADMIN', label: 'General Admin' }
  ];

  // Helper Check: True only for stores that handle items requiring clinical dosage data
  const isMedicinal = formData.department === 'PHARMACY' || formData.department === 'RADIOLOGY';

  useEffect(() => {
    fetchInventory();
  }, []);

  // Sync Form Updates when changing departments to maintain clean data rules
  useEffect(() => {
    if (!isMedicinal) {
      setFormData(prev => ({
        ...prev,
        dosage_form: '', // Cleared out cleanly for non-clinical items
        strength: '',    // Cleared out cleanly
        expiry_date: ''  // Optional field for lab/admin supplies
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dosage_form: prev.dosage_form || 'TABLET' // Restore default safe select option if returning to Pharmacy
      }));
    }
  }, [formData.department]);

  // AUTOMATED BATCH ENGINE: Generates real-time template strings inside modal
  useEffect(() => {
    if (formData.name) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = String(today.getFullYear()).slice(-2); 
      const compactDateStr = `${day}${month}${year}`;

      setFormData(prev => ({
        ...prev,
        batch_number: prev.batch_number && prev.batch_number.startsWith('SCC-B') 
          ? prev.batch_number 
          : `SCC-BXXX/${compactDateStr}`
      }));
    }
  }, [formData.name, formData.department]);

  const fetchInventory = async () => {
    try {
      const res = await API.get('/inventory-items/');
      const extractedData = res.data?.results || res.data || [];
      setInventory(Array.isArray(extractedData) ? extractedData : []);
    } catch (err) {
      console.error("Fetch error - check if API route exists", err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const hasPlaceholder = formData.batch_number && formData.batch_number.includes('XXX');

    const submitPayload = {
      ...formData,
      sku: undefined, 
      quantity_available: parseInt(formData.quantity_available) || 0,
      cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
      // Dynamic Data Sanitization
      dosage_form: isMedicinal ? formData.dosage_form : null,
      strength: isMedicinal ? (formData.strength || null) : null,
      expiry_date: isMedicinal ? (formData.expiry_date || null) : (formData.expiry_date || null), 
      batch_number: (!formData.batch_number || hasPlaceholder) ? undefined : formData.batch_number
    };

    try {
      await API.post('/inventory-items/', submitPayload);
      setShowModal(false);
      fetchInventory();
      setFormData({ 
        name: '', 
        sku: '',
        dosage_form: 'TABLET',
        strength: '',
        quantity_available: '', 
        cost_per_unit: '', 
        department: 'PHARMACY', 
        batch_number: '', 
        expiry_date: '' 
      });
    } catch (err) {
      alert("Error saving inventory item. Check backend logs and validation rules.");
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesDept = activeDeptFilter === 'ALL' || item.department === activeDeptFilter;
    const matchesSearch = !searchQuery || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batch_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] text-left">
      
      {/* 1. KPI COUNTER SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-teal-500 transition-all">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl w-fit mb-4"><TrendingUp size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
            {activeDeptFilter === 'ALL' ? 'Total Assets Value' : `${activeDeptFilter} Asset Value`}
          </p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            KES {filteredInventory.reduce((acc, curr) => acc + (typeof curr === 'object' ? (Number(curr.quantity_available || 0) * Number(curr.cost_per_unit || 0)) : 0), 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-amber-500 transition-all text-left">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit mb-4"><Box size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Items In Stock</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            {filteredInventory.reduce((acc, curr) => acc + (typeof curr === 'object' ? Number(curr.quantity_available || 0) : 0), 0).toLocaleString()} <span className="text-sm">Units</span>
          </h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-rose-500 transition-all text-left">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl w-fit mb-4"><Calendar size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Expiring Soon</p>
          <h3 className="text-3xl font-black text-rose-500 tracking-tighter italic uppercase leading-none">
             {filteredInventory.filter(i => i && i.expiry_date && new Date(i.expiry_date) < new Date(Date.now() + 90*24*60*60*1000)).length} Batches
          </h3>
        </div>
      </div>

      {/* 2. CONTROLS BAR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-4 rounded-[2.5rem] border border-slate-50 shadow-sm">
        <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap gap-1 max-w-full">
          {departmentTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveDeptFilter(tab.key)}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
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
            placeholder="Search main store inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 pl-10 pr-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-teal-500"
          />
        </div>

        <button 
          onClick={() => setShowModal(true)} 
          className="bg-slate-900 text-teal-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 shadow-xl active:scale-95 transition-all w-full xl:w-auto justify-center cursor-pointer"
        >
          <Plus size={18} /> New Inventory Entry
        </button>
      </div>

      {/* 3. TABLE GENERAL LEDGER */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[500px]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <th className="p-8 px-10">Product & Department</th>
              <th className="p-8 text-center">SKU Code</th>
              <th className="p-8 text-center">Batch No</th>
              <th className="p-8 text-center">Qty Available</th>
              <th className="p-8 text-center">Cost/Unit</th>
              <th className="p-8">Expiry</th>
              <th className="p-8 text-right pr-10">Asset Valuation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-left">
            {filteredInventory.length > 0 ? filteredInventory.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-all group animate-in fade-in duration-300">
                <td className="p-8 px-10">
                  <p className="font-black text-slate-900 uppercase italic text-sm">
                    {item.name || 'Unnamed Item'}
                    {item.strength && <span className="text-slate-400 font-bold ml-2 text-xs">({item.strength})</span>}
                  </p>
                  <p className="text-[9px] font-bold text-teal-600 uppercase tracking-widest mt-1 italic">
                    {item.department === 'LAB' ? 'LABORATORY' : item.department === 'ADMIN' ? 'GENERAL ADMIN' : item.department}
                    {item.dosage_form && <span className="text-slate-400 font-medium normal-case ml-2">[{item.dosage_form}]</span>}
                  </p>
                </td>
                <td className="p-8 text-center">
                  <span className="font-mono text-xs font-black text-teal-600 bg-teal-50 border border-teal-100/70 px-4 py-1.5 rounded-xl tracking-wider">
                    {item.sku || '—'}
                  </span>
                </td>
                <td className="p-8 text-center">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black italic uppercase tracking-tighter">
                    #{item.batch_number || 'N/A'}
                  </span>
                </td>
                <td className="p-8 text-center font-black text-slate-900 italic text-base">
                  {Number(item.quantity_available || 0).toLocaleString()} <span className="text-[10px] text-slate-400 ml-1 font-bold">Units</span>
                </td>
                <td className="p-8 text-center text-xs font-bold text-slate-500 italic uppercase tracking-tighter">
                  KES {Number(item.cost_per_unit || 0).toLocaleString()}
                </td>
                <td className="p-8 font-black italic text-xs">
                  <p className={item.expiry_date && new Date(item.expiry_date) < new Date() ? 'text-rose-600' : 'text-slate-500'}>
                    {item.expiry_date || ''}
                  </p>
                </td>
                <td className="p-8 text-right pr-10">
                  <p className="font-black text-slate-900 italic text-sm">
                    KES {(Number(item.quantity_available || 0) * Number(item.cost_per_unit || 0)).toLocaleString()}
                  </p>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="p-40 text-center text-slate-300 font-black uppercase italic tracking-[0.3em]">
                  No tracking records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* REGISTRATION ONBOARDING MODAL SHEET */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 text-left">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center px-12">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Stock <span className="text-teal-600">Onboarding</span></h3>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all cursor-pointer"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-12 space-y-6 overflow-y-auto">
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Destination Target Department</label>
                  <select name="department" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none appearance-none cursor-pointer focus:border-teal-500" value={formData.department} onChange={handleInputChange}>
                    <option value="PHARMACY">PHARMACY (Dispensing)</option>
                    <option value="LAB">LABORATORY (Reagents & Consumables)</option>
                    <option value="NURSING">NURSING (Wards & Clinical Support)</option>
                    <option value="RADIOLOGY">RADIOLOGY (Contrast/Imaging Gear)</option>
                    <option value="ADMIN">GENERAL ADMIN (Hospital Supplies)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Product Asset Name</label>
                <input required name="name" type="text" placeholder={isMedicinal ? "e.g. Panadol" : "e.g. Test Tube Vials or Syringes"} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.name} onChange={handleInputChange} />
              </div>

              {/* DYNAMIC METADATA GRID SECTION */}
              <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${isMedicinal ? 'opacity-100' : 'opacity-40'}`}>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Dosage Form</label>
                  <select 
                    name="dosage_form" 
                    disabled={!isMedicinal}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none disabled:cursor-not-allowed appearance-none cursor-pointer" 
                    value={formData.dosage_form} 
                    onChange={handleInputChange}
                  >
                    <option value="TABLET">Tablet</option>
                    <option value="CAPSULE">Capsule</option>
                    <option value="SYRUP">Syrup</option>
                    <option value="SUSPENSION">Oral Suspension</option>
                    <option value="VIAL">Vial (Liquid/Powder for Injection)</option>
                    <option value="AMP_INJ">Ampoule (Injection)</option>
                    <option value="INF_BAG">Infusion Bag</option>
                    <option value="OINTMENT">Ointment / Cream</option>
                    <option value="PATCH">Transdermal Patch</option>
                    <option value="PESSARY">Pessary</option>
                    <option value="SUPPOSITORY">Suppository</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Strength Metrics</label>
                  <input 
                    name="strength" 
                    type="text" 
                    disabled={!isMedicinal}
                    placeholder={isMedicinal ? "e.g. 500 mg" : "N/A (Non-Medicinal)"} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none disabled:bg-slate-100 disabled:cursor-not-allowed focus:border-teal-500" 
                    value={formData.strength} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Traceability SKU Code</label>
                  <input readOnly type="text" className="w-full bg-teal-50/50 border border-teal-100 text-teal-700 rounded-2xl py-4 px-6 font-mono text-xs font-black outline-none cursor-not-allowed" value={formData.name ? "AUTO-ASSIGNED ON SAVE" : "Awaiting Base Name..."} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Auto-Generated Batch Template</label>
                  <input readOnly type="text" className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 px-6 font-mono text-xs font-bold text-slate-600 outline-none" value={formData.batch_number} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Quantity</label>
                  <input required name="quantity_available" type="number" min="0" placeholder="0" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.quantity_available} onChange={handleInputChange} />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Cost/Unit</label>
                  <input required name="cost_per_unit" type="number" step="0.01" min="0" placeholder="KES" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.cost_per_unit} onChange={handleInputChange} />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">
                    Expiry Date {!isMedicinal && <span className="text-amber-500 font-medium normal-case">(Optional)</span>}
                  </label>
                  <input 
                    name="expiry_date" 
                    type="date" 
                    required={isMedicinal} // Required ONLY for drugs/contrast items
                    className="w-full border rounded-2xl py-4 px-6 text-xs font-black outline-none bg-slate-50 border-slate-100 focus:border-teal-500"
                    value={formData.expiry_date} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-slate-900 text-teal-400 py-6 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl flex items-center justify-center gap-4 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 mt-4 cursor-pointer">
                {loading ? "SAVING RECORD..." : <><Save size={20}/> Commit to Inventory</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainStoreLedger;