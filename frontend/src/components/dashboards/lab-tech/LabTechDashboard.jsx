import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  FlaskConical, Clock, CheckCircle2, AlertCircle, 
  Beaker, Users, ArrowRight, Search, RefreshCcw, Loader2, Microscope,
  Activity //
} from 'lucide-react';


import LabSidebar from './LabSidebar';
import DiagnosticWorklist from './modules/DiagnosticWorklist';
import ResultEntry from './modules/ResultEntry';
import PatientHistory from './modules/PatientHistory';
import ReportingEngine from './modules/ReportingEngine';

const LabTechDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0, onc_panels: 0, completed: 0, critical: 0
  });

  const fetchLabData = useCallback(async () => {
    try {
      const [resQueue, resAnalytics] = await Promise.all([
        API.get('/queue/?current_station=LAB'),
        API.get('/queue/analytics/?station=LAB')
      ]);
      setQueue(resQueue.data.results || resQueue.data);
      
      setStats({
        pending: resAnalytics.data.station_queue || 0,
        onc_panels: 18, 
        completed: 28, 
        critical: 2
      });
    } catch (err) {
      console.error("Lab Sync Error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabData();
    const interval = setInterval(fetchLabData, 15000);
    return () => clearInterval(interval);
  }, [fetchLabData]);

  const handleProcessPatient = async (queueId) => {
    try {
      await API.post(`/queue/${queueId}/move_next/`);
      fetchLabData();
    } catch (err) {
      alert("Flow Error: Ensure results are entered before moving.");
    }
  };

  const renderModule = () => {
    switch (activeTab) {
      case 'worklist': return <DiagnosticWorklist />;
      case 'entry': return <ResultEntry />;
      case 'history': return <PatientHistory />;
      case 'reporting': return <ReportingEngine />;
      default: return (
        <div className="space-y-10">
          {/* KPI TIER: ONCOLOGY SPECIFIC TRACKERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Queue Volume */}
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group hover:border-teal-500/30 transition-all">
              <div className="relative z-10">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Clock size={12} className="text-teal-500" /> Pending Worklist
                </p>
                <h4 className="text-4xl font-black text-white italic">{stats.pending}</h4>
              </div>
              <FlaskConical className="absolute -right-4 -bottom-4 text-white/5 w-24 h-24 group-hover:rotate-12 transition-transform" />
            </div>

            {/* 2. Oncology Common Tests (Replaced Urgent STAT) */}
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group hover:border-blue-500/30 transition-all">
              <div className="relative z-10">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Microscope size={12} className="text-blue-400" /> CBC / Onc. Panels
                </p>
                <h4 className="text-4xl font-black text-blue-400 italic">{stats.onc_panels}</h4>
              </div>
              <Activity className="absolute -right-4 -bottom-4 text-white/5 w-24 h-24 group-hover:scale-110 transition-transform" />
            </div>

            {/* 3. Throughput */}
            <div className="bg-teal-600/20 p-8 rounded-[2.5rem] border border-teal-500/20 relative overflow-hidden group hover:border-teal-500/50 transition-all">
              <div className="relative z-10">
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <CheckCircle2 size={12} /> Results Dispatched
                </p>
                <h4 className="text-4xl font-black text-white italic">{stats.completed}</h4>
              </div>
              <CheckCircle2 className="absolute -right-4 -bottom-4 text-teal-500/10 w-24 h-24" />
            </div>

            {/* 4. Safety Monitor */}
            <div className="bg-red-600/10 p-8 rounded-[2.5rem] border border-red-500/20 relative overflow-hidden group hover:border-red-500/50 transition-all">
              <div className="relative z-10">
                <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertCircle size={12} /> Critical Path
                </p>
                <h4 className="text-4xl font-black text-white italic">{stats.critical}</h4>
              </div>
              <Beaker className="absolute -right-4 -bottom-4 text-red-500/10 w-24 h-24" />
            </div>
          </div>

          {/* LIVE LAB WORKLIST TABLE */}
          <div className="bg-white/5 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse" />
                <h3 className="font-black text-white uppercase italic tracking-tighter text-lg">Queue</h3>
              </div>
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input className="bg-slate-900 border-none rounded-xl py-2 pl-10 pr-4 text-xs font-bold outline-none focus:ring-1 focus:ring-teal-500 text-white" placeholder="Search Patient..." />
                 </div>
                 <button onClick={fetchLabData} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                    <RefreshCcw size={18} className="text-slate-400" />
                 </button>
              </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    <th className="px-10 py-6">Identity</th>
                    <th className="px-10 py-6">Flow Token</th>
                    <th className="px-10 py-6">Wait Duration</th>
                    <th className="px-10 py-6">Live Status</th>
                    <th className="px-10 py-6 text-right">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-20 text-center">
                        <Loader2 className="animate-spin text-teal-500 mx-auto" size={32} />
                      </td>
                    </tr>
                  ) : queue.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.03] transition-all group">
                      <td className="px-10 py-6">
                        <p className="font-black text-white text-sm uppercase tracking-tight">{p.patient_name}</p>
                        <p className="text-[10px] font-bold text-slate-500">#{p.patient_id_no}</p>
                      </td>
                      <td className="px-10 py-6 font-black text-teal-500 italic text-sm">
                        {p.token_id}
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase">
                          <Clock size={14} className={p.wait_time > 45 ? 'text-red-400' : 'text-slate-500'} /> 
                          <span className={p.wait_time > 45 ? 'text-red-400' : ''}>{p.wait_time}m</span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          p.status === 'WAITING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-teal-500/10 text-teal-500 border-teal-500/20'
                        }`}>
                          {p.status_display}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2">
                           <button className="bg-white/5 hover:bg-blue-500 p-2.5 rounded-xl transition-all" title="Input Result Values">
                              <FlaskConical size={16} />
                           </button>
                           <button 
                            onClick={() => handleProcessPatient(p.id)}
                            className="bg-[#020617] text-teal-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-teal-600 hover:text-white transition-all shadow-lg"
                           >
                            Return to Doctor <ArrowRight size={14} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && queue.length === 0 && (
                 <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs italic">
                    <Microscope size={40} className="mx-auto mb-4 opacity-20" />
                    No active samples in the worklist.
                 </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-200">
      <LabSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              Salama <span className="text-teal-500 underline decoration-2 underline-offset-8">Lab Hub</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium tracking-tight">Oncology Diagnostics Module</p>
          </div>
          
          <div className="flex items-center space-x-4 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-xl">
             <div className="text-right px-2">
               <p className="text-xs font-bold text-white uppercase">Lab Specialist</p>
               <p className="text-[10px] text-teal-500 font-black tracking-widest uppercase">Unit Alpha-01</p>
             </div>
             <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center font-black text-white text-xs">
               CK
             </div>
          </div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {renderModule()}
        </section>
      </main>
    </div>
  );
};

export default LabTechDashboard;