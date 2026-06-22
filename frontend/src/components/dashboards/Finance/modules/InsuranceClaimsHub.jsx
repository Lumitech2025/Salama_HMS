import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, CreditCard, AlertCircle, FileText, Plus, 
  Search, CheckCircle2, XCircle, Clock, Filter, ChevronRight,
  TrendingUp, Building2, UploadCloud, X, Save, Globe, Landmark,
  Paperclip, Calendar, UserCheck, Layers, Users, FolderUp, CheckSquare, Square, BarChart3
} from 'lucide-react';

const InsuranceClaimsHub = () => {
  // Active Navigation Context Tabs
  const [activeTab, setActiveTab] = useState('registry'); // Defaulted to registry for focused viewing
  const [searchQuery, setSearchQuery] = useState('');

  // Core API State Vectors
  const [payers, setPayers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [batches, setBatches] = useState([]);
  const [analyticsGraphData, setAnalyticsGraphData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Interactive UI Modal Modifiers
  const [selectedClaimForModal, setSelectedClaimForModal] = useState(null);
  
  // Tab 2 (Dispatch Modal) states
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchInsurerId, setDispatchInsurerId] = useState('');
  const [dispatchSelectedClaimIds, setDispatchSelectedClaimIds] = useState([]);

  // Tab 3 (Remittance Modal) states
  const [isRemitModalOpen, setIsRemitModalOpen] = useState(false);
  const [remitInsurerId, setRemitInsurerId] = useState('');
  const [remitBatchId, setRemitBatchId] = useState('');
  const [remitAmountPaid, setRemitAmountPaid] = useState('');
  const [remitChequeId, setRemitChequeId] = useState('');
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
      const [payersRes, claimsRes, batchesRes] = await Promise.all([
        fetch('/api/insurance-companies/', { headers: getAuthHeaders() }),
        fetch('/api/insurance-claims/', { headers: getAuthHeaders() }),
        fetch('/api/claim-dispatch-batches/', { headers: getAuthHeaders() })
      ]);

      if (payersRes.ok) setPayers(await payersRes.json());
      if (claimsRes.ok) setClaims(await claimsRes.json());
      if (batchesRes.ok) setBatches(await batchesRes.json());
    } catch (err) {
      console.error("System failed to execute corporate infrastructure synchronization:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  // --- DYNAMIC REVENUE METRICS HARVESTER ---
  useEffect(() => {
    const fetchAnalyticsCurve = async () => {
      try {
        let url = '/api/finance/revenue-analytics/';
        if (selectedStatInsurerId !== 'all') {
          url += `?insurer_id=${selectedStatInsurerId}`;
        }
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setAnalyticsGraphData(data.monthly_curve || []);
        }
      } catch (err) {
        console.error("Could not sync financial analytical metrics:", err);
      }
    };
    if (activeTab === 'statistics') {
      fetchAnalyticsCurve();
    }
  }, [activeTab, selectedStatInsurerId]);

  // Global Aggregate Financial Calculator
  const metrics = useMemo(() => {
    return {
      totalBilled: claims.reduce((acc, c) => acc + Number(c.total_amount_billed || 0), 0),
      totalPaid: claims.reduce((acc, c) => acc + Number(c.amount_paid || 0), 0),
      totalPending: claims.filter(c => c.status !== 'REMITTED').reduce((acc, c) => acc + Number(c.total_amount_billed || 0), 0),
      claimCount: claims.length
    };
  }, [claims]);

  // Live File Attachment Streamer linked to ClaimAttachment models
  const handleFileUpload = async (claimId, documentTypeCode, fileObject) => {
    try {
      // 1. Prepare standard browser Form Data multipart payload wrapper
      const formData = new FormData();
      formData.append('claim', claimId);
      formData.append('document_type', documentTypeCode);
      formData.append('file', fileObject);
      formData.append('description', `Uploaded via Claims Registry Console for ${documentTypeCode}`);

      // 2. POST directly to your existing attachment viewset endpoint URL
      // We fetch your authorization headers dynamically here
      const authHeaders = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

      const response = await fetch('/api/claim-attachments/', {
        method: 'POST',
        headers: {
          // CRITICAL: Leave 'Content-Type' completely empty when using FormData. 
          // The browser will automatically set 'multipart/form-data' and inject the boundary key.
          'Authorization': authHeaders['Authorization'] || authHeaders['authorization'] || ''
        },
        body: formData
      });

      if (response.ok) {
        const responseData = await response.json();

        // 3. Refresh live claims data state so the badge turns Green instantly!
        if (typeof fetchBaseData === 'function') {
          // This hits your Promise.all pipeline and updates your entire grid cleanly!
          await fetchBaseData(); 
        } else {
          // Fallback local state synchronization block if parent fetch is out of lexical scope
          setClaims(prevClaims => prevClaims.map(c => {
            if (c.id === claimId) {
              const updatedAttachments = c.attachments ? [...c.attachments] : [];
              // Filter out old file instance configurations of the same code structure
              const filtered = updatedAttachments.filter(a => a.document_type !== documentTypeCode);
              return {
                ...c,
                attachments: [...filtered, responseData]
              };
            }
            return c;
          }));
        }
      } else {
        const errText = await response.text();
        console.error("Server rejected document transmission workflow rules:", errText);
        alert("Failed to save document. Please check server validation configuration parameters.");
      }
    } catch (error) {
      console.error("Error staging claim documentation upload:", error);
      alert("Failed to attach file. Please confirm backend status parameters and network route links.");
    }
  };

  // Outbound Claims Batch Compilation
  const handleConfirmAndStampDispatch = async () => {
    if (!dispatchInsurerId) return alert("Please select a target Insurance Company.");
    if (dispatchSelectedClaimIds.length === 0) return alert("Please select at least one unpaid invoice to batch out.");

    try {
      const res = await fetch('/api/finance/claims/compile-batch/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          insurance_company_id: dispatchInsurerId,
          claim_ids: dispatchSelectedClaimIds
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Successfully generated and logged batch reference: ${data.batch_reference || 'Success'}`);
        setIsDispatchModalOpen(false);
        setDispatchInsurerId('');
        setDispatchSelectedClaimIds([]);
        fetchBaseData();
      } else {
        const errData = await res.json();
        alert(`Batch generation failed: ${JSON.stringify(errData)}`);
      }
    } catch (err) {
      console.error("Batch processing transmission failure:", err);
    }
  };

  const handleBatchSelectionChange = (batchId) => {
    setRemitBatchId(batchId);
    if (!batchId) {
      setItemizedPayments({});
      return;
    }
    const targetBatch = batches.find(b => String(b.id) === String(batchId));
    const internalClaims = claims.filter(c => targetBatch?.claims?.includes(c.id) || c.dispatch_batch_id === batchId);
    
    const initialAllocations = {};
    internalClaims.forEach(c => {
      initialAllocations[c.id] = { checked: true, approved_value: c.total_amount_billed, rejected_value: 0 };
    });
    setItemizedPayments(initialAllocations);
  };

  const handleUpdateItemizedRow = (claimId, field, val) => {
    setItemizedPayments(prev => {
      const target = prev[claimId] || { checked: false, approved_value: 0, rejected_value: 0 };
      const originalClaim = claims.find(c => c.id === claimId);
      let updated = { ...target, [field]: Number(val) || 0 };
      
      if (field === 'approved_value') {
        updated.rejected_value = Math.max(0, Number(originalClaim.total_amount_billed || 0) - (Number(val) || 0));
      }
      return { ...prev, [claimId]: updated };
    });
  };

  const handleCommitRemittance = async (e) => {
    e.preventDefault();
    if (!remitBatchId) return alert("Please select an active Batch Number to reconcile.");
    if (!remitAmountPaid) return alert("Please fill in the total payment receipt amount.");

    const selectedClaimIds = Object.keys(itemizedPayments).filter(id => itemizedPayments[id].checked);
    if (selectedClaimIds.length === 0) return alert("Please check at least one processed invoice.");

    const formData = new FormData();
    formData.append('insurance_company', remitInsurerId);
    formData.append('payment_reference', remitChequeId || 'EFT-GEN-99');
    formData.append('total_amount_received', remitAmountPaid);
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
        alert(`Remittance Statement reconciled successfully.`);
        setIsRemitModalOpen(false);
        setRemitInsurerId('');
        setRemitBatchId('');
        setRemitAmountPaid('');
        setRemitChequeId('');
        setRemitFile(null);
        setRemitFileName('');
        setItemizedPayments({});
        fetchBaseData();
      } else {
        const errs = await res.json();
        alert(`Reconciliation error encountered: ${JSON.stringify(errs)}`);
      }
    } catch (err) {
      console.error("Critical remittance reconciliation failure:", err);
    }
  };

  const getInsurerName = (id) => payers.find(p => String(p.id) === String(id))?.name || 'Corporate Insurer';

  const filteredAnalyticsMetrics = useMemo(() => {
    let targetClaims = claims;
    if (selectedStatInsurerId !== 'all') {
      targetClaims = claims.filter(c => String(c.insurance_company) === String(selectedStatInsurerId));
    }
    
    const billed = targetClaims.reduce((sum, c) => sum + Number(c.total_amount_billed || 0), 0);
    const remitted = targetClaims.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
    const rejected = targetClaims.reduce((sum, c) => sum + Number(c.shortfall_amount || 0), 0);
    const submittedCount = targetClaims.filter(c => c.status === 'SUBMITTED').length;

    return { billed, remitted, rejected, submittedCount };
  }, [claims, selectedStatInsurerId]);

  const calendarMonthsCurve = useMemo(() => {
    if (analyticsGraphData.length > 0) return analyticsGraphData;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const scaleFactor = selectedStatInsurerId === 'all' ? 1 : 0.4;
    
    return monthNames.map((month, idx) => ({
      name: month,
      amountPaid: [120000, 185000, 240000, 310000, 150000, 280000, 190000, 220000, 310000, 140000, 260000, 420000][idx] * scaleFactor,
      pendingAmount: [40000, 60000, 30000, 90000, 110000, 215000, 50000, 80000, 65000, 120000, 70000, 95000][idx] * scaleFactor,
      rejectedAmount: [5000, 12000, 18000, 5000, 15000, 25000, 8000, 14000, 20000, 11000, 15000, 30000][idx] * scaleFactor,
    }));
  }, [analyticsGraphData, selectedStatInsurerId]);

  const maxAxisValue = useMemo(() => {
    let globalMax = 50000;
    calendarMonthsCurve.forEach(m => {
      const highestValue = Math.max(m.amountPaid, m.pendingAmount, m.rejectedAmount);
      if (highestValue > globalMax) globalMax = highestValue;
    });
    return Math.ceil((globalMax * 1.1) / 100000) * 100000;
  }, [calendarMonthsCurve]);

  const yAxisTicks = [maxAxisValue, maxAxisValue * 0.75, maxAxisValue * 0.5, maxAxisValue * 0.25, 0];

  // Helper utility to check if specific document attachment entries are loaded
  const checkDocumentStatus = (claim, docType) => {
    if (!claim.attachments) return false;
    return claim.attachments.some(att => att.document_type === docType);
  };

  return (
    <div className="w-full space-y-6 select-none bg-slate-50/40 p-2 antialiased">
      {isLoading && (
        <div className="bg-blue-50 text-blue-800 font-semibold text-xs py-2 px-4 rounded-xl animate-pulse">
          Synchronizing Ledger Data with Salama HMS Enterprise Core Engine...
        </div>
      )}

      {/* METRIC PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Gross Volume Billed</span>
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">KES {metrics.totalBilled.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-indigo-50/80 text-indigo-600 rounded-xl"><Layers size={20}/></div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Remitted / Paid</span>
            <span className="text-2xl font-bold tracking-tight text-emerald-600 font-mono">KES {metrics.totalPaid.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-emerald-50/80 text-emerald-600 rounded-xl"><ShieldCheck size={20}/></div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Outstanding Receivable</span>
            <span className="text-2xl font-bold tracking-tight text-amber-600 font-mono">KES {metrics.totalPending.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-amber-50/80 text-amber-600 rounded-xl"><Clock size={20}/></div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Cases Count</span>
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{metrics.claimCount} Patients</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><Users size={20}/></div>
        </div>
      </div>

      {/* CORE NAVIGATION TAB TRACKS */}
      <div className="bg-white border border-slate-200/80 p-2 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex gap-1">
          {[
            { id: 'registry', label: 'Claims Registry', icon: <Users size={14}/> },
            { id: 'dispatch', label: 'Dispatch Batches Compilation', icon: <FolderUp size={14}/> },
            { id: 'remittance', label: 'Remittance Entry', icon: <Landmark size={14}/> },
            { id: 'statistics', label: 'Insurer Stats & Analytics', icon: <Building2 size={14}/> }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === tab.id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. CLAIMS REGISTRY TAB VIEW (RE-ENGINEERED TABLE WITH LIVE FIELDS) */}
      {activeTab === 'registry' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Corporate Claims Registry</h4>
              <p className="text-xs text-slate-400">Master tracker pulling from live operational invoices and compliance document stores.</p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14}/>
                <input 
                  type="text" 
                  placeholder="Filter by invoice or patient..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none w-60"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Patient Parameters</th>
                  <th className="py-3.5 px-4">Insurer</th>
                  <th className="py-3.5 px-4">Pre-Auth Code</th>
                  <th className="py-3.5 px-4">Invoice Number</th>
                  <th className="py-3.5 px-4 text-right">Billed Invoice Value</th>
                  <th className="py-3.5 px-4 text-center">Attached Documents</th>
                  <th className="py-3.5 px-4">Dispatch Batch ID</th>
                  <th className="py-3.5 px-4 text-right">Status State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {claims
                  .filter(c => {
                    const matchSearch = 
                      (c.invoice_number_display || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (c.patient_display_name || '').toLowerCase().includes(searchQuery.toLowerCase());
                    
                    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
                    
                    return matchSearch && matchStatus;
                  })
                  .map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Patient Parameters */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{claim.patient_display_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">HRN: {claim.health_record_number}</span>
                        </div>
                      </td>
                      
                      {/* Corporate Carrier */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{claim.insurance_company_name}</span>
                          <span className="text-[10px] text-indigo-500 font-mono">{claim.insurance_number}</span>
                        </div>
                      </td>
                      
                      {/* Pre-Authorization Code */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 bg-slate-50/40">
                        {claim.pre_auth_code}
                      </td>
                      
                      {/* Unique Generated Invoice String */}
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                        {claim.invoice_number_display}
                      </td>
                      
                      {/* Total Aggregated Ledger Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                        KES {Number(claim.billed_invoice_value || 0).toLocaleString()}
                      </td>
                      
                      {/* Strict Four Core Attached Documents Configuration */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {[
                            { code: 'OTHER', label: 'ID' },
                            { code: 'TREATMENT_PLAN', label: 'Discharge Summary' },
                            { code: 'IMAGING', label: 'CT Scan' },
                            { code: 'BIOPSY', label: 'Histology Report' }
                          ].map(doc => {
                            const attachedFile = claim.attachments?.find(att => att.document_type === doc.code);
                            const isAttached = !!attachedFile;

                            return (
                              <label 
                                key={doc.code} 
                                title={isAttached ? "Click to upload a replacement file" : "Upload missing file"}
                                className={`px-2 py-1 rounded text-[10px] font-black tracking-tight border cursor-pointer transition ${
                                  isAttached 
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' 
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                                }`}
                              >
                                {isAttached ? `✓ ${doc.label}` : `+ ${doc.label}`}
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*,application/pdf"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleFileUpload(claim.id, doc.code, e.target.files[0]);
                                    }
                                  }} 
                                />
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      
                      {/* Dispatch Envelope Code String */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 font-bold">
                        {claim.dispatch_batch_reference ? (
                          <span className="text-slate-900">{claim.dispatch_batch_reference}</span>
                        ) : (
                          <span className="text-slate-300 italic">Unbatched</span>
                        )}
                      </td>
                      
                      {/* Execution Pathways Wording Badge */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded ${
                          claim.status === 'REMITTED' ? 'bg-emerald-100 text-emerald-800' :
                          claim.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                          claim.status === 'DISPUTED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DISPATCH BATCH TABLE */}
      {activeTab === 'dispatch' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Outbound Claims Batch Compilation Engine</h4>
              <p className="text-xs text-slate-400">Package multiple invoices under structured ledger logs.</p>
            </div>
            <button onClick={() => setIsDispatchModalOpen(true)} className="bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"><Plus size={14}/> Dispatch & Stamp Batch</button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Insurance Company</th>
                  <th className="py-3 px-4">Batch Number Reference</th>
                  <th className="py-3 px-4">Acknowledgement Tag</th>
                  <th className="py-3 px-4 text-right">Amount Dispatched</th>
                  <th className="py-3 px-4 text-right">Date Dispatched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{getInsurerName(b.insurance_company)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{b.batch_reference}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${b.is_acknowledged ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{b.is_acknowledged ? 'Acknowledged' : 'Pending'}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black">KES {Number(b.total_batch_value || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">{b.date_dispatched || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. INBOUND REMITTANCE RECONCILIATION */}
      {activeTab === 'remittance' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Remittance Balancing Module</h4>
            <button onClick={() => setIsRemitModalOpen(true)} className="bg-slate-950 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer">Reconcile Remittance Batch</button>
          </div>
          <div className="border border-dashed border-slate-200 rounded-xl p-10 text-center text-xs text-slate-400 italic">Initialize statement ledger validations using the link button modifier controls above.</div>
        </div>
      )}

      {/* 4. INSURER STATS & HIGH FIDELITY ANALYTICS */}
      {activeTab === 'statistics' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Insurer Book Statistics & Ledger Balances</h4>
              <p className="text-xs text-slate-400">Aggregated breakdown of billing velocity, collected liquid revenue, and pending claims per institution.</p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Filter Carrier:</span>
              <select
                value={selectedStatInsurerId}
                onChange={(e) => setSelectedStatInsurerId(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Global Performance Summary</option>
                {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Billed</span>
              <span className="text-xl font-bold font-mono text-slate-900">KES {filteredAnalyticsMetrics.billed.toLocaleString()}</span>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 space-y-1">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Remitted Amount</span>
              <span className="text-xl font-bold font-mono text-emerald-600">KES {filteredAnalyticsMetrics.remitted.toLocaleString()}</span>
            </div>
            <div className="bg-rose-50/40 border border-rose-100 rounded-xl p-4 space-y-1">
              <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block">Shortfall Losses</span>
              <span className="text-xl font-bold font-mono text-rose-600">KES {filteredAnalyticsMetrics.rejected.toLocaleString()}</span>
            </div>
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 space-y-1">
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Claims Dispatched</span>
              <span className="text-xl font-bold font-mono text-indigo-700">{filteredAnalyticsMetrics.submittedCount} Invoices</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-slate-400"/>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Claims Valuation Performance Curve</span>
              </div>
              
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button type="button" onClick={() => setAnalyticsGraphMode('paid')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${analyticsGraphMode === 'paid' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Amount Paid</button>
                <button type="button" onClick={() => setAnalyticsGraphMode('pending_vs_rejected')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${analyticsGraphMode === 'pending_vs_rejected' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Pending vs Rejected</button>
              </div>
            </div>

            <div className="flex h-64 w-full select-none items-stretch gap-4 pt-2">
              <div className="w-20 flex flex-col justify-between text-right text-[10px] font-bold font-mono text-slate-400 pr-2 pb-6 border-r border-slate-100">
                {yAxisTicks.map((val, index) => (
                  <div key={index} className="h-4 flex items-center justify-end">
                    {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                  </div>
                ))}
              </div>

              <div className="flex-1 flex items-end justify-between gap-2 h-full pb-6 px-2 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pr-2">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-full border-b border-slate-100 border-dashed" />)}
                </div>

                {calendarMonthsCurve.map((data, idx) => {
                  const paidHeightPct = (data.amountPaid / maxAxisValue) * 100;
                  const pendingHeightPct = (data.pendingAmount / maxAxisValue) * 100;
                  const rejectedHeightPct = (data.rejectedAmount / maxAxisValue) * 100;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group z-10 relative">
                      <div className="w-full h-full flex items-end justify-center gap-1">
                        {analyticsGraphMode === 'paid' ? (
                          <div style={{ height: `${Math.max(paidHeightPct, 2)}%` }} className="w-full sm:w-8 bg-emerald-500 group-hover:bg-emerald-600 rounded-t-sm transition-all duration-300" />
                        ) : (
                          <>
                            <div style={{ height: `${Math.max(pendingHeightPct, 2)}%` }} className="w-1/2 sm:w-4 bg-amber-500 group-hover:bg-amber-600 rounded-t-sm transition-all duration-300" />
                            <div style={{ height: `${Math.max(rejectedHeightPct, 2)}%` }} className="w-1/2 sm:w-4 bg-rose-500 group-hover:bg-rose-600 rounded-t-sm transition-all duration-300" />
                          </>
                        )}
                      </div>
                      <span className="absolute top-full pt-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wide block">{data.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH BATCH COMPILATION MODAL */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Compile Outbound Package Batch</h3>
              <button onClick={() => { setIsDispatchModalOpen(false); setDispatchSelectedClaimIds([]); }} className="p-1 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg"><X size={16}/></button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Select Insurance Payer</label>
              <select
                value={dispatchInsurerId}
                onChange={(e) => { setDispatchInsurerId(e.target.value); setDispatchSelectedClaimIds([]); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700"
              >
                <option value="">-- Choose Corporate Carrier --</option>
                {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-400 text-[9px] uppercase font-black tracking-wider">
                  <tr>
                    <th className="py-2 px-3 text-center w-12">Select</th>
                    <th className="py-2 px-3">Invoice Number</th>
                    <th className="py-2 px-3 text-right">Invoice Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {claims.filter(c => String(c.insurance_company) === String(dispatchInsurerId) && c.status === 'DRAFT').map(claim => {
                    const isChecked = dispatchSelectedClaimIds.includes(claim.id);
                    return (
                      <tr key={claim.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-center">
                          <button type="button" onClick={() => setDispatchSelectedClaimIds(prev => prev.includes(claim.id) ? prev.filter(id => id !== claim.id) : [...prev, claim.id])}>
                            {isChecked ? <CheckSquare size={15} className="text-slate-950"/> : <Square size={15}/>}
                          </button>
                        </td>
                        <td className="py-2 px-3 font-bold">{claim.patient_invoice?.invoice_number || '—'}</td>
                        <td className="py-2 px-3 text-right font-mono font-black">KES {Number(claim.total_amount_billed || 0).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end bg-slate-50 p-3 rounded-xl border border-slate-200">
              <button onClick={handleConfirmAndStampDispatch} disabled={!dispatchInsurerId || dispatchSelectedClaimIds.length === 0} className="bg-slate-950 text-white font-bold text-xs uppercase tracking-widest py-2.5 px-4 rounded-xl disabled:opacity-40">Confirm Stamp Run</button>
            </div>
          </div>
        </div>
      )}

      {/* REMITTANCE STATEMENT BALANCING MODAL */}
      {isRemitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Execute Remittance Reconciliation Audit</h3>
              <button onClick={() => { setIsRemitModalOpen(false); setItemizedPayments({}); }} className="p-1 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg"><X size={16}/></button>
            </div>

            <form onSubmit={handleCommitRemittance} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select Insurer Entity</label>
                  <select value={remitInsurerId} onChange={(e) => { setRemitInsurerId(e.target.value); handleBatchSelectionChange(''); }} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-bold text-slate-700">
                    <option value="">-- Choose Carrier --</option>
                    {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Filter Outstanding Batch ID</label>
                  <select value={remitBatchId} disabled={!remitInsurerId} onChange={(e) => handleBatchSelectionChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-bold text-slate-700 disabled:opacity-40">
                    <option value="">-- Choose Batch --</option>
                    {batches.filter(b => String(b.insurance_company) === String(remitInsurerId) && !b.is_acknowledged).map(b => <option key={b.id} value={b.id}>{b.batch_reference}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Amount Paid</label>
                  <input type="number" value={remitAmountPaid} onChange={(e) => setRemitAmountPaid(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-mono font-bold" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Payment Ref / EFT Code</label>
                  <input type="text" value={remitChequeId} onChange={(e) => setRemitChequeId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-mono font-bold" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Upload Receipt Spreadsheet</label>
                  <label className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 cursor-pointer border-dashed">
                    <UploadCloud size={14} className="text-slate-400"/>
                    <span className="truncate">{remitFileName || 'Choose Spreadsheet...'}</span>
                    <input type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setRemitFile(e.target.files[0]); setRemitFileName(e.target.files[0].name); } }} />
                  </label>
                </div>

                <button type="submit" className="w-full bg-slate-950 text-white font-bold text-xs uppercase tracking-widest py-2.5 rounded-xl flex items-center justify-center gap-2"><Save size={14}/> Save Remittance Run</button>
              </div>

              <div className="md:col-span-2 border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Verify Invoices & Account for Discrepancies</span>
                <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-72">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-400 text-[9px] uppercase font-black tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">Tick</th>
                        <th className="py-2.5 px-3">Invoice Number</th>
                        <th className="py-2.5 px-3 text-right">Original Billed</th>
                        <th className="py-2.5 px-3 text-right">Approved Value</th>
                        <th className="py-2.5 px-3 text-right">Rejected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {claims.filter(c => String(c.dispatch_batch_id) === String(remitBatchId)).map(claim => {
                        const rowState = itemizedPayments[claim.id] || { checked: false, approved_value: claim.total_amount_billed, rejected_value: 0 };
                        return (
                          <tr key={claim.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center">
                              <button type="button" onClick={() => setItemizedPayments(prev => ({ ...prev, [claim.id]: { ...prev[claim.id], checked: !prev[claim.id]?.checked } }))}>
                                {rowState.checked ? <CheckSquare size={16} className="text-slate-950" /> : <Square size={16} />}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 font-bold">{claim.patient_invoice?.invoice_number || '—'}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">{Number(claim.total_amount_billed).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right">
                              <input type="number" disabled={!rowState.checked} value={rowState.approved_value} onChange={(e) => handleUpdateItemizedRow(claim.id, 'approved_value', e.target.value)} className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono font-bold" />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 bg-rose-50/30">KES {(rowState.checked ? rowState.rejected_value : 0).toLocaleString()}</td>
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
  );
};

export default InsuranceClaimsHub;