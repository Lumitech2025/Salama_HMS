import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Users, Search, LayoutGrid, Activity, ChevronDown, 
  Stethoscope, RefreshCcw, AlertTriangle, Loader2, UserPlus, Timer, Clock
} from 'lucide-react';

const QueueStatus = () => {
  const [activeStation, setActiveStation] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [queue, setQueue] = useState([]);
  const [analytics, setAnalytics] = useState({ today_total: 0, station_queue: 0, avg_wait_time: '0m' });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    <div className="max-w-[1500px] mx-auto space-y-8 pb-20 font-['Inter'] animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="bg-[#020617] p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center border border-white/5 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-teal-500 p-4 rounded-[1.5rem] text-white shadow-lg">
             <LayoutGrid size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase">
                Salama <span className="text-teal-400">Monitor</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2">
                Live Clinical Distribution Center
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
        <KpiItem icon={<UserPlus size={22} />} label="Registered" value={analytics.today_total} color="blue" />
        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm relative group transition-all hover:shadow-md">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 p-3.5 bg-slate-900 text-white rounded-2xl z-10 group-hover:bg-teal-500 transition-colors">
                <Stethoscope size={22} />
            </div>
            <select 
              value={activeStation}
              onChange={(e) => { setLoading(true); setActiveStation(e.target.value); }}
              className="w-full h-full pl-16 pr-4 bg-transparent font-black text-slate-900 text-[11px] uppercase tracking-widest outline-none appearance-none cursor-pointer"
            >
              {stations.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <KpiItem icon={<Users size={22} />} label="Station Queue" value={analytics.station_queue} color="teal" />
        <KpiItem icon={<Timer size={22} />} label="Avg Wait" value={analytics.avg_wait_time} color="amber" />
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-xl overflow-hidden mx-2">
        <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-white">
          <div className="relative w-full md:w-[450px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search Identity or Token..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-[1.5rem] py-4 pl-16 pr-6 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Token ID</th>
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Identity</th>
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Station</th>
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.isArray(queue) && queue.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                  <td className="px-12 py-8 font-black text-teal-600 text-sm italic underline decoration-teal-100 decoration-4 underline-offset-8">
                    #{item.token_id}
                  </td>
                  <td className="px-12 py-8">
                    <p className="font-black text-slate-900 text-base uppercase tracking-tight">{item.patient_name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.patient_id_no}</p>
                  </td>
                  <td className="px-12 py-8 text-center">
                    <span className="bg-[#020617] text-teal-400 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-lg inline-block">
                        {item.station_display}
                    </span>
                  </td>
                  <td className="px-12 py-8 text-right">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                        item.status === 'WAITING' ? 'text-amber-500 animate-pulse' : 
                        item.status === 'IN_PROGRESS' ? 'text-blue-600' : 'text-teal-600'
                    }`}>
                        {item.status_display}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(loading || queue.length === 0) && (
            <div className="py-40 text-center flex flex-col items-center">
              {loading ? (
                <Loader2 className="text-teal-500 animate-spin mb-4" size={40} />
              ) : (
                <AlertTriangle className="text-slate-200 mb-4" size={48} />
              )}
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
                {loading ? "Rebuilding Monitor..." : "Station is currently empty"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KpiItem = ({ icon, label, value, color }) => {
    const bgMap = { blue: "bg-blue-50 text-blue-600", teal: "bg-teal-50 text-teal-600", amber: "bg-amber-50 text-amber-600" };
    return (
        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
            <div className={`p-4 rounded-2xl ${bgMap[color]}`}>{icon}</div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-3xl font-black text-slate-900 leading-none italic">{value}</p>
            </div>
        </div>
    );
};

export default QueueStatus;