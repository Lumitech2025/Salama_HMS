import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api'; 
import { 
  Save, Loader2, UserPlus, Activity, ArrowRight
} from 'lucide-react';

const Registration = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regStatus, setRegStatus] = useState('idle'); 
  const [errorMessage, setErrorMessage] = useState('');
  const [latestPatients, setLatestPatients] = useState([]);

  const initialFormState = {
    patientSID: '', 
    firstName: '', 
    lastName: '', 
    registry_no: '', // Changed to match Backend
    dob: '', 
    gender: 'M', 
    phone: '', 
    email: '',
    insuranceType: 'SHA', 
    insuranceNumber: '',
    nokName: '', 
    nokPhone: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchLatestPatients = useCallback(async () => {
    try {
      const response = await API.get('/queue/?ordering=-entered_at');
      const data = response.data.results || response.data;
      setLatestPatients(data.slice(0, 10));
    } catch (err) {
      console.error("Failed to fetch queue", err);
    }
  }, []);

  useEffect(() => {
    fetchLatestPatients();
  }, [fetchLatestPatients]);

  const generateSID = useCallback(() => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SAL-${year}-${random}`;
  }, []);

  useEffect(() => {
    if (!formData.patientSID) {
      setFormData(prev => ({ ...prev, patientSID: generateSID() }));
    }
  }, [formData.patientSID, generateSID]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    
    // PAYLOAD MAPPING: Ensures the JSON keys match the Django Serializer perfectly
    const payload = {
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`, // Mapped to 'name'
      registry_no: formData.registry_no.trim(), // Mapped to 'registry_no'
      dob: formData.dob || null,
      gender: formData.gender,
      phone: formData.phone,
      email: formData.email,
      insurance_type: formData.insuranceType,
      insurance_no: formData.insuranceNumber,
      emergency_contact: `${formData.nokName} - ${formData.nokPhone}`,
    };

    try {
      const response = await API.post('/patients/', payload);
      
      if (response.status === 201 || response.status === 200) {
        setRegStatus('success');
        setFormData(initialFormState);
        fetchLatestPatients();
        setTimeout(() => setRegStatus('idle'), 3000);
      }
    } catch (error) {
      setRegStatus('error');
      // Extract detailed validation errors from Django (like "registry_no is already taken")
      const backendErrors = error.response?.data;
      setErrorMessage(JSON.stringify(backendErrors) || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-['Inter']">
      
      <div className="flex justify-between items-center mb-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-20 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase flex items-center gap-3">
            <UserPlus className="text-teal-600" /> Salama <span className="text-teal-600">Registration</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">{formData.patientSID}</p>
        </div>
        
        <button form="registration-form" type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-teal-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center space-x-2">
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          <span>{isSubmitting ? 'Processing...' : 'Finalize Registration'}</span>
        </button>
      </div>

      {regStatus === 'error' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-widest animate-bounce">
            Error: {errorMessage}
        </div>
      )}

      <form id="registration-form" onSubmit={handleSubmit} className="space-y-6 mb-12">
        <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID / Passport (Registry No)</label>
              <input required name="registry_no" value={formData.registry_no} onChange={handleChange} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" placeholder="Required" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">First Name</label>
              <input required name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Name</label>
              <input required name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
              <input required name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-100 rounded-2xl p-4 text-sm font-bold outline-none">
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Insurance Type</label>
              <select name="insuranceType" value={formData.insuranceType} onChange={handleChange} className="w-full bg-slate-100 rounded-2xl p-4 text-sm font-bold outline-none">
                <option value="SHA">Social Health (SHA)</option>
                <option value="PRIVATE">Private</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Emergency Name</label>
              <input required name="nokName" value={formData.nokName} onChange={handleChange} className="w-full bg-amber-50/30 rounded-2xl p-4 text-sm font-bold border border-amber-100 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Emergency Phone</label>
              <input required name="nokPhone" value={formData.nokPhone} onChange={handleChange} className="w-full bg-amber-50/30 rounded-2xl p-4 text-sm font-bold border border-amber-100 outline-none" />
            </div>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse" />
            <h3 className="font-black text-slate-900 uppercase italic tracking-tighter">Live Patient Registration Monitor</h3>
          </div>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-white">
                <th className="px-10 py-5">Full Name</th>
                <th className="px-10 py-5">Registry ID</th>
                <th className="px-10 py-5">Current Station</th>
                <th className="px-10 py-5">Current Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {latestPatients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-10 py-6 font-black text-slate-900 text-sm uppercase tracking-tight">{p.patient_name}</td>
                  <td className="px-10 py-6 font-bold text-slate-500 text-xs italic">#{p.patient_id_no}</td>
                  <td className="px-10 py-6">
                    <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">
                      {p.station_display}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-3 py-1 rounded-md text-[8px] font-black uppercase ${p.status === 'WAITING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {p.status_display}
                    </span>
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

export default Registration;