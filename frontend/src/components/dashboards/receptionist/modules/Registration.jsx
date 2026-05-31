import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api'; 
import { 
  Save, Loader2, UserPlus, AlertCircle, CheckCircle2, 
  Users, Calendar, RefreshCw, AlertTriangle, FileText, Layers,
  Contact2
} from 'lucide-react';

const Registration = () => {
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

  const getLiveHrnPreview = () => {
    const shortYear = String(new Date().getFullYear()).slice(-2);
    const nextSequence = String((analytics.total_patients || 0) + 1).padStart(3, '0');
    return `SCC-${nextSequence}/${shortYear}`;
  };

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
      console.error("Sync Error", err);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
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
    
    const payload = {
      first_name: formData.first_name.trim(),
      middle_name: formData.middle_name.trim(),
      last_name: formData.last_name.trim(),
      id_number: formData.id_number.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null, 
      age: parseInt(formData.age, 10) || 0,
      gender: formData.gender,
      payment_mode: formData.payment_mode,
      insurance_company_id: formData.payment_mode === 'INSURANCE' ? parseInt(formData.insurance_company_id, 10) : null,
      insurance_number: formData.payment_mode === 'INSURANCE' ? formData.insurance_number.trim() : '',
      is_urgent: formData.is_urgent,
      is_returning: formData.is_returning,
      next_of_kin_name: formData.next_of_kin_name.trim(),
      next_of_kin_relationship: formData.next_of_kin_relationship,
      next_of_kin_phone: formData.next_of_kin_phone.trim()
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
        setErrorMessage("Registration engine validation failure.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 font-['Inter'] relative px-4 text-left">
      
      {regStatus === 'success' && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 font-bold text-sm">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
          <span>Registration completed successfully!</span>
        </div>
      )}

      {regStatus === 'error' && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 font-bold text-sm">
          <AlertCircle className="text-rose-600 shrink-0" size={20} />
          <span className="font-mono text-xs max-w-full overflow-x-auto">Rejection Details: {errorMessage}</span>
        </div>
      )}

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard label="Total Registrations" value={analytics.total_patients} icon={<Users className="text-blue-500"/>} color="blue" />
          <StatCard label="Today's Intake" value={analytics.todays_registrations} icon={<Calendar className="text-teal-500"/>} color="teal" />
          <StatCard label="Urgent Cases" value={analytics.urgent_today} icon={<AlertTriangle className="text-rose-500"/>} color="rose" />
          <StatCard label="Returning Patients" value={analytics.returning_today} icon={<RefreshCw className="text-amber-500"/>} color="amber" />
      </div>

      {/* FIXED: Standard Static Page Header Header (No longer floating/sticky) */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase italic">
            <UserPlus className="text-teal-600" size={22} /> Patient <span className="text-teal-600">Registrations</span>
          </h1>
        </div>
        
        <button 
          form="registration-form" 
          type="submit" 
          disabled={isSubmitting} 
          className="bg-slate-950 hover:bg-teal-600 text-white px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          <span>{isSubmitting ? 'Registering...' : 'Register Patient'}</span>
        </button>
      </div>

      <form id="registration-form" onSubmit={handleSubmit} className="space-y-8 mb-12">
        
        {/* BLOCK 1: PRIMARY DEMOGRAPHICS (With HRN incorporated under identification) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 mb-2">
            <FileText size={14} className="text-slate-400" /> 1. Core Identification & Demographics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-6">
            <FormInput label="National ID / Passport" name="id_number" value={formData.id_number} onChange={handleChange} required />
            <FormInput label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required />
            <FormInput label="Middle Name (Optional)" name="middle_name" value={formData.middle_name} onChange={handleChange} />
            <FormInput label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} required />
            
            <FormInput label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />
            <FormInput label="Email Address (Optional)" type="email" name="email" value={formData.email} onChange={handleChange} />
            <FormInput label="Age" type="number" name="age" value={formData.age} onChange={handleChange} required />

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer">
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            {/* FIXED: Live Preview HRN relocated immediately to the bottom row of Core Identifications */}
            <div className="space-y-2 md:col-span-4 border-t border-slate-50 pt-4 grid grid-cols-1 md:grid-cols-4">
              <div className="space-y-2 md:col-span-1">
                <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-2 flex items-center gap-1.5">
                  <FileText size={10} /> Live Preview HRN
                </label>
                <div className="w-full bg-teal-50/60 border border-teal-100/50 text-teal-700 rounded-2xl p-4 text-sm font-mono font-bold tracking-wider text-center md:text-left">
                  {getLiveHrnPreview()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BLOCK 2: NEXT OF KIN RELATIONAL DATA */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 mb-2">
            <Contact2 size={14} className="text-slate-400" /> 2. Next of Kin / Relational Contacts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormInput label="Next of Kin Full Name" name="next_of_kin_name" value={formData.next_of_kin_name} onChange={handleChange} required />
            
            {/* FIXED: Modified from text field to select component dropdown options */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Relationship</label>
              <select 
                name="next_of_kin_relationship" 
                value={formData.next_of_kin_relationship} 
                onChange={handleChange} 
                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer"
              >
                <option value="SPOUSE">Spouse</option>
                <option value="PARENT">Parent</option>
                <option value="CHILD">Child</option>
                <option value="SIBLING">Sibling</option>
                <option value="GUARDIAN">Legal Guardian</option>
                <option value="DEPENDENT">Dependent</option>
                <option value="OTHER">Other Relative</option>
              </select>
            </div>

            <FormInput label="Next of Kin Phone Number" name="next_of_kin_phone" value={formData.next_of_kin_phone} onChange={handleChange} required />
          </div>
        </div>

        {/* BLOCK 3: FINANCIAL COVER */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 mb-2">
            <Layers size={14} className="text-slate-400" /> 3. Coverage Allocation & Status Flags
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Mode of Payment</label>
              <select name="payment_mode" value={formData.payment_mode} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer">
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
                    className="w-full bg-slate-50 border-2 border-teal-100 rounded-2xl p-4 text-sm font-bold outline-none cursor-pointer"
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
          </div>

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

      {/* Activity Logs Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50">
          <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-xs">Live Registration Stream</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white border-b border-slate-100">
                <th className="px-8 py-4">Queue ID</th>
                <th className="px-8 py-4">Record Number</th>
                <th className="px-8 py-4">Patient Name</th>
                <th className="px-8 py-4">Payment Method</th>
                <th className="px-8 py-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {latestRegistrations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-5">
                    <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-rose-600 text-white">
                      {r.queue_id}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-mono font-bold text-xs text-teal-600 bg-teal-50/80 px-2.5 py-1.5 rounded-xl border border-teal-100">
                      {r.health_record_number} 
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{r.name}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider ${r.payment_mode === 'CASH' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {r.payment_mode === 'CASH' ? 'CASH' : (r.insurance_company_name || 'INSURANCE')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right text-slate-400 text-[10px] font-bold">
                    {r.registered_at ? new Date(r.registered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:19'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }) => {
  const colorBgs = { blue: 'bg-blue-50', teal: 'bg-teal-50', rose: 'bg-rose-50', amber: 'bg-amber-50' };
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <h4 className="text-3xl font-black text-slate-950 tracking-tighter italic mt-1">{value || 0}</h4>
        </div>
        <div className={`p-3 rounded-xl ${colorBgs[color]}`}>{icon}</div>
    </div>
  );
};

const FormInput = ({ label, ...props }) => (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
      <input {...props} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
    </div>
);

export default Registration;