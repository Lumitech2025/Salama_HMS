import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, PieChart, Package, 
  Radio, ShieldAlert, Briefcase, LogOut, ChevronDown, ChevronRight,
  Activity, BarChart3
} from 'lucide-react';

const AdminSidebar = ({ activeTab, setActiveTab, onLogout }) => {
  // Track state for all sub-tab grouping dropdown blocks
  const [expandedTabs, setExpandedTabs] = useState({
    hr: true,
    procurement: true,
    patients: true // Initialized to open for fluid UI layout context exploration
  });

  const toggleExpand = (tabKey) => {
    setExpandedTabs(prev => ({ ...prev, [tabKey]: !prev[tabKey] }));
  };

  // Strictly the requested admin modules with localized sub-tabs hierarchies
  const menuItems = [
    { id: 'users', label: 'User Management', icon: <Users size={18} /> },
    { id: 'overview', label: 'Command Center', icon: <LayoutDashboard size={18} /> },
    {
      id: 'hr',
      label: 'HR & Payroll Management',
      icon: <Briefcase size={18} />,
      hasSubitems: true,
      subitems: [
        { id: 'hr-directory', label: 'Staff Directory' },
        { id: 'hr-payroll', label: 'Payroll Management' }
      ]
    },
    {
      id: 'procurement',
      label: 'Procurement',
      icon: <Package size={18} />,
      hasSubitems: true,
      subitems: [
        { id: 'inventory', label: 'Inventory' },
        { id: 'purchase-orders', label: 'Purchase Orders' }
      ]
    },
    {
      id: 'patients',
      label: 'Patients',
      icon: <Users size={18} />,
      hasSubitems: true,
      subitems: [
        { id: 'patient-metrics', label: 'Patient Metrics' },
        { id: 'queue-status', label: 'Queue Status' }
      ]
    },
    { id: 'financials', label: 'Financial Analytics', icon: <PieChart size={18} /> },
    { id: 'insurance', label: 'Insurance', icon: <ShieldAlert size={18} /> },
    { id: 'communications', label: 'Communication & Broadcast Center', icon: <Radio size={18} /> }
  ];

  const handleLogoutClick = () => {
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  const isSubitemActive = (item) => {
    if (!item.hasSubitems) return false;
    return item.subitems.some(sub => sub.id === activeTab);
  };

  return (
    <aside className="w-80 bg-[#090E1A] h-screen flex flex-col p-6 border-r border-white/5 font-sans antialiased select-none shrink-0 z-20">
      {/* Brand Header - Salama Finance Portal standard */}
      <div className="mb-10 px-4 flex items-center space-x-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
            SALAMA <span className="text-teal-400 not-italic font-light">HMS</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">
            Admin Portal
          </p>
        </div>
      </div>

      {/* Main Navigation - Strict upper-case styling mirroring your portal design */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1 no-scrollbar">
        {menuItems.map((item) => {
          const isGroupExpanded = expandedTabs[item.id];
          const activeParent = activeTab === item.id || isSubitemActive(item);

          if (item.hasSubitems) {
            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 text-left ${
                    activeParent 
                      ? 'text-white bg-white/5' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="mr-4 text-current opacity-70">{item.icon}</div>
                    <span className="text-[12px] font-bold tracking-[0.1em] uppercase">
                      {item.label}
                    </span>
                  </div>
                  {isGroupExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                </button>

                {/* Sub-tabs Expandable Node Drawer */}
                {isGroupExpanded && (
                  <div className="pl-6 space-y-1 ml-4 border-l border-white/10 mt-1 mb-2">
                    {item.subitems.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTab(sub.id)}
                        className={`w-full flex items-center justify-start py-2.5 px-4 rounded-lg transition-all duration-200 text-left ${
                          activeTab === sub.id
                            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/15'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-[11px] font-bold tracking-[0.08em] uppercase">
                          {sub.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Flat single actions navigation row
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-start px-4 py-3.5 rounded-xl transition-all duration-200 text-left ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="mr-4 text-current opacity-70">{item.icon}</div>
              <span className="text-[12px] font-bold tracking-[0.1em] uppercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer Branding Area */}
      <div className="pt-4 border-t border-white/5 space-y-3">
        <div className="px-4">
          <p className="text-[10px] text-slate-600 font-mono tracking-tight">Version 1.0.0 (Salama Hospital)</p>
        </div>
        <button 
          onClick={handleLogoutClick}
          className="flex items-center justify-start space-x-3 px-4 py-3 text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all w-full"
        >
          <LogOut size={16} />
          <span className="text-[11px] font-bold tracking-[0.1em] uppercase">Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;