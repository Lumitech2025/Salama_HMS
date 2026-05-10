import React from 'react';
import { 
  LayoutGrid, 
  FlaskConical, 
  History, 
  BookOpen, 
  PackageSearch, 
  LogOut, 
  FlaskRound
} from 'lucide-react';

const LabSidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', label: 'Home', icon: LayoutGrid },
    { id: 'diagnostics', label: 'Diagnostics', icon: FlaskConical },
    { id: 'history', label: 'Patient History', icon: History },
    { id: 'reference', label: 'Reference Desk', icon: BookOpen },
    { id: 'inventory', label: 'Inventory', icon: PackageSearch },
  ];

  return (
    <div className="w-72 bg-slate-950 border-r border-white/5 flex flex-col h-screen sticky top-0">
      {/* BRANDING */}
      <div className="p-8 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500 p-2.5 rounded-xl shadow-lg shadow-teal-500/20">
            <FlaskRound size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">
              Salama <span className="text-teal-500 text-sm">LAB</span>
            </h1>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Precision Diagnostics</p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative ${
                isActive 
                  ? 'bg-teal-500 text-white shadow-xl shadow-teal-500/10' 
                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon size={20} className={isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
              <span className="text-xs font-black uppercase tracking-widest leading-none">
                {item.label}
              </span>
              
              {isActive && (
                <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* FOOTER ACTION */}
      <div className="p-6 border-t border-white/5">
        <button 
          onClick={() => window.location.href = '/login'}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default LabSidebar;