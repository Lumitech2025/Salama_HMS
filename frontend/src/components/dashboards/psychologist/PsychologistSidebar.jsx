import React from 'react';
import { LayoutDashboard, HeartHandshake, MapPin, BookOpen, LogOut } from 'lucide-react';

const PsychologistSidebar = ({ activeTab, setActiveTab, onLogout, stats = { activeCases: 0, ltfuAlerts: 0 } }) => {
  // Dynamically pull the exact active user context from the backend state cache
  const rawFirstName = localStorage.getItem('first_name') || 'Ayana';
  const rawLastName = localStorage.getItem('last_name') || 'Nkirote';
  const designation = localStorage.getItem('designation') || 'Counseling Psychologist';

  const menuItems = [
    { id: 'overview', label: 'Clinical Overview', icon: LayoutDashboard },
    { id: 'psychosocial', label: 'Psychosocial Desk', icon: HeartHandshake, badge: stats.activeCases },
    { id: 'tracing', label: 'Continuity & Tracing', icon: MapPin, badge: stats.ltfuAlerts, badgeColor: 'bg-rose-500 text-white' },
    { id: 'hro_cme', label: 'HRO & CME Registry', icon: BookOpen },
  ];

  return (
    <aside className="w-80 h-screen fixed left-0 top-0 bg-[#020617] text-white flex flex-col justify-between p-8 border-r border-white/5 font-['Inter'] z-50">
      <div className="space-y-8">
        {/* Brand Header */}
        <div className="px-4 text-left">
          <h2 className="text-2xl font-bold tracking-tighter uppercase italic">
            Salama<span className="text-teal-400">.HMS</span>
          </h2>
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.25em] mt-1">
            Psychosocial Desk
          </p>
        </div>

        {/* Dynamic User Card */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 text-left">
          <div className="w-11 h-11 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 font-bold border border-teal-500/20 shrink-0 text-sm">
            {rawFirstName.charAt(0)}{rawLastName.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-semibold text-sm text-white truncate">Dr. {rawFirstName} {rawLastName}</h4>
            <p className="text-[10px] text-slate-400 uppercase mt-1 tracking-wider truncate font-medium">{designation}</p>
          </div>
        </div>

        <hr className="border-white/5 my-2" />

        {/* Navigation Link Stack */}
        <nav className="space-y-1.5 text-left">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl transition-all group ${
                  isCurrent 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/10 font-medium' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon size={16} className={`transition-colors ${isCurrent ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span className="text-xs tracking-wide font-medium">{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md font-mono ${item.badgeColor || 'bg-teal-500 text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Terminate Session Button */}
      <button 
        onClick={onLogout}
        className="w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all text-left group text-xs font-medium"
      >
        <LogOut size={16} className="transition-colors group-hover:text-rose-400" />
        <span>Logout</span>
      </button>
    </aside>
  );
};

export default PsychologistSidebar;