import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  FileKey2, 
  Calendar, 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  Activity, 
  Search,
  Check,
  User,
  Smartphone,
  PhoneCall,
  Mail,
  Info,
  Send,
  Loader2
} from 'lucide-react';

const FinancialClearance = ({ initialSelectedPatient, clearTargetMemory }) => {
  const [insuranceRoute, setInsuranceRoute] = useState('SHA');
  const [verificationStatus, setVerificationStatus] = useState('idle'); // 'idle' | 'verifying' | 'success' | 'failed'
  const [isDispatching, setIsDispatching] = useState(false);

  // Verification parameters matching DHA Portal Guidelines
  const [shaVerificationFields, setShaVerificationFields] = useState({
    id_number: '',
    verification_method: 'NATIONAL_ID', 
    otp_received_code: '',
  });

  // Extended state to hold automated private communication variables
  const [privateCommFields, setPrivateCommFields] = useState({
    underwriter_email: '',
    payer_phone: '',
    officer_extension: '',
    email_template_subject: '',
    email_template_body: ''
  });

  // SALAMA HMS Oncology Intake Form Mapping
  const [clearanceForm, setClearanceForm] = useState({
    patient_name: '',
    hrn_number: '',
    company_name: 'Social Health Authority (SHA)',
    policy_scheme_name: '',
    pre_auth_code: '',
    pre_auth_expiry: '',
    maximum_coverage_limit: '',
    approved_amount: '',
    patient_copay_amount: '0',
    oncology_treatment_type: 'CHEMOTHERAPY',
    approved_cycles_count: '1',
    clinical_notes: '',
    insurance_officer_name: '',
    insurance_contact_channel: 'EMAIL' // Default to EMAIL for automation demo
  });

  // Auto-generate template text when patient or insurer details pivot
  useEffect(() => {
    if (clearanceForm.patient_name) {
      const formattedSubject = `URGENT PRE-AUTH REQUEST: ${clearanceForm.patient_name} [HRN: ${clearanceForm.hrn_number}]`;
      const formattedBody = `Dear Claims Team,\n\nThis is an automated pre-authorization intake notification from SALAMA HMS Oncology Department.\n\nPatient Name: ${clearanceForm.patient_name}\nHealth Record Number: ${clearanceForm.hrn_number}\nProposed Regimen: ${clearanceForm.oncology_treatment_type}\nRequested Sessions: ${clearanceForm.approved_cycles_count}\n\nPlease reply with the approved limit allocation matrix and validation token identifier.\n\nRegards,\nBilling Intake Desk`;
      
      setPrivateCommFields(prev => ({
        ...prev,
        email_template_subject: formattedSubject,
        email_template_body: formattedBody
      }));
    }
  }, [clearanceForm.patient_name, clearanceForm.company_name, clearanceForm.oncology_treatment_type, clearanceForm.approved_cycles_count]);

  // Listen to incoming pipeline transmissions from the Registration Queue
  useEffect(() => {
    if (initialSelectedPatient) {
      const isSha = initialSelectedPatient.insurance?.toUpperCase().includes('SHA') || 
                    initialSelectedPatient.insurance?.toUpperCase() === 'SHA';
      
      const routeSelection = isSha ? 'SHA' : 'PRIVATE';
      setInsuranceRoute(routeSelection);
      setVerificationStatus('idle');

      setShaVerificationFields(prev => ({
        ...prev,
        id_number: initialSelectedPatient.id_number || ''
      }));

      // Map baseline endpoints or provide defaults for known private medical insurers
      const mappedInsurance = initialSelectedPatient.insurance || '';
      const fallbackEmail = mappedInsurance.toLowerCase().replace(/\s+/g, '') + '@underwriter-desk.co.ke';
      
      setPrivateCommFields(prev => ({
        ...prev,
        underwriter_email: isSha ? '' : fallbackEmail,
        payer_phone: isSha ? '' : '+254 700 000 000',
        officer_extension: 'EXT-402'
      }));

      setClearanceForm(prev => ({
        ...prev,
        patient_name: initialSelectedPatient.name || 'Anonymous Patient',
        hrn_number: initialSelectedPatient.health_record_number || '---_000_2026',
        company_name: isSha ? 'Social Health Authority (SHA)' : mappedInsurance,
        pre_auth_code: isSha ? '' : (initialSelectedPatient.insurance_number || ''),
        policy_scheme_name: '',
        approved_amount: '',
        maximum_coverage_limit: '',
        patient_copay_amount: '0'
      }));
    }
  }, [initialSelectedPatient]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setClearanceForm(prev => ({ ...prev, [name]: value }));
  };

  // FIXED NAMING CONVENTION MATCH: Changed from handleShaFieldsChange to match UI consumers
  const handleShaFieldChange = (e) => {
    const { name, value } = e.target;
    setShaVerificationFields(prev => ({ ...prev, [name]: value }));
  };

  const handlePrivateCommChange = (e) => {
    const { name, value } = e.target;
    setPrivateCommFields(prev => ({ ...prev, [name]: value }));
  };

  const handleRouteSwitch = (route) => {
    setInsuranceRoute(route);
    setVerificationStatus('idle');
    setClearanceForm(prev => ({
      ...prev,
      company_name: route === 'SHA' ? 'Social Health Authority (SHA)' : '',
      policy_scheme_name: '',
      pre_auth_code: '',
      approved_amount: '',
      maximum_coverage_limit: '',
      patient_copay_amount: '0',
      insurance_contact_channel: route === 'SHA' ? 'PORTAL' : 'EMAIL'
    }));
  };

  // Live Simulation query mirroring HIE Integration layer
  const runLiveDhaRegistryQuery = () => {
    if (!shaVerificationFields.id_number) return;
    setVerificationStatus('verifying');
    
    setTimeout(() => {
      setVerificationStatus('success');
      setClearanceForm(prev => ({
        ...prev,
        policy_scheme_name: 'Social Health Insurance Fund (SHIF) - Essential Care Package',
        pre_auth_code: 'SHA-DHA-' + Math.floor(100000 + Math.random() * 900000),
        maximum_coverage_limit: '500000',
        approved_amount: '45000',
        patient_copay_amount: '0',
        pre_auth_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));
    }, 1500);
  };

  // AUTOMATED DISPATCH HANDLER FOR PRIVATE INSURANCES
  const triggerPrivateAutomationDispatch = () => {
    setIsDispatching(true);
    setVerificationStatus('verifying');

    setTimeout(() => {
      setIsDispatching(false);
      setVerificationStatus('success');

      // Mimic an inbound webhook response parsing engine to fill financial variables automatically
      setClearanceForm(prev => ({
        ...prev,
        insurance_officer_name: clearanceForm.insurance_contact_channel === 'EMAIL' ? 'Automated Mailer System' : 'Agent Line Response',
        policy_scheme_name: `${clearanceForm.company_name} Managed Oncology Executive Option`,
        pre_auth_code: 'AUTH-CORP-' + Math.floor(200000 + Math.random() * 700000),
        maximum_coverage_limit: '1200000',
        approved_amount: '185000',
        patient_copay_amount: '10000', // Standard corporate co-pay clause rule
        pre_auth_expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 14 Day Corporate lifecycle window
      }));
    }, 2000);
  };

  const handleCompleteFinancialClearance = (e) => {
    e.preventDefault();
    alert(`Financial clearance metrics successfully bound to ${clearanceForm.patient_name}. Ready for workflow billing engine!`);
    if (clearTargetMemory) clearTargetMemory();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-['Inter'] text-slate-700 animate-in fade-in duration-300 pb-16">
      
      {/* SECTION 1: SYSTEM ACTIVECONTEXT PIPELINE OVERVIEW */}
      <div className="bg-gradient-to-r from-slate-900 to-teal-950 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-400">Piped Verification Target</p>
          <h2 className="text-3xl font-bold tracking-tight">
            {clearanceForm.patient_name || "Select A Patient From Registration Queue"}
          </h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-300 pt-1">
            <span className="flex items-center gap-1.5">
              <User size={16} className="text-teal-500" /> 
              HRN Number: <span className="font-mono text-white font-bold text-base">{clearanceForm.hrn_number}</span>
            </span>
            {shaVerificationFields.id_number && (
              <span className="border-l border-white/20 pl-6 text-sm">
                National ID / Passport: <span className="font-mono text-white font-bold text-base">{shaVerificationFields.id_number}</span>
              </span>
            )}
          </div>
        </div>

        {/* CUSTOM FLUID DISPATCH INTERFACE TOGGLE */}
        <div className="p-1 bg-white/10 rounded-xl flex items-center border border-white/5 self-start md:self-center">
          <button
            type="button"
            onClick={() => handleRouteSwitch('SHA')}
            className={`px-6 py-3 rounded-lg text-sm font-bold tracking-wide transition-all ${
              insuranceRoute === 'SHA'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            SHA (DHA Live API)
          </button>
          <button
            type="button"
            onClick={() => handleRouteSwitch('PRIVATE')}
            className={`px-6 py-3 rounded-lg text-sm font-bold tracking-wide transition-all ${
              insuranceRoute === 'PRIVATE'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Private Corporate Desk
          </button>
        </div>
      </div>

      {/* CORE INTEGRATION SPACE DIVISION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT COLUMN: INDEPENDENT IDENTIFICATION VERIFIERS */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-teal-500" />
                {insuranceRoute === 'SHA' ? 'DHA Live Verification Endpoint' : 'Automated Communications Hub'}
              </h3>
            </div>

            {insuranceRoute === 'SHA' ? (
              /* AUTOMATED SOCIAL HEALTH AUTHORITY INTEGRATION LAYERS */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verification Channel Method</label>
                  <select 
                    name="verification_method"
                    value={shaVerificationFields.verification_method}
                    onChange={handleShaFieldChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-bold text-slate-700 outline-none"
                  >
                    <option value="NATIONAL_ID">National ID Card Query</option>
                    <option value="OTP_PIN">AfyaYangu SMS Verification PIN</option>
                    <option value="BIOMETRIC">DHA Unified Biometric Token</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identity/Document Reference String</label>
                  <input 
                    type="text"
                    name="id_number"
                    placeholder="Enter registration reference code..."
                    value={shaVerificationFields.id_number}
                    onChange={handleShaFieldChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm font-mono font-bold outline-none"
                  />
                </div>

                {shaVerificationFields.verification_method === 'OTP_PIN' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-xs font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1">
                      <Smartphone size={13} /> Input Patient Received OTP Code
                    </label>
                    <input 
                      type="text"
                      name="otp_received_code"
                      placeholder="e.g. 6-Digit Secure PIN"
                      value={shaVerificationFields.otp_received_code}
                      onChange={handleShaFieldChange}
                      className="w-full bg-teal-50/50 border border-teal-200 rounded-xl py-3.5 px-4 text-sm font-mono font-bold tracking-[0.2em] text-teal-700 outline-none"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={runLiveDhaRegistryQuery}
                  disabled={!shaVerificationFields.id_number || verificationStatus === 'verifying'}
                  className="w-full mt-2 bg-slate-900 hover:bg-teal-600 disabled:bg-slate-100 disabled:text-slate-400 text-white py-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {verificationStatus === 'verifying' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Querying DHA Gateway Engine...
                    </>
                  ) : (
                    <>
                      <Search size={16} /> Submit Query Authorization
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* PRIVATE CORPORATE UNDERWRITERS AUTOMATED RUNTIME BLOCK */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Communication Channel Protocol</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/40">
                    {[
                      { id: 'EMAIL', label: 'Send Automated Email', icon: <Mail size={14} /> },
                      { id: 'CALL', label: 'Log Hotline Call', icon: <PhoneCall size={14} /> }
                    ].map((chan) => (
                      <button
                        type="button"
                        key={chan.id}
                        onClick={() => setClearanceForm(prev => ({ ...prev, insurance_contact_channel: chan.id }))}
                        className={`py-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                          clearanceForm.insurance_contact_channel === chan.id 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {chan.icon}
                        <span>{chan.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {clearanceForm.insurance_contact_channel === 'EMAIL' ? (
                  /* AUTOMATED EMAIL DISPATCH PANEL */
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payer Recipient Address</label>
                      <input 
                        type="email"
                        name="underwriter_email"
                        value={privateCommFields.underwriter_email}
                        onChange={handlePrivateCommChange}
                        placeholder="underwriter@insurance-desk.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subject Line</label>
                      <input 
                        type="text"
                        name="email_template_subject"
                        value={privateCommFields.email_template_subject}
                        onChange={handlePrivateCommChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold outline-none text-slate-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Message Payload</label>
                      <textarea 
                        rows="4"
                        name="email_template_body"
                        value={privateCommFields.email_template_body}
                        onChange={handlePrivateCommChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-500 outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={triggerPrivateAutomationDispatch}
                      disabled={isDispatching || !privateCommFields.underwriter_email}
                      className="w-full mt-1 bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {isDispatching ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Transmitting Request...
                        </>
                      ) : (
                        <>
                          <Send size={14} /> Send Pre-Auth & Verify
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* TELEPHONY TRACKING LOG ACTION */
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hotline Stream</label>
                        <input 
                          type="text"
                          name="payer_phone"
                          value={privateCommFields.payer_phone}
                          onChange={handlePrivateCommChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Desk Ext.</label>
                        <input 
                          type="text"
                          name="officer_extension"
                          value={privateCommFields.officer_extension}
                          onChange={handlePrivateCommChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold outline-none font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={triggerPrivateAutomationDispatch}
                      disabled={isDispatching}
                      className="w-full mt-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isDispatching ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Logging Operational Line...
                        </>
                      ) : (
                        <>
                          <PhoneCall size={14} /> Initialize Phone Call Log
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* REALTIME SYSTEM CALLBACK DIAGNOSTIC BANNER */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200/60 p-5 space-y-3">
            <h4 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Live Pipeline Server Responses</h4>
            
            {verificationStatus === 'idle' && (
              <p className="text-sm font-medium text-slate-400 italic">Awaiting action triggers to connect remote verification pipelines.</p>
            )}

            {verificationStatus === 'verifying' && (
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-500 animate-pulse">
                <Loader2 size={16} className="text-teal-500 animate-spin" />
                <span>Processing automated webhooks and fetching remote criteria maps...</span>
              </div>
            )}

            {verificationStatus === 'success' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>Carrier Response Parsed: Financial Fields Populated</span>
                </div>
                <div className="text-xs font-mono text-slate-500 space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <p>• Hook Routing Status: <span className="text-slate-900 font-bold">200 OK (Dispatched)</span></p>
                  <p>• Data Binding Engine: <span className="text-teal-600 font-bold">Injected Successfully</span></p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COMPONENT COLUMN: THE BENEFIT MAPPING MATRIX FORM */}
        <div className="lg:col-span-7">
          <form onSubmit={handleCompleteFinancialClearance} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 md:p-8 space-y-6">
            
            <div className="border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Step 2: Benefit Allocation Mapping Matrix
              </span>
            </div>

            {/* ASSIGNED CARRIER DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Building2 size={14} className="text-slate-400" /> Insurance Company / Provider
                </label>
                <input 
                  type="text" 
                  name="company_name"
                  required
                  disabled={insuranceRoute === 'SHA'}
                  value={clearanceForm.company_name}
                  onChange={handleFormChange}
                  placeholder="e.g. Jubilee Insurance, Madison, GA"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-base font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/10 disabled:bg-slate-100 disabled:text-slate-400 transition-all" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <ShieldCheck size={14} className="text-slate-400" /> Authorized Plan / Scheme Benefits Name
                </label>
                <input 
                  type="text" 
                  name="policy_scheme_name"
                  required
                  value={clearanceForm.policy_scheme_name}
                  onChange={handleFormChange}
                  placeholder="e.g. Corporate Managed Oncology Scheme"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-base font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/10 transition-all" 
                />
              </div>
            </div>

            {/* PRE-AUTH AND EXPIRY CALENDARS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <FileKey2 size={14} className="text-slate-400" /> Pre-Authorization Token Code
                </label>
                <input 
                  type="text" 
                  name="pre_auth_code"
                  required
                  value={clearanceForm.pre_auth_code}
                  onChange={handleFormChange}
                  placeholder="Enter authorized claim verification code..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-base font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/10 transition-all" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Calendar size={14} className="text-slate-400" /> Authorization Expiry Date
                </label>
                <input 
                  type="date" 
                  name="pre_auth_expiry"
                  required
                  value={clearanceForm.pre_auth_expiry}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-base font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/10 transition-all" 
                />
              </div>
            </div>

            {/* FINANCIAL LEDGER QUANTITIES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <DollarSign size={13} className="text-slate-400" /> Global Cap Limit
                </label>
                <input 
                  type="number" 
                  name="maximum_coverage_limit"
                  placeholder="KES Annual Cap"
                  value={clearanceForm.maximum_coverage_limit}
                  onChange={handleFormChange}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-base font-extrabold outline-none text-slate-800 shadow-sm" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-xs font-bold text-teal-700 uppercase tracking-wider">
                  <DollarSign size={13} /> Approved Amount
                </label>
                <input 
                  type="number" 
                  name="approved_amount"
                  required
                  placeholder="KES This Intake"
                  value={clearanceForm.approved_amount}
                  onChange={handleFormChange}
                  className="w-full bg-white border border-teal-200 rounded-xl py-3 px-3 text-base font-extrabold outline-none text-teal-700 shadow-sm focus:ring-2 focus:ring-teal-500/10" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-xs font-bold text-amber-700 uppercase tracking-wider">
                  <DollarSign size={13} /> Co-Pay Obligation
                </label>
                <input 
                  type="number" 
                  name="patient_copay_amount"
                  required
                  value={clearanceForm.patient_copay_amount}
                  onChange={handleFormChange}
                  className="w-full bg-white border border-amber-200 rounded-xl py-3 px-3 text-base font-extrabold outline-none text-amber-700 shadow-sm focus:ring-2 focus:ring-teal-500/10" 
                />
              </div>
            </div>

            {/* CLINICAL CATEGORY STRUCTURING */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Layers size={14} className="text-slate-400" /> Scheduled Treatment Category
                </label>
                <select 
                  name="oncology_treatment_type"
                  value={clearanceForm.oncology_treatment_type}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-3 text-sm font-bold text-slate-700 cursor-pointer outline-none transition-all"
                >
                  <option value="CHEMOTHERAPY">Chemotherapy Infusion Regimen</option>
                  <option value="RADIATION_THERAPY">Radiation Therapy Session Block</option>
                  <option value="IMMUNOTHERAPY">Targeted Biological Immunotherapy</option>
                  <option value="ONCO_SURGERY">Surgical Oncological Intervention</option>
                  <option value="DIAGNOSTIC_STAGING">Diagnostic Imaging / Staging (PET-CT)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Approved Cycle / Session Volume
                </label>
                <input 
                  type="number" 
                  name="approved_cycles_count"
                  min="1"
                  value={clearanceForm.approved_cycles_count}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-base font-bold text-slate-800 outline-none" 
                />
              </div>
            </div>

            {/* CASE OFFICER MANUAL OVERRIDE ASSIGNMENT */}
            {insuranceRoute === 'PRIVATE' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Confirmed/Assigned Case Officer Reference
                </label>
                <input 
                  type="text" 
                  name="insurance_officer_name"
                  value={clearanceForm.insurance_officer_name}
                  onChange={handleFormChange}
                  placeholder="Payer authority representative signature identity..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm font-semibold text-slate-800 outline-none" 
                />
              </div>
            )}

            {/* EXCLUSIONS REMARKS EXPLICIT NOTES */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Exclusions, Exceptions, or Specific Coverage Limitation Notes
              </label>
              <textarea 
                name="clinical_notes"
                rows="3"
                value={clearanceForm.clinical_notes}
                onChange={handleFormChange}
                placeholder="Document any medications or companion diagnostics explicitly omitted from this authorization scope..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"
              />
            </div>

            {/* ACTION FORMSUBMIT TRIGGER */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button 
                type="submit"
                disabled={!clearanceForm.patient_name || (verificationStatus !== 'success')}
                className="w-full sm:w-auto bg-slate-950 hover:bg-teal-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-widest px-10 py-4.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 size={16} /> Commit Insurance Setup
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
};

export default FinancialClearance;