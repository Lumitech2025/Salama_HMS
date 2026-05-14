import React from 'react';
import { Wallet, Activity, Receipt, Box, ArrowUpRight, ChevronRight } from 'lucide-react';

const FinanceDashboard = () => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* KPI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Monthly Revenue', val: 'KES 2.5M', icon: Wallet, color: 'text-teal-600', trend: '+14%' },
          { label: 'Current OpEx', val: 'KES 890K', icon: Activity, color: 'text-rose-600', trend: '-2%' },
          { label: 'Insurance Claims', val: 'KES 1.2M', icon: Receipt, color: 'text-blue-600', trend: 'Pending' },
          { label: 'Reagent Assets', val: 'KES 450K', icon: Box, color: 'text-amber-600', trend: 'In Stock' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all">
             <div className={`p-4 rounded-2xl w-fit mb-6 bg-slate-50 ${card.color}`}><card.icon size={26} /></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
             <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{card.val}</h3>
             <div className="mt-4 text-[9px] font-bold text-teal-600 flex items-center gap-1 uppercase tracking-widest">
               <ArrowUpRight size={14} /> {card.trend} vs last month
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* GRAPH COLUMN */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[3.5rem] p-10 shadow-2xl min-h-[500px]">
          <div className="flex justify-between items-center mb-10">
            <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Annual Financial Trajectory</h4>
            <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-2 text-teal-500"><div className="w-2 h-2 bg-teal-500 rounded-full"/> Revenue</span>
                <span className="flex items-center gap-2 text-rose-500"><div className="w-2 h-2 bg-rose-500 rounded-full"/> Expenses</span>
            </div>
          </div>
          {/* Chart logic here */}
          <div className="h-72 flex items-end justify-between gap-3 px-4 pt-20">
             {[45, 60, 55, 80, 70, 95, 85, 60, 75, 90, 80, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="w-full bg-slate-50 rounded-t-xl h-full flex flex-col justify-end overflow-hidden">
                        <div className="w-full bg-teal-500/20 group-hover:bg-teal-500 transition-all cursor-pointer" style={{ height: `${h}%` }} />
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase italic">Month {i+1}</span>
                </div>
             ))}
          </div>
        </div>

        {/* REQUISITION MINI-TABLE */}
        <div className="lg:col-span-4 bg-[#020617] rounded-[3.5rem] p-10 shadow-2xl text-white">
          <h4 className="text-xl font-black uppercase italic tracking-tighter text-teal-400 mb-8">Recent Requisitions</h4>
          <div className="space-y-4">
            {[
              { id: 'RQ-882', item: 'REAGENTS', dept: 'LAB DEPT', cost: '120k', status: 'PENDING' },
              { id: 'RQ-881', item: 'SYRINGES', dept: 'NURSE DEPT', cost: '5k', status: 'URGENT' },
              { id: 'RQ-879', item: 'CONTRAST', dept: 'RAD DEPT', cost: '18k', status: 'NORMAL' },
            ].map((req, i) => (
              <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-3xl group hover:bg-white/10 transition-all">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">{req.id}</span>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-md ${req.status === 'URGENT' ? 'bg-rose-500' : 'bg-slate-700'}`}>{req.status}</span>
                </div>
                <p className="font-black text-sm uppercase italic tracking-tight">{req.item}</p>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{req.dept}</span>
                    <span className="text-sm font-black italic">KES {req.cost}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 bg-teal-600 hover:bg-teal-500 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">Open Requisition Hub</button>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;