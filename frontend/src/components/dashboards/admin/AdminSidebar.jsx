import React from 'react';
import { 
  LayoutDashboard, Users, PieChart, Package, 
  ShieldCheck, Beaker, Stethoscope, Pill, LogOut, Settings
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

  return (
    <div className="w-72 bg-slate-950 min-h-screen p-6 flex flex-col border-r border-white/5">
      <div className="flex items-center space-x-3 mb-10 px-2">
        <div className="bg-white p-1.5 rounded-xl">
           <div className="w-6 h-6 bg-slate-950 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs italic">S</span>
           </div>
        </div>
        <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">
          Salama <span className="text-teal-500">Admin</span>
        </h2>
      </div>

      <nav className="flex-1 space-y-8">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 px-4">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                    activeTab === item.id 
                    ? 'bg-white text-slate-950 shadow-xl' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className={`${activeTab === item.id ? 'text-slate-950' : 'text-slate-500 group-hover:text-teal-500'}`}>
                    {item.icon}
                  </span>
                  <span className="font-bold text-xs uppercase tracking-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="pt-6 border-t border-white/5 space-y-2">
        <button className="w-full flex items-center space-x-4 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white/5 hover:text-white transition-all">
          <Settings size={18} />
          <span className="font-bold text-xs uppercase tracking-tight">System Settings</span>
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center space-x-4 px-4 py-3 rounded-2xl text-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-all"
        >
          <LogOut size={18} />
          <span className="font-bold text-xs uppercase tracking-tight">Term Sesson</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;