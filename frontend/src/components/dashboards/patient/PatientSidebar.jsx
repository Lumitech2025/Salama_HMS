import React from 'react';
import { LayoutDashboard, User, Activity, Calendar, Clipboard, FlaskConical, Shield, LogOut } from 'lucide-react';

const PatientSidebar = ({ activeTab, setActiveTab, onLogout, patientData }) => {
  const menuItems = [
    { id: 'overview', label: 'Home / Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'vitals', label: 'Personal Health & Vitals', icon: Activity },
    { id: 'appointments', label: 'Appointments Hub', icon: Calendar },
    { id: 'records', label: 'Health Records & History', icon: Clipboard },
    { id: 'prescriptions', label: 'My Prescriptions', icon: FlaskConical },
    { id: 'insurance', label: 'Insurance Cover & SHA', icon: Shield },
  ];

  const getInitials = (fullName) => {
    if (!fullName) return 'PT';
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="w-80 h-screen fixed left-0 top-0 bg-[#020617] text-slate-400 flex flex-col justify-between p-6 border-r border-white/5 font-['Inter'] z-50">
      <div className="space-y-6">
        
        {/* Unified Salama HMS Corporate Identity Branding */}
        <div className="px-4 text-left">
          <h2 className="text-2xl font-bold tracking-tighter uppercase italic text-white">
            Salama<span className="text-teal-400">.Portal</span>
          </h2>
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.25em] mt-1">
            Personal Health Dashboard
          </p>
        </div>

        {/* PROFILE BADGE SECTION */}
        <div className="border border-white/5 p-5 rounded-2xl flex flex-col items-center text-center space-y-3 bg-white/5">
          <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center font-bold text-lg text-teal-400 border border-teal-500/20 shadow-sm">
            {getInitials(patientData?.name)}
          </div>
          <div>
            <h4 className="font-bold text-sm text-white tracking-tight uppercase">{patientData?.name || 'Loading Patient...'}</h4>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">****{patientData?.national_id?.slice(-4) || '2026'}</p>
            <span className="inline-block mt-2 bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
              Verified Account
            </span>
          </div>

          <div className="w-full text-left pt-3 border-t border-white/5 space-y-2 text-[11px] font-medium">
            <p><span className="text-slate-500">Registry ID:</span> <span className="font-mono text-slate-300">CR{patientData?.id || '1'}4404733</span></p>
            <p><span className="text-slate-500">Phone:</span> <span className="text-slate-300">+{patientData?.phone || '254*******'}</span></p>
          </div>
        </div>

        {/* NAVIGATION LINKS TRACK */}
        <nav className="space-y-1 text-left">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-xs tracking-wide ${
                  isCurrent 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/10' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={15} className={isCurrent ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* FOOTER METADATA PANELS */}
      <div className="space-y-4">
        <div className="text-[10px] text-slate-500 font-medium px-2 text-left leading-normal">
          
          <p className="mt-0.5 text-[9px] text-slate-600 font-mono">Version 1.0.167 (Salama Portal)</p>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all text-left text-xs font-semibold"
        >
          <LogOut size={15} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default PatientSidebar;