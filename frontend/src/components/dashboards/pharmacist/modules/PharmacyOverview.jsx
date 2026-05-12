import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Users, Pill, AlertTriangle, TrendingUp, 
  ArrowRight, RefreshCw, Loader2, Package, Activity, Eye
} from 'lucide-react';

const PharmacyOverview = ({ onAction }) => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    lowStock: 0,
    revenue: 0
  });

  // 1. Centralized Data Fetcher
  const fetchData = useCallback(async () => {
    try {
      const [resQueue, resStats] = await Promise.all([
        API.get('/queue/?current_station=PHARMACY'),
        API.get('/pharmacy/analytics/summary/').catch(() => ({ data: {} }))
      ]);

      // Only show patients awaiting medication
      const rawQueue = resQueue.data.results || resQueue.data || [];
      const pendingQueue = rawQueue.filter(p => p.status === 'AWAITING_MEDICATION');
      
      setQueue(pendingQueue);
      setStats({
        pending: pendingQueue.length,
        completed: resStats.data.dispensed_today || 0,
        lowStock: resStats.data.low_stock_items || 0,
        revenue: resStats.data.revenue_today || 0
      });
    } catch (err) {
      console.error("Pharma Sync Error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Real-time Listening: Poll every 10 seconds
  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // 3. Process Logic
  const handleProcessOrder = async (patient) => {
    try {
      // Optimistic UI update
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1)
      }));
      setQueue(prevQueue => prevQueue.filter(p => p.id !== patient.id));

      // Trigger navigation to detailed view
      onAction(patient, 'prescriptions'); 
    } catch (err) {
      console.error("Process error", err);
      onAction(patient, 'prescriptions');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 font-['Inter']">
      
      {/* HIGH-CONTRAST KPI TIER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. Pending Queue */}
        <div className="bg-[#020617] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:border-teal-500/30 transition-all">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
               <Users size={16} className="text-teal-500" />
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Pending Orders</p>
            </div>
            <h4 className="text-5xl font-black text-white italic tracking-tighter">{stats.pending}</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 italic">Awaiting Dispense</p>
          </div>
          <Users size={120} className="absolute -right-8 -bottom-8 text-white/[0.02] group-hover:text-teal-500/[0.05] transition-colors" />
        </div>

        {/* 2. Fulfillment Rate */}
        <div className="bg-[#020617] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
               <Activity size={16} className="text-blue-500" />
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Fulfillment Rate</p>
            </div>
            <h4 className="text-5xl font-black text-white italic tracking-tighter">{stats.completed}</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 italic">Transacted Today</p>
          </div>
          <Pill size={120} className="absolute -right-8 -bottom-8 text-white/[0.02] group-hover:rotate-12 transition-transform" />
        </div>

        {/* 3. Inventory Alerts */}
        <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden group transition-all ${stats.lowStock > 0 ? 'bg-rose-950/20 border-rose-500/30' : 'bg-[#020617] border-white/5'}`}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
               <Package size={16} className={stats.lowStock > 0 ? 'text-rose-500' : 'text-slate-500'} />
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Inventory Alerts</p>
            </div>
            <h4 className={`text-5xl font-black italic tracking-tighter ${stats.lowStock > 0 ? 'text-rose-500' : 'text-white'}`}>{stats.lowStock}</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 italic">Items Below Threshold</p>
          </div>
          <AlertTriangle size={120} className={`absolute -right-8 -bottom-8 ${stats.lowStock > 0 ? 'text-rose-500/[0.08]' : 'text-white/[0.02]'}`} />
        </div>

        {/* 4. Daily Revenue */}
        <div className="bg-[#020617] p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
               <TrendingUp size={16} className="text-emerald-500" />
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Daily Revenue</p>
            </div>
            <div className="flex items-baseline gap-1">
               <span className="text-emerald-500 font-black text-sm uppercase">Ksh</span>
               <h4 className="text-3xl font-black text-white italic tracking-tighter">{stats.revenue.toLocaleString()}</h4>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 text-right italic">Settled Invoices</p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[80px]" />
        </div>
      </div>

      {/* PIPELINE TABLE - REMOVED QUEUE DURATION COLUMN */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.4)]" />
            <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-xl">Prescription Pipeline</h3>
          </div>
          <button onClick={fetchData} className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200 group">
              <RefreshCw size={20} className={`text-slate-400 group-hover:text-teal-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] bg-slate-50/50">
                <th className="px-12 py-8">Patient Identity</th>
                <th className="px-12 py-8">Token</th>
                <th className="px-12 py-8">Clinic Status</th>
                <th className="px-12 py-8 text-right">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && queue.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-32 text-center">
                    <Loader2 className="animate-spin mx-auto text-teal-500" size={40} />
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-4">Syncing Pipeline Data...</p>
                  </td>
                </tr>
              ) : queue.map((patient) => (
                <tr key={patient.id} className="group hover:bg-teal-50/10 transition-all border-l-4 border-l-transparent hover:border-l-teal-500">
                  <td className="px-12 py-10">
                    <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{patient.patient_name}</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest italic">UCRN: {patient.patient_id_no}</p>
                  </td>
                  <td className="px-12 py-10">
                    <span className="bg-slate-900 text-white font-mono font-bold px-4 py-2 rounded-xl text-sm shadow-lg group-hover:bg-teal-600 transition-colors">
                      {patient.token_id}
                    </span>
                  </td>
                  <td className="px-12 py-10">
                    <span className="px-4 py-2 bg-teal-50 text-teal-700 rounded-xl text-[9px] font-black uppercase tracking-widest border border-teal-100/50 shadow-sm">
                      Orders Transmitted
                    </span>
                  </td>
                  <td className="px-12 py-10 text-right">
                    <button 
                      onClick={() => handleProcessOrder(patient)}
                      className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-teal-600 transition-all shadow-xl active:scale-95 ml-auto"
                    >
                      View Prescription <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && queue.length === 0 && (
              <div className="py-40 text-center">
                  <Pill size={64} className="mx-auto mb-6 text-slate-200 opacity-20" />
                  <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-xs italic">
                      Pipeline is currently clear
                  </p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyOverview;