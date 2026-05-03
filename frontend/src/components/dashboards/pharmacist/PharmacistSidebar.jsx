import React from 'react';
import { 
  LayoutDashboard, 
  Pill, 
  ClipboardList, 
  Package, 
  Users,
  Receipt,     
  ArrowDownUp,
  Settings,
  LogOut 
} from 'lucide-react';

const PharmacistSidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'prescriptions', label: 'Prescriptions', icon: ClipboardList },
    { id: 'dispensing', label: 'Dispensing', icon: Pill },
    { id: 'inventory', label: 'Inventory/Stock', icon: Package },
    { id: 'patients', label: 'Patient Registry', icon: Users },
    { id: 'billing', label: 'Billing & Requisitions', icon: Receipt }, // New Module
  ];

  return (
    <div className="w-64 bg-slate-900 min-h-screen p-6 flex flex-col text-slate-300">
      <div className="mb-10 px-2">
        <h1 className="text-xl font-black text-white tracking-tighter">
          SALAMA <span className="text-teal-500">PHARMA</span>
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id 
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>
      

      <div className="pt-6 border-t border-slate-800">
        <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors">
          <LogOut size={20} />
          <span className="font-bold text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default PharmacistSidebar;