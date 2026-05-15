import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Package, FileText, Calendar, Truck, Plus, Search, 
  Download, ArrowRight, X, Save, AlertCircle 
} from 'lucide-react';

const MainStoreLedger = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State for Receiving Stock
  const [formData, setFormData] = useState({
    item: '',
    supplier: '',
    invoice_number: '',
    batch_number: '',
    quantity: '',
    buying_price: '',
    expiry_date: '',
    due_date: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Logic: 1. Create/Find Invoice -> 2. Create Batch -> 3. Update Inventory
      await API.post('/main-store-batches/', formData);
      setShowModal(false);
      // fetchUpdatedData(); 
    } catch (err) {
      console.error("Procurement error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
      
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Store Valuation</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">KES 14,800,000</h3>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expiry Risk</p>
          <h3 className="text-3xl font-black text-rose-500 tracking-tighter italic">KES 1,240,000</h3>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendor Debt</p>
          <h3 className="text-3xl font-black text-amber-600 tracking-tighter italic">KES 3,100,000</h3>
        </div>
      </div>

      {/* Navigation & Actions */}
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 w-fit">
          {[
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'invoices', label: 'Invoices', icon: FileText },
            { id: 'vendors', label: 'Suppliers', icon: Truck },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Quick search..." className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-64 focus:border-teal-500 transition-all" />
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-teal-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-teal-700 shadow-lg shadow-teal-600/20 active:scale-95 transition-all"
          >
            <Plus size={16} /> Receive Stock
          </button>
        </div>
      </div>

      {/* Dynamic Table Content */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'inventory' ? (
          <table className="w-full text-left animate-in slide-in-from-bottom-4">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-8">Item Description</th>
                <th className="p-8">Batch/Invoice</th>
                <th className="p-8">Quantity</th>
                <th className="p-8">Valuation</th>
                <th className="p-8">Expiry</th>
                <th className="p-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-8">
                  <p className="font-black text-slate-900 uppercase italic">Cisplatin 50mg</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Cytotoxic Agent</p>
                </td>
                <td className="p-8">
                  <p className="text-xs font-bold text-slate-700 uppercase">BT-2024-X</p>
                  <button className="text-[9px] text-teal-600 font-black uppercase tracking-tighter mt-1 hover:underline">Invoice #8820</button>
                </td>
                <td className="p-8 text-sm font-black text-slate-900 italic">45 Vials</td>
                <td className="p-8 text-sm font-black text-slate-900 italic">KES 369,000</td>
                <td className="p-8">
                  <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg">14 JUN 2027</span>
                </td>
                <td className="p-8 text-right"><ArrowRight size={18} className="text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" /></td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="p-40 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4 italic">
                {activeTab === 'invoices' ? <FileText size={32}/> : <Truck size={32}/>}
             </div>
             <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">{activeTab} module under active audit</p>
          </div>
        )}
      </div>

      {/* MODAL: Receive New Stock */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden text-left">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Procurement <span className="text-teal-600">Entry</span></h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                  <select name="supplier" onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-5 text-xs font-bold outline-none focus:border-teal-500">
                    <option value="">Select Vendor...</option>
                    <option value="1">Roche Kenya</option>
                    <option value="2">Mission for Essential Drugs</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Number</label>
                  <input name="invoice_number" onChange={handleInputChange} type="text" placeholder="INV-2024-..." className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-5 text-xs font-bold outline-none focus:border-teal-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch #</label>
                  <input name="batch_number" onChange={handleInputChange} type="text" placeholder="BT-..." className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input name="quantity" onChange={handleInputChange} type="number" placeholder="0" className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date</label>
                  <input name="expiry_date" onChange={handleInputChange} type="date" className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-teal-400 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
              >
                {loading ? "Processing..." : <><Save size={18}/> Commit to Ledger</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainStoreLedger;