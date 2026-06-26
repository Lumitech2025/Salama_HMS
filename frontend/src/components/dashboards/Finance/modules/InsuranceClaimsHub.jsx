import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, CreditCard, AlertCircle, FileText, Plus, 
  Search, CheckCircle2, XCircle, Clock, Filter, ChevronRight,
  TrendingUp, Building2, UploadCloud, X, Save, Globe, Landmark,
  Paperclip, Calendar, UserCheck, Layers, Users, FolderUp, CheckSquare, Square, BarChart3, ChevronDown
} from 'lucide-react';

const InsuranceClaimsHub = () => {
  // Active Navigation Context Tabs
  const [activeTab, setActiveTab] = useState('registry'); 
  const [searchQuery, setSearchQuery] = useState('');

  // Core API State Vectors
  const [payers, setPayers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [batches, setBatches] = useState([]);
  const [remittances, setRemittances] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);

  // Tab 2 (Dispatch Modal) states
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedInsurerId, setSelectedInsurerId] = useState("");
  const [unbatchedClaims, setUnbatchedClaims] = useState([]);
  const [selectedClaimIds, setSelectedClaimIds] = useState([]);
  const [expandedBatchId, setExpandedBatchId] = useState(null);

  // Tab 3 (Remittance Modal) states
  const [isRemitModalOpen, setIsRemitModalOpen] = useState(false);
  const [remitInsurerId, setRemitInsurerId] = useState('');
  const [remitBatchId, setRemitBatchId] = useState('');
  const [remitAmountPaid, setRemitAmountPaid] = useState('');
  const [remitChequeId, setRemitChequeId] = useState('');
  const [remitDateReceived, setRemitDateReceived] = useState(new Date().toISOString().split('T')[0]); 
  const [remitFile, setRemitFile] = useState(null);
  const [remitFileName, setRemitFileName] = useState('');
  const [itemizedPayments, setItemizedPayments] = useState({}); 

  // Tab 4 (Statistics View Controls)
  const [selectedStatInsurerId, setSelectedStatInsurerId] = useState('all');
  const [analyticsGraphMode, setAnalyticsGraphMode] = useState('paid'); 

  // --- REUSABLE AUTHENTICATED REQUEST HEADER BUILDER ---
  const getAuthHeaders = (isMultipart = false) => {
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // --- CORE DATA SYNCHRONIZATION FROM DJANGO BACKEND ---
  const fetchBaseData = async () => {
    setIsLoading(true);
    try {
      const [payersRes, claimsRes, batchesRes, remittancesRes] = await Promise.all([
        fetch('/api/insurance-companies/', { headers: getAuthHeaders() }),
        fetch('/api/insurance-claims/', { headers: getAuthHeaders() }),
        fetch('/api/claim-dispatch-batches/', { headers: getAuthHeaders() }),
        fetch('/api/remittance-batches/', { headers: getAuthHeaders() })
      ]);

      if (payersRes.ok) setPayers(await payersRes.json());
      if (claimsRes.ok) setClaims(await claimsRes.json());
      if (batchesRes.ok) setBatches(await batchesRes.json());
      if (remittancesRes.ok) setRemittances(await remittancesRes.json());
    } catch (err) {
      console.error("System failed to execute corporate infrastructure synchronization:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  // 1. UPDATED METRICS: Outstanding Receivable = Gross Billed - Total Remitted
  const metrics = useMemo(() => {
    const totalBilled = claims.reduce((acc, c) => acc + Number(c.total_amount_billed || 0), 0);
    const totalPaid = remittances.reduce((acc, r) => acc + Number(r.total_amount_received || 0), 0);
    
    return {
      totalBilled,
      totalPaid,
      totalPending: Math.max(0, totalBilled - totalPaid),
      claimCount: claims.length
    };
  }, [claims, remittances]);

  // Fetch available unsubmitted claims
  const fetchUnsubmittedClaimsForInsurer = async (insurerId) => {
    setSelectedInsurerId(insurerId);
    if (!insurerId) {
      setUnbatchedClaims([]);
      setSelectedClaimIds([]);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(`/api/claim-dispatch-batches/unbatched-claims/?insurance_company_id=${insurerId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUnbatchedClaims(data);
        setSelectedClaimIds([]);
      }
    } catch (err) {
      console.error("Error connecting to claims endpoint tracking stream:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleClaimCheckboxSelection = (claimId) => {
    setSelectedClaimIds(prev =>
      prev.includes(claimId)
        ? prev.filter(id => id !== claimId)
        : [...prev, claimId]
    );
  };

  const toggleSelectAllClaims = () => {
    if (selectedClaimIds.length === unbatchedClaims.length) {
      setSelectedClaimIds([]);
    } else {
      setSelectedClaimIds(unbatchedClaims.map(c => c.id));
    }
  };

  const calculateRunningBatchValueTotal = () => {
    if (!unbatchedClaims || !selectedClaimIds) return 0;
    return unbatchedClaims
      .filter(claim => claim && selectedClaimIds.includes(claim.id))
      .reduce((sum, claim) => sum + Number(claim.total_amount_billed || 0), 0);
  };

  const computedBatchReferencePreview = useMemo(() => {
    if (!selectedInsurerId) return "SCC-BXXX/INITIALS/DD/MM/YY";
    const company = payers.find(p => String(p.id) === String(selectedInsurerId));
    if (!company) return "SCC-BXXX/INITIALS/DD/MM/YY";
    
    let initials = company.name.split(' ')[0].toUpperCase().slice(0, 3);
    const existingCount = batches.filter(b => String(b.insurance_company) === String(selectedInsurerId)).length;
    const nextSequence = String(existingCount + 1).padStart(3, '0');
    
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    
    return `SCC-B${nextSequence}/${initials}/${dd}/${mm}/${yy}`;
  }, [selectedInsurerId, payers, batches]);

  // --- REMITTANCE LOADING ---
  const handleBatchSelectionChange = (batchId) => {
    setRemitBatchId(batchId);
    if (!batchId) {
      setItemizedPayments({});
      return;
    }
    
    const associatedClaims = claims.filter(c => String(c.dispatch_batch) === String(batchId) || String(c.dispatch_batch_id) === String(batchId));
    
    const initialAllocations = {};
    associatedClaims.forEach(c => {
      initialAllocations[c.id] = { 
        checked: true, 
        approved_value: Number(c.total_amount_billed || 0), 
        rejected_value: 0 
      };
    });
    setItemizedPayments(initialAllocations);
  };

  const handleUpdateItemizedRow = (claimId, field, val) => {
    setItemizedPayments(prev => {
      const target = prev[claimId] || { checked: false, approved_value: 0, rejected_value: 0 };
      const originalClaim = claims.find(c => c.id === claimId);
      let updated = { ...target, [field]: Number(val) || 0 };
      
      if (field === 'approved_value') {
        const billed = Number(originalClaim?.total_amount_billed || 0);
        updated.rejected_value = Math.max(0, billed - updated.approved_value);
      }
      return { ...prev, [claimId]: updated };
    });
  };

  const handleConfirmAndStampDispatch = async () => {
    if (!selectedInsurerId) return alert("Please select a target Insurance Company.");
    if (selectedClaimIds.length === 0) return alert("Please select at least one claim.");

    try {
      const res = await fetch('/api/claim-dispatch-batches/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          insurance_company: parseInt(selectedInsurerId),
          claim_ids: selectedClaimIds
        })
      });

      if (res.ok) {
        alert(`Successfully generated and dispatched batch reference.`);
        setIsDispatchModalOpen(false);
        setSelectedInsurerId('');
        setSelectedClaimIds([]);
        fetchBaseData(); 
      }
    } catch (err) {
      console.error("Batch processing transmission failure:", err);
    }
  };

  const handleCommitRemittance = async (e) => {
    e.preventDefault();
    if (!remitBatchId) return alert("Please select an active Batch Number.");
    if (!remitAmountPaid) return alert("Please enter the total payment receipt amount.");
    if (!remitDateReceived) return alert("Please pick the statement date received.");

    const activeSelectedIds = Object.keys(itemizedPayments).filter(id => itemizedPayments[id].checked);
    if (activeSelectedIds.length === 0) return alert("Please select at least one invoice to settle.");

    const formData = new FormData();
    formData.append('insurance_company', remitInsurerId);
    formData.append('payment_reference', remitChequeId || 'EFT-REMIT');
    formData.append('total_amount_received', remitAmountPaid);
    formData.append('date_received', remitDateReceived); 
    formData.append('itemized_allocations', JSON.stringify(itemizedPayments));
    if (remitFile) {
      formData.append('remittance_file', remitFile);
    }

    try {
      const res = await fetch('/api/remittance-batches/', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: formData
      });

      if (res.ok) {
        alert(`Remittance processed successfully.`);
        setIsRemitModalOpen(false);
        setRemitInsurerId('');
        setRemitBatchId('');
        setRemitAmountPaid('');
        setRemitChequeId('');
        setRemitDateReceived(new Date().toISOString().split('T')[0]);
        setRemitFile(null);
        setRemitFileName('');
        setItemizedPayments({});
        fetchBaseData();
      } else {
        const errorData = await res.json();
        alert(`Error: ${JSON.stringify(errorData)}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- TAB 4 MATHEMATICS ---
  const filteredAnalyticsMetrics = useMemo(() => {
    let targetClaims = claims;
    let targetRemittances = remittances;

    if (selectedStatInsurerId !== 'all') {
      targetClaims = claims.filter(c => String(c.insurance_company) === String(selectedStatInsurerId));
      targetRemittances = remittances.filter(r => String(r.insurance_company) === String(selectedStatInsurerId));
    }
    
    const billed = targetClaims.reduce((sum, c) => sum + Number(c.total_amount_billed || 0), 0);
    const remitted = targetRemittances.reduce((sum, r) => sum + Number(r.total_amount_received || 0), 0);
    const rejected = targetClaims.reduce((sum, c) => sum + Number(c.shortfall_amount || 0), 0);
    const submittedCount = targetClaims.filter(c => c.status === 'SUBMITTED' || c.status === 'REMITTED' || c.status === 'PAID').length;

    return { billed, remitted, rejected, submittedCount };
  }, [claims, remittances, selectedStatInsurerId]);

  const trueDataGraphCurve = useMemo(() => {
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const matrix = monthsShort.map(m => ({ name: m, amountPaid: 0, billedAmount: 0, pendingAmount: 0 }));
    
    let targetClaims = claims;
    let targetRemittances = remittances;

    if (selectedStatInsurerId !== 'all') {
      targetClaims = claims.filter(c => String(c.insurance_company) === String(selectedStatInsurerId));
      targetRemittances = remittances.filter(r => String(r.insurance_company) === String(selectedStatInsurerId));
    }

    targetRemittances.forEach(r => {
      if (!r.date_received) return;
      const monthIdx = new Date(r.date_received).getMonth();
      if (monthIdx >= 0 && monthIdx < 12) {
        matrix[monthIdx].amountPaid += Number(r.total_amount_received || 0);
      }
    });

    targetClaims.forEach(c => {
      const dateStr = c.date_submitted || c.created_at;
      if (!dateStr) return;
      const monthIdx = new Date(dateStr).getMonth();
      if (monthIdx >= 0 && monthIdx < 12) {
        matrix[monthIdx].billedAmount += Number(c.total_amount_billed || 0);
      }
    });

    // Graph Pending Amount = Billed - Paid per period
    matrix.forEach(m => {
      m.pendingAmount = Math.max(0, m.billedAmount - m.amountPaid);
    });

    return matrix;
  }, [claims, remittances, selectedStatInsurerId]);

  const maxAxisValue = useMemo(() => {
    let highest = 50000;
    trueDataGraphCurve.forEach(m => {
      const top = Math.max(m.amountPaid, m.pendingAmount);
      if (top > highest) highest = top;
    });
    return Math.ceil((highest * 1.15) / 50000) * 50000;
  }, [trueDataGraphCurve]);

  const yAxisTicks = [maxAxisValue, maxAxisValue * 0.75, maxAxisValue * 0.5, maxAxisValue * 0.25, 0];

  return (
    <div className="w-full space-y-6 select-none bg-slate-50/40 p-4 antialiased text-sm">
      {isLoading && (
        <div className="bg-blue-50 text-blue-800 font-bold text-sm py-3 px-5 rounded-xl animate-pulse shadow-sm">
          Synchronizing Live Institutional Accounts Data Stream...
        </div>
      )}

      {/* FINANCIAL TOP-LEVEL METRIC KIP PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Gross Volume Billed</span>
            <span className="text-2xl font-black tracking-tight text-slate-900 font-mono">KES {metrics.totalBilled.toLocaleString()}</span>
          </div>
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl"><Layers size={22}/></div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Total Remitted / Paid</span>
            <span className="text-2xl font-black tracking-tight text-emerald-600 font-mono">KES {metrics.totalPaid.toLocaleString()}</span>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl"><ShieldCheck size={22}/></div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Outstanding Receivable</span>
            <span className="text-2xl font-black tracking-tight text-amber-600 font-mono">KES {metrics.totalPending.toLocaleString()}</span>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl"><Clock size={22}/></div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Active Cases Count</span>
            <span className="text-2xl font-black tracking-tight text-slate-900 font-mono">{metrics.claimCount} Patients</span>
          </div>
          <div className="p-3.5 bg-slate-100 text-slate-600 rounded-xl"><Users size={22}/></div>
        </div>
      </div>

      {/* MAIN ENGINE ROUTING NAVIGATION TABS */}
      <div className="bg-white border border-slate-200 p-2 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="flex gap-2">
          {[
            { id: 'registry', label: 'Claims Registry', icon: <Users size={16}/> },
            { id: 'dispatch', label: 'Dispatch Batches Compilation', icon: <FolderUp size={16}/> },
            { id: 'remittance', label: 'Remittance Entry', icon: <Landmark size={16}/> },
            { id: 'statistics', label: 'Insurer Stats & Analytics', icon: <Building2 size={16}/> }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === tab.id ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. CLAIMS REGISTRY TAB VIEW */}
      {activeTab === 'registry' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Corporate Claims Registry</h4>
              <p className="text-xs text-slate-400">Master tracker pulling from live operational invoices.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
              <input 
                type="text" 
                placeholder="Filter by invoice or patient..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none w-72 focus:bg-white focus:border-slate-400 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-xs tracking-wider">
                  <th className="py-4 px-4">Patient Parameters</th>
                  <th className="py-4 px-4">Insurer</th>
                  <th className="py-4 px-4">Pre-Auth Code</th>
                  <th className="py-4 px-4">Invoice Number</th>
                  <th className="py-4 px-4 text-right">Billed Invoice Value</th>
                  <th className="py-4 px-4">Dispatch Batch</th>
                  <th className="py-4 px-4 text-right">Status State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                {claims
                  .filter(c => {
                    const pName = c.patient_name || c.patient_display_name || '';
                    const invNum = c.invoice_number_display || c.invoice_number || '';
                    return invNum.toLowerCase().includes(searchQuery.toLowerCase()) || pName.toLowerCase().includes(searchQuery.toLowerCase());
                  })
                  .map((claim) => {
                    // 2. dynamically map Batch Reference from Batches array to guarantee visibility
                    const matchingBatch = batches.find(b => String(b.id) === String(claim.dispatch_batch) || String(b.id) === String(claim.dispatch_batch_id));
                    const batchRefDisplay = claim.dispatch_batch_reference || matchingBatch?.batch_reference;
                    
                    // 3. dynamically force 'PAID' status if corresponding batch is acknowledged
                    const isPaid = claim.status === 'REMITTED' || claim.status === 'PAID' || (matchingBatch && matchingBatch.is_acknowledged);
                    const statusDisplay = isPaid ? 'PAID' : (matchingBatch ? 'DISPATCHED' : (claim.status || 'UNBATCHED'));

                    return (
                      <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{claim.patient_name || claim.patient_display_name}</span>
                            <span className="text-xs text-slate-400 font-mono mt-0.5">HRN: {claim.patient_hrn}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-800">{claim.insurance_company_name}</td>
                        <td className="py-4 px-4 font-mono text-slate-600 bg-slate-50/40">{claim.pre_auth_code}</td>
                        <td className="py-4 px-4 font-mono font-bold text-indigo-600">{claim.invoice_number_display || claim.invoice_number}</td>
                        <td className="py-4 px-4 text-right font-mono font-black text-slate-900">KES {Number(claim.total_amount_billed || 0).toLocaleString()}</td>
                        <td className="py-4 px-4 font-mono text-slate-500 font-bold">
                          {batchRefDisplay || <span className="text-slate-300 italic">Unbatched</span>}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`inline-block text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded 
                            ${isPaid ? 'bg-emerald-100 text-emerald-800' 
                            : (matchingBatch ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700')}`}>
                            {statusDisplay}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DISPATCH BATCH ENGINE */}
      {activeTab === 'dispatch' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Outbound Claims Batch Compilation Engine</h4>
              <p className="text-xs text-slate-400">Package multiple invoices under structured ledger logs.</p>
            </div>
            <button 
              onClick={() => {
                setIsDispatchModalOpen(true);
                setSelectedInsurerId("");
                setUnbatchedClaims([]);
                setSelectedClaimIds([]);
              }} 
              className="bg-slate-950 text-white font-bold text-sm uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-slate-800 transition-all shadow-sm"
            >
              <Plus size={16}/> Dispatch & Stamp Batch
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-xs tracking-wider">
                  <th className="py-4 px-4 w-10"></th>
                  <th className="py-4 px-4">Batch Number Reference</th>
                  <th className="py-4 px-4">Insurance Company</th>
                  <th className="py-4 px-4 text-right">Batch Value</th>
                  <th className="py-4 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {batches.map((b) => {
                  const isExpanded = expandedBatchId === b.id;
                  const nestedClaims = claims.filter(c => String(c.dispatch_batch) === String(b.id) || String(c.dispatch_batch_id) === String(b.id));
                  
                  return (
                    <React.Fragment key={b.id}>
                      <tr className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setExpandedBatchId(isExpanded ? null : b.id)}>
                        <td className="py-4 px-4 text-center">
                          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-indigo-600">{b.batch_reference}</td>
                        <td className="py-4 px-4 font-bold text-slate-900">{b.insurance_company_name}</td>
                        <td className="py-4 px-4 text-right font-mono font-black">KES {Number(b.total_batch_value || 0).toLocaleString()}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-3 py-1 rounded text-[11px] font-black uppercase ${b.is_acknowledged ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {b.is_acknowledged ? 'Settled / Paid' : 'Submitted (Pending Payment)'}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={5} className="p-5">
                            <div className="border border-slate-200 rounded-xl bg-white p-5 space-y-3 shadow-sm">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Itemized Claims inside batch</span>
                              <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-xs">
                                    <th className="pb-3">Patient Name</th>
                                    <th className="pb-3">HRN</th>
                                    <th className="pb-3">Preauth Code</th>
                                    <th className="pb-3">Invoice Number</th>
                                    <th className="pb-3 text-right">Invoice Value</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                                  {nestedClaims.map((nc) => (
                                    <tr key={nc.id}>
                                      <td className="py-3 text-slate-900 font-bold">{nc.patient_name || nc.patient_display_name}</td>
                                      <td className="py-3 font-mono text-slate-500">{nc.patient_hrn}</td>
                                      <td className="py-3 font-mono text-slate-500">{nc.pre_auth_code}</td>
                                      <td className="py-3 font-mono text-indigo-600">{nc.invoice_number_display || nc.invoice_number}</td>
                                      <td className="py-3 text-right font-mono text-slate-900">KES {Number(nc.total_amount_billed || 0).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* DISPATCH BATCH CREATION MODAL */}
          {isDispatchModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide">Compile Corporate Remittance Consignment</h3>
                  <button onClick={() => setIsDispatchModalOpen(false)} className="text-slate-400 font-bold text-lg">✕</button>
                </div>
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Target Insurance Underwriter</label>
                    <select value={selectedInsurerId} onChange={(e) => fetchUnsubmittedClaimsForInsurer(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:outline-none focus:border-slate-400 transition-all">
                      <option value="">-- Choose Insurer --</option>
                      {payers.map(ins => <option key={ins.id} value={ins.id}>{ins.name}</option>)}
                    </select>
                  </div>

                  {selectedInsurerId && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50 text-xs uppercase font-black text-slate-400 border-b border-slate-200">
                          <tr>
                            <th className="p-3.5 text-center w-14"><button type="button" onClick={toggleSelectAllClaims}><CheckSquare size={16}/></button></th>
                            <th className="p-3.5">Patient Name</th>
                            <th className="p-3.5">HRN</th>
                            <th className="p-3.5">Preauth Code</th>
                            <th className="p-3.5">Invoice Number</th>
                            <th className="p-3.5 text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unbatchedClaims.map(claim => (
                            <tr key={claim.id} className="border-b border-slate-100 font-semibold hover:bg-slate-50/50">
                              <td className="p-3.5 text-center"><input type="checkbox" className="w-4 h-4 rounded" checked={selectedClaimIds.includes(claim.id)} onChange={() => toggleClaimCheckboxSelection(claim.id)} /></td>
                              <td className="p-3.5 font-bold text-slate-900">{claim.patient_name || claim.patient_display_name}</td>
                              <td className="p-3.5 font-mono text-slate-500">{claim.patient_hrn}</td>
                              <td className="p-3.5 font-mono text-slate-500">{claim.pre_auth_code}</td>
                              <td className="p-3.5 font-mono text-indigo-600">{claim.invoice_number_display || claim.invoice_number}</td>
                              <td className="p-3.5 text-right font-mono font-bold">KES {Number(claim.total_amount_billed || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-black tracking-wider block">Reference Key</span>
                      <span className="font-mono text-sm text-indigo-600 font-bold">{computedBatchReferencePreview}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 uppercase font-black tracking-wider block">Consolidated Value</span>
                      <span className="text-base font-mono font-black text-emerald-600">KES {calculateRunningBatchValueTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                  <button onClick={() => setIsDispatchModalOpen(false)} className="text-sm font-bold text-slate-500 uppercase mr-4 tracking-wider">Cancel</button>
                  <button onClick={handleConfirmAndStampDispatch} disabled={selectedClaimIds.length === 0} className="bg-indigo-600 text-white text-sm px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider disabled:opacity-40 shadow-sm">Complete & Dispatch</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. INBOUND REMITTANCE RECONCILIATION */}
      {activeTab === 'remittance' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Remittance Balancing Module</h4>
              <p className="text-xs text-slate-400">Process insurance statements against corresponding outbound batch pipelines.</p>
            </div>
            <button onClick={() => setIsRemitModalOpen(true)} className="bg-slate-950 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-sm cursor-pointer hover:bg-slate-800 transition-all">Reconcile Remittance Batch</button>
          </div>
          
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-black border-b border-slate-200">
                <tr>
                  <th className="p-4">Invoice Code</th>
                  <th className="p-4">Patient Details</th>
                  <th className="p-4">Preauth Code</th>
                  <th className="p-4 text-right">Billed Amount</th>
                  <th className="p-4 text-right">Amount Settled</th>
                  <th className="p-4 text-right">Shortfall Reduction</th>
                  <th className="p-4 text-center">Lifecycle Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {claims.filter(c => {
                  const matchingBatch = batches.find(b => String(b.id) === String(c.dispatch_batch) || String(b.id) === String(c.dispatch_batch_id));
                  return c.status === 'REMITTED' || c.status === 'PAID' || (matchingBatch && matchingBatch.is_acknowledged);
                }).map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono text-indigo-600">{c.invoice_number_display || c.invoice_number}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-bold text-sm">{c.patient_name || c.patient_display_name}</span>
                        <span className="text-xs font-mono text-slate-400 mt-0.5">HRN: {c.patient_hrn}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-500">{c.pre_auth_code}</td>
                    <td className="p-4 text-right font-mono">KES {Number(c.total_amount_billed || 0).toLocaleString()}</td>
                    <td className="p-4 text-right font-mono text-emerald-600">KES {Number(c.amount_paid || 0).toLocaleString()}</td>
                    <td className="p-4 text-right font-mono text-rose-600">KES {Number(c.shortfall_amount || 0).toLocaleString()}</td>
                    <td className="p-4 text-center"><span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">PAID</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AUDITED REMITTANCE POPUP MODAL */}
          {isRemitModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl border border-slate-200 max-w-6xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Execute Remittance Reconciliation Audit</h3>
                  <button onClick={() => { setIsRemitModalOpen(false); setItemizedPayments({}); }} className="text-slate-400 font-bold text-xl">✕</button>
                </div>

                <form onSubmit={handleCommitRemittance} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start overflow-y-auto flex-1 pr-1">
                  <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Select Insurer Entity</label>
                      <select value={remitInsurerId} onChange={(e) => { setRemitInsurerId(e.target.value); handleBatchSelectionChange(''); }} className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-sm font-bold shadow-xs focus:border-slate-500 focus:outline-none">
                        <option value="">-- Choose Carrier --</option>
                        {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Filter Outstanding Batch ID</label>
                      <select value={remitBatchId} disabled={!remitInsurerId} onChange={(e) => handleBatchSelectionChange(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-sm font-bold shadow-xs disabled:opacity-40 focus:border-slate-500 focus:outline-none">
                        <option value="">-- Choose Batch Reference --</option>
                        {batches.filter(b => String(b.insurance_company) === String(remitInsurerId) && !b.is_acknowledged).map(b => <option key={b.id} value={b.id}>{b.batch_reference}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Statement Date Received</label>
                      <input type="date" value={remitDateReceived} onChange={(e) => setRemitDateReceived(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-sm font-mono font-bold shadow-xs focus:border-slate-500 focus:outline-none" required />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Total Amount Received</label>
                      <input type="number" value={remitAmountPaid} onChange={(e) => setRemitAmountPaid(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-sm font-mono font-bold shadow-xs focus:border-slate-500 focus:outline-none" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Payment Reference Code</label>
                      <input type="text" value={remitChequeId} placeholder="EFT/CHQ Number" onChange={(e) => setRemitChequeId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-sm font-mono focus:border-slate-500 focus:outline-none shadow-xs" />
                    </div>

                    {/* UPLOAD PROOF BINARY INTEGRATION */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Upload Remittance Sheet Advice</label>
                      <div className="relative border border-dashed border-slate-300 rounded-xl bg-white p-3 text-center hover:bg-slate-50/50 transition-all cursor-pointer">
                        <input 
                          type="file" 
                          accept=".pdf,.xls,.xlsx"
                          onChange={(e) => {
                            if(e.target.files?.[0]) {
                              setRemitFile(e.target.files[0]);
                              setRemitFileName(e.target.files[0].name);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        />
                        <div className="flex flex-col items-center justify-center gap-1">
                          <UploadCloud size={20} className="text-slate-400" />
                          <span className="text-xs text-slate-600 font-bold truncate max-w-full">
                            {remitFileName || "Attach PDF / Excel File"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-slate-950 text-white font-bold text-sm uppercase py-3.5 rounded-xl flex items-center justify-center gap-2 mt-5 hover:bg-slate-800 transition-all shadow-md"><Save size={16}/> Save Settlement Run</button>
                  </div>

                  <div className="md:col-span-2 border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Verify Invoices & Account for Discrepancies</span>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs uppercase font-black">
                          <tr>
                            <th className="p-3 text-center w-14">Tick</th>
                            <th className="p-3">Patient Details</th>
                            <th className="p-3">Invoice Code</th>
                            <th className="p-3 text-right">Billed</th>
                            <th className="p-3 text-right">Approved</th>
                            <th className="p-3 text-right">Shortfall</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claims.filter(c => String(c.dispatch_batch) === String(remitBatchId) || String(c.dispatch_batch_id) === String(remitBatchId)).map(claim => {
                            const rowState = itemizedPayments[claim.id] || { checked: false, approved_value: claim.total_amount_billed, rejected_value: 0 };
                            return (
                              <tr key={claim.id} className="border-b border-slate-100 font-semibold hover:bg-slate-50/40 transition-colors">
                                <td className="p-3 text-center">
                                  <button type="button" onClick={() => setItemizedPayments(prev => ({ ...prev, [claim.id]: { ...prev[claim.id], checked: !prev[claim.id]?.checked } }))}>
                                    {rowState.checked ? <CheckSquare size={18} className="text-slate-950" /> : <Square size={18} className="text-slate-400" />}
                                  </button>
                                </td>
                                <td className="p-3 text-slate-900 font-bold">{claim.patient_name || claim.patient_display_name}</td>
                                <td className="p-3 font-mono text-indigo-600">{claim.invoice_number_display || claim.invoice_number}</td>
                                <td className="p-3 text-right font-mono text-slate-400">{Number(claim.total_amount_billed).toLocaleString()}</td>
                                <td className="p-3 text-right">
                                  <input type="number" disabled={!rowState.checked} value={rowState.approved_value} onChange={(e) => handleUpdateItemizedRow(claim.id, 'approved_value', e.target.value)} className="w-24 text-right bg-slate-50 border border-slate-300 rounded-lg py-1 px-2 text-sm font-mono font-bold focus:bg-white focus:outline-none" />
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-rose-600 bg-rose-50/20">{(rowState.checked ? rowState.rejected_value : 0).toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. INSURER STATS & ANALYTICS PANEL */}
      {activeTab === 'statistics' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Insurer Book Statistics & Ledger Balances</h4>
              <p className="text-xs text-slate-400">Aggregated breakdown computed in real-time from active registry accounts.</p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl shadow-xs">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block pl-2">Filter Carrier:</span>
              <select value={selectedStatInsurerId} onChange={(e) => setSelectedStatInsurerId(e.target.value)} className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer">
                <option value="all">Global Performance Summary</option>
                {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Total Billed</span>
              <span className="text-xl font-bold font-mono text-slate-900">KES {filteredAnalyticsMetrics.billed.toLocaleString()}</span>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-5 space-y-2">
              <span className="text-xs font-black text-emerald-600 uppercase tracking-widest block">Remitted Amount</span>
              <span className="text-xl font-bold font-mono text-emerald-600">KES {filteredAnalyticsMetrics.remitted.toLocaleString()}</span>
            </div>
            <div className="bg-rose-50/40 border border-rose-100 rounded-xl p-5 space-y-2">
              <span className="text-xs font-black text-rose-600 uppercase tracking-widest block">Shortfall Losses</span>
              <span className="text-xl font-bold font-mono text-rose-600">KES {filteredAnalyticsMetrics.rejected.toLocaleString()}</span>
            </div>
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-5 space-y-2">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest block">Active Run Count</span>
              <span className="text-xl font-bold font-mono text-indigo-700">{filteredAnalyticsMetrics.submittedCount} Invoices</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-slate-400"/>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Claims Valuation Performance Curve</span>
              </div>
              
              <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button type="button" onClick={() => setAnalyticsGraphMode('paid')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${analyticsGraphMode === 'paid' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Amount Paid</button>
                <button type="button" onClick={() => setAnalyticsGraphMode('receivable')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${analyticsGraphMode === 'receivable' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Outstanding Receivable</button>
              </div>
            </div>

            <div className="flex h-72 w-full select-none items-stretch gap-4 pt-2">
              <div className="w-24 flex flex-col justify-between text-right text-xs font-bold font-mono text-slate-400 pr-3 pb-6 border-r border-slate-100">
                {yAxisTicks.map((val, index) => (
                  <div key={index} className="h-4 flex items-center justify-end">
                    {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                  </div>
                ))}
              </div>

              <div className="flex-1 flex items-end justify-between gap-3 h-full pb-6 px-2 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pr-2">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-full border-b border-slate-100 border-dashed" />)}
                </div>

                {trueDataGraphCurve.map((data, idx) => {
                  const paidHeightPct = (data.amountPaid / maxAxisValue) * 100;
                  const pendingHeightPct = (data.pendingAmount / maxAxisValue) * 100;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group z-10 relative">
                      <div className="w-full h-full flex items-end justify-center gap-1.5">
                        {analyticsGraphMode === 'paid' ? (
                          <div style={{ height: `${Math.max(paidHeightPct, 2.5)}%` }} className="w-full sm:w-12 bg-emerald-500 group-hover:bg-emerald-600 rounded-t-xs transition-all duration-300" />
                        ) : (
                          <div style={{ height: `${Math.max(pendingHeightPct, 2.5)}%` }} className="w-full sm:w-12 bg-amber-500 group-hover:bg-amber-600 rounded-t-xs transition-all duration-300" />
                        )}
                      </div>
                      <span className="absolute top-full pt-2 text-xs font-black text-slate-400 uppercase tracking-wide block">{data.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceClaimsHub;