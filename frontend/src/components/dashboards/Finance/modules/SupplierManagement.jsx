import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Truck, ShieldCheck, Landmark, FileText, Send, 
  Plus, Search, Phone, Mail, AlertCircle, Star, X, Save, 
  Trash2, Clock, CheckCircle2, Award, Upload, Calendar, Edit2, MoreVertical
} from 'lucide-react';

// --- MAIN COMPONENT ---
const SupplierManagement = () => {
  const [showSupplierModal, setShowSupplierModal] = useState(false);
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
      loading(false); 
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
            <p className="text-[15px] bold font-black text-slate-1000 uppercase tracking-widest mb-1">Accounts Payable</p>
            <h3 className="text-3xl bold font-black text-rose-600 tracking-tighter italic uppercase leading-none">KES 8,400,000</h3>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl w-max">
            <Clock size={12}/> 14 Invoices Due
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl text-left flex flex-col justify-between">
          <div>
            <p className="text-[15px] font-black text-slate-1000 uppercase tracking-widest mb-1">Active Partners</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">{suppliers.length} </h3>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl w-max">
            <Award size={12}/> 100% Verified
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl text-left flex flex-col justify-between">
          <div>
            <p className="text-[15px] font-black text-slate-1000 uppercase tracking-widest mb-1">Avg Fulfillment Cycle</p>
            <h3 className="text-3xl font-black text-teal-600 tracking-tighter italic uppercase leading-none">4.2 Days</h3>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl w-max">
            <CheckCircle2 size={12}/> -0.8d vs Last Month
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden text-left flex flex-col justify-between">
          <div>
            <p className="text-[15px] font-black text-slate-1000 uppercase tracking-widest mb-1">Open Purchase Orders</p>
            <h3 className="text-3xl font-black text-amber-600 tracking-tighter italic uppercase leading-none">07 Pending</h3>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl w-max">
            <Send size={12}/> KES 2.1M Committed
          </div>
        </div>
      </div>

      {/* 2. ACTIONS AREA */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-50">
        <div className="p-1.5 flex gap-1 items-center px-4">
          <Truck size={16} className="text-slate-800" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-800">Supplier Directory</span>
        </div>
        
        <button 
          onClick={() => setShowSupplierModal(true)}
          className="bg-[#020617] text-teal-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl active:scale-95"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {/* 3. DYNAMIC CONTENT AREA */}
      <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl min-h-[500px] overflow-hidden">
        {selectedSupplier ? (
          <div className="p-12 animate-in fade-in duration-300">
            <button 
              onClick={() => setSelectedSupplier(null)} 
              className="text-slate-400 mb-6 hover:text-slate-900 uppercase font-black text-[10px] tracking-widest flex items-center gap-2 transition-colors"
            >
              ← Back to Directory
            </button>
            <div className="border-b border-slate-100 pb-6 mb-6">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">{selectedSupplier.name}</h2>
              <span className="mt-2 inline-block bg-slate-100 text-slate-800 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">{selectedSupplier.category}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Contact Information</h4>
                <p className="font-bold text-slate-700">Representative: <span className="text-slate-900 font-black">{selectedSupplier.contact_person}</span></p>
                <p className="font-bold text-slate-700">Email: <span className="text-slate-900 font-black">{selectedSupplier.email}</span></p>
                <p className="font-bold text-slate-700">Phone: <span className="text-slate-900 font-black">{selectedSupplier.phone}</span></p>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Compliance & Financials</h4>
                <p className="font-bold text-slate-700">Tax PIN / TIN: <span className="text-slate-900 font-black uppercase tracking-wider">{selectedSupplier.tin_number}</span></p>
                <p className="font-bold text-slate-700">Regulatory License: <span className="text-slate-900 font-black uppercase">{selectedSupplier.license_number}</span></p>
                <p className="font-bold text-slate-700">Payment Terms: <span className="text-slate-900 font-black">{selectedSupplier.payment_terms}</span></p>
              </div>
            </div>
          </div>
        ) : (
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
                    <tr 
                      key={vendor.id}
                      onClick={() => setSelectedSupplier(vendor)} 
                      className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
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
                      <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            setSupplierForm(vendor);
                            setEditingSupplier(vendor);
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
                              <input required type="text" value={supplierForm.name} onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" placeholder="e.g. Roche Kenya" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                              <select value={supplierForm.category} onChange={(e) => setSupplierForm({...supplierForm, category: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500 uppercase tracking-tighter">
                                  <option value="PHARMA">Pharmaceuticals</option>
                                  <option value="LAB">Lab Reagents</option>
                                  <option value="GEN">General Supplies</option>
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Person</label>
                            <input required type="text" value={supplierForm.contact_person} onChange={(e) => setSupplierForm({...supplierForm, contact_person: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <input required type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                            <input required type="tel" value={supplierForm.phone} onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" />
                        </div>
                    </div>

                      <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax PIN / TIN Number</label>
                              <input required type="text" value={supplierForm.tin_number} placeholder="e.g. P051XXXXX" onChange={(e) => setSupplierForm({...supplierForm, tin_number: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regulatory Lic # (PPB / County)</label>
                              <input required type="text" value={supplierForm.license_number} placeholder="e.g. PPB/MD/..." onChange={(e) => setSupplierForm({...supplierForm, license_number: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-teal-500" />
                          </div>
                      </div>

                      {/* Section 2: Critical Document Checklist Upload Engine */}
                      <div className="p-8 bg-slate-50 rounded-[2rem] space-y-6">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2"><Upload size={14}/> Required Compliance Documentation</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* KRA PIN Doc */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">1. Tax Registration (KRA PIN Document)</label>
                            <input required={!editingSupplier} type="file" accept=".pdf" onChange={(e) => handleFileChange('kra_pin_doc', e.target.files[0])} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer w-full" />
                          </div>

                          {/* Certificate of Incorporation */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">2. Certificate of Incorporation / Reg</label>
                            <input required={!editingSupplier} type="file" accept=".pdf" onChange={(e) => handleFileChange('incorporation_doc', e.target.files[0])} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer w-full" />
                          </div>

                          {/* Regulatory Medical/Trade License */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">3. Operating License (PPB / Commercial)</label>
                            <input required={!editingSupplier} type="file" accept=".pdf" onChange={(e) => handleFileChange('regulatory_license_doc', e.target.files[0])} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer w-full" />
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
                            <input required={!editingSupplier} type="file" accept=".pdf" onChange={(e) => handleFileChange('tax_compliance_doc', e.target.files[0])} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer w-full" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> Document Expiration Date</label>
                            <input required type="date" value={supplierForm.tax_compliance_expiry} onChange={(e) => setSupplierForm({...supplierForm, tax_compliance_expiry: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-xs font-bold outline-none" />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Settlement Details */}
                      <div className="p-8 bg-slate-50 rounded-[2rem] space-y-6">
                          <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] flex items-center gap-2"><Landmark size={14}/> Financial Settlement Matrix</p>
                          <div className="grid grid-cols-3 gap-6">
                              <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                                  <input type="text" value={supplierForm.bank_name || ''} onChange={(e) => setSupplierForm({...supplierForm, bank_name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">A/C Number</label>
                                  <input type="text" value={supplierForm.account_number || ''} onChange={(e) => setSupplierForm({...supplierForm, account_number: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SWIFT Code</label>
                                  <input type="text" value={supplierForm.swift_code || ''} onChange={(e) => setSupplierForm({...supplierForm, swift_code: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
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
    </div>
  );
};

export default SupplierManagement;