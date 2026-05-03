import React from 'react';
import { 
  LayoutDashboard, 
  FileSearch, 
  RefreshCcw, 
  Scale, 
  Calculator, 
  History,
  LogOut,
  ShieldCheck
} from 'lucide-react';

const BillingOfficerSidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'claims', label: 'Claims Tracker', icon: FileSearch },
    { id: 'cycles', label: 'Cycle Billing', icon: RefreshCcw },
    { id: 'reconciliation', label: 'Pharmacy Recon', icon: Scale },
    { id: 'estimator', label: 'Financial Estimator', icon: Calculator },
    { id: 'history', label: 'Invoice History', icon: History },
  ];

  return (
    <div className="w-72 h-screen bg-white border-r border-slate-100 flex flex-col p-6 sticky top-0">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="bg-teal-600 p-2 rounded-xl text-white shadow-lg shadow-teal-200">
          <ShieldCheck size={24} />
        </div>
        <span className="font-black text-xl tracking-tighter text-slate-900">Salama<span className="text-teal-600 underline decoration-teal-200 decoration-4">Finance</span></span>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
              activeTab === item.id 
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100">
        <button className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 font-bold text-sm transition-all group">
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default BillingOfficerSidebar;