import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  ShieldCheck, CreditCard, AlertCircle, FileText, Plus, 
  Search, CheckCircle2, XCircle, Clock, Filter, ChevronRight,
  TrendingUp, Building2, UploadCloud, X, Save, Globe, Landmark,
  Paperclip, Calendar, UserCheck, Layers, Users, FolderUp
} from 'lucide-react';

// --- SUB-COMPONENT: OUTBOUND CLAIM DISPATCH BATCH MODAL ---
const LogDispatchModal = ({ isOpen, onClose, payers, claims, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    batch_reference: '',
    insurance_company: '',
    claim_ids: []
  });

  if (!isOpen) return null;

  // Filter unbatched claims belonging to the selected insurer
  const eligibleClaims = claims.filter(c => 
    String(c.insurance_company) === String(formData.insurance_company) && !c.dispatch_batch
  );

  const handleClaimToggle = (id) => {
    setFormData(prev => ({
      ...prev,
      claim_ids: prev.claim_ids.includes(id) 
        ? prev.claim_ids.filter(cid => cid !== id)
        : [...prev.claim_ids, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.insurance_company) return alert("Please select a target insurance payer.");
    if (formData.claim_ids.length === 0) return alert("You must select at least one patient claim invoice to batch.");

    setLoading(true);
    try {
      // Calculate total batch value sum on-the-fly from chosen claims
      const selectedClaimsObjects = claims.filter(c => formData.claim_ids.includes(c.id));
      const total_batch_value = selectedClaimsObjects.reduce((acc, curr) => acc + parseFloat(curr.total_amount_billed || 0), 0);

      // Create outbound dispatch record
      const dispatchRes = await API.post('/claim-dispatch-batches/', {
        batch_reference: formData.batch_reference,
        insurance_company: formData.insurance_company,
        total_batch_value: total_batch_value
      });

      // Bulk patch selected claims to link them to this newly registered dispatch batch reference
      await Promise.all(formData.claim_ids.map(claimId => 
        API.patch(`/insurance-claims/${claimId}/`, { 
          dispatch_batch: dispatchRes.data.id,
          status: 'DISPATCHED' 
        })
      ));

      alert("Outbound claim dispatch batch generated and committed successfully!");
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to process claim dispatch batch. Verify batch reference code is globally unique.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Compile Outbound <span className="text-blue-600">Claims Batch</span></h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-6 text-left">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch Tracking Reference</label>
              <input 
                required
                type="text" 
                placeholder="e.g. BATCH-NHIF-MAY2026-01"
                value={formData.batch_reference}
                onChange={(e) => setFormData({...formData, batch_reference: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-blue-500" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Payer</label>
              <select 
                required
                value={formData.insurance_company}
                onChange={(e) => setFormData({...formData, insurance_company: e.target.value, claim_ids: []})}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-blue-500"
              >
                <option value="">Select Insurer...</option>
                {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">
              Select Outstanding Patient Claims ({eligibleClaims.length} available)
            </label>
            <div className="bg-slate-50 rounded-2xl p-4 max-h-[180px] overflow-y-auto border border-slate-100 space-y-2">
              {formData.insurance_company === '' ? (
                <p className="text-[11px] text-slate-400 italic py-4 text-center font-bold">Please pick an insurance company to look up unbatched items.</p>
              ) : eligibleClaims.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-4 text-center font-bold">No unbatched claims found matching this payer choice.</p>
              ) : eligibleClaims.map(c => (
                <label key={c.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-400 transition-all select-none">
                  <input 
                    type="checkbox" 
                    checked={formData.claim_ids.includes(c.id)}
                    onChange={() => handleClaimToggle(c.id)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 text-xs">
                    <p className="font-black text-slate-900">{c.patient_display_name || "John Doe Kamau"}</p>
                    <p className="text-[10px] text-slate-400">Ref: #{c.claim_number} | Auth: {c.pre_auth_code || 'N/A'}</p>
                  </div>
                  <p className="text-xs font-black text-slate-800">KES {parseFloat(c.total_amount_billed).toLocaleString()}</p>
                </label>
              ))}
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-[#020617] text-blue-400 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"
          >
            {loading ? "DISPATCHING BATCH ITEMS..." : "Compile Outbound Batch Envelope"}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: INBOUND REMITTANCE BATCH UPLOAD MODAL ---
const RemittanceModal = ({ isOpen, onClose, payers, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [fileObject, setFileObject] = useState(null);
  const [formData, setFormData] = useState({
    insurance_company: '',
    payment_reference: '',
    total_amount_received: '',
    date_received: new Date().toISOString().split('T')[0]
  });

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileObject(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.insurance_company) return alert("Please select a valid insurance company");
    
    setLoading(true);

    const payload = new FormData();
    payload.append('insurance_company', formData.insurance_company);
    payload.append('payment_reference', formData.payment_reference);
    payload.append('total_amount_received', formData.total_amount_received);
    payload.append('date_received', formData.date_received);
    if (fileObject) {
      payload.append('remittance_file', fileObject);
    }

    try {
      await API.post('/remittance-batches/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert("Remittance batch registered successfully into system ledger!");
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save remittance batch. Ensure payment reference code is uniquely valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Log Bank <span className="text-teal-600">Remittance</span></h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Insurance Payer</label>
            <select 
              required
              value={formData.insurance_company}
              onChange={(e) => setFormData({...formData, insurance_company: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-teal-500"
            >
              <option value="">Select Payer...</option>
              {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Amount Received (KES)</label>
              <input 
                required
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={formData.total_amount_received}
                onChange={(e) => setFormData({...formData, total_amount_received: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-teal-500" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Received</label>
              <input 
                required
                type="date" 
                value={formData.date_received}
                onChange={(e) => setFormData({...formData, date_received: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-teal-500" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Reference (EFT, Cheque No, Transfer ID)</label>
            <input 
              required
              type="text" 
              placeholder="e.g. EFT-991A2-JUBILEE"
              value={formData.payment_reference}
              onChange={(e) => setFormData({...formData, payment_reference: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-teal-500" 
            />
          </div>

          <div className="relative border-2 border-dashed border-slate-100 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-teal-50/40 transition-all cursor-pointer group">
            <input 
              type="file" 
              accept=".pdf,.xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
            <UploadCloud size={32} className="text-slate-300 group-hover:text-teal-600 mb-2" />
            <p className="text-[10px] font-black text-slate-400 group-hover:text-teal-700 uppercase tracking-widest text-center">
              {fileObject ? fileObject.name : "Attach Remittance Statement Advice (PDF/Excel)"}
            </p>
          </div>

          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-[#020617] text-teal-400 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"
          >
            {loading ? "SAVING REMITTANCE BATCH..." : "Commit Batch & Register Records"}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- MAIN INSURANCE SYSTEM HUB ---
const InsuranceClaimsHub = () => {
  const [activeSubTab, setActiveSubTab] = useState('queue');
  // Sub-toggle matrix selector flag for Claims View context switching
  const [claimsViewMode, setClaimsViewMode] = useState('global'); // 'global' or 'patient'
  
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  
  // Data State Arrays
  const [payers, setPayers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [remitBatches, setRemitBatches] = useState([]);
  const [dispatchBatches, setDispatchBatches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [payerForm, setPayerForm] = useState({
    name: '', kra_pin: '', contact_person: '', email: '', phone: '', portal_link: '', default_copay_amount: '0.00'
  });

  useEffect(() => {
    fetchCoreData();
  }, []);

  const fetchCoreData = async () => {
    setLoading(true);
    try {
      const payersRes = await API.get('/insurance-companies/');
      setPayers(payersRes.data.results || payersRes.data || []);
      
      const claimsRes = await API.get('/insurance-claims/');
      setClaims(claimsRes.data.results || claimsRes.data || []);

      const remitRes = await API.get('/remittance-batches/');
      setRemitBatches(remitRes.data.results || remitRes.data || []);

      const dispatchRes = await API.get('/claim-dispatch-batches/');
      setDispatchBatches(dispatchRes.data.results || dispatchRes.data || []);
    } catch (err) { 
      console.error("Endpoint execution layout error: ", err); 
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayer = async (e) => {
    e.preventDefault();
    try {
      await API.post('/insurance-companies/', payerForm);
      alert("New Corporate Payer added successfully to corporate registry.");
      setShowPayerModal(false);
      setPayerForm({
        name: '', kra_pin: '', contact_person: '', email: '', phone: '', portal_link: '', default_copay_amount: '0.00'
      });
      fetchCoreData();
    } catch (err) {
      alert("Validation failed. Check if Company Name or KRA PIN is already registered.");
    }
  };

  // Safe client-side multi-layer filter mapping
  const filteredClaims = claims.filter(c => {
    const term = searchQuery.toLowerCase();
    return (
      c.claim_number?.toLowerCase().includes(term) ||
      c.patient_display_name?.toLowerCase().includes(term) ||
      c.pre_auth_code?.toLowerCase().includes(term) ||
      c.insurance_company_name?.toLowerCase().includes(term)
    );
  });

  // Structural processing logic to pivot claims table aggregate down into distinct patient blocks
  const getPatientGroupedLedger = () => {
    const map = {};
    filteredClaims.forEach(claim => {
      const name = claim.patient_display_name || "Unknown Patient/Private Record";
      if (!map[name]) {
        map[name] = {
          patient_name: name,
          policy_number: claim.patient_policy_number || "N/A",
          claims_count: 0,
          total_billed: 0,
          total_shortfall: 0,
          insurer_breakdown: new Set(),
          individual_claims: []
        };
      }
      map[name].claims_count += 1;
      map[name].total_billed += parseFloat(claim.total_amount_billed || 0);
      map[name].total_shortfall += parseFloat(claim.shortfall_amount || 0);
      if (claim.insurance_company_name) map[name].insurer_breakdown.add(claim.insurance_company_name);
      map[name].individual_claims.push(claim);
    });
    return Object.values(map);
  };

  const groupedPatientLedger = getPatientGroupedLedger();

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] text-left">
      
      {/* 1. ANALYTICS METRIC BANNER COPIED FROM image_6d8f91.png */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <div className="p-4 rounded-2xl w-fit mb-6 bg-blue-50 text-blue-600"><TrendingUp size={28} /></div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outstanding Claims</h2>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            KES {claims.filter(c => c.status !== 'APPROVED').reduce((acc, curr) => acc + parseFloat(curr.total_amount_billed || 0), 0).toLocaleString()}
          </h3>
         
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <div className="p-4 rounded-2xl w-fit mb-6 bg-rose-50 text-rose-600"><XCircle size={28} /></div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disputed / Rejected Value</h2>
          <h3 className="text-3xl font-black text-rose-600 tracking-tighter italic uppercase leading-none">
            KES {claims.filter(c => c.status === 'REJECTED' || c.status === 'DISPUTED').reduce((acc, curr) => acc + parseFloat(curr.total_amount_billed || 0), 0).toLocaleString()}
          </h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <div className="p-4 rounded-2xl w-fit mb-6 bg-teal-50 text-teal-600"><CheckCircle2 size={28} /></div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Remittance Value</h2>
          <h3 className="text-3xl font-black text-teal-600 tracking-tighter italic uppercase leading-none">
            KES {remitBatches.reduce((acc, curr) => acc + parseFloat(curr.total_amount_received || 0), 0).toLocaleString()}
          </h3>
        </div>
      </div>

      {/* 2. SUB-TAB TOGGLE & FLEXIBLE ACTION ROW */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-50">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1">
          {[
            { id: 'queue', label: 'Claims Registry', icon: FileText },
            { id: 'dispatched_batches', label: 'Dispatched Batches', icon: FolderUp },
            { id: 'remittance', label: 'Remittance Batches', icon: CreditCard },
            { id: 'payers', label: 'Insurers/Payers', icon: Building2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 w-full xl:w-auto">
          {activeSubTab === 'dispatched_batches' && (
            <button 
              onClick={() => setShowDispatchModal(true)}
              className="bg-blue-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl"
            >
              <Plus size={18} /> Dispatch Claims Envelope
            </button>
          )}
          <button 
            onClick={() => activeSubTab === 'payers' ? setShowPayerModal(true) : setShowRemitModal(true)}
            className="bg-[#020617] text-teal-400 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl active:scale-95"
          >
            <Plus size={18} /> {activeSubTab === 'payers' ? 'Add Insurance Co' : 'Log Bulk Remittance'}
          </button>
        </div>
      </div>

      {/* 3. CORE DYNAMIC DISPLAY CONTEXT GRID */}
      <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl min-h-[500px] overflow-hidden">
        
        {/* VIEW A: CLAIMS REGISTRY & PATIENT-BY-PATIENT LEDGER (POWER OF THE TOGGLE) */}
        {activeSubTab === 'queue' && (
          <div className="animate-in slide-in-from-bottom-4">
            <div className="p-8 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by Patient name, Claim reference, Pre-Auth code..." 
                  className="w-full bg-slate-50 rounded-2xl py-4 pl-16 pr-6 text-xs font-bold outline-none border border-slate-100 focus:border-blue-500 transition-all" 
                />
              </div>

              {/* THE TOGGLE: SWITCH BETWEEN CHRONOLOGICAL LIST AND PATIENT AUDIT RECORD MATRICES */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 self-stretch md:self-auto">
                <button 
                  onClick={() => setClaimsViewMode('global')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${claimsViewMode === 'global' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  <Layers size={12}/> Global Stream
                </button>
                <button 
                  onClick={() => setClaimsViewMode('patient')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${claimsViewMode === 'patient' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  <Users size={12}/> Patient Matrix Ledger
                </button>
              </div>
            </div>

            {claimsViewMode === 'global' ? (
              // SUB-VIEW A1: ORIGINAL GLOBAL CHRONOLOGICAL CLAIM ENTRIES
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-8">Patient Reference</th>
                    <th className="p-8">Insurer & Pre-Auth Code</th>
                    <th className="p-8">Billed Invoice Value</th>
                    <th className="p-8">Shortfall Deductions</th>
                    <th className="p-8">Dispatch Batch ID</th>
                    <th className="p-8">Process Status</th>
                    <th className="p-8 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredClaims.length > 0 ? filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="p-8">
                        <p className="font-black text-slate-900 uppercase italic leading-none">{claim.patient_display_name || "John Doe Kamau"}</p>
                        <p className="text-[9px] text-blue-600 font-bold uppercase mt-2 tracking-tighter">Claim ID: #{claim.claim_number}</p>
                      </td>
                      <td className="p-8">
                        <p className="text-xs font-bold text-slate-700 uppercase leading-none mb-1">{claim.insurance_company_name || "Jubilee Insurance"}</p>
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Auth: {claim.pre_auth_code || "N/A"}</span>
                      </td>
                      <td className="p-8">
                        <p className="font-black text-slate-900 italic text-sm">KES {parseFloat(claim.total_amount_billed || 0).toLocaleString()}</p>
                      </td>
                      <td className="p-8 font-bold text-rose-600 text-xs italic">
                        KES {parseFloat(claim.shortfall_amount || 0).toLocaleString()}
                      </td>
                      <td className="p-8 text-xs font-bold text-slate-500 uppercase">
                        {claim.dispatch_batch_reference ? (
                          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
                            {claim.dispatch_batch_reference}
                          </span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg text-[9px] font-black">
                            UNBATCHED / QUEUED
                          </span>
                        )}
                      </td>
                      <td className="p-8 text-left">
                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                          claim.status === 'APPROVED' ? 'bg-teal-50 text-teal-600 border-teal-100' : 
                          claim.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="p-8 text-right"><ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-all"/></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="p-24 text-center text-slate-400 text-xs font-bold uppercase italic tracking-wider">
                        No matching hospital claim records populated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              // SUB-VIEW A2: ADVANCED SYSTEM ACCOUNTING LOOKUP (PATIENT-BY-PATIENT LEDGER)
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-8">Patient Account Profile</th>
                    <th className="p-8">Policy Number</th>
                    <th className="p-8">Claims Bound</th>
                    <th className="p-8">Assigned Insurers</th>
                    <th className="p-8">Aggregate Value Billed</th>
                    <th className="p-8">Cumulative Deductions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupedPatientLedger.length > 0 ? groupedPatientLedger.map((group, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                      <td className="p-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700 uppercase">
                            {group.patient_name.charAt(0)}
                          </div>
                          <p className="font-black text-slate-900 uppercase italic">{group.patient_name}</p>
                        </div>
                      </td>
                      <td className="p-8 text-xs font-mono font-bold text-slate-600">{group.policy_number}</td>
                      <td className="p-8">
                        <span className="bg-blue-50 text-blue-700 font-black px-3 py-1.5 text-[10px] border border-blue-100 rounded-xl">
                          {group.claims_count} INVOICES
                        </span>
                      </td>
                      <td className="p-8 text-xs font-bold text-slate-700">
                        {Array.from(group.insurer_breakdown).join(', ') || 'N/A'}
                      </td>
                      <td className="p-8 font-black text-slate-900 italic text-sm">
                        KES {group.total_billed.toLocaleString()}
                      </td>
                      <td className="p-8 font-black text-rose-600 text-xs italic">
                        KES {group.total_shortfall.toLocaleString()}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="p-24 text-center text-slate-400 text-xs font-bold uppercase italic tracking-wider">
                        No patient data models parsed to build dynamic ledgers.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* VIEW B: DISPATCHED BATCHES HUB PANEL (OUTBOUND TRAFFIC CONTROL) */}
        {activeSubTab === 'dispatched_batches' && (
          <div className="animate-in slide-in-from-bottom-4">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Outbound Claim Batch Mail Delivery Ledger</span>
            </div>
            
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="p-8">Dispatch ID Reference</th>
                  <th className="p-8">Receiving Corporate Insurer</th>
                  <th className="p-8">Gross Bundle Value</th>
                  <th className="p-8">Date Dispatched</th>
                  <th className="p-8">Claims Count</th>
                  <th className="p-8">Payer Acknowledgment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dispatchBatches.length > 0 ? dispatchBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="p-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><FolderUp size={16}/></div>
                        <div>
                          <p className="font-black text-slate-900 uppercase tracking-tight">{batch.batch_reference}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">System Index: #{batch.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8 text-xs font-black text-slate-700 uppercase italic">
                      {batch.insurance_company_name || "Corporate Insurer"}
                    </td>
                    <td className="p-8 font-black text-blue-600 italic text-sm">
                      KES {parseFloat(batch.total_batch_value).toLocaleString()}
                    </td>
                    <td className="p-8 text-xs font-bold text-slate-600">
                      <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400"/> {batch.date_dispatched}</div>
                    </td>
                    <td className="p-8 text-xs font-bold text-slate-700">
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg">
                        {batch.claims_count} Files Bound
                      </span>
                    </td>
                    <td className="p-8">
                      {batch.is_acknowledged ? (
                        <span className="bg-teal-50 text-teal-700 text-[9px] font-black tracking-widest uppercase border border-teal-200 px-3 py-1.5 rounded-xl">
                          Acknowledged / Received
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 text-[9px] font-black tracking-widest uppercase border border-amber-200 px-3 py-1.5 rounded-xl">
                          In-Transit / Pending Review
                        </span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="p-24 text-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic mb-2">No outbound claim dispatch batches found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW C: REMITTANCE BATCH LEDGER PROCESSING HUB */}
        {activeSubTab === 'remittance' && (
          <div className="animate-in slide-in-from-bottom-4">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Bank Remittance Processing Ledger</span>
            </div>
            
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="p-8">Batch Reference Code</th>
                  <th className="p-8">Insurance Payer</th>
                  <th className="p-8">Total Deposited Amount</th>
                  <th className="p-8">Value Date</th>
                  <th className="p-8">Logged/Reconciled By</th>
                  <th className="p-8">Statement File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {remitBatches.length > 0 ? remitBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="p-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700"><Landmark size={16}/></div>
                        <div>
                          <p className="font-black text-slate-900 uppercase tracking-tight">REMIT-{batch.payment_reference}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Batch ID: #{batch.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8 text-xs font-black text-slate-700 uppercase italic">
                      {batch.insurance_company_name || "Corporate Insurer"}
                    </td>
                    <td className="p-8 font-black text-teal-600 italic text-sm">
                      KES {parseFloat(batch.total_amount_received).toLocaleString()}
                    </td>
                    <td className="p-8 text-xs font-bold text-slate-600">
                      <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400"/> {batch.date_received}</div>
                    </td>
                    <td className="p-8 text-xs font-medium text-slate-500">
                      <div className="flex items-center gap-2"><UserCheck size={14} className="text-slate-400"/> {batch.reconciled_by_username || "Finance Officer"}</div>
                    </td>
                    <td className="p-8">
                      {batch.remittance_file ? (
                        <a 
                          href={batch.remittance_file} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 py-2 rounded-xl w-fit transition-all border border-blue-100"
                        >
                          <Paperclip size={12}/> View Sheet
                        </a>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">No File Advice</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="p-24 text-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic mb-2">No bank remittance batches logged yet.</p>
                      <button 
                        onClick={() => setShowRemitModal(true)} 
                        className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-4 py-2 rounded-xl border border-teal-100 mt-2"
                      >
                        Log First Batch Here
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW D: INSURERS / PAYERS LIST */}
        {activeSubTab === 'payers' && (
           <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
              {payers.map((payer) => (
                <div key={payer.id} className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 group hover:bg-white transition-all text-left">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-white p-4 rounded-2xl text-blue-600 shadow-sm"><ShieldCheck size={24}/></div>
                    <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg uppercase border border-blue-100 italic tracking-widest">
                      PIN: {payer.kra_pin || "N/A"}
                    </span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 italic uppercase leading-none">{payer.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">
                    Contact: {payer.contact_person} ({payer.email})
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Billed</p>
                        <p className="text-sm font-black text-slate-900">KES {parseFloat(payer.total_billed || 0).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Remitted</p>
                        <p className="text-sm font-black text-teal-600">KES {parseFloat(payer.total_remitted || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-rose-500 uppercase mb-1">Aging Debt</p>
                        <p className="text-sm font-black text-rose-600 italic">KES {parseFloat(payer.aging_debt || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  {payer.portal_link && (
                    <a 
                      href={payer.portal_link} 
                      target="_blank" 
                      rel="noreferrer"
                      className="block text-center w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl"
                    >
                      Open Claims Portal
                    </a>
                  )}
              </div>
              ))}
           </div>
        )}
      </div>

      {/* MODAL: ADD INSURANCE COMPANY */}
      {showPayerModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowPayerModal(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden text-left">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Onboard <span className="text-blue-600">Payer</span></h3>
              <button onClick={() => setShowPayerModal(false)} className="text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleCreatePayer} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                  <input required type="text" placeholder="e.g. Jubilee Insurance" value={payerForm.name} onChange={(e)=>setPayerForm({...payerForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company KRA PIN</label>
                  <input required type="text" placeholder="e.g. P051XXXXXXZ" value={payerForm.kra_pin} onChange={(e)=>setPayerForm({...payerForm, kra_pin: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Account Person</label>
                  <input required type="text" placeholder="e.g. Jane Karimi" value={payerForm.contact_person} onChange={(e)=>setPayerForm({...payerForm, contact_person: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
                  <input required type="email" placeholder="claims@jubileekenya.com" value={payerForm.email} onChange={(e)=>setPayerForm({...payerForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Line</label>
                  <input required type="text" placeholder="+254..." value={payerForm.phone} onChange={(e)=>setPayerForm({...payerForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest ml-1">Default Copay (KES)</label>
                  <input type="number" placeholder="0.00" value={payerForm.default_copay_amount} onChange={(e)=>setPayerForm({...payerForm, default_copay_amount: e.target.value})} className="w-full bg-slate-50 border border-teal-100 text-teal-700 rounded-2xl py-5 px-6 text-xs font-bold outline-none" />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Claims Portal URL</label>
                  <input type="url" placeholder="https://..." value={payerForm.portal_link} onChange={(e)=>setPayerForm({...payerForm, portal_link: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" />
                </div>
              </div>

              <button type="submit" className="w-full bg-[#020617] text-blue-400 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                <Save size={18}/> Register Insurance Provider
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INBOUND REMITTANCE BATCH REGISTRATION */}
      <RemittanceModal 
        isOpen={showRemitModal} 
        onClose={() => setShowRemitModal(false)} 
        payers={payers} 
        onRefresh={fetchCoreData}
      />

      {/* MODAL: OUTBOUND DISPATCH COMPILATION */}
      <LogDispatchModal 
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        payers={payers}
        claims={claims}
        onRefresh={fetchCoreData}
      />
    </div>
  );
};

export default InsuranceClaimsHub;