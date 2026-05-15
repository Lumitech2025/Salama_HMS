import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Truck, ShieldCheck, Landmark, FileText, Send, 
  Plus, Search, Phone, Mail, Download, AlertCircle, Star, X, Save, Globe, Landmark as BankIcon, Trash2
} from 'lucide-react';

// --- SUB-COMPONENT: CREATE PO MODAL ---
const CreatePOModal = ({ isOpen, onClose, suppliers }) => {
  const [step, setStep] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [deadline, setDeadline] = useState('');
  const [poItems, setPoItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);
  const [loading, setLoading] = useState(false);

  const addItemRow = () => setPoItems([...poItems, { description: '', quantity: 1, unit_price: 0 }]);
  const removeItemRow = (index) => setPoItems(poItems.filter((_, i) => i !== index));
  const calculateTotal = () => poItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);

  const handleIssuePO = async () => {
    setLoading(true);
    try {
      const payload = {
        supplier: selectedSupplier,
        delivery_deadline: deadline,
        items: poItems,
        total_estimated_cost: calculateTotal(),
      };
      await API.post('/purchase-orders/', payload);
      alert("Purchase Order Issued Successfully");
      onClose();
    } catch (err) {
      console.error("PO Creation Failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">New <span className="text-teal-600">Purchase Order</span></h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
        </div>

        <div className="p-12 overflow-y-auto flex-1">
          {step === 1 ? (
            <div className="grid grid-cols-2 gap-8 text-left animate-in slide-in-from-right-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Select Vendor</label>
                <select 
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none"
                >
                  <option value="">Select Partner...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Expected Delivery</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" />
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="pb-4 px-2 w-1/2">Item Description</th>
                    <th className="pb-4 px-2">Qty</th>
                    <th className="pb-4 px-2">Unit Price</th>
                    <th className="pb-4 px-2 text-right">Line Total</th>
                    <th className="pb-4 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {poItems.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50">
                      <td className="py-4 px-2">
                        <input type="text" placeholder="Item Name..." className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none" 
                          value={row.description} onChange={(e) => {
                            const list = [...poItems];
                            list[idx].description = e.target.value;
                            setPoItems(list);
                          }}
                        />
                      </td>
                      <td className="py-4 px-2">
                        <input type="number" className="w-20 bg-slate-50 rounded-xl py-3 px-2 text-xs font-bold text-center outline-none" 
                          value={row.quantity} onChange={(e) => {
                            const list = [...poItems];
                            list[idx].quantity = e.target.value;
                            setPoItems(list);
                          }}
                        />
                      </td>
                      <td className="py-4 px-2 font-black italic">
                        <input type="number" className="w-32 bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none" 
                           value={row.unit_price} onChange={(e) => {
                             const list = [...poItems];
                             list[idx].unit_price = e.target.value;
                             setPoItems(list);
                           }}
                        />
                      </td>
                      <td className="py-4 px-2 text-right font-black italic text-slate-900 text-sm">
                        {(row.quantity * row.unit_price).toLocaleString()}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button onClick={() => removeItemRow(idx)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addItemRow} className="text-[10px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-6 py-3 rounded-xl hover:bg-teal-100 transition-all">
                + Add Item Line
              </button>
            </div>
          )}
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-12">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Estimated Value</p>
            <p className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">KES {calculateTotal().toLocaleString()}</p>
          </div>
          <div className="flex gap-4">
            {step === 2 && <button onClick={() => setStep(1)} className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Back</button>}
            <button 
              onClick={() => step === 1 ? setStep(2) : handleIssuePO()}
              disabled={loading}
              className="bg-[#020617] text-teal-400 px-12 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl flex items-center gap-3 active:scale-95 transition-all"
            >
              {loading ? 'Processing...' : step === 1 ? 'Configure Items' : 'Issue Purchase Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const SupplierManagement = () => {
  const [activeSubTab, setActiveSubTab] = useState('directory');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [supplierForm, setSupplierForm] = useState({
    name: '', category: 'PHARMA', contact_person: '', email: '', phone: '',
    tin_number: '', bank_name: '', account_number: '', swift_code: '',
    payment_terms: 'Net 30', contract_document: null
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await API.get('/suppliers/');
      setSuppliers(res.data.results || res.data);
    } catch (err) { console.error("Fetch error", err); }
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    Object.keys(supplierForm).forEach(key => formData.append(key, supplierForm[key]));
    try {
      await API.post('/suppliers/', formData);
      setShowSupplierModal(false);
      fetchSuppliers();
    } catch (err) { alert("Error onboarding supplier."); } 
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] text-left">
      
      {/* 1. KPI HEADERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Accounts Payable</p>
          <h3 className="text-3xl font-black text-rose-600 tracking-tighter italic uppercase leading-none text-left">KES 8,400,000</h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Contracts</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">{suppliers.length} Partners</h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Open Purchase Orders</p>
          <h3 className="text-3xl font-black text-teal-600 tracking-tighter italic uppercase leading-none">07 Pending</h3>
        </div>
      </div>

      {/* 2. SUB-TAB TOGGLE & MAIN ACTION */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-50">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
          {[
            { id: 'metrics', label: 'Financial Metrics', icon: Landmark },
            { id: 'directory', label: 'Supplier Directory', icon: Truck },
            { id: 'procurement', label: 'Purchase Orders', icon: Send },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={() => activeSubTab === 'procurement' ? setShowPOModal(true) : setShowSupplierModal(true)}
          className="bg-[#020617] text-teal-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl active:scale-95"
        >
          <Plus size={18} /> {activeSubTab === 'procurement' ? 'Create New PO' : 'Add Supplier'}
        </button>
      </div>

      {/* 3. DYNAMIC CONTENT AREA */}
      <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl min-h-[500px] overflow-hidden">
        {activeSubTab === 'directory' && (
          <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
             {suppliers.length > 0 ? suppliers.map(vendor => (
                <div key={vendor.id} className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 group hover:bg-white transition-all hover:shadow-xl">
                    <div className="flex justify-between items-start mb-6 text-left">
                        <div className="bg-white p-4 rounded-2xl text-teal-600 shadow-sm group-hover:bg-teal-500 group-hover:text-white transition-all"><ShieldCheck size={24}/></div>
                        <div className="flex gap-1 text-amber-400">
                            {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor"/>)}
                        </div>
                    </div>
                    
                    <h4 className="text-2xl font-black text-slate-900 italic uppercase leading-none mb-1 text-left">{vendor.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-4 mb-6 text-left">{vendor.category_display || 'Oncology Supplier'}</p>

                    <div className="grid grid-cols-2 gap-y-4 mb-8 text-left">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Bank Details</p>
                            <p className="text-xs font-bold text-slate-700 uppercase italic truncate pr-4">{vendor.bank_name || 'Not Set'} • {vendor.account_number || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Agreement Terms</p>
                            <p className="text-xs font-bold text-slate-700 uppercase italic underline decoration-teal-500 underline-offset-4">{vendor.payment_terms}</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                        {vendor.contract_document ? (
                            <a href={vendor.contract_document} target="_blank" rel="noreferrer" className="text-teal-600 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:underline text-left">
                                <FileText size={14}/> View Contract PDF
                            </a>
                        ) : (
                            <span className="text-slate-400 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-50">
                                <AlertCircle size={14}/> No PDF Attached
                            </span>
                        )}
                        <button 
                            onClick={() => { setActiveSubTab('procurement'); setShowPOModal(true); }}
                            className="bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-teal-500 transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <Send size={14}/> Raise PO
                        </button>
                    </div>
                </div>
             )) : (
                 <div className="col-span-2 py-20 text-center uppercase font-black text-slate-300 italic tracking-[0.5em]">No Suppliers in Registry</div>
             )}
          </div>
        )}

        {activeSubTab === 'procurement' && (
          <div className="p-20 text-center animate-in fade-in">
             <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6"><Send size={32} /></div>
             <h4 className="text-xl font-black text-slate-900 uppercase italic leading-none">Purchase Order (PO) Hub</h4>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4 max-w-sm mx-auto leading-relaxed">Select a vendor from the directory to initiate a formal procurement request or use the button above.</p>
          </div>
        )}
      </div>

      {/* MODAL: ONBOARD SUPPLIER */}
      {showSupplierModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowSupplierModal(false)}></div>
              <div className="relative bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 px-12">
                      <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Vendor <span className="text-teal-600">Onboarding</span></h3>
                      <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
                  </div>
                  
                  <form onSubmit={handleSupplierSubmit} className="p-12 space-y-8 max-h-[70vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-8 text-left">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                              <input required type="text" onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" placeholder="e.g. Roche Kenya" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                              <select onChange={(e) => setSupplierForm({...supplierForm, category: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500 uppercase tracking-tighter">
                                  <option value="PHARMA">Pharmaceuticals</option>
                                  <option value="LAB">Lab Reagents</option>
                                  <option value="GEN">General Supplies</option>
                              </select>
                          </div>
                      </div>
                      <div className="p-8 bg-slate-50 rounded-[2rem] space-y-6">
                          <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] flex items-center gap-2"><BankIcon size={14}/> Settlement Details</p>
                          <div className="grid grid-cols-3 gap-6 text-left">
                              <div className="space-y-2 text-left">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                                  <input type="text" onChange={(e) => setSupplierForm({...supplierForm, bank_name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                              </div>
                              <div className="space-y-2 text-left">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">A/C Number</label>
                                  <input type="text" onChange={(e) => setSupplierForm({...supplierForm, account_number: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                              </div>
                              <div className="space-y-2 text-left">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SWIFT Code</label>
                                  <input type="text" onChange={(e) => setSupplierForm({...supplierForm, swift_code: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                              </div>
                          </div>
                      </div>
                      <button disabled={loading} className="w-full bg-[#020617] text-teal-400 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3">
                          {loading ? 'Processing...' : <><Save size={18}/> Commit Supplier to Registry</>}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* PO MODAL INTEGRATION */}
      <CreatePOModal 
        isOpen={showPOModal} 
        onClose={() => setShowPOModal(false)} 
        suppliers={suppliers} 
      />
    </div>
  );
};

export default SupplierManagement;