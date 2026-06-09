import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Package, Calendar, Plus, Search, X, Save, Box, TrendingUp, AlertCircle, Layers
} from 'lucide-react';

const LabInventory = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields State locked directly to LAB department
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    dosage_form: '', 
    strength: '',
    quantity_available: '',
    cost_per_unit: '',
    department: 'LAB',
    batch_number: '',
    expiry_date: ''
  });

  // Non-clinical item rule helper (Lab items generally don't utilize medicinal metrics)
  const isMedicinal = false;

  useEffect(() => {
    fetchInventory();
  }, []);

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
  }, [formData.name]);

  const fetchInventory = async () => {
    try {
      const res = await API.get('/inventory-items/');
      const extractedData = res.data?.results || res.data || [];
      // Strict scope: only extract items that natively belong to the LAB department
      const labOnlyData = (Array.isArray(extractedData) ? extractedData : []).filter(
        item => item.department === 'LAB'
      );
      setInventory(labOnlyData);
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
      dosage_form: null,
      strength: null,
      expiry_date: formData.expiry_date || null, 
      batch_number: (!formData.batch_number || hasPlaceholder) ? undefined : formData.batch_number
    };

    try {
      await API.post('/inventory-items/', submitPayload);
      setShowModal(false);
      fetchInventory();
      setFormData({ 
        name: '', 
        sku: '',
        dosage_form: '',
        strength: '',
        quantity_available: '', 
        cost_per_unit: '', 
        department: 'LAB', 
        batch_number: '', 
        expiry_date: '' 
      });
    } catch (err) {
      alert("Error saving laboratory inventory item. Check backend logs and validation rules.");
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    return !searchQuery || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batch_number?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] text-left">
      
      {/* 1. KPI COUNTER SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-teal-500 transition-all">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl w-fit mb-4"><TrendingUp size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
            LAB Asset Value
          </p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            KES {filteredInventory.reduce((acc, curr) => acc + (typeof curr === 'object' ? (Number(curr.quantity_available || 0) * Number(curr.cost_per_unit || 0)) : 0), 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-amber-500 transition-all text-left">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit mb-4"><Box size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Lab Items In Stock</p>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text"
            placeholder="Search laboratory inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 pl-10 pr-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-teal-500"
          />
        </div>

        <button 
          onClick={() => setShowModal(true)} 
          className="bg-slate-900 text-teal-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 shadow-xl active:scale-95 transition-all w-full sm:w-auto justify-center cursor-pointer"
        >
          <Plus size={18} /> New Lab Entry
        </button>
      </div>

      {/* 3. TABLE GENERAL LEDGER */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[500px]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <th className="p-8 px-10">Product Asset Item</th>
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
                  </p>
                  <p className="text-[9px] font-bold text-teal-600 uppercase tracking-widest mt-1 italic">
                    LABORATORY (REAGENTS & CONSUMABLES)
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
                    {item.expiry_date || '—'}
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
                  No lab tracking records found.
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
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Lab Stock <span className="text-teal-600">Onboarding</span></h3>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all cursor-pointer"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-12 space-y-6 overflow-y-auto">
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Product Asset Name</label>
                <input required name="name" type="text" placeholder="e.g. Test Tube Vials, Reagents or Syringes" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.name} onChange={handleInputChange} />
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
                    Expiry Date <span className="text-amber-500 font-medium normal-case">(Optional)</span>
                  </label>
                  <input 
                    name="expiry_date" 
                    type="date" 
                    className="w-full border rounded-2xl py-4 px-6 text-xs font-black outline-none bg-slate-50 border-slate-100 focus:border-teal-500"
                    value={formData.expiry_date} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-slate-900 text-teal-400 py-6 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl flex items-center justify-center gap-4 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 mt-4 cursor-pointer">
                {loading ? "SAVING RECORD..." : <><Save size={20}/> Commit to Lab Inventory</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabInventory;