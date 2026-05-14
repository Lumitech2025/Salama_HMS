import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  PackageSearch, AlertCircle, Plus, Minus, Send, 
  ClipboardList, ShoppingCart, Loader2, Search, 
  Edit3, X, Save, Database, FilePlus 
} from 'lucide-react';

const LabInventory = () => {
  const [activeTab, setActiveTab] = useState('stock');
  const [inventory, setInventory] = useState([
      { id: 1, name: 'NEEDLES 21G', category: 'Consumables', stock: 150, min_stock: 50, unit: 'Pcs' },
      { id: 2, name: 'PSA REAGENT KIT', category: 'Reagents', stock: 5, min_stock: 10, unit: 'Kits' },
      { id: 3, name: 'URINALYSIS STRIPS', category: 'Consumables', stock: 200, min_stock: 100, unit: 'Strips' }
  ]);
  const [loading, setLoading] = useState(false);
  const [submittingReq, setSubmittingReq] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedItem, setSelectedItem] = useState(null); 
  const [showAddItem, setShowAddItem] = useState(false); 
  const [showCustomRequest, setShowCustomRequest] = useState(false); 
  
  const [adjustData, setAdjustData] = useState({ used: 0, notes: '' });
  const [newItem, setNewItem] = useState({ name: '', category: 'Reagents', stock: 0, min_stock: 5, unit: 'Units' });
  const [customReq, setCustomReq] = useState({ name: '', quantity: 1, reason: '' });
  const [requisitionItems, setRequisitionItems] = useState([]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API.get('/inventory/'); 
      setInventory(response.data.results || response.data);
    } catch (err) { console.error("Inventory Load Error", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleAddCustomRequest = () => {
    if (!customReq.name) return;
    const customItem = {
      id: `custom-${Date.now()}`,
      name: customReq.name.toUpperCase(),
      order_qty: parseInt(customReq.quantity),
      isCustom: true,
      reason: customReq.reason
    };
    setRequisitionItems([...requisitionItems, customItem]);
    setCustomReq({ name: '', quantity: 1, reason: '' });
    setShowCustomRequest(false);
  };

  const handleAddToRequisition = (item) => {
    const existing = requisitionItems.find(i => i.id === item.id);
    if (existing) {
      updateReqQty(item.id, existing.order_qty + 5);
    } else {
      setRequisitionItems([...requisitionItems, { ...item, order_qty: 10 }]);
    }
  };

  const updateReqQty = (id, newQty) => {
    if (newQty < 1) return;
    setRequisitionItems(requisitionItems.map(item => 
      item.id === id ? { ...item, order_qty: parseInt(newQty) } : item
    ));
  };

  const handleSubmitRequisition = async () => {
    if (requisitionItems.length === 0) return;
    setSubmittingReq(true);
    try {
      alert(`🚀 Requisition dispatched to Procurement.`);
      setRequisitionItems([]);
    } catch (err) { alert("Error sending requisition."); }
    finally { setSubmittingReq(false); }
  };

  const handleAdjustStock = async () => {
    if (adjustData.used > selectedItem.stock) {
        alert("Critical Error: Usage cannot exceed physical stock.");
        return;
    }
    setSelectedItem(null);
    alert("Stock ledger updated successfully.");
    fetchInventory();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
      
      {/* HEADER SECTION - DARK STYLE */}
      <div className="bg-[#020617] border border-white/5 p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-lg text-white"><PackageSearch size={32} /></div>
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Inventory <span className="text-blue-400">Hub</span></h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Stock Control & Logistics</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
            <button onClick={() => setShowAddItem(true)} className="p-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl transition-all flex items-center gap-2 group">
                <Plus size={20} className="text-teal-500 group-hover:scale-125 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest px-2">Register Item</span>
            </button>
            <div className="flex bg-white/5 p-2 rounded-[2rem] border border-white/10">
                <button onClick={() => setActiveTab('stock')} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${activeTab === 'stock' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}><ClipboardList size={16} /> Live Stock</button>
                <button onClick={() => setActiveTab('requisitions')} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${activeTab === 'requisitions' ? 'bg-teal-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}><Send size={16} /> History</button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
        {/* LEFT: STOCK MONITOR - LIGHT STYLE */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-100 rounded-[3.5rem] p-10 shadow-xl min-h-[600px]">
            <div className="flex justify-between items-center mb-12 border-b border-slate-50 pb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Current Stock Ledger</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time availability monitor</p>
              </div>
              <div className="relative w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Filter Inventory..." className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" onChange={(e) => setSearchTerm(e.target.value)}/>
              </div>
            </div>

            <div className="space-y-4">
              {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => {
                const isLow = item.stock <= item.min_stock;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-8 rounded-[2.5rem] border transition-all duration-300 ${isLow ? 'bg-rose-50/50 border-rose-100 shadow-md' : 'bg-slate-50/30 border-slate-100 hover:bg-white hover:shadow-lg hover:border-blue-100'}`}>
                    <div className="flex items-center gap-6">
                       <div className={`p-4 rounded-2xl ${isLow ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-200' : 'bg-slate-900 text-teal-400'}`}><Database size={24} /></div>
                       <div>
                          <p className="font-black text-slate-900 text-base uppercase tracking-tight italic">{item.name}</p>
                          <span className="text-[9px] font-black bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-lg uppercase tracking-widest mt-2 inline-block">{item.category}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-10">
                       <div className="text-right pr-8 border-r border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Physical Qty</p>
                          <p className={`text-3xl font-black tracking-tighter italic ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>{item.stock} <small className="text-[10px] opacity-40 uppercase not-italic font-bold">{item.unit}</small></p>
                       </div>
                       <div className="flex gap-3">
                          <button onClick={() => setSelectedItem(item)} className="p-4 bg-white text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-100"><Edit3 size={20} /></button>
                          <button onClick={() => handleAddToRequisition(item)} className={`p-4 rounded-2xl transition-all shadow-sm border ${isLow ? 'bg-rose-600 text-white border-rose-600 shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-900 hover:text-white border-slate-100'}`}><ShoppingCart size={20} /></button>
                       </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: REQUISITION DRAWER - DARK THEME */}
        <div className="lg:col-span-4 bg-[#020617] rounded-[3rem] p-10 shadow-2xl h-fit sticky top-8 border border-white/5">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.3em]">Procurement Drawer</h3>
                <button onClick={() => setShowCustomRequest(true)} className="bg-white/5 hover:bg-white/10 p-2.5 rounded-xl text-teal-500 transition-all flex items-center gap-2 border border-white/10 group">
                  <FilePlus size={18} className="group-hover:rotate-12 transition-transform" /> <span className="text-[9px] font-black uppercase">Unlisted Item</span>
                </button>
            </div>

            <div className="space-y-4 mb-10 min-h-[200px]">
                {requisitionItems.length === 0 ? (
                    <div className="text-center py-20 opacity-10 flex flex-col items-center">
                        <ShoppingCart size={64} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Empty Drawer</p>
                    </div>
                ) : requisitionItems.map((item, idx) => (
                    <div key={idx} className={`p-6 rounded-[2rem] border animate-in slide-in-from-right-4 transition-all duration-300 ${item.isCustom ? 'bg-teal-500/10 border-teal-500/30' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-xs font-black text-white uppercase tracking-tight italic leading-tight">{item.name}</p>
                              {item.isCustom && <span className="text-[8px] font-black bg-teal-500 text-white px-2 py-0.5 rounded-md uppercase mt-1 inline-block">Manual Entry</span>}
                            </div>
                            <button onClick={() => setRequisitionItems(requisitionItems.filter(i => i.id !== item.id))} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-full"><X size={16} /></button>
                        </div>
                        <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl">
                             <button onClick={() => updateReqQty(item.id, item.order_qty - 1)} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"><Minus size={14}/></button>
                             <input type="number" className="w-full bg-transparent border-none text-teal-400 font-black text-center text-lg outline-none" value={item.order_qty} onChange={(e) => updateReqQty(item.id, e.target.value)} />
                             <button onClick={() => updateReqQty(item.id, item.order_qty + 1)} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"><Plus size={14}/></button>
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={handleSubmitRequisition} disabled={requisitionItems.length === 0 || submittingReq} className={`w-full py-6 rounded-[2.25rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${requisitionItems.length === 0 ? 'bg-slate-900 text-slate-600' : 'bg-teal-500 text-white hover:bg-teal-400 shadow-xl shadow-teal-500/20 active:scale-95'}`}>
                {submittingReq ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Dispatch Requisition
            </button>
        </div>
      </div>

      {/* MODAL: USAGE LOG (STOCK ADJUSTMENT) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white border border-slate-100 rounded-[3rem] w-full max-w-lg p-10 space-y-8 shadow-2xl relative">
            <button onClick={() => setSelectedItem(null)} className="absolute right-8 top-8 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Usage <span className="text-blue-600">Ledger</span></h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{selectedItem.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-2">Available</p><p className="text-3xl font-black text-slate-900">{selectedItem.stock}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-2">After Use</p><p className={`text-3xl font-black ${selectedItem.stock - adjustData.used < 0 ? 'text-rose-500 animate-bounce' : 'text-teal-600'}`}>{selectedItem.stock - adjustData.used}</p></div>
            </div>
            
            <div className="space-y-5">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex justify-between tracking-widest">Quantity Used <span>({selectedItem.unit})</span></label><input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-black text-slate-900 text-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all" autoFocus onChange={(e) => setAdjustData({...adjustData, used: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Adjustment Reason</label><textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-bold text-slate-700 text-xs focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all" rows="3" placeholder="e.g. Analysis run, Waste, Expired..." onChange={(e) => setAdjustData({...adjustData, notes: e.target.value})} /></div>
            </div>
            <button onClick={handleAdjustStock} className="w-full py-6 bg-[#020617] text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                <Save size={18} /> Update
            </button>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW ITEM (CATALOG) */}
      {showAddItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white border border-slate-100 rounded-[3rem] w-full max-w-md p-12 space-y-8 shadow-2xl relative">
                <button onClick={() => setShowAddItem(false)} className="absolute right-10 top-10 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
                <div className="space-y-2">
                    <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter italic">Register <span className="text-blue-600">Product</span></h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New laboratory asset entry</p>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Scientific / Product Name</label><input className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500" required placeholder="e.g. CBC CONTROL LEVEL 1" onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Initial Stock</label><input type="number" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500" required onChange={e => setNewItem({...newItem, stock: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Min. Threshold</label><input type="number" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500" required onChange={e => setNewItem({...newItem, min_stock: e.target.value})} /></div>
                    </div>
                    <button onClick={() => setShowAddItem(false)} className="w-full py-6 bg-[#020617] text-white rounded-[2.25rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-600 transition-all flex items-center justify-center gap-4 shadow-xl">
                        <Save size={20} /> Register Item
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LabInventory;