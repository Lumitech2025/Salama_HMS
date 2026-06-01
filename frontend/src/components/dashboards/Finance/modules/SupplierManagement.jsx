import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Truck, ShieldCheck, Landmark, FileText, Send, 
  Plus, Search, Phone, Mail, AlertCircle, Star, X, Save, 
  Trash2, Clock, CheckCircle2, Award, Upload, Calendar, Edit2, MoreVertical
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
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [supplierForm, setSupplierForm] = useState({
    name: '', category: 'PHARMA', contact_person: '', email: '', phone: '',
    tin_number: '', license_number: '', bank_name: '', account_number: '', swift_code: '',
    payment_terms: 'Net 30',
    kra_pin_doc: null,
    tax_compliance_doc: null,
    tax_compliance_expiry: '',
    incorporation_doc: null,
    regulatory_license_doc: null,
    bank_confirmation_doc: null
  });

  // 2. Robust Submission Logic
  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData();
    
    // Efficiently append all state keys to FormData
    Object.entries(supplierForm).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    try {
      if (editingSupplier) {
        // Update existing supplier
        await API.put(`/suppliers/${editingSupplier.id}/`, formData);
      } else {
        // Create new supplier
        await API.post('/suppliers/', formData);
      };
      
      setShowSupplierModal(false);
      setEditingSupplier(null)
      setSupplierForm({
        name: '', category: 'PHARMA', contact_person: '', email: '', phone: '',
        tin_number: '', license_number: '', bank_name: '', account_number: '', swift_code: '',
        payment_terms: 'Net 30', kra_pin_doc: null, tax_compliance_doc: null,
        tax_compliance_expiry: '', incorporation_doc: null, regulatory_license_doc: null,
        bank_confirmation_doc: null
      });
      fetchSuppliers();
    } catch (err) { 
      console.error("Submission Error:", err.response?.data || err);
      alert("Error: Failed to save supplier. Please verify all fields and documents."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleFileChange = (field, file) => {
    setSupplierForm(prev => ({ ...prev, [field]: file }));
  };

  const fetchSuppliers = async () => {
    try {
      const response = await API.get('/suppliers/');
      setSuppliers(response.data);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] text-left">
      
      {/* 1. OPERATIONAL & RISK KPI HEADERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Accounts Payable</p>
            <h3 className="text-2xl font-black text-rose-600 tracking-tighter italic uppercase leading-none">KES 8,400,000</h3>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl w-max">
            <Clock size={12}/> 14 Invoices Due
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl text-left flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Partners</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">{suppliers.length} Registered</h3>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl w-max">
            <Award size={12}/> 100% Verified
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl text-left flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Fulfillment Cycle</p>
            <h3 className="text-2xl font-black text-teal-600 tracking-tighter italic uppercase leading-none">4.2 Days</h3>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl w-max">
            <CheckCircle2 size={12}/> -0.8d vs Last Month
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden text-left flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Open Purchase Orders</p>
            <h3 className="text-2xl font-black text-amber-600 tracking-tighter italic uppercase leading-none">07 Pending</h3>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl w-max">
            <Send size={12}/> KES 2.1M Committed
          </div>
        </div>
      </div>

      {/* 2. SUB-TAB TOGGLE */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-50">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
          {[
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
  <div className="animate-in fade-in duration-500 overflow-x-auto">

    
    {suppliers.length > 0 ? (
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <th className="px-8 py-6">Supplier</th>
            <th className="px-4 py-6">Category</th>
            <th className="px-4 py-6">Contact</th>
            <th className="px-4 py-6">Status</th>
            <th className="px-8 py-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map(vendor => (
            <tr key={vendor.id}
            onClick={() => setSelectedSupplier(vendor)} 
            className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-6">
                <p className="font-black text-slate-900 text-sm">{vendor.name}</p>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{vendor.tin_number}</p>
              </td>
              <td className="px-4 py-6 text-xs font-bold text-slate-600 uppercase">{vendor.category}</td>
              <td className="px-4 py-6">
                <p className="text-xs font-bold text-slate-900">{vendor.contact_person}</p>
                <p className="text-[10px] text-slate-400">{vendor.phone}</p>
              </td>
              <td className="px-4 py-6">
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Verified</span>
              </td>
              <td className="px-8 py-6 text-right">
                <button 
                  onClick={() => {
                    setSupplierForm(vendor); // Populate form with existing data
                    setEditingSupplier(vendor); // Track that we are editing
                    setShowSupplierModal(true);
                  }}
                  className="text-slate-400 hover:text-teal-600 transition-colors p-2"
                >
                  <Edit2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className="py-20 text-center uppercase font-black text-slate-300 italic tracking-[0.5em]">No Suppliers in Registry</div>
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
              <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 px-12">
                      <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Vendor <span className="text-teal-600">Onboarding</span></h3>
                      <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
                  </div>
                  
                  <form onSubmit={handleSupplierSubmit} className="p-12 space-y-8 max-h-[75vh] overflow-y-auto text-left">
                      
                      {/* Section 1: Core Company Credentials */}
                      <div className="grid grid-cols-2 gap-8">
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

                      <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Person</label>
                            <input required type="text" onChange={(e) => setSupplierForm({...supplierForm, contact_person: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <input required type="email" onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                            <input required type="tel" onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" />
                        </div>
                    </div>

                      <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax PIN / TIN Number</label>
                              <input required type="text" placeholder="e.g. P051XXXXX" onChange={(e) => setSupplierForm({...supplierForm, tin_number: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regulatory Lic # (PPB / County)</label>
                              <input required type="text" placeholder="e.g. PPB/MD/..." onChange={(e) => setSupplierForm({...supplierForm, license_number: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" />
                          </div>
                          
                      </div>

                      {/* Section 2: Critical Document Checklist Upload Engine */}
                      <div className="p-8 bg-slate-50 rounded-[2rem] space-y-6">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2"><Upload size={14}/> Required Compliance Documentation</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* KRA PIN Doc */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">1. Tax Registration (KRA PIN Document)</label>
                            <input required type="file" accept=".pdf" onChange={(e) => handleFileChange('kra_pin_doc', e.target.files[0])} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer w-full" />
                          </div>

                          {/* Certificate of Incorporation */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">2. Certificate of Incorporation / Reg</label>
                            <input required type="file" accept=".pdf" onChange={(e) => handleFileChange('incorporation_doc', e.target.files[0])} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer w-full" />
                          </div>

                          {/* Regulatory Medical/Trade License */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">3. Operating License (PPB / Commercial)</label>
                            <input required type="file" accept=".pdf" onChange={(e) => handleFileChange('regulatory_license_doc', e.target.files[0])} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer w-full" />
                          </div>

                          {/* Bank Details Confirmation */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">4. Bank Account Confirmation Stamp Letter</label>
                            <input type="file" accept=".pdf" onChange={(e) => handleFileChange('bank_confirmation_doc', e.target.files[0])} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer w-full" />
                          </div>

                        </div>

                        {/* Special Composite Tracker Slot: Tax Compliance Certificate + Validation Clock */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">5. Valid Tax Compliance Certificate (TCC)</label>
                            <input required type="file" accept=".pdf" onChange={(e) => handleFileChange('tax_compliance_doc', e.target.files[0])} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer w-full" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> Document Expiration Date</label>
                            <input required type="date" onChange={(e) => setSupplierForm({...supplierForm, tax_compliance_expiry: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-xs font-bold outline-none" />
                          </div>
                        </div>

                      </div>

                      {/* Section 3: Settlement Details */}
                      <div className="p-8 bg-slate-50 rounded-[2rem] space-y-6">
                          <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] flex items-center gap-2"><Landmark size={14}/> Financial Settlement Matrix</p>
                          <div className="grid grid-cols-3 gap-6">
                              <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                                  <input type="text" onChange={(e) => setSupplierForm({...supplierForm, bank_name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">A/C Number</label>
                                  <input type="text" onChange={(e) => setSupplierForm({...supplierForm, account_number: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SWIFT Code</label>
                                  <input type="text" onChange={(e) => setSupplierForm({...supplierForm, swift_code: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                              </div>
                          </div>
                      </div>

                      <button disabled={loading} className="w-full bg-[#020617] text-teal-400 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3">
                          {loading ? 'Processing Uploads & Saving...' : <><Save size={18}/> Commit Certified Supplier to Registry</>}
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