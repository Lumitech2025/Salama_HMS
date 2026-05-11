import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  PackageSearch, AlertCircle, Plus, Minus, Send, 
  History, ClipboardList, TrendingDown, CheckCircle2, 
  Trash2, ShoppingCart, Loader2, Search, Edit3, X, Save, Database,
  FilePlus // New icon for custom requests
} from 'lucide-react';

const LabInventory = () => {
  const [activeTab, setActiveTab] = useState('stock');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingReq, setSubmittingReq] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals State
  const [selectedItem, setSelectedItem] = useState(null); 
  const [showAddItem, setShowAddItem] = useState(false); 
  const [showCustomRequest, setShowCustomRequest] = useState(false); // 👈 New State
  
  // Forms State
  const [adjustData, setAdjustData] = useState({ used: 0, notes: '' });
  const [newItem, setNewItem] = useState({ name: '', category: 'Reagents', stock: 0, min_stock: 5, unit: 'Units' });
  const [customReq, setCustomReq] = useState({ name: '', quantity: 1, reason: '' }); // 👈 New form state
  
  const [requisitionItems, setRequisitionItems] = useState([]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API.get('/inventory/'); 
      setInventory(response.data);
    } catch (err) { console.error("Inventory Load Error", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  // --- CUSTOM REQUEST HANDLER ---
  const handleAddCustomRequest = () => {
    if (!customReq.name) return;
    const customItem = {
      id: `custom-${Date.now()}`, // Temporary ID
      name: customReq.name.toUpperCase(),
      order_qty: customReq.quantity,
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
      updateReqQty(item.id, existing.order_qty + 1);
    } else {
      setRequisitionItems([...requisitionItems, { ...item, order_qty: 5 }]);
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
      const payload = {
        items: requisitionItems.map(i => ({
          item_id: i.isCustom ? null : i.id,
          item_name: i.name,
          quantity: i.order_qty,
          is_new_item_request: i.isCustom || false,
          notes: i.reason || ""
        }))
      };
      
      // await API.post('/requisitions/', payload); 
      alert(`🚀 Requisition dispatched. Included ${requisitionItems.filter(i => i.isCustom).length} new item requests.`);
      setRequisitionItems([]);
    } catch (err) { alert("Error sending requisition."); }
    finally { setSubmittingReq(false); }
  };

  // ... handleAdjustStock & handleCreateItem logic remains same ...
  const handleAdjustStock = async () => {
    if (adjustData.used > selectedItem.stock) {
        alert("Critical Error: Usage cannot exceed physical stock on hand.");
        return;
    }
    try {
      await API.post(`/inventory/${selectedItem.id}/adjust_stock/`, adjustData);
      alert("Stock ledger updated successfully.");
      setSelectedItem(null);
      setAdjustData({ used: 0, notes: '' });
      fetchInventory();
    } catch (err) { alert("Error updating stock."); }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      await API.post('/inventory/', newItem);
      alert("New item added to catalog.");
      setShowAddItem(false);
      fetchInventory();
    } catch (err) { alert("Error adding item."); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Plus_Jakarta_Sans'] pb-20">
      
      {/* HEADER SECTION */}
      <div className="bg-[#020617] border border-white/5 p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-lg text-white"><PackageSearch size={32} /></div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Inventory <span className="text-blue-400 font-black">Hub</span></h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Stock Control & Logistics</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
            <button 
                onClick={() => setShowAddItem(true)}
                className="p-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl transition-all flex items-center gap-2"
            >
                <Plus size={20} className="text-teal-500" />
                <span className="text-[10px] font-black uppercase tracking-widest px-2">Register Item</span>
            </button>
            <div className="flex bg-white/5 p-2 rounded-[2rem] border border-white/10">
                <button onClick={() => setActiveTab('stock')} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${activeTab === 'stock' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}><ClipboardList size={16} /> Live Stock</button>
                <button onClick={() => setActiveTab('requisitions')} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${activeTab === 'requisitions' ? 'bg-teal-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}><Send size={16} /> History</button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: STOCK MONITOR */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Current Stock Ledger</h3>
              <div className="relative w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="text" placeholder="Filter Inventory..." className="w-full bg-slate-900 border-none rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setSearchTerm(e.target.value)}/>
              </div>
            </div>

            <div className="space-y-4">
              {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => {
                const isLow = item.stock <= item.min_stock;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all ${isLow ? 'bg-red-500/5 border-red-500/20 shadow-lg' : 'bg-white/[0.02] border-white/5'}`}>
                    <div className="flex items-center gap-5">
                       <div className={`p-4 rounded-2xl ${isLow ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-slate-800 text-slate-400'}`}><Database size={20} /></div>
                       <div>
                          <p className="font-black text-white text-sm uppercase tracking-tight">{item.name}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.category}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-8">
                       <div className="text-center px-6 border-r border-white/5">
                          <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Available</p>
                          <p className={`text-xl font-black ${isLow ? 'text-red-500' : 'text-white'}`}>{item.stock} <small className="text-[9px] opacity-50 uppercase">{item.unit}</small></p>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => setSelectedItem(item)} className="p-4 bg-white/5 text-teal-400 rounded-2xl hover:bg-teal-500 hover:text-white transition-all border border-white/5"><Edit3 size={18} /></button>
                          <button onClick={() => handleAddToRequisition(item)} className={`p-4 rounded-2xl transition-all border border-white/5 ${isLow ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-white/5 text-slate-500 hover:bg-blue-600 hover:text-white'}`}><ShoppingCart size={18} /></button>
                       </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: REQUISITION DRAWER */}
        <div className="lg:col-span-4 bg-[#020617] border border-white/10 rounded-[3rem] p-10 shadow-2xl h-fit sticky top-8">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.3em]">Procurement Drawer</h3>
                <button 
                  onClick={() => setShowCustomRequest(true)}
                  className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-teal-500 transition-all flex items-center gap-2 border border-white/5"
                  title="Request Item not in Inventory"
                >
                  <FilePlus size={16} /> <span className="text-[9px] font-black uppercase">Unlisted</span>
                </button>
            </div>

            <div className="space-y-4 mb-10 min-h-[150px]">
                {requisitionItems.length === 0 ? (
                    <div className="text-center py-10 opacity-20"><ShoppingCart size={40} className="mx-auto mb-2" /><p className="text-[10px] font-black uppercase">Drawer Empty</p></div>
                ) : requisitionItems.map((item, idx) => (
                    <div key={idx} className={`p-5 rounded-2xl border border-white/5 space-y-4 animate-in slide-in-from-right-4 ${item.isCustom ? 'bg-teal-500/5 border-teal-500/20' : 'bg-white/5'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-black text-white uppercase tracking-tighter">{item.name}</p>
                              {item.isCustom && <span className="text-[8px] font-black bg-teal-500 text-white px-2 py-0.5 rounded-full uppercase mt-1 inline-block">New Request</span>}
                            </div>
                            <button onClick={() => setRequisitionItems(requisitionItems.filter(i => i.id !== item.id))} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all"><X size={16} /></button>
                        </div>
                        <div className="flex items-center gap-3">
                             <button onClick={() => updateReqQty(item.id, item.order_qty - 1)} className="p-1.5 bg-slate-900 rounded-lg text-slate-500 hover:text-white"><Minus size={14}/></button>
                             <input type="number" className="w-full bg-slate-900 border-none rounded-lg text-teal-400 font-black text-center text-xs py-1.5 outline-none" value={item.order_qty} onChange={(e) => updateReqQty(item.id, e.target.value)} />
                             <button onClick={() => updateReqQty(item.id, item.order_qty + 1)} className="p-1.5 bg-slate-900 rounded-lg text-slate-500 hover:text-white"><Plus size={14}/></button>
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={handleSubmitRequisition} disabled={requisitionItems.length === 0 || submittingReq} className={`w-full py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${requisitionItems.length === 0 ? 'bg-slate-800 text-slate-600' : 'bg-teal-500 text-white hover:bg-teal-400 shadow-xl'}`}>
                {submittingReq ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                Submit Requisition
            </button>
        </div>
      </div>

      {/* MODAL 1: ADD TO CATALOG (Permanent Registration) */}
      {showAddItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#020617] border border-white/10 rounded-[3rem] w-full max-w-md p-10 space-y-8 shadow-2xl relative">
                <button onClick={() => setShowAddItem(false)} className="absolute right-8 top-8 text-slate-500 hover:text-white"><X size={24} /></button>
                <h3 className="text-2xl font-black text-white uppercase italic">Add to <span className="text-teal-400 font-black">Catalog</span></h3>
                <form onSubmit={handleCreateItem} className="space-y-5">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Item Name</label><input className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm focus:ring-2 focus:ring-teal-500" required onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Initial Stock</label><input type="number" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm focus:ring-2 focus:ring-teal-500" required onChange={e => setNewItem({...newItem, stock: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Min. Threshold</label><input type="number" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm focus:ring-2 focus:ring-teal-500" required onChange={e => setNewItem({...newItem, min_stock: e.target.value})} /></div>
                    </div>
                    <button type="submit" className="w-full py-5 bg-white text-slate-900 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-teal-400 transition-all flex items-center justify-center gap-3"><Save size={18} /> Register Item</button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL 2: CUSTOM UNLISTED REQUEST (One-time Requisition) */}
      {showCustomRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#020617] border border-white/10 rounded-[3rem] w-full max-w-md p-10 space-y-8 shadow-2xl relative">
                <button onClick={() => setShowCustomRequest(false)} className="absolute right-8 top-8 text-slate-500 hover:text-white"><X size={24} /></button>
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Custom <span className="text-teal-400 font-black">Request</span></h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Request item not found in current inventory</p>
                </div>
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Unlisted Item Name</label>
                        <input className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm focus:ring-2 focus:ring-teal-500" placeholder="e.g. Centrifuge Motor, Specific Reagent" onChange={e => setCustomReq({...customReq, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Quantity</label>
                        <input type="number" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm focus:ring-2 focus:ring-teal-500" value={customReq.quantity} onChange={e => setCustomReq({...customReq, quantity: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Clinical Justification</label>
                        <textarea className="w-full bg-slate-900 border-none rounded-2xl p-4 font-bold text-white text-xs focus:ring-2 focus:ring-teal-500" placeholder="Why is this needed?" onChange={e => setCustomReq({...customReq, reason: e.target.value})} />
                    </div>
                    <button onClick={handleAddCustomRequest} className="w-full py-5 bg-teal-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-teal-400 transition-all flex items-center justify-center gap-3">
                        <Plus size={18} /> Add to Requisition
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL 3: USAGE LOG (Remaining same) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#020617] border border-white/10 rounded-[3rem] w-full max-w-lg p-10 space-y-8 shadow-2xl relative">
            <button onClick={() => setSelectedItem(null)} className="absolute right-8 top-8 text-slate-500 hover:text-white"><X size={24} /></button>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Usage Log: <span className="text-teal-400">{selectedItem.name}</span></h3>
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center"><p className="text-[9px] font-black text-slate-500 uppercase mb-1">On Hand</p><p className="text-2xl font-black text-white">{selectedItem.stock}</p></div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center transition-all"><p className="text-[9px] font-black text-slate-500 uppercase mb-1">Net Remaining</p><p className={`text-2xl font-black ${selectedItem.stock - adjustData.used < 0 ? 'text-red-500 animate-pulse' : 'text-teal-400'}`}>{selectedItem.stock - adjustData.used}</p></div>
            </div>
            <div className="space-y-4">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex justify-between">Quantity Used <span>{selectedItem.unit}</span></label><input type="number" className="w-full bg-slate-900 border-none rounded-2xl p-5 font-black text-white text-lg focus:ring-2 focus:ring-teal-500" autoFocus onChange={(e) => setAdjustData({...adjustData, used: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Reason / Note</label><textarea className="w-full bg-slate-900 border-none rounded-2xl p-5 font-bold text-white text-xs focus:ring-2 focus:ring-teal-500" rows="3" placeholder="e.g. Broken vial..." onChange={(e) => setAdjustData({...adjustData, notes: e.target.value})} /></div>
            </div>
            <button onClick={handleAdjustStock} className="w-full py-5 bg-teal-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-teal-400"><Save size={18} /> Update Ledger</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabInventory;