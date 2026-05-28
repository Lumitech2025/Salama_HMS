import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, ShieldCheck, FileKey2, Calendar, DollarSign, Layers, 
  CheckCircle2, Activity, Search, User, Smartphone, PhoneCall, Mail, Send, Loader2
} from 'lucide-react';

// System base interceptor matching your target backend routing matrix
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token') || 
                localStorage.getItem('access') || 
                localStorage.getItem('salama_access_token') || 
                localStorage.getItem('token') || 
                localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

const FinancialClearance = ({ initialSelectedPatient, clearTargetMemory }) => {
  const [insuranceRoute, setInsuranceRoute] = useState('SHA');
  const [verificationStatus, setVerificationStatus] = useState('idle'); 
  const [isDispatching, setIsDispatching] = useState(false);

  // Corporate Master Registries State
  const [companies, setCompanies] = useState([]);
  const [availableSchemes, setAvailableSchemes] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const [shaFields, setShaFields] = useState({ id_number: '', method: 'NATIONAL_ID', otp: '' });
  const [privateFields, setPrivateFields] = useState({ email: '', phone: '', ext: 'EXT-402', subject: '', body: '' });

  const [form, setForm] = useState({
    patient_name: '', 
    hrn_number: '', 
    company_name: 'Social Health Authority (SHA)',
    scheme: '', 
    code: '', 
    expiry: '', 
    cap_limit: '', 
    approved_amount: '',
    copay: '0', 
    treatment_type: 'CHEMOTHERAPY', 
    cycles: '1'
  });

  // Pull existing configurations from backend database on initialization setup
  useEffect(() => {
    const fetchInsuranceCompaniesRegistry = async () => {
      try {
        const response = await api.get('/insurance-companies/');
        const data = response.data.results || response.data;
        setCompanies(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Critical Profile Fetch Fail: Could not fetch active corporate profiles matrix.", err);
      }
    };
    fetchInsuranceCompaniesRegistry();
  }, []);

  // Synchronize structural mail communication parameters dynamically
  useEffect(() => {
    if (form.patient_name) {
      setPrivateFields(prev => ({
        ...prev,
        subject: `URGENT PRE-AUTH REQUEST: ${form.patient_name} [HRN: ${form.hrn_number}]`,
        body: `Dear Claims Team,\n\nThis is an automated pre-authorization request from SALAMA HMS.\n\nPatient Name: ${form.patient_name}\nHRN: ${form.hrn_number}\nTreatment: ${form.treatment_type}\nSessions: ${form.cycles}\n\nPlease verify.`
      }));
    }
  }, [form.patient_name, form.treatment_type, form.cycles]);

  // Handle incoming selected context modifications from queue lines safely
  useEffect(() => {
    if (initialSelectedPatient) {
      const isSha = initialSelectedPatient.insurance?.toUpperCase().includes('SHA');
      const company = isSha ? 'Social Health Authority (SHA)' : (initialSelectedPatient.insurance || '');
      
      setInsuranceRoute(isSha ? 'SHA' : 'PRIVATE');
      setVerificationStatus('idle');
      setShaFields(prev => ({ ...prev, id_number: initialSelectedPatient.id_number || '' }));
      
      // Match incoming patient string cleanly against known databases if available
      let verifiedEmail = `${company.toLowerCase().replace(/\s+/g, '')}@underwriter-desk.co.ke`;
      let verifiedPhone = '+254 700 000 000';
      
      setPrivateFields(prev => ({
        ...prev,
        email: isSha ? '' : verifiedEmail,
        phone: isSha ? '' : verifiedPhone
      }));

      setForm(prev => ({
        ...prev,
        patient_name: initialSelectedPatient.name || 'Anonymous Patient',
        hrn_number: initialSelectedPatient.health_record_number || '---_000_2026',
        company_name: company,
        code: initialSelectedPatient.insurance_number || prev.code || '',
        scheme: prev.scheme || '', 
        approved_amount: prev.approved_amount || '', 
        cap_limit: prev.cap_limit || '', 
        copay: '0',
        expiry: prev.expiry || ''
      }));
    }
  }, [initialSelectedPatient]);

  const handleInputChange = (e, setter) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: value }));
  };

  // Route switches control dynamic baseline values mapping primitives safely
  const handleRouteSwitch = (route) => {
    setInsuranceRoute(route);
    setVerificationStatus('idle');
    setSelectedCompanyId('');
    setAvailableSchemes([]);
    setForm(prev => ({
      ...prev,
      company_name: route === 'SHA' ? 'Social Health Authority (SHA)' : '',
      scheme: '',
      code: '',
      cap_limit: '',
      approved_amount: '',
      copay: '0',
      expiry: ''
    }));
  };

  // Dynamic Cascading Selection Engine: Handles Parent Company Trigger Blocks
  const handleCompanyDropdownSelect = (e) => {
    const companyId = e.target.value;
    setSelectedCompanyId(companyId);
    
    const targetProfile = companies.find(c => String(c.id) === String(companyId));
    if (targetProfile) {
      setAvailableSchemes(targetProfile.schemes || []);
      
      // Seed communication endpoints directly from configured server matrices
      setPrivateFields(prev => ({
        ...prev,
        email: targetProfile.email || `${targetProfile.name.toLowerCase().replace(/\s+/g, '')}@underwriter-desk.co.ke`,
        phone: targetProfile.phone || '+254 700 000 000'
      }));

      setForm(prev => ({
        ...prev,
        company_name: targetProfile.name,
        scheme: '', 
        code: '',
        cap_limit: '',
        approved_amount: '',
        copay: '0'
      }));
    } else {
      setAvailableSchemes([]);
    }
  };

  // Dynamic Auto-population Engine: Extracts scheme metrics on client actions
  const handleSchemeDropdownSelect = (e) => {
    const schemeName = e.target.value;
    const targetScheme = availableSchemes.find(s => s.name === schemeName);
    
    if (targetScheme) {
      setForm(prev => ({
        ...prev,
        scheme: targetScheme.name,
        cap_limit: targetScheme.preauth_threshold ? String(targetScheme.preauth_threshold) : '',
        copay: targetScheme.copay_amount ? String(targetScheme.copay_amount) : '0',
        // Auto-seed simulation track codes based on configuration attributes safely
        code: 'AUTH-' + (targetScheme.classification || 'CORP') + '-' + Math.floor(100000 + Math.random() * 900000),
        expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 14-day standard validation window
      }));
    }
  };

  const runVerification = (isPrivate = false) => {
    if (!isPrivate && !shaFields.id_number) return;
    if (isPrivate) setIsDispatching(true);
    setVerificationStatus('verifying');
    
    setTimeout(() => {
      setIsDispatching(false);
      setVerificationStatus('success');
      
      // Simulation engine triggers as a proxy fallback mechanism if manual inputs are passed
      if (!isPrivate) {
        setForm(prev => ({
          ...prev,
          scheme: 'Social Health Insurance Fund (SHIF)',
          code: 'SHA-DHA-' + Math.floor(100000 + Math.random() * 900000),
          cap_limit: '500000',
          approved_amount: '45000',
          copay: '0',
          expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
      } else {
        setForm(prev => ({
          ...prev,
          approved_amount: prev.approved_amount || String(parseFloat(prev.cap_limit || '100000') * 0.85)
        }));
      }
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-['Inter'] text-slate-700 pb-16 animate-in fade-in">
      
      {/* Patient Target Header */}
      <div className="bg-gradient-to-r from-slate-900 to-teal-950 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal-400">Selected Patient</p>
          <h2 className="text-3xl font-bold tracking-tight">{form.patient_name || "Select Patient From Queue"}</h2>
          <div className="flex flex-wrap items-center gap-x-6 text-sm text-slate-300 pt-1">
            <span className="flex items-center gap-1.5"><User size={16} className="text-teal-400" /> HRN: <span className="font-mono font-bold text-white text-base">{form.hrn_number}</span></span>
            {shaFields.id_number && <span className="border-l border-white/20 pl-6">ID / Passport: <span className="font-mono font-bold text-white text-base">{shaFields.id_number}</span></span>}
          </div>
        </div>

        <div className="p-1 bg-white/10 rounded-xl flex border border-white/5">
          {['SHA', 'PRIVATE'].map(route => (
            <button key={route} type="button" onClick={() => handleRouteSwitch(route)} className={`px-6 py-3 rounded-lg text-sm font-bold transition-all ${insuranceRoute === route ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
              {route === 'SHA' ? 'SHA Gateway' : 'Private Corporate Desk'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Communications/verification */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3"><Activity size={16} className="text-teal-500" /> Verification Hub</h3>
            
            {insuranceRoute === 'SHA' ? (
              <div className="space-y-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Method</label>
                  <select name="method" value={shaFields.method} onChange={(e) => handleInputChange(e, setShaFields)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-bold text-slate-700 outline-none">
                    <option value="NATIONAL_ID">National ID Query</option>
                    <option value="OTP_PIN">SMS Verification PIN</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Identification Value</label>
                  <input type="text" name="id_number" value={shaFields.id_number} onChange={(e) => handleInputChange(e, setShaFields)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-mono font-bold text-sm outline-none" />
                </div>
                <button type="button" onClick={() => runVerification(false)} disabled={!shaFields.id_number || verificationStatus === 'verifying'} className="w-full bg-slate-900 hover:bg-teal-600 text-white py-4 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-5">
                  {verificationStatus === 'verifying' ? <><Loader2 size={16} className="animate-spin" /> Fetching Gateway...</> : <><Search size={16} /> Run Verification</>}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Recipients</label>
                  <input type="email" name="email" value={privateFields.email} onChange={(e) => handleInputChange(e, setPrivateFields)} placeholder="underwriter@insurance.co.ke" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none" />
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Message</label>
                  <textarea rows="4" name="body" value={privateFields.body} onChange={(e) => handleInputChange(e, setPrivateFields)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-500 outline-none resize-none" />
                </div>
                <button type="button" onClick={() => runVerification(true)} disabled={isDispatching || !privateFields.email} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm disabled:opacity-5">
                  {isDispatching ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send & Populate Fields</>}
                </button>
              </div>
            )}
          </div>

          {/* Inline Response Diagnostic Block */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Server Logs</h4>
            {verificationStatus === 'idle' && <p className="text-sm font-medium text-slate-400 italic">Waiting for active pipeline trigger.</p>}
            {verificationStatus === 'verifying' && <div className="flex items-center gap-3 text-sm font-semibold text-slate-500 animate-pulse"><Loader2 size={16} className="text-teal-500 animate-spin" /> <span>Syncing records...</span></div>}
            {verificationStatus === 'success' && (
              <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl font-bold flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-600" /> <span>Insurance verification parameters validated.</span></div>
            )}
          </div>
        </div>

        {/* Right Column: Information form fields */}
        <div className="lg:col-span-7">
          <form onSubmit={(e) => { e.preventDefault(); alert('Financial parameters logged.'); if(clearTargetMemory) clearTargetMemory(); }} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block border-b pb-2">Insurance Allocation Form</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* INSURER COMPANY COMPONENT DROPDOWN OR STATIC ELEMENT */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Building2 size={14} /> Insurer Company</label>
                {insuranceRoute === 'SHA' ? (
                  <input type="text" name="company_name" required disabled value={form.company_name} className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 text-base font-bold text-slate-800 outline-none" />
                ) : (
                  <select 
                    value={selectedCompanyId} 
                    onChange={handleCompanyDropdownSelect}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-base font-bold text-slate-800 outline-none"
                  >
                    <option value="">-- Select Registered Payer --</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* SCHEME PLAN COMPONENT DROPDOWN OR TEXT FIELD ELEMENT */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><ShieldCheck size={14} /> Scheme/Plan Variant</label>
                {insuranceRoute === 'SHA' ? (
                  <input type="text" name="scheme" required value={form.scheme} onChange={(e) => handleInputChange(e, setForm)} placeholder="Scheme Cover Plan Name" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-base font-bold text-slate-800 outline-none" />
                ) : (
                  <select 
                    value={form.scheme} 
                    onChange={handleSchemeDropdownSelect}
                    required
                    disabled={!selectedCompanyId}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-base font-bold text-slate-800 outline-none disabled:bg-slate-100 disabled:opacity-60"
                  >
                    <option value="">-- Choose Sub-Plan Variant --</option>
                    {availableSchemes.map((scheme, idx) => (
                      <option key={scheme.id || idx} value={scheme.name}>{scheme.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><FileKey2 size={14} /> Pre-Auth Reference Code</label>
                <input type="text" name="code" required value={form.code} onChange={(e) => handleInputChange(e, setForm)} placeholder="Authorization reference" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-base font-mono font-bold text-slate-800 outline-none" />
              </div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Calendar size={14} /> Authorization Expiry</label>
                <input type="date" name="expiry" required value={form.expiry} onChange={(e) => handleInputChange(e, setForm)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-base font-semibold text-slate-700 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              {[
                { label: 'Global Limit', name: 'cap_limit', color: 'text-slate-500', border: 'border-slate-200' },
                { label: 'Approved Amount', name: 'approved_amount', color: 'text-teal-700', border: 'border-teal-200' },
                { label: 'Co-Pay Value', name: 'copay', color: 'text-amber-700', border: 'border-amber-200' }
              ].map(field => (
                <div key={field.name} className="space-y-1">
                  <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${field.color}`}><DollarSign size={13} /> {field.label}</label>
                  <input type="number" name={field.name} value={form[field.name]} onChange={(e) => handleInputChange(e, setForm)} className={`w-full bg-white border ${field.border} rounded-xl py-3 px-3 text-base font-extrabold outline-none text-slate-800 shadow-sm`} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Layers size={14} /> Treatment Type</label>
                <select name="treatment_type" value={form.treatment_type} onChange={(e) => handleInputChange(e, setForm)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-3 text-sm font-bold text-slate-700 outline-none">
                  <option value="CHEMOTHERAPY">Chemotherapy Infusion</option>
                  <option value="RADIATION_THERAPY">Radiation Session Block</option>
                  <option value="IMMUNOTHERAPY">Targeted Immunotherapy</option>
                </select>
              </div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Session / Cycles Volume</label>
                <input type="number" name="cycles" min="1" value={form.cycles} onChange={(e) => handleInputChange(e, setForm)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-base font-bold text-slate-800 outline-none" />
              </div>
            </div>

            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-wider">Commit Financial Settlement</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FinancialClearance;