import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Fingerprint, Phone, Users, ShieldCheck, 
  Save, Search, Loader2, CheckCircle2, 
  AlertCircle, ArrowRight, CalendarCheck 
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const Registration = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [visitType, setVisitType] = useState('NEW');
  const [hasAppointment, setHasAppointment] = useState(false);
  const [regStatus, setRegStatus] = useState('idle'); 
  const [registeredPatientId, setRegisteredPatientId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const initialFormState = {
    patientSID: '', 
    firstName: '',
    lastName: '',
    idNumber: '', 
    dob: '',
    gender: '',
    phone: '',
    email: '',
    insuranceType: 'SHA',
    insuranceNumber: '',
    nokName: '',
    nokRelation: '',
    nokPhone: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Generate unique Salama SID for display
  const generateSID = useCallback(() => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(4, '0');
    return `SAL-${year}-${random}`;
  }, []);

  useEffect(() => {
    if (visitType === 'NEW' && !formData.patientSID) {
      setFormData(prev => ({ ...prev, patientSID: generateSID() }));
    }
  }, [visitType, formData.patientSID, generateSID]);

  const lookupAppointment = async () => {
    if (!formData.idNumber) {
        alert("Please enter an ID Number to search scheduled appointments.");
        return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/?search=${formData.idNumber}`, {
        headers: { 
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      
      const results = Array.isArray(data) ? data : (data.results || []);

      if (results.length > 0) {
        const latest = results[0];
        const nameParts = (latest.manual_patient_name || "").split(" ");
        setFormData(prev => ({
          ...prev,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(" ") || '',
        }));
      } else {
        alert("No scheduled appointment found for this ID.");
      }
    } catch (err) {
      console.error("Lookup failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    
    // Safety Check: Ensure Date of Birth is not in the future
    if (new Date(formData.dob) > new Date()) {
      setErrorMessage("Date of Birth cannot be in the future.");
      setIsSubmitting(false);
      return;
    }

    // MAP PAYLOAD TO MATCH SERIALIZER VIRTUAL FIELDS
    const payload = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      id_number: formData.idNumber.trim(), // Serializer maps this to registry_no
      dob: formData.dob || null,
      gender: formData.gender === 'male' ? 'M' : 'F', // Django expects single character
      phone: formData.phone,
      email: formData.email,
      insurance_type: formData.insuranceType,
      insurance_no: formData.insuranceNumber,
      emergency_contact: `${formData.nokName} (${formData.nokRelation}) - ${formData.nokPhone}`,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/patients/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        setRegisteredPatientId(result.id);
        setRegStatus('success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Parsing Django's error dictionary
        let errorMsg = "Please verify inputs.";
        if (result.id_number) errorMsg = result.id_number[0];
        else if (result.registry_no) errorMsg = result.registry_no[0];
        else if (result.detail) errorMsg = result.detail;
        else if (typeof result === 'object') {
            errorMsg = Object.entries(result).map(([k, v]) => `${k}: ${v}`).join(' | ');
        }
        throw new Error(errorMsg);
      }
    } catch (error) {
      setRegStatus('error');
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-['Plus_Jakarta_Sans']">
      
      {/* 1. Success Message & Navigation */}
      {regStatus === 'success' && (
        <div className="mb-6 p-6 bg-teal-50 border-2 border-teal-100 rounded-[2.5rem] flex items-center justify-between animate-in zoom-in-95">
          <div className="flex items-center gap-4">
            <div className="bg-teal-500 p-2 rounded-full text-white shadow-lg">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 uppercase">Registry Updated</p>
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest italic tracking-tighter">Record Secured Successfully</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/triage')} 
            className="bg-[#020617] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-teal-600 transition-all shadow-xl group"
          >
            Proceed to Triage 
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* 2. Error Message Alert */}
      {regStatus === 'error' && (
        <div className="mb-6 p-5 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-600 animate-in shake duration-300">
          <AlertCircle size={20} />
          <p className="text-xs font-bold uppercase tracking-tight">System Error: {errorMessage}</p>
        </div>
      )}

      {/* 3. Header Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl">
        <div className="flex bg-white/10 p-1.5 rounded-2xl border border-white/10">
          <button 
            onClick={() => setVisitType('NEW')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${visitType === 'NEW' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >New Patient</button>
          <button 
            onClick={() => setVisitType('SUBSEQUENT')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${visitType === 'SUBSEQUENT' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >Subsequent</button>
        </div>

        <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                    type="checkbox" 
                    checked={hasAppointment} 
                    onChange={(e) => setHasAppointment(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-slate-700 bg-transparent checked:bg-teal-500 transition-all appearance-none cursor-pointer"
                />
                <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-teal-400 font-['Plus_Jakarta_Sans']">Appointment Scheduled?</span>
            </label>
            {hasAppointment && (
                <button 
                    type="button"
                    onClick={lookupAppointment}
                    className="flex items-center gap-2 bg-teal-500/20 text-teal-400 border border-teal-500/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-teal-500 hover:text-white transition-all shadow-sm"
                >
                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
                    Sync Details
                </button>
            )}
        </div>
      </div>

      {/* 4. Title Header */}
      <div className="flex justify-between items-center mb-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-10 backdrop-blur-md bg-white/90">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Salama <span className="text-teal-600">Registry</span></h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">{visitType} Workflow | {formData.patientSID}</p>
        </div>
        
        <div className="flex items-center gap-4">
          {regStatus === 'success' ? (
             <div className="bg-teal-100 text-teal-700 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                 <CheckCircle2 size={16} /> Patient Registered
             </div>
          ) : (
            <button 
                form="registration-form"
                type="submit"
                disabled={isSubmitting}
                className="bg-slate-900 hover:bg-teal-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center space-x-2 disabled:opacity-50"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                <span>Finalize Record</span>
            </button>
          )}
        </div>
      </div>

      <form id="registration-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Identity Grid */}
        <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm">
          <div className="flex items-center space-x-3 mb-10 border-b border-slate-50 pb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Fingerprint size={24} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Patient Bio-Data</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic tracking-tighter">Legal Identification & Demographics</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ID Number / Passport</label>
              <input required name="idNumber" value={formData.idNumber} onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 transition-all" placeholder="National ID No." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">First Name</label>
              <input required name="firstName" value={formData.firstName} onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 transition-all" placeholder="First Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Last Name</label>
              <input required name="lastName" value={formData.lastName} onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 transition-all" placeholder="Last Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Date of Birth</label>
              <input required name="dob" value={formData.dob} onChange={handleChange} type="date" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-slate-900 focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone Number</label>
              <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-slate-900 focus:ring-2 focus:ring-teal-500" placeholder="07xx xxx xxx" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Gender</label>
              <select required name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold appearance-none cursor-pointer">
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </div>

        {/* Secondary Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-200">
                <div className="flex items-center space-x-3 mb-10 pb-6 border-b border-slate-200/50">
                    <ShieldCheck className="text-teal-600" size={24} />
                    <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Insurance Profile</h3>
                </div>
                <div className="space-y-4">
                    <select name="insuranceType" value={formData.insuranceType} onChange={handleChange} className="w-full bg-white border-none rounded-2xl p-5 font-bold shadow-sm outline-none">
                        <option value="SHA">Social Health Authority (SHA)</option>
                        <option value="PRIVATE">Private Insurance</option>
                        <option value="CASH">Cash / Self-Pay</option>
                    </select>
                    <input name="insuranceNumber" placeholder="Policy / Member Number" value={formData.insuranceNumber} onChange={handleChange} className="w-full bg-white border-none rounded-2xl p-5 font-bold outline-none shadow-sm" />
                </div>
            </div>

            <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl">
                <div className="flex items-center space-x-3 mb-10 border-b border-white/5 pb-6">
                    <Users className="text-amber-500" size={24} />
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">Emergency Contact</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <input required name="nokName" placeholder="Next of Kin Name" value={formData.nokName} onChange={handleChange} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-teal-500" />
                    <div className="grid grid-cols-2 gap-4">
                        <input name="nokRelation" placeholder="Relation" value={formData.nokRelation} onChange={handleChange} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-teal-500" />
                        <input required name="nokPhone" placeholder="Emergency Phone" value={formData.nokPhone} onChange={handleChange} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-teal-500" />
                    </div>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
};

export default Registration;