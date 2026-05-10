import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  PackageSearch, AlertCircle, Plus, Minus, Send, 
  History, ClipboardList, TrendingDown, CheckCircle2, 
  Trash2, ShoppingCart, Loader2, Search, Edit3, X, Save
} from 'lucide-react';

const LabInventory = () => {
  const [activeTab, setActiveTab] = useState('stock');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null); // For Adjustment Modal
  const [adjustData, setAdjustData] = useState({ used: 0, notes: '' });
  const [requisitionItems, setRequisitionItems] = useState([]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API.get('/inventory/'); // Ensure endpoint exists
      setInventory(response.data);
    } catch (err) {
      console.error("Inventory Load Error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleAdjustStock = async () => {
    try {
      await API.post(`/inventory/${selectedItem.id}/adjust_stock/`, adjustData);
      alert("Stock ledger updated.");
      setSelectedItem(null);
      fetchInventory();
    } catch (err) {
      alert("Error updating stock.");
    }
  };

  const handleAddToRequisition = (item) => {
    if (!requisitionItems.find(i => i.id === item.id)) {
      setRequisitionItems([...requisitionItems, { ...item, order_qty: 1 }]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Plus_Jakarta_Sans'] pb-20">
      
      {/* HEADER SECTION (Same as before) */}
      <div className="bg-[#020617] border border-white/5 p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-lg text-white"><PackageSearch size={32} /></div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Inventory <span className="text-blue-400">Hub</span></h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Stock Control & Requisitions</p>
          </div>
        </div>
        <div className="relative z-10 flex bg-white/5 p-2 rounded-[2rem] border border-white/10">
          <button onClick={() => setActiveTab('stock')} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${activeTab === 'stock' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}><ClipboardList size={16} /> Live Stock</button>
          <button onClick={() => setActiveTab('requisitions')} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${activeTab === 'requisitions' ? 'bg-teal-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}><Send size={16} /> Requisitions</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: STOCK MONITOR */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Current Stock Ledger</h3>
              <input 
                className="bg-slate-900 border-none rounded-xl py-2 px-4 text-xs font-bold outline-none text-white w-64" 
                placeholder="Filter Items..." 
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => {
                const isLow = item.stock <= item.min_stock;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all ${isLow ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                    <div className="flex items-center gap-5">
                       <div className={`p-4 rounded-2xl ${isLow ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'}`}><PackageSearch size={20} /></div>
                       <div>
                          <p className="font-black text-white text-sm uppercase tracking-tight">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{item.category}</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-6">
                       <div className="text-center px-4 border-r border-white/5">
                          <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Available</p>
                          <p className={`text-xl font-black ${isLow ? 'text-red-500' : 'text-white'}`}>{item.stock} <small className="text-[9px] opacity-50 uppercase">{item.unit}</small></p>
                       </div>
                       
                       <div className="flex gap-2">
                          <button onClick={() => setSelectedItem(item)} className="p-3 bg-white/5 text-teal-400 rounded-xl hover:bg-white/10" title="Log Usage"><Edit3 size={18} /></button>
                          <button onClick={() => handleAddToRequisition(item)} className={`p-3 rounded-xl transition-all ${isLow ? 'bg-red-600 text-white' : 'bg-white/5 text-slate-500'}`}><ShoppingCart size={18} /></button>
                       </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: REQUISITION PANEL (Shortened for space) */}
        <div className="lg:col-span-4 bg-teal-600/10 border border-teal-500/20 rounded-[3rem] p-10 shadow-2xl h-fit">
            <h3 className="text-sm font-black text-teal-400 uppercase tracking-[0.2em] mb-8">Requisition Drawer</h3>
            <div className="space-y-4 mb-10">
                {requisitionItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-white uppercase">{item.name}</p>
                        <input type="number" className="w-16 bg-white/5 border-none text-teal-400 font-black text-xs p-1 rounded text-center" defaultValue={1} />
                    </div>
                ))}
            </div>
            <button className="w-full py-5 bg-white text-slate-900 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-teal-400 transition-all flex items-center justify-center gap-2">
                <Send size={16} /> Submit to Accounts
            </button>
        </div>
      </div>

      {/* MODAL: STOCK ADJUSTMENT */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#020617] border border-white/10 rounded-[3rem] w-full max-w-lg p-10 space-y-8 shadow-2xl">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Usage Log: <span className="text-teal-400">{selectedItem.name}</span></h3>
                <button onClick={() => setSelectedItem(null)} className="text-slate-500 hover:text-white"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">On Hand</p>
                    <p className="text-2xl font-black text-white">{selectedItem.stock}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Remaining</p>
                    <p className="text-2xl font-black text-teal-400">{selectedItem.stock - adjustData.used}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Quantity Used Today</label>
                    <input 
                        type="number" 
                        className="w-full bg-slate-900 border-none rounded-2xl p-5 font-black text-white text-lg focus:ring-2 focus:ring-teal-500"
                        onChange={(e) => setAdjustData({...adjustData, used: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Internal Note (Reason)</label>
                    <textarea 
                        className="w-full bg-slate-900 border-none rounded-2xl p-5 font-bold text-white text-xs focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. Broken vial, 10 CBC tests conducted..."
                        onChange={(e) => setAdjustData({...adjustData, notes: e.target.value})}
                    />
                </div>
            </div>

            <button 
                onClick={handleAdjustStock}
                className="w-full py-5 bg-teal-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3 transition-all"
            >
                <Save size={18} /> Commit Ledger Adjustment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabInventory;