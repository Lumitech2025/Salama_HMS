import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  FlaskConical, Clock, CheckCircle2, AlertCircle, 
  Beaker, Users, ArrowRight, Search, RefreshCcw, Loader2, Microscope,
  Activity, LayoutGrid, Layers
} from 'lucide-react';

import LabSidebar from './LabSidebar';
import DiagnosticWorklist from './modules/DiagnosticWorklist';
import PatientHistory from './modules/PatientHistory';
import LabReference from './modules/LabReference';
import LabInventory from './modules/LabInventory';

const LabTechDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0, 
    todays_patients: 0, 
    total_individual_tests: 0
  });

  const fetchLabData = useCallback(async () => {
    try {
      const [resQueue, resAnalytics] = await Promise.all([
        API.get('/queue/?current_station=LAB&status=WAITING'),
        API.get('/queue/analytics/?station=LAB')
      ]);
      
      setQueue(resQueue.data.results || resQueue.data);
      
      // We map the analytics from the backend
      setStats({
        pending: resAnalytics.data.station_queue || 0,
        todays_patients: resAnalytics.data.today_total || 0, 
        // This would be a sum of all test lines across all patients today
        total_individual_tests: resAnalytics.data.total_tests_count || 142 
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
      case 'diagnostics': return <DiagnosticWorklist />;
      case 'history': return <PatientHistory />;
      case 'reference': return <LabReference />;
      case 'inventory': return <LabInventory />;
      default: return (
        <div className="space-y-10">
          {/* KPI TIER: UPDATED LAB METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* 1. Pending Tests (In Queue) */}
            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 relative overflow-hidden group hover:border-teal-500/30 transition-all shadow-2xl">
              <div className="relative z-10">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Clock size={14} className="text-teal-500" /> Pending Worklist
                </p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-6xl font-black text-white italic tracking-tighter">{stats.pending}</h4>
                  <span className="text-slate-500 text-xs font-bold uppercase">Patients</span>
                </div>
              </div>
              <FlaskConical className="absolute -right-6 -bottom-6 text-white/5 w-32 h-32 group-hover:rotate-12 transition-transform" />
            </div>

            {/* 2. Today's Tests (Patient Count) */}
            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 relative overflow-hidden group hover:border-blue-500/30 transition-all shadow-2xl">
              <div className="relative z-10">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Users size={14} className="text-blue-400" /> Today's Admissions
                </p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-6xl font-black text-white italic tracking-tighter">{stats.todays_patients}</h4>
                  <span className="text-slate-500 text-xs font-bold uppercase">Processed</span>
                </div>
              </div>
              <Activity className="absolute -right-6 -bottom-6 text-white/5 w-32 h-32 group-hover:scale-110 transition-transform" />
            </div>

            {/* 3. Total Individual Tests (Specific Count) */}
            <div className="bg-teal-600/10 p-10 rounded-[3rem] border border-teal-500/20 relative overflow-hidden group hover:border-teal-500/50 transition-all shadow-2xl">
              <div className="relative z-10">
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Layers size={14} /> Aggregate Tests Done
                </p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-6xl font-black text-white italic tracking-tighter">{stats.total_individual_tests}</h4>
                  <span className="text-teal-500 text-xs font-bold uppercase tracking-tighter">Units</span>
                </div>
              </div>
              <Beaker className="absolute -right-6 -bottom-6 text-teal-500/10 w-32 h-32" />
            </div>
          </div>

          {/* LIVE QUEUE TABLE */}
          <div className="bg-white/5 rounded-[3.5rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-10 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(20,184,166,0.5)]" />
                <h3 className="font-black text-white uppercase italic tracking-tighter text-xl">Live Lab Queue</h3>
              </div>
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input className="bg-slate-900 border-none rounded-2xl py-3 pl-12 pr-6 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 text-white w-80 transition-all" placeholder="Filter by Name or Token..." />
                 </div>
                 <button onClick={fetchLabData} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
                    <RefreshCcw size={20} className="text-teal-400" />
                 </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] bg-slate-900/50">
                    <th className="px-12 py-8">Patient Identity</th>
                    <th className="px-12 py-8">Flow Token</th>
                    <th className="px-12 py-8">Wait Time</th>
                    <th className="px-12 py-8 text-right">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="py-32 text-center">
                        <Loader2 className="animate-spin text-teal-500 mx-auto" size={48} />
                        <p className="mt-4 text-slate-500 font-black uppercase text-[10px] tracking-widest">Syncing worklist...</p>
                      </td>
                    </tr>
                  ) : queue.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.03] transition-all group">
                      <td className="px-12 py-10">
                        <p className="font-black text-white text-lg uppercase tracking-tight group-hover:text-teal-400 transition-colors">{p.patient_name}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1">Registry ID: #{p.patient_id_no}</p>
                      </td>
                      <td className="px-12 py-10">
                        <span className="bg-slate-900 text-teal-500 font-black italic px-4 py-2 rounded-xl border border-teal-500/20 text-sm">
                          {p.token_id}
                        </span>
                      </td>
                      <td className="px-12 py-10">
                        <div className="flex items-center gap-3 text-slate-400 font-black text-sm uppercase">
                          <Clock size={16} className={p.wait_time > 45 ? 'text-red-400' : 'text-slate-500'} /> 
                          <span className={p.wait_time > 45 ? 'text-red-400 animate-pulse' : ''}>{p.wait_time} Minutes</span>
                        </div>
                      </td>
                      <td className="px-12 py-10 text-right">
                        <div className="flex justify-end gap-3">
                           <button 
                            onClick={() => setActiveTab('diagnostics')}
                            className="bg-white/5 hover:bg-teal-500 p-4 rounded-2xl transition-all border border-white/5 group" 
                            title="Input Result Values"
                           >
                              <Microscope size={20} className="group-hover:scale-110 transition-transform" />
                           </button>
                           <button 
                            onClick={() => handleProcessPatient(p.id)}
                            className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 hover:bg-teal-600 transition-all shadow-xl"
                           >
                            Finalize & Release <ArrowRight size={16} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && queue.length === 0 && (
                 <div className="py-32 text-center">
                    <Microscope size={64} className="mx-auto mb-6 text-slate-800 opacity-20" />
                    <p className="text-slate-500 font-black uppercase tracking-[0.5em] text-xs italic">
                        Worklist clear. No active samples.
                    </p>
                 </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-teal-500/30">
      <LabSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 p-12 overflow-y-auto custom-scrollbar">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-16 gap-8">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              Salama <span className="text-teal-500 underline decoration-4 underline-offset-[12px]">Lab Hub</span>
            </h1>
            <p className="text-slate-500 text-sm mt-4 font-bold tracking-[0.2em] uppercase">Oncology Diagnostic Command Center</p>
          </div>
          
          <div className="flex items-center space-x-6 bg-white/5 p-4 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-md">
             <div className="text-right px-2">
               <p className="text-xs font-black text-white uppercase tracking-widest">Lab Specialist</p>
               <p className="text-[10px] text-teal-500 font-black tracking-[0.3em] uppercase mt-1 italic">Unit Alpha-01</p>
             </div>
             <div className="w-14 h-14 bg-teal-500 rounded-[1.2rem] flex items-center justify-center font-black text-white text-sm shadow-xl shadow-teal-500/20">
               CK
             </div>
          </div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
          {renderModule()}
        </section>
      </main>
    </div>
  );
};

export default LabTechDashboard;