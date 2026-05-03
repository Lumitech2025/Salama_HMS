import React from 'react';
import { 
  LayoutDashboard, 
  FlaskConical, 
  Microscope, 
  Receipt, 
  Clock, 
  Pill,
  LogOut,
  HeartPulse
} from 'lucide-react';

const PatientSidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', label: 'My Health', icon: LayoutDashboard },
    { id: 'lab-results', label: 'Lab Reports', icon: FlaskConical },
    { id: 'imaging', label: 'Scans & Imaging', icon: Microscope },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'billing', label: 'Billing & Payments', icon: Receipt },
    { id: 'history', label: 'Treatment History', icon: Clock },
  ];

  return (
    <div className="w-72 h-screen bg-white border-r border-slate-100 flex flex-col p-6 sticky top-0">
      {/* Branding */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-100">
          <HeartPulse size={24} />
        </div>
        <span className="font-black text-xl tracking-tighter text-slate-900 uppercase">
          Salama<span className="text-blue-600 underline decoration-blue-200 decoration-4">Connect</span>
        </span>
      </div>

      {/* Navigation */}
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

      {/* Logout / Profile Area */}
      <div className="mt-auto pt-6 border-t border-slate-100">
        <button className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 font-bold text-sm transition-all group">
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default PatientSidebar;