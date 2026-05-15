import React from 'react';
import { Wallet, Activity, Receipt, Box, ArrowUpRight, Clock } from 'lucide-react';

const FinanceDashboard = ({ setActiveTab }) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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
        
        {/* 2. ANALYTICS GRAPH - Reduced Height */}
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
          
          {/* Chart logic - Standardized bars with Month Names */}
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
        <div className="lg:col-span-4 bg-[#020617] rounded-[3.5rem] p-10 shadow-2xl text-white flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400"><Clock size={20}/></div>
            <h4 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">Recent <span className="text-teal-500">Requisitions</span></h4>
          </div>
          
          <div className="space-y-4 flex-1">
            {[
              { id: 'RQ-882', item: 'REAGENTS', dept: 'LAB DEPT', cost: '120,000', status: 'PENDING' },
              { id: 'RQ-881', item: 'SYRINGES', dept: 'NURSE DEPT', cost: '5,000', status: 'URGENT' },
              { id: 'RQ-879', item: 'CONTRAST', dept: 'RAD DEPT', cost: '18,500', status: 'NORMAL' },
            ].map((req, i) => (
              <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-[2.5rem] group hover:bg-white/10 transition-all text-left">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.2em]">{req.id}</span>
                    <span className={`text-[8px] font-black px-3 py-1 rounded-lg tracking-widest ${req.status === 'URGENT' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{req.status}</span>
                </div>
                <p className="font-black text-base uppercase italic tracking-tight leading-none mb-4">{req.item}</p>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{req.dept}</span>
                    <span className="text-xs font-black italic text-teal-400">KES {req.cost}</span>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => setActiveTab('requisitions')}
            className="w-full mt-8 bg-teal-600 hover:bg-teal-500 py-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl shadow-teal-900/20 active:scale-95"
          >
            Open Requisition Hub
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;