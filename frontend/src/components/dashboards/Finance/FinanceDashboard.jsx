import React, { useState, useEffect } from 'react';
import { Wallet, Activity, Receipt, Box, ArrowUpRight, Clock, Loader2 } from 'lucide-react';

const FinanceDashboard = ({ setActiveTab }) => {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const getAuthHeaders = () => {
    const token = 
      localStorage.getItem('access_token') || 
      localStorage.getItem('access') || 
      localStorage.getItem('salama_access_token') || 
      localStorage.getItem('token') || 
      localStorage.getItem('accessToken');

    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  useEffect(() => {
    const fetchRecentRequisitions = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/requisitions/', { headers: getAuthHeaders() });
        if (response.ok) {
          const data = await response.json();
          const rawList = data.results || data || [];
          setRequisitions(rawList.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed syncing live state tracking log vectors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentRequisitions();
  }, []);

  // Standardizer helper to redirect to the active side-panel route safely
  const handleNavigationToHub = () => {
    if (typeof setActiveTab === 'function') {
      // Lowercase fallback if your primary layout state matches standard path strings
      setActiveTab('requisitions'); 
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-['Inter']">
      
      {/* 1. KPI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Monthly Revenue', val: 'KES 2.5M', icon: Wallet, color: 'text-teal-600', trend: '+14%', trendColor: 'text-teal-600' },
          { label: 'Current OpEx', val: 'KES 890K', icon: Activity, color: 'text-rose-600', trend: '-2%', trendColor: 'text-teal-600' },
          { label: 'Insurance Claims', val: 'KES 1.2M', icon: Receipt, color: 'text-blue-600', trend: 'Pending', trendColor: 'text-blue-600' },
          { label: 'Reagent Assets', val: 'KES 450K', icon: Box, color: 'text-amber-600', trend: 'In Stock', trendColor: 'text-amber-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all text-left">
             <div className={`p-4 rounded-2xl w-fit mb-6 bg-slate-50 ${card.color}`}><card.icon size={26} /></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{card.label}</p>
             <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{card.val}</h3>
             <div className={`mt-4 text-[9px] font-black ${card.trendColor} flex items-center gap-1 uppercase tracking-widest`}>
               <ArrowUpRight size={14} /> {card.trend} <span className="text-slate-400 font-bold ml-1">vs last month</span>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 2. ANALYTICS GRAPH */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[3.5rem] p-10 shadow-2xl min-h-[450px] flex flex-col text-left">
          <div className="flex justify-between items-center mb-8">
            <div>
                <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Annual Financial <span className="text-teal-600">Trajectory</span></h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-1 text-left">Revenue vs Expenses Performance</p>
            </div>
            <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-2 text-teal-500"><div className="w-2.5 h-2.5 bg-teal-500 rounded-full"/> Revenue</span>
                <span className="flex items-center gap-2 text-rose-500"><div className="w-2.5 h-2.5 bg-rose-500 rounded-full"/> Expenses</span>
            </div>
          </div>
          
          <div className="flex-1 flex items-end justify-between gap-3 px-2 pt-6">
             {[45, 60, 55, 80, 70, 95, 85, 60, 75, 90, 80, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="w-full bg-slate-50 rounded-2xl h-48 flex flex-col justify-end overflow-hidden">
                        <div className="w-full bg-teal-500/10 group-hover:bg-teal-500 transition-all cursor-pointer" style={{ height: `${h}%` }} />
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase italic tracking-tighter">{months[i]}</span>
                </div>
             ))}
          </div>
        </div>

        {/* 3. REQUISITION SIDEBAR */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[3.5rem] p-10 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 rounded-xl text-teal-600"><Clock size={20}/></div>
                <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Recent <span className="text-teal-600">Requisitions</span></h4>
              </div>
              {loading && <Loader2 size={16} className="animate-spin text-teal-600" />}
            </div>
            
            <div className="space-y-4">
              {!loading && requisitions.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center text-xs font-medium text-slate-400">
                  No active funding demands found inside the pipeline registries.
                </div>
              ) : (
                requisitions.map((req, i) => {
                  const displayId = req.id ? `RQ-${req.id}` : `RQ-00${i + 1}`;
                  const rawTitle = req.title || (req.items && req.items[0]?.non_inventory_title) || 'Direct Allocation';
                  const displayItem = rawTitle.replace(/\[.*?\]\s*/g, '');
                  const departmentLabel = req.dept || req.department || 'GENERAL';
                  const numericCost = req.requested_amount || req.total_cost || req.total || 0;
                  const currentStatus = req.status || 'PENDING';

                  return (
                    <div key={req.id || i} className="bg-slate-50/60 border border-slate-100 p-6 rounded-[2.5rem] group hover:bg-slate-100/80 transition-all text-left">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em]">{displayId}</span>
                        <span className={`text-[8px] font-black px-3 py-1 rounded-lg tracking-widest uppercase ${
                          currentStatus === 'APPROVED' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : currentStatus === 'REJECTED' 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {currentStatus}
                        </span>
                      </div>
                      <p className="font-black text-base uppercase italic tracking-tight text-slate-800 line-clamp-1 leading-none mb-4">
                        {displayItem}
                      </p>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-200/60">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{departmentLabel} DEPT</span>
                        <span className="text-sm font-black italic text-slate-900">
                          KES {parseFloat(numericCost).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <button 
            onClick={handleNavigationToHub}
            className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-teal-400 py-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-md active:scale-95"
          >
            Open Requisition Hub
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;