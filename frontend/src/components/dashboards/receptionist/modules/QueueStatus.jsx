import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Users, 
  ArrowRightCircle, 
  Clock, 
  Timer, 
  Search,
  LayoutGrid,
  Activity,
  ChevronDown,
  UserCheck,
  Stethoscope,
  RefreshCcw,
  AlertTriangle
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
    { id: 'RADIOLOGY', label: 'Radiology' },
    { id: 'PSYCHOLOGY', label: 'Psychology' }
  ];

  // 1. Fetch Queue Data (Table)
  const fetchQueueData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let url = '/api/queue/';
      const params = [];
      if (activeStation !== 'ALL') params.push(`current_station=${activeStation}`);
      if (searchTerm) params.push(`search=${searchTerm}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await axios.get(url);
      setQueue(Array.isArray(response.data) ? response.data : (response.data.results || []));
    } catch (err) {
      console.error("Queue Sync Error:", err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [activeStation, searchTerm]);

  // 2. Fetch Analytics Data (KPIs)
  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await axios.get(`/api/queue/analytics/?station=${activeStation}`);
      setAnalytics(response.data);
    } catch (err) {
      console.error("Analytics Sync Error:", err);
    }
  }, [activeStation]);

  useEffect(() => {
    fetchQueueData();
    fetchAnalytics();
    
    // Auto-refresh every 30 seconds for live orchestration
    const interval = setInterval(() => {
      fetchQueueData();
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchQueueData, fetchAnalytics]);

  return (
    <div className="max-w-[1500px] mx-auto space-y-6 pb-20 font-['Plus_Jakarta_Sans'] animate-in fade-in duration-700">
      
      {/* TIER 1: THE TITLE HEADER */}
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
          onClick={fetchQueueData}
          className={`relative z-10 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCcw size={20} className="text-teal-400" />
        </button>

        <Activity className="absolute -right-10 -top-10 text-white/5 w-64 h-64 rotate-12" />
      </div>

      {/* TIER 2: KPI METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><UserCheck size={24} /></div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Today's Registered</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{analytics.today_total}</p>
            </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm relative">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-slate-900 text-white rounded-2xl z-10"><Stethoscope size={24} /></div>
            <select 
              value={activeStation}
              onChange={(e) => setActiveStation(e.target.value)}
              className="w-full h-full pl-16 pr-4 bg-transparent font-black text-slate-900 text-sm uppercase tracking-wider outline-none appearance-none cursor-pointer"
            >
              {stations.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5">
            <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl"><Users size={24} /></div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">In Station Queue</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{analytics.station_queue}</p>
            </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Timer size={24} /></div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg. Wait</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{analytics.avg_wait_time}</p>
            </div>
        </div>
      </div>

      {/* TIER 3: THE DATA TABLE */}
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
          
          <div className="flex gap-2">
            {['ALL', 'TRIAGE', 'DOCTOR', 'LAB'].map((sid) => (
              <button 
                key={sid}
                onClick={() => setActiveStation(sid)}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
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
                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {!loading && queue.map((item) => (
                <tr key={item.id} className="group hover:bg-teal-50/20 transition-all">
                  <td className="px-12 py-8 font-black text-teal-600 text-sm italic underline decoration-teal-100 decoration-4 underline-offset-4">
                    {item.token_id}
                  </td>
                  <td className="px-12 py-8">
                    <p className="font-black text-slate-900 text-base uppercase mb-1">{item.patient_name}</p>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase ${
                      item.priority === 'HIGH' || item.priority === 'EMERGENCY' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.priority} Priority
                    </span>
                  </td>
                  <td className="px-12 py-8">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
                      <span className="font-black text-[11px] text-slate-700 uppercase tracking-widest">{item.station_display}</span>
                    </div>
                  </td>
                  <td className="px-12 py-8">
                    <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border-2 ${
                      item.status === 'WAITING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      {item.status_display}
                    </span>
                  </td>
                  <td className="px-12 py-8 font-bold text-slate-400 text-sm">
                    <div className="flex items-center gap-3">
                       <Clock size={16} className="text-slate-300" /> 
                       <span>{item.wait_time} <small className="text-[10px] text-slate-300 uppercase">Min</small></span>
                    </div>
                  </td>
                  <td className="px-12 py-8 text-right">
                    <button className="p-4 bg-white border-2 border-slate-100 text-slate-900 rounded-[1.2rem] hover:bg-slate-900 hover:text-white transition-all shadow-sm group">
                      <ArrowRightCircle size={22} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(loading || queue.length === 0) && (
            <div className="p-32 text-center flex flex-col items-center">
              {loading ? (
                <RefreshCcw className="text-teal-500 animate-spin mb-4" size={48} />
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