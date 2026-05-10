import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Users, ArrowRightCircle, Clock, Timer, Search, LayoutGrid,
  Activity, ChevronDown, UserCheck, Stethoscope, RefreshCcw, 
  AlertTriangle, Loader2, ArrowRight, UserPlus // 👈 Fixed: Added UserPlus and ArrowRight here
} from 'lucide-react';

const QueueStatus = () => {
  const [activeStation, setActiveStation] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [queue, setQueue] = useState([]);
  const [analytics, setAnalytics] = useState({ today_total: 0, station_queue: 0, avg_wait_time: '0m' });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const stations = [
    { id: 'ALL', label: 'All Stations' },
    { id: 'REGISTRATION', label: 'Registration' },
    { id: 'TRIAGE', label: 'Triage Station' },
    { id: 'DOCTOR', label: 'Consultation' },
    { id: 'LAB', label: 'Laboratory' },
    { id: 'PHARMACY', label: 'Pharmacy' },
    { id: 'BILLING', label: 'Billing/Discharge' }
  ];

  const fetchQueueData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = {};
      if (activeStation !== 'ALL') params.current_station = activeStation;
      if (searchTerm) params.search = searchTerm;
      
      const response = await API.get('/queue/', { params });
      const data = response.data.results || response.data;
      setQueue(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Queue Sync Error:", err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [activeStation, searchTerm]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await API.get(`/queue/analytics/`, {
          params: { station: activeStation }
      });
      setAnalytics(response.data);
    } catch (err) {
      console.error("Analytics Sync Error:", err);
    }
  }, [activeStation]);

  const handleAdvance = async (item) => {
    const nextStationMap = {
        'REGISTRATION': 'TRIAGE',
        'TRIAGE': 'DOCTOR',
        'DOCTOR': 'LAB/PHARMACY',
        'PHARMACY': 'BILLING',
        'BILLING': 'COMPLETED'
    };

    const next = nextStationMap[item.current_station] || 'Next Station';
    if (!window.confirm(`Advance ${item.patient_name} to ${next}?`)) return;
    
    setActionLoading(item.id);
    try {
        await API.post(`/queue/${item.id}/move_next/`);
        await Promise.all([fetchQueueData(), fetchAnalytics()]);
    } catch (err) {
        alert("Flow Control Error: Patient must complete current assessment first.");
    } finally {
        setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchQueueData();
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchQueueData();
      fetchAnalytics();
    }, 15000); 
    return () => clearInterval(interval);
  }, [fetchQueueData, fetchAnalytics]);

  return (
    <div className="max-w-[1500px] mx-auto space-y-6 pb-20 font-['Plus_Jakarta_Sans'] animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="bg-[#020617] p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center border border-white/5 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-teal-500 p-4 rounded-[1.5rem] text-white shadow-lg">
             <LayoutGrid size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">
                Salama <span className="text-teal-400">Monitor</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-1">
                Real-Time Clinical Flow Control
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => { setLoading(true); fetchQueueData(); }}
          className={`relative z-10 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all ${isRefreshing ? 'opacity-50' : ''}`}
        >
          <RefreshCcw size={20} className={`text-teal-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <Activity className="absolute -right-10 -top-10 text-white/5 w-64 h-64 rotate-12" />
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><UserPlus size={24} /></div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Today's Registered</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{analytics.today_total || 0}</p>
            </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm relative group transition-all hover:shadow-md">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-slate-900 text-white rounded-2xl z-10 group-hover:bg-teal-500 transition-colors">
                <Stethoscope size={24} />
            </div>
            <select 
              value={activeStation}
              onChange={(e) => { setLoading(true); setActiveStation(e.target.value); }}
              className="w-full h-full pl-16 pr-4 bg-transparent font-black text-slate-900 text-sm uppercase tracking-wider outline-none appearance-none cursor-pointer"
            >
              {stations.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
            <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl"><Users size={24} /></div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">In Station Queue</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{analytics.station_queue || 0}</p>
            </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Timer size={24} /></div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg. Wait</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{analytics.avg_wait_time || '0m'}</p>
            </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/30">
          <div className="relative w-full md:w-[450px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search Patient or Token..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 pl-16 pr-6 text-sm font-bold outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
            {['ALL', 'TRIAGE', 'DOCTOR', 'LAB', 'PHARMACY'].map((sid) => (
              <button 
                key={sid}
                onClick={() => { setLoading(true); setActiveStation(sid); }}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${
                  activeStation === sid ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                {sid}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase">Token ID</th>
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase">Patient</th>
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase">Current Station</th>
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase">Live Status</th>
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase">Wait Time</th>
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase text-right">Flow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Array.isArray(queue) && queue.map((item) => (
                <tr key={item.id} className="group hover:bg-teal-50/20 transition-all animate-in slide-in-from-left-2">
                  <td className="px-12 py-8 font-black text-teal-600 text-sm italic underline decoration-teal-100 decoration-4 underline-offset-4">
                    #{item.token_id}
                  </td>
                  <td className="px-12 py-8">
                    <p className="font-black text-slate-900 text-base uppercase mb-1">{item.patient_name}</p>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase ${
                      item.priority === 'EMERGENCY' ? 'bg-red-600 text-white animate-pulse' : 
                      item.priority === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.priority} Priority
                    </span>
                  </td>
                  <td className="px-12 py-8">
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          item.current_station === 'TRIAGE' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          item.current_station === 'DOCTOR' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-teal-50 text-teal-600 border-teal-100'
                      }`}>
                        {item.station_display}
                      </span>
                    </div>
                  </td>
                  <td className="px-12 py-8">
                    <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border-2 ${
                      item.status === 'WAITING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                      item.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                      'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {item.status_display}
                    </span>
                  </td>
                  <td className="px-12 py-8 font-bold text-slate-400 text-sm">
                    <div className="flex items-center gap-3">
                       <Clock size={16} className={item.wait_time > 30 ? 'text-red-400' : 'text-slate-300'} /> 
                       <span className={item.wait_time > 30 ? 'text-red-500 font-black' : 'font-black'}>
                           {item.wait_time} <small className="text-[10px] opacity-60 uppercase">Min</small>
                       </span>
                    </div>
                  </td>
                  <td className="px-12 py-8 text-right">
                    <button 
                        onClick={() => handleAdvance(item)}
                        disabled={actionLoading === item.id}
                        className="p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-[1.2rem] hover:bg-slate-900 hover:text-white transition-all shadow-sm group disabled:opacity-50"
                    >
                      {actionLoading === item.id ? (
                          <Loader2 size={22} className="animate-spin" />
                      ) : (
                          <ArrowRightCircle size={22} className="group-hover:translate-x-1 transition-transform" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(loading || queue.length === 0) && (
            <div className="p-32 text-center flex flex-col items-center">
              {loading ? (
                <Loader2 className="text-teal-500 animate-spin mb-4" size={48} />
              ) : (
                <div className="bg-slate-50 p-8 rounded-full mb-4">
                  <AlertTriangle className="text-slate-200" size={48} />
                </div>
              )}
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em]">
                {loading ? "Synchronizing Live Data..." : "Station is Currently Clear"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueStatus;