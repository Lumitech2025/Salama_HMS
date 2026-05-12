import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Package, TrendingDown, PlusCircle, 
  Store, AlertTriangle, Search, ArrowRightLeft, 
  Loader2, X, Save, Factory, Edit3, ClipboardList, Send
} from 'lucide-react';

const InventoryManager = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  
  const [selectedItem, setSelectedPatient] = useState(null);

  // Form States
  const [formData, setFormData] = useState({
    name: '', manufacturer: '', expiry_date: '', strength: '', 
    quantity_in_stock: '', reorder_level: '', selling_price_kes: '', 
    is_hazardous: false, batch_number: ''
  });

  const [requisitionData, setRequisitionData] = useState({
    drug_name: '', quantity: '', priority: 'Normal', notes: ''
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await API.get('/drugs/?store_location=pharmacy');
      setInventory(res.data.results || res.data || []);
    } catch (err) {
      console.error("Inventory sync error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, []);

  // --- Handlers ---
  const handleSaveStock = async (e) => {
    e.preventDefault();
    try {
      await API.post('/drugs/', { ...formData, store_location: 'pharmacy' });
      setShowAddModal(false);
      fetchInventory();
    } catch (err) { alert("Error saving stock entry."); }
  };

  const handleSendRequisition = async (e) => {
    e.preventDefault();
    try {
      // Logic for internal requisition to Main Store
      console.log("Requisition Sent:", requisitionData);
      alert(`Requisition for ${requisitionData.quantity} units of ${requisitionData.drug_name} sent to Main Store.`);
      setShowRequisitionModal(false);
      setRequisitionData({ drug_name: '', quantity: '', priority: 'Normal', notes: '' });
    } catch (err) { alert("Failed to send requisition."); }
  };

  const handleUpdateAmendment = async (e) => {
    e.preventDefault();
    try {
      await API.patch(`/drugs/${selectedItem.id}/`, formData);
      setShowAmendmentModal(false);
      fetchInventory();
    } catch (err) { alert("Amendment failed."); }
  };

  const openAmendment = (item) => {
    setSelectedPatient(item);
    setFormData({ ...item });
    setShowAmendmentModal(true);
  };

  const openDrugRequisition = (item) => {
    setRequisitionData({ ...requisitionData, drug_name: item.name });
    setShowRequisitionModal(true);
  };

  const lowStockCount = inventory.filter(item => item.quantity_in_stock <= item.reorder_level).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
      
      {/* TIER 1: HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                <Store className="text-teal-500" size={32} /> Pharmacy Shop Inventory
            </h2>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
                onClick={() => setShowRequisitionModal(true)}
                className="flex-1 md:flex-none bg-white border border-slate-200 p-4 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2 font-bold text-xs uppercase"
            >
                <ArrowRightLeft size={16} /> Requisition From Main
            </button>
            <button 
                onClick={() => { setFormData({ name: '', manufacturer: '', expiry_date: '', strength: '', quantity_in_stock: '', reorder_level: '', selling_price_kes: '', is_hazardous: false, batch_number: '' }); setShowAddModal(true); }}
                className="flex-1 md:flex-none bg-[#020617] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-teal-600 transition-all shadow-xl active:scale-95"
            >
                <PlusCircle size={18} /> Add Shop Stock
            </button>
        </div>
      </div>

      {/* TIER 2: ANALYTICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnalyticsCard label="Low Stock Alerts" value={String(lowStockCount).padStart(2, '0')} icon={<TrendingDown size={24}/>} color={lowStockCount > 0 ? "red" : "slate"} />
        <AnalyticsCard label="Total Shop Value" value={`Ksh ${(inventory.reduce((acc, curr) => acc + (parseFloat(curr.selling_price_kes) * curr.quantity_in_stock), 0)).toLocaleString()}`} icon={<Package size={24}/>} color="teal" />
        <AnalyticsCard label="Storage Alerts" value={inventory.filter(i => i.is_hazardous).length} icon={<AlertTriangle size={24}/>} color="amber" />
      </div>

      {/* TIER 3: TABLE */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 bg-slate-50/30">
            <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search shop inventory..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/5 transition-all text-sm font-medium" />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-slate-50/50">
                <th className="px-10 py-6">Drug & Manufacturer</th>
                <th className="px-10 py-6">Stock Level</th>
                <th className="px-10 py-6">Retail Price</th>
                <th className="px-10 py-6 text-right pr-14">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="4" className="py-32 text-center"><Loader2 className="animate-spin mx-auto text-teal-500" size={40} /></td></tr>
              ) : inventory.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/80 transition-all">
                  <td className="px-10 py-8">
                    <p className="font-black text-slate-900 uppercase tracking-tight">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.manufacturer}</p>
                  </td>
                  <td className="px-10 py-8">
                    <span className={`text-xl font-black ${item.quantity_in_stock <= item.reorder_level ? 'text-red-500' : 'text-slate-900'}`}>{item.quantity_in_stock}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase ml-2">Min: {item.reorder_level}</span>
                  </td>
                  <td className="px-10 py-8 font-mono font-black text-teal-600">Ksh {parseFloat(item.selling_price_kes).toLocaleString()}</td>
                  <td className="px-10 py-8 text-right pr-14">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => openAmendment(item)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm" title="Amend Data">
                            <Edit3 size={16} />
                        </button>
                        <button onClick={() => openDrugRequisition(item)} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-teal-600 transition-all shadow-sm" title="Requisition Stock">
                            <ArrowRightLeft size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* REQUISITION MODAL */}
      {showRequisitionModal && (
        <Modal title="Inventory Requisition" close={() => setShowRequisitionModal(false)}>
            <form onSubmit={handleSendRequisition} className="p-10 space-y-6">
                <Input label="Drug Name" value={requisitionData.drug_name} onChange={e => setRequisitionData({...requisitionData, drug_name: e.target.value})} placeholder="Enter drug name" />
                <div className="grid grid-cols-2 gap-6">
                    <Input label="Quantity Requesting" type="number" value={requisitionData.quantity} onChange={e => setRequisitionData({...requisitionData, quantity: e.target.value})} />
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Priority</label>
                        <select className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-slate-900 outline-none border-none focus:ring-2 focus:ring-teal-500" value={requisitionData.priority} onChange={e => setRequisitionData({...requisitionData, priority: e.target.value})}>
                            <option>Normal</option>
                            <option>Urgent</option>
                            <option>Critical (Stock Out)</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Internal Notes</label>
                    <textarea className="w-full bg-slate-50 rounded-2xl p-4 font-medium text-slate-900 outline-none border-none min-h-[100px]" placeholder="Reason for requisition..." value={requisitionData.notes} onChange={e => setRequisitionData({...requisitionData, notes: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-teal-500 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-teal-200 hover:bg-[#020617] transition-all flex items-center justify-center gap-3">
                    <Send size={18} /> Submit Requisition
                </button>
            </form>
        </Modal>
      )}

      {/* AMENDMENT MODAL */}
      {showAmendmentModal && (
        <Modal title="Amend Shop Record" close={() => setShowAmendmentModal(false)}>
            <form onSubmit={handleUpdateAmendment} className="p-10 grid grid-cols-2 gap-6">
                <Input label="Drug Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <Input label="Batch Number" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} />
                <Input label="Expiry Date" type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
                <Input label="Selling Price" type="number" value={formData.selling_price_kes} onChange={e => setFormData({...formData, selling_price_kes: e.target.value})} />
                <div className="col-span-2">
                    <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 hover:bg-slate-900 transition-all">
                        Update Shop Record
                    </button>
                </div>
            </form>
        </Modal>
      )}

      {/* ADD MODAL (Existing logic maintained) */}
      {showAddModal && (
        <Modal title="Register Shop Stock" close={() => setShowAddModal(false)}>
            <form onSubmit={handleSaveStock} className="p-10 grid grid-cols-2 gap-6">
                <Input label="Drug Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <Input label="Manufacturer" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} />
                <Input label="Quantity" type="number" value={formData.quantity_in_stock} onChange={e => setFormData({...formData, quantity_in_stock: e.target.value})} />
                <Input label="Price (Ksh)" type="number" value={formData.selling_price_kes} onChange={e => setFormData({...formData, selling_price_kes: e.target.value})} />
                <button className="col-span-2 bg-teal-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all">Finalize Entry</button>
            </form>
        </Modal>
      )}
    </div>
  );
};

// Layout Components
const Modal = ({ title, close, children }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900 uppercase italic">{title}</h3>
                <button onClick={close} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24}/></button>
            </div>
            {children}
        </div>
    </div>
);

const AnalyticsCard = ({ label, value, icon, color }) => (
    <div className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-teal-500 transition-all`}>
        <div className={`p-4 bg-${color}-50 text-${color}-500 rounded-2xl w-fit group-hover:scale-110 transition-transform`}>{icon}</div>
        <h4 className="text-3xl font-black text-slate-950 mt-6 tracking-tighter">{value}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
);

const Input = ({ label, ...props }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
        <input {...props} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-teal-500 transition-all" required />
    </div>
);

export default InventoryManager;