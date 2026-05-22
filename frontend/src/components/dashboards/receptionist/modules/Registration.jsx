import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api'; 
import { 
  Save, Loader2, UserPlus, AlertCircle, CheckCircle2, 
  Users, Calendar, RefreshCw, AlertTriangle, FileText
} from 'lucide-react';

const Registration = () => {
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

  // Client-side visual preview helper calculation matching your Django logic
  const getLiveHrnPreview = () => {
    if (!formData.firstName.trim()) return '---_001_2026';
    const prefix = formData.firstName.trim().slice(0, 3).toUpperCase().padEnd(3, 'X');
    return `${prefix}_001_2026`;
  };

  const fetchData = useCallback(async () => {
    try {
      const [resList, resStats] = await Promise.all([
        API.get('/registrations'),
        API.get('/registrations/analytics')
      ]);
      setLatestRegistrations((resList.data.results || resList.data).slice(0, 10));
      setAnalytics(resStats.data);
    } catch (err) {
      console.error("Sync Error", err);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 30000);
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
    
    const payload = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(), 
      id_number: formData.id_number,
      phone: formData.phone,
      age: formData.age,
      gender: formData.gender,
      insurance: formData.insurance,
      insurance_number: formData.insurance_number,
      is_urgent: formData.is_urgent,
      is_returning: formData.is_returning,
    };

    try {
      const response = await API.post('/registrations', payload);
      if (response.status === 201 || response.status === 200) {
        setRegStatus('success');
        setFormData(initialFormState); 
        fetchData(); 
      }
    } catch (error) {
      setRegStatus('error');
      const errs = error.response?.data;
      setErrorMessage(typeof errs === 'object' ? JSON.stringify(errs) : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-['Inter']">
      
      {/* TIER 1: CORE OPERATIONAL KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard 
            label="Total Registrations" 
            value={analytics.total_patients} 
            icon={<Users className="text-blue-500"/>} 
            color="blue" 
          />
          <StatCard 
            label="Today's Intake" 
            value={analytics.todays_registrations} 
            icon={<Calendar className="text-teal-500"/>} 
            color="teal" 
          />
          <StatCard 
            label="Urgent Case" 
            value={analytics.urgent_today} 
            icon={<AlertTriangle className={analytics.urgent_today > 0 ? "text-rose-500 animate-pulse" : "text-slate-400"}/>} 
            color={analytics.urgent_today > 0 ? "rose" : "slate"} 
          />
          <StatCard 
            label="Returning Patients" 
            value={analytics.returning_today} 
            icon={<RefreshCw className="text-amber-500"/>} 
            color="amber" 
          />
      </div>

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-20 backdrop-blur-md bg-white/90">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase flex items-center gap-3">
            <UserPlus className="text-teal-600" /> Patient <span className="text-teal-600">Registrations</span>
          </h1>
        </div>
        
        <button form="registration-form" type="submit" disabled={isSubmitting} className="bg-[#020617] hover:bg-teal-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center space-x-2">
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          <span>Register Patient</span>
        </button>
      </div>

      {/* FORM SECTION */}
      <form id="registration-form" onSubmit={handleSubmit} className="space-y-6 mb-12">
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
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Insurance</label>
              <select name="insurance" value={formData.insurance} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none">
                <option value="CASH">Cash Payment</option>
                <option value="SHA">Social Health (SHA)</option>
                <option value="PRIVATE">Private Insurance</option>
              </select>
            </div>

            <FormInput label="Insurance No." name="insurance_number" value={formData.insurance_number} onChange={handleChange} />

            {/* LIVE AUTOMATED RECORD PREVIEW BOX */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest ml-2 flex items-center gap-1.5">
                <FileText size={10} /> Health Record Number
              </label>
              <div className="w-full bg-teal-50/50 border border-teal-100/50 text-teal-700 rounded-2xl p-4 text-sm font-mono font-bold tracking-wider select-none">
                {getLiveHrnPreview()}
              </div>
            </div>

            {/* FLOW CONTROL TOGGLES */}
            <div className="md:col-span-3 flex items-center gap-8 p-4 bg-slate-50 rounded-[2rem] border border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="is_returning" 
                      checked={formData.is_returning} 
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" 
                    />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-teal-600 transition-colors">Returning Patient</span>
                </label>

                <label className={`flex items-center gap-3 cursor-pointer group px-6 py-2 rounded-xl transition-all ${formData.is_urgent ? 'bg-rose-50 border border-rose-100' : ''}`}>
                    <input 
                      type="checkbox" 
                      name="is_urgent" 
                      checked={formData.is_urgent} 
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500" 
                    />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${formData.is_urgent ? 'text-rose-600' : 'text-slate-500'} group-hover:text-rose-600 transition-colors`}>Urgent Case</span>
                </label>
            </div>
          </div>
        </div>
      </form>

      {/* RECENT REGISTRATIONS LOG */}
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <h3 className="font-black text-slate-900 uppercase italic tracking-tighter">Activity Log</h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Registration Stream</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-white">
                <th className="px-10 py-5">Queue ID</th>
                <th className="px-10 py-5">Record Number</th>
                <th className="px-10 py-5">Patient Name</th>
                <th className="px-10 py-5">Classification</th>
                <th className="px-10 py-5">Insurance</th>
                <th className="px-10 py-5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {latestRegistrations.map((r) => (
                <tr key={r.id} className={`hover:bg-slate-50 transition-all ${r.is_urgent ? 'bg-rose-50/30' : ''}`}>
                  <td className="px-10 py-6">
                      <span className={`px-3 py-1 rounded-lg font-mono font-bold text-xs ${r.is_urgent ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'}`}>
                        {r.queue_id}
                      </span>
                  </td>
                  {/* Newly Integrated Health Record Number Column */}
                  <td className="px-10 py-6">
                    <span className="font-mono font-bold text-xs text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100/50 tracking-wide">
                      {r.health_record_number || '---_000_2026'}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <p className="font-black text-slate-900 text-sm uppercase">{r.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest">{r.id_number}</p>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`text-[9px] font-black uppercase ${r.is_returning ? 'text-amber-600' : 'text-blue-500'}`}>
                      {r.is_returning ? 'Returning' : 'New Intake'}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-3 py-1 rounded-md text-[8px] font-black uppercase ${r.insurance === 'CASH' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {r.insurance}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right text-slate-400 text-[10px] font-bold uppercase">
                      {new Date(r.registered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

// Internal Sub-components
const StatCard = ({ label, value, icon, color }) => (
    <div className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-${color}-500 transition-all`}>
        <div className={`p-4 bg-${color}-50 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform`}>{icon}</div>
        <h4 className="text-4xl font-black text-slate-950 tracking-tighter italic">{value}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
);

const FormInput = ({ label, ...props }) => (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
      <input {...props} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
    </div>
);

export default Registration;