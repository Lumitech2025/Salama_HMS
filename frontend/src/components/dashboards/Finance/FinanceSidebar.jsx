import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  LayoutDashboard, Database, ClipboardList, Truck, 
  Receipt, LogOut, Settings, ChevronRight, ShieldCheck 
} from 'lucide-react';

const FinanceSidebar = ({ activeTab, setActiveTab, onLogout }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for new pending requisitions to show the notification badge
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        // Fetching only PENDING requisitions that haven't been viewed
        const res = await API.get('/requisitions/', { 
          params: { status: 'PENDING', is_viewed_by_finance: false } 
        });
        // Adjust based on whether your API returns a 'count' field or a raw array
        const count = res.data.count !== undefined ? res.data.count : res.data.length;
        setUnreadCount(count);
      } catch (err) {
        console.error("Notification sync error", err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard,  },
    { 
      id: 'requisitions', 
      label: 'Requisitions', 
      icon: ClipboardList, 
      badge: unreadCount > 0 ? unreadCount : null 
    },
    { id: 'inventory', label: 'Main Store', icon: Database,  },
    { id: 'vendors', label: 'Suppliers', icon: Truck, },
    { id: 'claims', label: 'Insurance Hub', icon: Receipt,  },
  ];

  return (
    <div className="h-screen w-80 bg-[#020617] text-white flex flex-col p-8 fixed left-0 top-0 shadow-2xl z-50">
      {/* BRANDING */}
      <div className="mb-12 px-2 flex items-center gap-3">
        <div className="bg-teal-500 p-2.5 rounded-xl shadow-lg shadow-teal-500/20">
          <ShieldCheck size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none text-white">
            Salama <span className="text-teal-400">Finance Portal</span>
          </h1>
          
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full group relative flex items-center gap-4 p-5 rounded-[1.5rem] transition-all duration-300 ${
                isActive ? 'bg-white/10 border border-white/10 shadow-xl' : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              {/* Icon Container */}
              <div className={`p-3 rounded-2xl relative transition-all duration-300 ${
                isActive ? 'bg-teal-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-slate-300'
              }`}>
                <Icon size={20} />
                
                {/* WHATSAPP-STYLE NOTIFICATION BADGE */}
                {item.badge && (
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white animate-pulse shadow-lg shadow-rose-500/40">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label & Description */}
              <div className="text-left">
                <p className={`text-xs font-black uppercase tracking-widest ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                }`}>
                  {item.label}
                </p>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter mt-0.5">
                  {item.desc}
                </p>
              </div>

              {isActive && (
                <div className="absolute right-4 animate-in fade-in slide-in-from-left-2">
                  <ChevronRight size={16} className="text-teal-500" />
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <div className="pt-8 border-t border-white/5 space-y-3">
        <button 
          onClick={onLogout} 
          className="w-full flex items-center gap-4 p-5 rounded-3xl bg-rose-500/5 border border-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300 group"
        >
          <LogOut size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default FinanceSidebar;