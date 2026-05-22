import React from 'react';
import { 
    LayoutDashboard, Users, PieChart, Package, 
    ShieldCheck, Beaker, Stethoscope, Pill, LogOut 
} from 'lucide-react';

const AdminSidebar = ({ activeTab, setActiveTab, onLogout }) => {
  
  const menuGroups = [
    {
      label: "Management Modules",
      items: [
        { id: 'overview', label: 'Command Center', icon: <LayoutDashboard size={18} /> },
        { id: 'users', label: 'User Management', icon: <Users size={18} /> },
        { id: 'financials', label: 'Financial Analytics', icon: <PieChart size={18} /> },
        { id: 'inventory', label: 'Inventory Command', icon: <Package size={18} /> },
        { id: 'audit', label: 'System Audit', icon: <ShieldCheck size={18} /> },
      ]
    },
    {
      label: "Clinical Oversight",
      items: [
        { id: 'view-lab', label: 'Lab Oversight', icon: <Beaker size={18} /> },
        { id: 'view-clinical', label: 'Clinical Feed', icon: <Stethoscope size={18} /> },
        { id: 'view-pharmacy', label: 'Pharmacy Stock', icon: <Pill size={18} /> },
      ]
    }
  ];

  // Defensive handle fallback layer
  const handleLogoutClick = () => {
    if (typeof onLogout === 'function') {
        onLogout();
    } else {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    }
  };

  return (
    <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
      {/* Unified Brand Identity */}
      <div className="mb-8 px-2">
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
            SALAMA <span className="text-blue-500 not-italic font-light">HMS</span>
        </h1>
        <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">
            Admin 
        </p>
      </div>

      {/* Navigation - With sub-group labels mapped seamlessly */}
      <nav className="flex-1 space-y-6 overflow-y-auto pr-1 no-scrollbar">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-6 mb-1">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-start px-6 py-4 rounded-2xl transition-all duration-300 ${
                    activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 font-bold' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="mr-4 text-current">{item.icon}</div>
                  <span className="text-[12px] font-bold tracking-widest uppercase truncate">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="pt-8 border-t border-white/5 space-y-4">
        <div className="px-6 text-left">
            <p className="text-[9px] text-slate-600 font-mono">Version 1.0.0 (Salama Hospital)</p>
        </div>
        <button 
          onClick={handleLogoutClick}
          className="flex items-center justify-start space-x-4 px-6 py-4 text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all w-full"
        >
          <LogOut size={18} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;