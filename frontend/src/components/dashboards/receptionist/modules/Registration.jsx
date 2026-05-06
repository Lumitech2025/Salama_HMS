import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserPlus, Fingerprint, Phone, Users, ShieldCheck, 
  Save, Hash, Search, Loader2, CheckCircle2, 
  AlertCircle, ArrowRight, CalendarCheck, UserCheck 
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const Registration = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [visitType, setVisitType] = useState('NEW'); // NEW or SUBSEQUENT
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

  // Generate unique ID for new patients (Salama Standard)
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

  // Lookup Appointment to auto-fill details (Prevents double data entry)
  const lookupAppointment = async () => {
    if (!formData.idNumber) {
        alert("Please enter an ID Number to search.");
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
      
      if (data.length > 0) {
        const latest = data[0];
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
    
    // Mapping frontend fields to Django Patient Model
    const payload = {
      name: `${formData.firstName} ${formData.lastName}`,
      registry_no: formData.idNumber,
      dob: formData.dob || null, // Ensure date is null if empty
      gender: formData.gender === 'male' ? 'M' : 'F',
      phone: formData.phone,
      email: formData.email,
      insurance_type: formData.insuranceType,
      insurance_no: formData.insuranceNumber,
      emergency_contact: `${formData.nokName} | ${formData.nokRelation} | ${formData.nokPhone}`,
      cancer_type: "Unassigned", // Default for registry until clinical staging
      staging: "N/A"
    };

    try {
      // Note the trailing slash: Django DefaultRouter requires it
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
      } else {
        // Log the specific 400 error from DRF (e.g., 'registry_no already exists')
        const errorMsg = Object.values(result).flat().join(', ');
        throw new Error(errorMsg || "Failed to save record");
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
      
      {/* 1. Visit Type & Appointment Sync */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl">
        <div className="flex bg-white/10 p-1.5 rounded-2xl border border-white/10">
          <button 
            onClick={() => setVisitType('NEW')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${visitType === 'NEW' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400'}`}
          >New Patient</button>
          <button 
            onClick={() => setVisitType('SUBSEQUENT')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${visitType === 'SUBSEQUENT' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400'}`}
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
                <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-teal-400">Has Appointment?</span>
            </label>
            {hasAppointment && (
                <button 
                    type="button"
                    onClick={lookupAppointment}
                    className="flex items-center gap-2 bg-teal-500/20 text-teal-400 border border-teal-500/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-teal-500 hover:text-white transition-all"
                >
                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
                    Sync Details
                </button>
            )}
        </div>
      </div>

      {/* 2. Feedback Messages */}
      {regStatus === 'error' && (
        <div className="mb-6 p-5 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-600 animate-in zoom-in-95">
            <AlertCircle size={20} />
            <p className="text-xs font-bold uppercase tracking-tight">Error: {errorMessage}</p>
        </div>
      )}

      {/* 3. Main Registration Header */}
      <div className="flex justify-between items-center mb-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-10 backdrop-blur-md bg-white/90">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">
            Salama <span className="text-teal-600">Registry</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
            {visitType} Workflow | {formData.patientSID}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {regStatus === 'success' ? (
            <button 
                onClick={() => window.location.href = `/triage/${registeredPatientId}`}
                className="bg-teal-600 hover:bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center space-x-2"
            >
                <span>Proceed to Triage</span>
                <ArrowRight size={16} />
            </button>
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
        {/* Identity Section */}
        <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm">
          <div className="flex items-center space-x-3 mb-10 border-b border-slate-50 pb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Fingerprint size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Patient Bio-Data</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Identification</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ID Number / Passport</label>
              <input required name="idNumber" value={formData.idNumber} onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-slate-900" placeholder="Identity No." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">First Name</label>
              <input required name="firstName" value={formData.firstName} onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold" placeholder="First Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Last Name</label>
              <input required name="lastName" value={formData.lastName} onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold" placeholder="Last Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Date of Birth</label>
              <input required name="dob" value={formData.dob} onChange={handleChange} type="date" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone</label>
              <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold" placeholder="07xx xxx xxx" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Gender</label>
              <select required name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold appearance-none">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </div>

        {/* Insurance & Emergency Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-200">
                <div className="flex items-center space-x-3 mb-10 pb-6 border-b border-slate-200/50">
                    <ShieldCheck className="text-teal-600" size={24} />
                    <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Insurance</h3>
                </div>
                <div className="space-y-4">
                    <select name="insuranceType" value={formData.insuranceType} onChange={handleChange} className="w-full bg-white border-none rounded-2xl p-5 font-bold">
                        <option value="SHA">Social Health Authority (SHA)</option>
                        <option value="PRIVATE">Private Insurance</option>
                        <option value="CASH">Cash / Self-Pay</option>
                    </select>
                    <input name="insuranceNumber" placeholder="Member Number" value={formData.insuranceNumber} onChange={handleChange} className="w-full bg-white border-none rounded-2xl p-5 font-bold outline-none" />
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
                        <input required name="nokPhone" placeholder="Phone" value={formData.nokPhone} onChange={handleChange} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-teal-500" />
                    </div>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
};

export default Registration;