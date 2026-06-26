import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api'; 
import BillingOfficerSidebar from './BillingOfficerSidebar';
import FinancialClearance from './modules/FinancialClearance'; 
import InsuranceProviders from './modules/InsuranceProviders';
import ServiceCatalogue from './modules/ServiceCatalogue';
import PaymentPortal from '../receptionist/modules/PaymentPortal';
import BillingHome from '../receptionist/modules/Registration';
import BillingOverview from './modules/BillingOverview';
import InsuranceClaimsHub from '../Finance/modules/InsuranceClaimsHub';

import { 
  Bell, UserCircle, Save, Loader2, UserPlus, AlertCircle, 
  CheckCircle2, Users, Calendar, RefreshCw, AlertTriangle, 
  FileText, ArrowRight, Activity, Layers, Contact2
} from 'lucide-react';

const BillingOfficerDashboard = () => {
  const [activeTab, setActiveTab] = useState('home'); 

  
  // Cross-Module Passing Memory States
  const [targetedPatient, setTargetedPatient] = useState(null);

  // Core API Stream Sync Engines mirroring Registration view
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regStatus, setRegStatus] = useState('idle'); 
  const [errorMessage, setErrorMessage] = useState('');
  const [latestRegistrations, setLatestRegistrations] = useState([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState([]);
  const [analytics, setAnalytics] = useState({
      total_patients: 0,
      todays_registrations: 0,
      urgent_today: 0,
      returning_today: 0
  });

  // 🚀 ALIGNED: Keys updated to match Django Serializer & Registration.jsx specifications
  const initialFormState = {
    first_name: '', 
    middle_name: '',
    last_name: '', 
    id_number: '', 
    age: '', 
    gender: 'M', 
    phone: '', 
    email: '',
    payment_mode: 'CASH',          
    insurance_company_id: '',          
    insurance_number: '',
    is_urgent: false,
    is_returning: false,
    next_of_kin_name: '',
    next_of_kin_relationship: 'SPOUSE',
    next_of_kin_phone: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // 🚀 ALIGNED: Calculates the 'SCC-XXX/YY' format dynamically based on Registration design
  const getLiveHrnPreview = () => {
    const shortYear = String(new Date().getFullYear()).slice(-2);
    const nextSequence = String((analytics.total_patients || 0) + 1).padStart(3, '0');
    return `SCC-${nextSequence}/${shortYear}`;
  };

  // 🚀 ALIGNED: Live Async Data Fetching Engine mirroring Registration dataset dependencies
  const fetchData = useCallback(async () => {
    try {
      const [resList, resStats, resInsurance] = await Promise.all([
        API.get('/registrations/'),
        API.get('/registrations/analytics/'),
        API.get('/insurance-companies/') 
      ]);
      
      const rawRecords = resList.data.results || resList.data;
      setLatestRegistrations(Array.isArray(rawRecords) ? rawRecords : []);
      setAnalytics(resStats.data);
      setInsuranceCompanies(resInsurance.data.results || resInsurance.data || []);
    } catch (err) {
      console.error("Billing Engine Sync Telemetry Error:", err);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 30000); // Poll tracking parameters every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'payment_mode' && value === 'CASH') {
        updated.insurance_company_id = '';
        updated.insurance_number = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegStatus('idle');
    setErrorMessage('');
    
    // 🚀 ALIGNED: Payload parameters mapping match Registration.jsx structures precisely
    const payload = {
      first_name: formData.first_name.trim(),
      middle_name: formData.middle_name.trim(),
      last_name: formData.last_name.trim(),
      id_number: formData.id_number.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      age: parseInt(formData.age, 10) || 0,
      gender: formData.gender,
      payment_mode: formData.payment_mode,
      insurance_company_id: formData.payment_mode === 'INSURANCE' ? parseInt(formData.insurance_company_id, 10) : null,
      insurance_number: formData.payment_mode === 'INSURANCE' ? formData.insurance_number.trim() : '',
      is_urgent: formData.is_urgent,
      is_returning: formData.is_returning,
      next_of_kin_name: formData.next_of_kin_name.trim(),
      next_of_kin_relationship: formData.next_of_kin_relationship,
      next_of_kin_phone: formData.next_of_kin_phone.trim(),
    };

    try {
      const response = await API.post('/registrations/', payload);
      if (response.status === 201 || response.status === 200) {
        setRegStatus('success');
        setFormData(initialFormState); 
        await fetchData(); 
      }
    } catch (error) {
      setRegStatus('error');
      const errs = error.response?.data;
      if (errs && typeof errs === 'object') {
        setErrorMessage(Object.entries(errs).map(([f, m]) => `${f}: ${m}`).join(' | '));
      } else {
        setErrorMessage("Registration desk submission connection failure.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cross-tab routing operational clearance handover logic
  const handleRedirectToClearance = (patientRecord) => {
    const optimizedPatient = {
      ...patientRecord,
      name: patientRecord.name || `${patientRecord.first_name || ''} ${patientRecord.last_name || ''}`.trim() || "Anonymous Patient",
      queue_id: patientRecord.queue_id || `Q-${String(patientRecord.id || '').padStart(3, '0')}`,
      health_record_number: patientRecord.health_record_number || 'SCC-001/26'
    };
    
    setTargetedPatient(optimizedPatient);
    setActiveTab('clearance'); 
  };

  const renderContent = () => {
  switch (activeTab) {
    case 'home': 
      return (
        <BillingOverview 
          // 💳 CASH PATIENTS ROUTING PATHWAY
          onRouteToPayment={(patient) => {
            // Transform registration record into a shape PaymentPortal understands if needed, or pass directly
            setTargetedPatient(patient); 
            setActiveTab('billing'); // Automatically slides view to the Payment Terminal
          }}
          // 🛡️ INSURANCE PATIENTS ROUTING PATHWAY
          onTriggerVerification={(patient) => {
            setTargetedPatient(patient); 
            setActiveTab('clearance'); // Automatically slides view to Insurance Verification
          }}
        />
      );

    case 'clearance': 
      return (
        <FinancialClearance 
          initialSelectedPatient={targetedPatient} 
          clearTargetMemory={() => setTargetedPatient(null)} 
        />
      );
    
    case 'billing': 
      return (
        <PaymentPortal 
          // If your PaymentPortal component can auto-load an active patient instance passed as a prop:
          activePatientRecord={targetedPatient}
          clearActiveRecord={() => setTargetedPatient(null)}
        />
      );

    case 'claims': return <InsuranceClaimsHub/>;
    case 'reconciliation': return <PharmacyReconciliation />;
    case 'insurance-providers': return <InsuranceProviders />;
    case 'service-catalogue': return <ServiceCatalogue />;
      
      // OVERVIEW VIEW: Aligned with the exact Registration workspaces layout
      default: return (
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-['Inter'] space-y-6">
          
          {/* Status Banners */}
          {regStatus === 'success' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 font-bold text-sm shadow-sm">
              <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
              <span>Registration completed successfully!</span>
            </div>
          )}

          {regStatus === 'error' && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 font-bold text-sm shadow-sm">
              <AlertCircle className="text-rose-600 shrink-0" size={20} />
              <span className="font-mono text-xs max-w-full overflow-x-auto">Rejection Details: {errorMessage}</span>
            </div>
          )}

          {/* Analytics Widgets Layout */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard label="Total Registrations" value={analytics.total_patients} icon={<Users className="text-blue-500"/>} color="blue" />
              <StatCard label="Today's Intake" value={analytics.todays_registrations} icon={<Calendar className="text-teal-500"/>} color="teal" />
              <StatCard label="Urgent Cases" value={analytics.urgent_today} icon={<AlertTriangle className="text-rose-500"/>} color="rose" />
              <StatCard label="Returning Patients" value={analytics.returning_today} icon={<RefreshCw className="text-amber-500"/>} color="amber" />
          </div>

          {/* Registration Desk Actions Bar */}
          <div className="flex justify-between items-center bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-md sticky top-4 z-40 transition-all">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3 italic">
                <UserPlus className="text-teal-600" size={22} /> Registration <span className="text-teal-600">Desk</span>
              </h1>
            </div>
            
            <button 
              form="dashboard-registration-form" 
              type="submit" 
              disabled={isSubmitting} 
              className="bg-slate-950 hover:bg-teal-600 text-white px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              <span>{isSubmitting ? 'Registering...' : 'Commit Registration'}</span>
            </button>
          </div>

          {/* Registration Form Controls Grid */}
          <form id="dashboard-registration-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8">
              
              {/* Row 1: Identification & Names */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                <FormInput label="National ID / Passport" name="id_number" value={formData.id_number} onChange={handleChange} required />
                <FormInput label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required />
                <FormInput label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} />
                <FormInput label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} required />
              </div>

              {/* Row 2: Demographics & Contacts */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                <FormInput label="Age" type="number" name="age" value={formData.age} onChange={handleChange} required />
                
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer text-slate-800">
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>

                <FormInput label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />
                <FormInput label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange} />
              </div>

              {/* Row 3: Financial Framework & Operations */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Mode of Payment</label>
                  <select name="payment_mode" value={formData.payment_mode} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer text-slate-800">
                    <option value="CASH">Cash Payment</option>
                    <option value="INSURANCE">Insurance Cover</option>
                  </select>
                </div>

                {formData.payment_mode === 'INSURANCE' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-2 flex items-center gap-1">
                        <Layers size={10}/> Insurance Provider
                      </label>
                      <select 
                        name="insurance_company_id" 
                        value={formData.insurance_company_id} 
                        onChange={handleChange} 
                        required
                        className="w-full bg-slate-50 border-2 border-teal-100 rounded-2xl p-4 text-sm font-bold outline-none cursor-pointer text-slate-800"
                      >
                        <option value="">-- Choose Provider --</option>
                        {insuranceCompanies.map(company => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                    </div>
                    <FormInput label="Insurance Card No." name="insurance_number" value={formData.insurance_number} onChange={handleChange} required />
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-2 flex items-center gap-1.5">
                    <FileText size={10} /> Live Preview HRN
                  </label>
                  <div className="w-full bg-teal-50/60 border border-teal-100/50 text-teal-700 rounded-2xl p-4 text-sm font-mono font-bold tracking-wider">
                    {getLiveHrnPreview()}
                  </div>
                </div>
              </div>

              {/* Row 4: Emergency Contacts & Next of Kin Integration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-8 pt-4 border-t border-slate-50">
                <FormInput label="Next of Kin Name" name="next_of_kin_name" value={formData.next_of_kin_name} onChange={handleChange} />
                
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1.5">
                    <Contact2 size={11} className="text-slate-400" /> Relationship
                  </label>
                  <select 
                    name="next_of_kin_relationship" 
                    value={formData.next_of_kin_relationship} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer text-slate-800"
                  >
                    <option value="SPOUSE">Spouse</option>
                    <option value="CHILD">Child</option>
                    <option value="PARENT">Parent</option>
                    <option value="SIBLING">Sibling</option>
                    <option value="GUARDIAN">Guardian</option>
                  </select>
                </div>

                <FormInput label="Next of Kin Phone" name="next_of_kin_phone" value={formData.next_of_kin_phone} onChange={handleChange} />
              </div>

              {/* Patient Intake Priority Indicators */}
              <div className="flex items-center gap-8 pt-4 border-t border-slate-50">
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input type="checkbox" name="is_returning" checked={formData.is_returning} onChange={handleChange} className="w-5 h-5 rounded-lg border-slate-200 text-teal-600 focus:ring-teal-500 accent-teal-600" />
                  <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-800 uppercase tracking-wider">Returning Patient</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input type="checkbox" name="is_urgent" checked={formData.is_urgent} onChange={handleChange} className="w-5 h-5 rounded-lg border-slate-200 text-rose-600 focus:ring-rose-500 accent-rose-600" />
                  <span className="text-[10px] font-black text-slate-500 group-hover:text-rose-700 uppercase tracking-wider">Urgent Case</span>
                </label>
              </div>
            </div>
          </form>

          {/* Queue Worklist Table with precise background chip status accents */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-900 font-black uppercase text-xs tracking-wider italic">
                <Activity size={14} className="text-teal-500 animate-pulse" /> Live Financial Clearance Desk Queue
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Action Required to Route</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white border-b border-slate-100">
                    <th className="px-8 py-4">Queue Token</th>
                    <th className="px-8 py-4">Health Record No.</th>
                    <th className="px-8 py-4">Patient Name</th>
                    <th className="px-8 py-4">Classification</th>
                    <th className="px-8 py-4">Payment Method</th>
                    <th className="px-8 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {latestRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-8 py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        No active queue tracking telemetry records found.
                      </td>
                    </tr>
                  ) : (
                    latestRegistrations.map((r) => {
                      const displayQueueId = r.queue_id || `Q-${String(r.id || '').padStart(3, '0')}`;
                      const displayHrn = r.health_record_number || '---_000_2026';

                      return (
                        <tr key={r.id} className={`hover:bg-slate-50/80 transition-colors ${r.is_urgent ? 'bg-rose-50/20' : ''}`}>
                          <td className="px-8 py-5">
                            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${r.is_urgent ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-900 text-white'}`}>
                              {displayQueueId}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="font-mono font-bold text-xs text-teal-600 bg-teal-50/80 px-2.5 py-1.5 rounded-xl border border-teal-100">
                              {displayHrn}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{r.name}</p>
                            {r.id_number && <p className="text-[9px] text-slate-400 font-bold tracking-widest">{r.id_number}</p>}
                          </td>
                          <td className="px-8 py-5">
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${r.is_returning ? 'text-amber-600' : 'text-blue-500'}`}>
                              {r.is_returning ? 'Returning' : 'New Intake'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider ${r.payment_mode === 'CASH' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-purple-100 text-purple-700 border border-purple-200'}`}>
                              {r.payment_mode === 'CASH' ? 'CASH' : (r.insurance_company_name || 'INSURANCE')}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRedirectToClearance(r)}
                              className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider bg-slate-950 hover:bg-teal-600 text-white px-4 py-2 rounded-xl transition-all shadow-sm"
                            >
                              <span>Process</span>
                              <ArrowRight size={11} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      );
    }
  };

  return (
    <div className="flex bg-slate-50/50 min-h-screen">
      <BillingOfficerSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-10 overflow-y-auto">
        {/* Top Navbar segment */}
        

        {/* Content Render Outlet */}
        {renderContent()}
      </main>
    </div>
  );
};

// UI Presentation Card Components
const StatCard = ({ label, value, icon, color }) => {
  const colorBgs = { blue: 'bg-blue-50', teal: 'bg-teal-50', rose: 'bg-rose-50', amber: 'bg-amber-50' };
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:border-slate-200">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <h4 className="text-3xl font-black text-slate-950 tracking-tighter italic mt-1">{value || 0}</h4>
        </div>
        <div className={`p-3 rounded-xl ${colorBgs[color] || 'bg-slate-50'}`}>{icon}</div>
    </div>
  );
};

const FormInput = ({ label, ...props }) => (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
      <input {...props} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all text-slate-800" />
    </div>
);

export default BillingOfficerDashboard;