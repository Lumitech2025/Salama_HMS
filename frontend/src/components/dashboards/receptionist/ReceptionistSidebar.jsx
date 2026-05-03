import React from 'react';
import { 
  UserPlus, 
  ShieldCheck, 
  Calendar, 
  Wallet, 
  Users, 
  Settings, 
  LogOut,
  LayoutDashboard
} from 'lucide-react';

const ReceptionistSidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Dashboard Home' },
    { id: 'registration', icon: UserPlus, label: 'Patient Registration' },
    { id: 'insurance', icon: ShieldCheck, label: 'SHA/NHIF Verify' },
    { id: 'appointments', icon: Calendar, label: 'Appointments' },
    { id: 'billing', icon: Wallet, label: 'Billing & Payments' },
    { id: 'queue', icon: Users, label: 'Live Queue Status' },
  ];

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <aside className="w-72 bg-slate-900 min-h-screen flex flex-col border-r border-slate-800 shadow-2xl sticky top-0">
      <div className="p-8 mb-4">
        <h2 className="text-teal-500 font-black text-xl tracking-tighter italic uppercase">Salama HMS</h2>
        <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mt-1 text-wrap">Front Desk Operations</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${
              activeTab === item.id 
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/40' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800 space-y-4">
        <button className="w-full flex items-center space-x-3 text-slate-400 hover:text-teal-400 px-4 py-2 transition-colors group">
          <Settings size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">Profile Settings</span>
        </button>
        
        <button 
          onClick={handleLogout}
          className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center space-x-3 py-4 rounded-2xl transition-all font-bold text-sm shadow-sm"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default ReceptionistSidebar;