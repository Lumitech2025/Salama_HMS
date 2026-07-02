import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  LayoutDashboard, Database, ClipboardList, Truck, 
  Receipt, LogOut, ChevronRight, ShieldCheck, Building2, 
  FileText, ClipboardCheck
} from 'lucide-react';

const FinanceSidebar = ({ activeTab, setActiveTab, onLogout }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    let isMounted = true; 

    const fetchUnread = async () => {
      try {
        const res = await API.get('/requisitions/', { 
          params: { status: 'PENDING', is_viewed_by_finance: false } 
        });
        
        if (!isMounted) return;

        const count = res.data.count !== undefined ? res.data.count : res.data.length;
        setUnreadCount(count);
      } catch (err) {
        console.error("Notification sync error", err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); 
    
    return () => {
      isMounted = false;
      clearInterval(interval); 
    };
  }, []);
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, },
    { 
      id: 'finance_requisitions', label: 'Requisitions', 
      icon: ClipboardList, 
            badge: unreadCount > 0 ? unreadCount : null 
    },
    { id: 'inventory', label: 'Main Store', icon: Database  },
    { id: 'stocktake', label: 'Stocktake Audits', icon: ClipboardCheck },
    { id: 'assets', label: 'Asset Management', icon: FileText },
    { id: 'expenses', label: 'Expense Management', icon: Receipt,},
    { id: 'insurance_providers', label: 'Insurance Providers', icon: Building2  },
    { id: 'claims', label: 'Claims', icon: Receipt  },
    { id: 'vendors', label: 'Suppliers', icon: Truck },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: ClipboardList },
    { id: 'service-catalogue', label: 'Service Catalogue', icon: FileText },
  ];

  return (
    <aside className="h-screen w-80 bg-[#020617] text-white flex flex-col p-6 fixed left-0 top-0 shadow-2xl z-50 font-sans antialiased">
      <div className="mb-10 px-2 flex items-center gap-3">
        <div className="bg-teal-500 p-2.5 rounded-xl shadow-lg shadow-teal-500/20">
          <ShieldCheck size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none text-white">
            Salama <span className="text-teal-400">Finance Portal</span>
          </h1>
        </div>
      </div>
      <nav className="flex-1 space-y-3 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full group relative flex items-center gap-4 p-4 rounded-[1.5rem] transition-all duration-300 text-left focus:outline-none cursor-pointer ${
                isActive ? 'bg-white/10 border border-white/10 shadow-xl' : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className={`p-3 rounded-2xl relative transition-all duration-300 ${
                isActive ? 'bg-teal-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-slate-300'
              }`}>
                <Icon size={20} />
                
                {item.badge && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white animate-pulse shadow-lg shadow-rose-500/40 border border-[#020617]">
                    {item.badge}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black uppercase tracking-widest truncate ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`}>
                  {item.label}
                </p>
                <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5 group-hover:text-slate-400 transition-colors">
                  {item.desc}
                </p>
              </div>

              {isActive && (
                <div className="animate-in fade-in slide-in-from-left-2">
                  <ChevronRight size={16} className="text-teal-500" />
                </div>
              )}
            </button>
          );
        })}
      </nav>
      <div className="pt-8 border-t border-white/5">
        <button 
          onClick={onLogout} 
          className="w-full flex items-center gap-4 p-4 rounded-3xl bg-rose-500/5 border border-rose-500/10 text-rose-500 hover:bg-rose-50 hover:text-white transition-all duration-300 group cursor-pointer"
        >
          <LogOut size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default FinanceSidebar;