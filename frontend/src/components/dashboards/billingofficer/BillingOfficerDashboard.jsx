import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api'; 
import BillingOfficerSidebar from './BillingOfficerSidebar';
import ClaimsTracker from './modules/ClaimsTracker';
import CycleBilling from './modules/CycleBilling';
import PharmacyReconciliation from './modules/PharmacyReconciliation';
import FinancialEstimator from './modules/FinancialEstimator';
import InvoiceHistory from './modules/InvoiceHistory';
import FinancialClearance from './modules/FinancialClearance'; 
import InsuranceProviders from './modules/InsuranceProviders';


import { 
  Bell, UserCircle, Save, Loader2, UserPlus, AlertCircle, 
  CheckCircle2, Users, Calendar, RefreshCw, AlertTriangle, 
  FileText, ArrowRight, Activity 
} from 'lucide-react';

const BillingOfficerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Cross-Module Passing Memory States
  const [targetedPatient, setTargetedPatient] = useState(null);

  // Core API Stream Sync Engines mirroring Receptionist view
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regStatus, setRegStatus] = useState('idle'); 
  const [errorMessage, setErrorMessage] = useState('');
  const [latestRegistrations, setLatestRegistrations] = useState([]);
  const [analytics, setAnalytics] = useState({
      total_patients: 0,
      todays_registrations: 0,
      urgent_today: 0,
      returning_today: 0
  });

  const initialFormState = {
    firstName: '', 
    lastName: '', 
    id_number: '', 
    age: '', 
    gender: 'M', 
    phone: '', 
    insurance: 'CASH', 
    insurance_number: '',
    is_urgent: false,
    is_returning: false
  };

  const [formData, setFormData] = useState(initialFormState);

  // Dynamic Live HRN Computations
  const getLiveHrnPreview = () => {
    if (!formData.firstName.trim()) return '---_000_2026';
    const prefix = formData.firstName.trim().slice(0, 3).toUpperCase().padEnd(3, 'X');
    const nextSequence = String((analytics.todays_registrations || 0) + 1).padStart(3, '0');
    return `${prefix}_${nextSequence}_2026`;
  };

  // Live Async Sync Data Fetching Pattern
  const fetchData = useCallback(async () => {
    try {
      const [resList, resStats] = await Promise.all([
        API.get('/registrations'),
        API.get('/registrations/analytics')
      ]);
      const rawRecords = resList.data.results || resList.data;
      setLatestRegistrations(Array.isArray(rawRecords) ? rawRecords.slice(0, 10) : []);
      setAnalytics(resStats.data);
    } catch (err) {
      console.error("Billing Engine Telemetry Sync Error", err);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 30000); // Polling every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegStatus('idle');
    setErrorMessage('');
    
    const payload = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(), 
      id_number: formData.id_number.trim(),
      phone: formData.phone.trim(),
      age: parseInt(formData.age, 10) || 0,
      gender: formData.gender,
      insurance: formData.insurance,
      insurance_number: formData.insurance_number.trim(),
      is_urgent: formData.is_urgent,
      is_returning: formData.is_returning,
    };

    try {
      const response = await API.post('/registrations', payload);
      if (response.status === 201 || response.status === 200) {
        setRegStatus('success');
        setFormData(initialFormState); 
        await fetchData(); 
      }
    } catch (error) {
      setRegStatus('error');
      const errs = error.response?.data;
      
      if (errs && typeof errs === 'object') {
        const errorMessages = Object.entries(errs)
          .map(([field, msg]) => `${field.replace('_', ' ')}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join(' | ');
        setErrorMessage(errorMessages);
      } else {
        setErrorMessage("Registration engine connection error.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cross-tab routing handover logic
  const handleRedirectToClearance = (patientRecord) => {
    // Standardize naming mapping variations for local component compatibility
    const optimizedPatient = {
      ...patientRecord,
      name: patientRecord.name || `${patientRecord.first_name || ''} ${patientRecord.last_name || ''}`.trim() || "Anonymous Patient",
      queue_id: patientRecord.queue_id || `Q-${String(patientRecord.id || '').padStart(3, '0')}`,
      health_record_number: patientRecord.health_record_number || patientRecord.hrn || '---_000_2026'
    };
    
    setTargetedPatient(optimizedPatient);
    setActiveTab('clearance'); // Move sidebar view tab index directly over
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'clearance': 
        return (
          <FinancialClearance 
            initialSelectedPatient={targetedPatient} 
            clearTargetMemory={() => setTargetedPatient(null)} 
          />
        );
      
      case 'claims': return <ClaimsTracker />;
      case 'cycles': return <CycleBilling />;
      case 'reconciliation': return <PharmacyReconciliation />;
      case 'estimator': return <FinancialEstimator />;
      case 'history': return <InvoiceHistory />;
      case 'insurance-providers': return <InsuranceProviders />;
      
      // OVERVIEW VIEW: Patient registration workspace panel
      default: return (
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-['Inter'] space-y-6">
          
          {/* Status Banners */}
          {regStatus === 'success' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 font-bold text-sm shadow-sm">
              <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
              <span>Registration completed successfully.</span>
            </div>
          )}

          {regStatus === 'error' && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 font-bold text-sm shadow-sm">
              <AlertCircle className="text-rose-600 shrink-0" size={20} />
              <span className="font-mono text-xs max-w-full overflow-x-auto">System Core Rejection Details: {errorMessage}</span>
            </div>
          )}

          {/* Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard label="Total Registrations" value={analytics.total_patients} icon={<Users className="text-blue-500"/>} color="blue" />
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:border-teal-500">
                <div className="p-4 rounded-2xl w-fit mb-6 bg-teal-50"><Calendar className="text-teal-500"/></div>
                <h4 className="text-4xl font-black text-slate-950 tracking-tighter italic">{analytics.todays_registrations || 0}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Today's Intake</p>
              </div>
              <StatCard label="Urgent Cases Today" value={analytics.urgent_today} icon={<AlertTriangle className={analytics.urgent_today > 0 ? "text-rose-500 animate-pulse" : "text-slate-400"}/>} color={analytics.urgent_today > 0 ? "rose" : "slate"} />
              <StatCard label="Returning Patients" value={analytics.returning_today} icon={<RefreshCw className="text-amber-500"/>} color="amber" />
          </div>

          {/* Registration Submission Control Sticky Header */}
          <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-20 backdrop-blur-md bg-white/90">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
                <UserPlus className="text-teal-600" /> Registration Desk <span className="text-teal-600"></span>
              </h1>
              
            </div>
            
            <button form="dashboard-registration-form" type="submit" disabled={isSubmitting} className="bg-slate-950 hover:bg-teal-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center space-x-2 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              <span>{isSubmitting ? 'Registering...' : 'Commit Registration'}</span>
            </button>
          </div>

          {/* Registration Input Matrix */}
          <form id="dashboard-registration-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-10">
                <FormInput label="National ID / Passport" name="id_number" value={formData.id_number} onChange={handleChange} required />
                <FormInput label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
                <FormInput label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
                <FormInput label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />
                <FormInput label="Age" type="number" name="age" value={formData.age} onChange={handleChange} required />

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none">
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Payment Mode</label>
                  <select name="insurance" value={formData.insurance} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-teal-700 outline-none">
                    <option value="CASH">Cash Payment Counter</option>
                    <option value="SHA">Social Health Authority (SHA)</option>
                    <option value="PRIVATE">Private Corporate Insurance</option>
                  </select>
                </div>

                <FormInput label="Insurance / Scheme Card No." name="insurance_number" value={formData.insurance_number} onChange={handleChange} disabled={formData.insurance === 'CASH'} placeholder={formData.insurance === 'CASH' ? 'N/A' : 'Enter policy card ID...'} />

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-2 flex items-center gap-1.5">
                    <FileText size={10} /> Computed HRN Preview
                  </label>
                  <div className="w-full bg-teal-50/50 border border-teal-100/50 text-teal-700 rounded-2xl p-4 text-sm font-mono font-bold tracking-wider select-none">
                    {getLiveHrnPreview()}
                  </div>
                </div>

                <div className="md:col-span-3 flex items-center gap-8 p-4 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" name="is_returning" checked={formData.is_returning} onChange={handleChange} className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-teal-600 transition-colors">Returning Patient</span>
                    </label>

                    <label className={`flex items-center gap-3 cursor-pointer group px-6 py-2 rounded-xl transition-all ${formData.is_urgent ? 'bg-rose-50 border border-rose-100' : ''}`}>
                        <input type="checkbox" name="is_urgent" checked={formData.is_urgent} onChange={handleChange} className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${formData.is_urgent ? 'text-rose-600' : 'text-slate-500'} group-hover:text-rose-600 transition-colors`}>Urgent Case</span>
                    </label>
                </div>
              </div>
            </div>
          </form>

          {/* Active Worklist / Queue View with Routing Anchors */}
          <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-2 text-slate-900 font-black uppercase tracking-tight italic">
                <Activity size={16} className="text-teal-500 animate-pulse" /> Live Financial Clearance Desk Queue
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Click to verify</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-white border-b border-slate-100">
                    <th className="px-10 py-5">Queue Token</th>
                    <th className="px-10 py-5">Health Record No.</th>
                    <th className="px-10 py-5">Patient Name</th>
                    <th className="px-10 py-5">Classification</th>
                    <th className="px-10 py-5">Payment Mode</th>
                    <th className="px-10 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {latestRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-10 py-8 text-center text-xs font-medium text-slate-400">
                        No active queue records found.
                      </td>
                    </tr>
                  ) : (
                    latestRegistrations.map((r) => {
                      
                        
                      const displayQueueId = r.queue_id || r.token_id || `Q-${String(r.id || '').padStart(3, '0')}`;
                      const resolvedFullName = r.name || r.patient_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || "Anonymous Patient";

                      const rawFieldVal = r.health_record_number || r.hrn || r.patient?.health_record_number;
                      const displayHrn = (rawFieldVal && rawFieldVal !== '---_000_2026') 
                        ? rawFieldVal 
                        : (r.patient_details?.health_record_number || r.visit?.health_record_number || r.visit_details?.health_record_number || '---_000_2026');

                      return (
                        <tr key={r.id} className={`hover:bg-slate-50/80 transition-all ${r.is_urgent ? 'bg-rose-50/20' : ''}`}>
                          <td className="px-10 py-6">
                            <span className={`px-3 py-1 rounded-lg font-mono font-bold text-xs ${r.is_urgent ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'}`}>
                              {displayQueueId}
                            </span>
                          </td>
                          <td className="px-10 py-6">
                            <span className="font-mono font-bold text-xs text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100/50 tracking-wide">
                              {displayHrn}
                            </span>
                          </td>
                          <td className="px-10 py-6">
                            <p className="font-black text-slate-900 text-sm uppercase">{resolvedFullName}</p>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest">{r.id_number}</p>
                          </td>
                          <td className="px-10 py-6">
                            <span className={`text-[9px] font-black uppercase ${r.is_returning ? 'text-amber-600' : 'text-blue-500'}`}>
                              {r.is_returning ? 'Returning' : 'New Intake'}
                            </span>
                          </td>
                          <td className="px-10 py-6">
                            <span className={`px-3 py-1 rounded-md text-[8px] font-black uppercase ${r.insurance === 'CASH' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                              {r.insurance}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <button
                              type="button"
                              onClick={() => handleRedirectToClearance(r)}
                              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-slate-900 hover:bg-teal-600 text-white px-4 py-2 rounded-xl transition-all shadow-sm"
                            >
                              <span>Process</span>
                              <ArrowRight size={12} />
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
        <div className="flex justify-between items-center mb-10">
          <div className="bg-white px-6 py-2.5 rounded-full border border-slate-100 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Billing Desk</span>
            
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <Bell size={22} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linet</p>
              </div>
              <UserCircle size={36} className="text-slate-300" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {renderContent()}
      </main>
    </div>
  );
};

// UI Presentation Card Components
const StatCard = ({ label, value, icon, color }) => {
  const colorBorders = { blue: 'hover:border-blue-500', teal: 'hover:border-teal-500', rose: 'hover:border-rose-500', amber: 'hover:border-amber-500', slate: 'hover:border-slate-500' };
  const colorBgs = { blue: 'bg-blue-50', teal: 'bg-teal-50', rose: 'bg-rose-50', amber: 'bg-amber-50', slate: 'bg-slate-50' };
  return (
    <div className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group transition-all ${colorBorders[color] || 'hover:border-slate-200'}`}>
        <div className={`p-4 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform ${colorBgs[color] || 'bg-slate-50'}`}>{icon}</div>
        <h4 className="text-4xl font-black text-slate-950 tracking-tighter italic">{value || 0}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
};

const FormInput = ({ label, ...props }) => (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
      <input {...props} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
    </div>
);

export default BillingOfficerDashboard;