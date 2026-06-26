import React, { useState } from 'react';
import { 
  Users, PieChart, ShieldAlert, LogOut, ChevronDown, ChevronRight, Package 
} from 'lucide-react';

const AdminSidebar = ({ activeTab, setActiveTab, onLogout }) => {
  const [expandedTabs, setExpandedTabs] = useState({
    hr: true,
    procurement: true,
    patients: true 
  });

  const toggleExpand = (tabKey) => {
    setExpandedTabs(prev => ({ ...prev, [tabKey]: !prev[tabKey] }));
  };

  const menuItems = [
    { id: 'users', label: 'User Management', icon: <Users size={20} /> },
    { id: 'financials', label: 'Finance Analytics', icon: <PieChart size={20} /> },
    { id: 'insurance', label: 'Insurance', icon: <ShieldAlert size={20} /> },
    { id: 'inventory', label: 'Main Store', icon: <Package size={20} /> },
    { id: 'requisitions', label: 'Requisitions', icon: <ShieldAlert size={20} /> },
  ];

  const handleLogoutClick = () => {
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  return (
    <aside className="w-80 bg-[#090E1A] h-screen flex flex-col p-6 border-r border-white/5 font-sans antialiased select-none shrink-0 z-20">
      {/* Brand Header */}
      <div className="mb-10 px-4 flex items-center space-x-3">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
            SALAMA <span className="text-teal-400 not-italic font-light">HMS</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
            Admin Portal
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-5 py-4 rounded-xl transition-all duration-300 ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="mr-4 opacity-80">{item.icon}</div>
            <span className="text-sm font-semibold tracking-wide">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="pt-6 border-t border-white/10 space-y-4">
        <button 
          onClick={handleLogoutClick}
          className="flex items-center space-x-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all w-full"
        >
          <LogOut size={20} />
          <span className="text-sm font-bold tracking-wide uppercase">Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;