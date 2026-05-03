import React, { useState } from 'react';
import { UserPlus, Fingerprint, Phone, Users, ShieldCheck, Save } from 'lucide-react';

const Registration = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    dob: '',
    gender: '',
    phone: '',
    insuranceType: 'SHA', // Defaulting to the new standard
    insuranceNumber: '',
    nokName: '',
    nokRelation: '',
    nokPhone: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Registering Patient for Salama HMS:", formData);
    // Logic to POST to your Django backend goes here
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Patient Registration</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Create a new permanent medical record</p>
        </div>
        <button 
          form="registration-form"
          type="submit"
          className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-teal-900/20 flex items-center space-x-2"
        >
          <Save size={18} />
          <span>Save Patient Record</span>
        </button>
      </div>

      <form id="registration-form" onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Personal Details */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8 border-b border-slate-50 pb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <UserPlus size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Personal Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">First Name</label>
              <input required name="firstName" onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium" placeholder="e.g. John" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Last Name</label>
              <input required name="lastName" onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium" placeholder="e.g. Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-1">
                <Fingerprint size={12} /> ID / Passport Number
              </label>
              <input required name="idNumber" onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium" placeholder="Enter ID" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Date of Birth</label>
              <input required name="dob" onChange={handleChange} type="date" className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Gender</label>
              <select name="gender" onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium appearance-none">
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-1">
                <Phone size={12} /> Phone Number
              </label>
              <input required name="phone" onChange={handleChange} type="tel" className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium" placeholder="07..." />
            </div>
          </div>
        </div>

        {/* Section 2: Insurance & Billing */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8 border-b border-slate-50 pb-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Insurance (SHA/NHIF)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Insurance Provider</label>
              <select name="insuranceType" onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium">
                <option value="SHA">SHA (Social Health Authority)</option>
                <option value="NHIF">NHIF (Transition)</option>
                <option value="PRIVATE">Private Insurance</option>
                <option value="CASH">Cash Patient</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Policy / Member Number</label>
              <input name="insuranceNumber" onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium" placeholder="Member ID" />
            </div>
          </div>
        </div>

        {/* Section 3: Next of Kin */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8 border-b border-slate-50 pb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Next of Kin (Emergency Contact)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Full Name</label>
              <input name="nokName" onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium" placeholder="NOK Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Relationship</label>
              <input name="nokRelation" onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium" placeholder="e.g. Spouse" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Phone Number</label>
              <input name="nokPhone" onChange={handleChange} type="tel" className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-teal-500/20 outline-none font-medium" placeholder="NOK 07..." />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Registration;