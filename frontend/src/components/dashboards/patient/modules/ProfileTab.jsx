import React from 'react';
import { User, Shield, Briefcase, Landmark } from 'lucide-react';

const ProfileTab = ({ patientData }) => {
  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300 font-['Inter']">
      
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Identification & Demographic Files</h2>
        <p className="text-xs text-slate-400 mt-0.5">Integrated biometric identity records synchronized with central registry systems.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Demographics Box Frame (Takes 2 columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-6 text-xs font-medium text-slate-500">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-50">
            <User size={14} className="text-blue-500" /> Statutory Credentials
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1"><p className="text-slate-400">Legal Name</p><p className="text-sm font-bold text-slate-800">{patientData?.name}</p></div>
            <div className="space-y-1"><p className="text-slate-400">National ID Card / Passport Index</p><p className="text-sm font-mono font-bold text-slate-800">{patientData?.national_id}</p></div>
            <div className="space-y-1"><p className="text-slate-400">Gender Allocation</p><p className="text-sm font-bold text-slate-800 uppercase">{patientData?.gender}</p></div>
            <div className="space-y-1"><p className="text-slate-400">Registered Telephone Terminal</p><p className="text-sm font-bold text-slate-800">+{patientData?.phone}</p></div>
          </div>
        </div>

        {/* Insurance Cover Scope Information Card (Takes 1 column) */}
        <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-sm flex flex-col justify-between text-xs space-y-4">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/5">
              <Shield size={14} className="text-teal-400" /> Scope Parameters
            </h3>
            <div className="space-y-2.5 font-medium text-slate-300">
              <p><span className="text-slate-500">Universal Fund:</span> Social Health Insurance (SHIF)</p>
              <p><span className="text-slate-500">Scheme Pool:</span> Level 6 Cancer Management Program</p>
              <p><span className="text-slate-500">Exemption Index:</span> Fully Exempt Co-Pay</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-[11px] text-slate-400 leading-normal">
            * To report profile errors or modify details, file an update ticket at any national Huduma Center location.
          </div>
        </div>

      </div>

    </div>
  );
};

export default ProfileTab;