import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Package, Calendar, Plus, Search, X, Save, Box, TrendingUp, AlertCircle, Trash2, Layers
} from 'lucide-react';

const MainStoreLedger = () => {
  const [activeDeptFilter, setActiveDeptFilter] = useState('ALL'); 
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);

  // Form Fields State matching Django choices
  const [formData, setFormData] = useState({
    name: '',
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

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await API.get('/inventory-items/');
      setInventory(res.data.results || res.data || []);
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

    // Format payload to properly handle optional expiry dates for Django backend requirements
    const submitPayload = {
      ...formData,
      expiry_date: formData.expiry_date || null
    };

    try {
      await API.post('/inventory-items/', submitPayload);
      setShowModal(false);
      fetchInventory();
      setFormData({ 
        name: '', 
        quantity_available: '', 
        cost_per_unit: '', 
        department: 'PHARMACY', 
        batch_number: '', 
        expiry_date: '' 
      });
    } catch (err) {
      alert("Error saving inventory item. Check backend logs and console.");
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (activeDeptFilter === 'ALL') return true;
    return item.department === activeDeptFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
      
      {/* 1. KPI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-teal-500 transition-all">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl w-fit mb-4"><TrendingUp size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
            {activeDeptFilter === 'ALL' ? 'Total Assets Value' : `${activeDeptFilter} Asset Value`}
          </p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            KES {filteredInventory.reduce((acc, curr) => acc + (Number(curr.quantity_available) * Number(curr.cost_per_unit)), 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-amber-500 transition-all text-left">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit mb-4"><Box size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Items In Stock</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            {filteredInventory.reduce((acc, curr) => acc + Number(curr.quantity_available), 0).toLocaleString()} <span className="text-sm">Units</span>
          </h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-rose-500 transition-all text-left">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl w-fit mb-4"><Calendar size={20}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Expiring Soon</p>
          <h3 className="text-3xl font-black text-rose-500 tracking-tighter italic uppercase leading-none">
             {filteredInventory.filter(i => i.expiry_date && new Date(i.expiry_date) < new Date(Date.now() + 90*24*60*60*1000)).length} Batches
          </h3>
        </div>
      </div>

      {/* 2. DEPARTMENT FILTER TOGGLES & ENTRY ACTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-4 rounded-[2.5rem] border border-slate-50 shadow-sm">
        <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap gap-1 max-w-full">
          {departmentTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveDeptFilter(tab.key)}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeDeptFilter === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button 
          onClick={() => setShowModal(true)} 
          className="bg-slate-900 text-teal-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 shadow-xl active:scale-95 transition-all w-full xl:w-auto justify-center"
        >
          <Plus size={18} /> New Inventory Entry
        </button>
      </div>

      {/* 3. INVENTORY TABLE VIEW */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[500px]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <th className="p-8 px-10">Product & Department</th>
              <th className="p-8 text-center">Batch No</th>
              <th className="p-8 text-center">Qty</th>
              <th className="p-8 text-center">Cost/Unit</th>
              <th className="p-8">Expiry</th>
              <th className="p-8 text-right pr-10">Stock Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-left">
            {filteredInventory.length > 0 ? filteredInventory.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-all group animate-in fade-in duration-300">
                <td className="p-8 px-10">
                  <p className="font-black text-slate-900 uppercase italic text-sm">{item.name}</p>
                  <p className="text-[9px] font-bold text-teal-600 uppercase tracking-widest mt-1 italic">
                    {item.department === 'LAB' ? 'LABORATORY' : item.department === 'ADMIN' ? 'GENERAL ADMIN' : item.department}
                  </p>
                </td>
                <td className="p-8 text-center">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black italic uppercase tracking-tighter">#{item.batch_number}</span>
                </td>
                <td className="p-8 text-center font-black text-slate-900 italic text-base">
                  {Number(item.quantity_available).toLocaleString()} <span className="text-[10px] text-slate-400 ml-1 font-bold">Units</span>
                </td>
                <td className="p-8 text-center text-xs font-bold text-slate-500 italic uppercase tracking-tighter">
                  KES {Number(item.cost_per_unit).toLocaleString()}
                </td>
                <td className="p-8">
                   <p className={`font-black italic text-xs ${item.expiry_date && new Date(item.expiry_date) < new Date() ? 'text-rose-600' : 'text-slate-900'}`}>
                      {item.expiry_date || ' '}
                   </p>
                </td>
                <td className="p-8 text-right pr-10">
                  <p className="font-black text-slate-900 italic text-sm">
                    KES {(Number(item.quantity_available) * Number(item.cost_per_unit)).toLocaleString()}
                  </p>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="p-40 text-center text-slate-300 font-black uppercase italic tracking-[0.3em]">
                  No tracking records found under {activeDeptFilter === 'ALL' ? 'any storage point' : `the ${activeDeptFilter} registry`}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: DIRECT STOCK ONBOARDING */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 text-left">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center px-12">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Stock <span className="text-teal-600">Onboarding</span></h3>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-12 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Product Name</label>
                <input required name="name" type="text" placeholder="e.g. Paclitaxel 500 MG" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.name} onChange={handleInputChange} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Consuming Dept</label>
                    <select name="department" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-black outline-none appearance-none cursor-pointer focus:border-teal-500" value={formData.department} onChange={handleInputChange}>
                        <option value="PHARMACY">PHARMACY</option>
                        <option value="LAB">LABORATORY</option>
                        <option value="NURSING">NURSING</option>
                        <option value="RADIOLOGY">RADIOLOGY</option>
                        <option value="ADMIN">GENERAL ADMIN</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Batch Number</label>
                    <input required name="batch_number" type="text" placeholder="e.g. BT215" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.batch_number} onChange={handleInputChange} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Quantity</label>
                    <input required name="quantity_available" type="number" min="0" placeholder="0" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.quantity_available} onChange={handleInputChange} />
                </div>
                <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Cost/Unit</label>
                    <input required name="cost_per_unit" type="number" step="0.01" min="0" placeholder="KES" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.cost_per_unit} onChange={handleInputChange} />
                </div>
                <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Expiry <span className="text-slate-300 lowercase font-medium">(optional)</span></label>
                    <input name="expiry_date" type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-black outline-none focus:border-teal-500" value={formData.expiry_date} onChange={handleInputChange} />
                </div>
              </div>

              <button disabled={loading} className="w-full bg-slate-900 text-teal-400 py-7 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl flex items-center justify-center gap-4 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50">
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