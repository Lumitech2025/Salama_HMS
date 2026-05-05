import React, { useState, useEffect } from 'react';
import { UserPlus, Fingerprint, Phone, Users, ShieldCheck, Save, Hash, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const Registration = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [regStatus, setRegStatus] = useState('idle'); // idle, success, error, duplicate

  // 1. Initial State synchronized with your Django model expectations
  const initialFormState = {
    patientSID: '', 
    firstName: '',
    lastName: '',
    idNumber: '', 
    dob: '',
    gender: '',
    phone: '',
    insuranceType: 'SHA',
    insuranceNumber: '',
    nokName: '',
    nokRelation: '',
    nokPhone: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // 2. Generate Unique Salama ID (SID)
  const generateSID = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(4, '0');
    return `SAL-${year}-${random}`;
  };

  useEffect(() => {
    if (!formData.patientSID) {
      setFormData(prev => ({ ...prev, patientSID: generateSID() }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 3. Search for Existing Patient (Using your PatientViewSet SearchFilter)
  const checkExistingPatient = async () => {
    if (!formData.idNumber) return;
    setIsSearching(true);
    try {
      // Your ViewSet supports search on registry_no[cite: 3]
      const response = await fetch(`http://127.0.0.1:8000/api/patients/?search=${formData.idNumber}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      
      if (data.length > 0) {
        setRegStatus('duplicate');
        alert("A patient with this ID is already registered in Salama Cloud.");
      } else {
        alert("ID Available for registration.");
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Final Submission to Django Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Map Frontend state to Django Patient Model
    const payload = {
      name: `${formData.firstName} ${formData.lastName}`,
      registry_no: formData.idNumber,
      dob: formData.dob,
      gender: formData.gender === 'male' ? 'M' : 'F', // Align with GENDER_CHOICES
      phone: formData.phone,
      insurance_type: formData.insuranceType,
      insurance_no: formData.insuranceNumber,
      emergency_contact: `${formData.nokName} (${formData.nokRelation}) - ${formData.nokPhone}`,
      cancer_type: "General", // Required by your model[cite: 1]
      staging: "N/A" // Required by your model[cite: 1]
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/patients/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setRegStatus('success');
        setTimeout(() => {
          setRegStatus('idle');
          setFormData({...initialFormState, patientSID: generateSID()});
        }, 3000);
      } else {
        throw new Error("Failed to save record");
      }
    } catch (error) {
      console.error("Registration Error:", error);
      setRegStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header & ID Badge */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm sticky top-4 z-10 backdrop-blur-md bg-white/90">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">
            Salama <span className="text-teal-600">Registration</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
            New Electronic Health Record (EHR) Creation
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2">
            <Hash size={14} className="text-slate-400" />
            <span className="text-xs font-black text-slate-600 font-mono tracking-tighter">
              {formData.patientSID}
            </span>
          </div>
          
          <button 
            form="registration-form"
            type="submit"
            disabled={isSubmitting || regStatus === 'duplicate'}
            className={`${
                regStatus === 'success' ? 'bg-teal-500' : 'bg-slate-900 hover:bg-teal-600'
            } text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center space-x-2 disabled:opacity-50`}
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : regStatus === 'success' ? <CheckCircle2 size={16}/> : <Save size={16} />}
            <span>{regStatus === 'success' ? 'Record Saved' : 'Finalize Record'}</span>
          </button>
        </div>
      </div>

      <form id="registration-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Core Identity */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
             <UserPlus size={120} />
          </div>
          
          <div className="flex items-center space-x-3 mb-10 border-b border-slate-50 pb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Fingerprint size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Identity Profile</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verify National Identity First</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">National ID / Passport</label>
              <div className="relative">
                <input 
                    required 
                    name="idNumber" 
                    value={formData.idNumber}
                    onChange={handleChange} 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500/20 rounded-2xl p-5 outline-none font-bold text-slate-900 transition-all" 
                    placeholder="Enter ID Number" 
                />
                <button 
                    type="button" 
                    onClick={checkExistingPatient}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700"
                >
                  {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                </button>
              </div>
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
              <input required name="dob" value={formData.dob} onChange={handleChange} type="date" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-slate-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Gender</label>
              <select required name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold appearance-none">
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1">
                <Phone size={12} /> Contact Number
              </label>
              <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold" placeholder="07xx xxx xxx" />
            </div>
          </div>
        </div>

        {/* Section 2: Insurance */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
             <ShieldCheck size={120} />
          </div>
          <div className="flex items-center space-x-3 mb-10 border-b border-slate-50 pb-6">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Insurance & Billing</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select SHA/SHIF or Private</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Primary Provider</label>
              <select name="insuranceType" value={formData.insuranceType} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold">
                <option value="SHA">SHA (Social Health Authority)</option>
                <option value="PRIVATE">Private / Corporate</option>
                <option value="CASH">Cash / Self-Pay</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Policy/Member Number</label>
              <input name="insuranceNumber" value={formData.insuranceNumber} onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold" placeholder="Member ID" />
            </div>
          </div>
        </div>

        {/* Section 3: Next of Kin */}
        <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none text-white">
             <Users size={120} />
          </div>
          <div className="flex items-center space-x-3 mb-10 border-b border-white/5 pb-6">
            <div className="p-3 bg-white/5 text-amber-500 rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight uppercase">Emergency Contact</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Next of Kin Information</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2 text-white">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Full Name</label>
              <input name="nokName" value={formData.nokName} onChange={handleChange} type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none font-bold focus:border-amber-500/50" />
            </div>
            <div className="space-y-2 text-white">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Relationship</label>
              <input name="nokRelation" value={formData.nokRelation} onChange={handleChange} type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none font-bold focus:border-amber-500/50" />
            </div>
            <div className="space-y-2 text-white">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Phone Number</label>
              <input name="nokPhone" value={formData.nokPhone} onChange={handleChange} type="tel" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none font-bold focus:border-amber-500/50" />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Registration;