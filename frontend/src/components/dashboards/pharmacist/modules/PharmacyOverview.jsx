import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Users, Pill, AlertTriangle, TrendingUp, 
  RefreshCw, Loader2, Package, Eye
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

  // Centralized Data Fetcher
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch queue items safely
      const resQueue = await API.get('/queue/?current_station=PHARMACY');
      const rawQueue = resQueue.data.results || resQueue.data || [];
      
      // Filter: Handles both backend station assignments safely
      const pendingQueue = rawQueue.filter(p => 
        p.current_station === 'PHARMACY' || 
        p.status === 'AWAITING_MEDICATION' || 
        p.status === 'WAITING'
      );
      
      setQueue(pendingQueue);
      
      // Since '/pharmacy/analytics/summary/' does not exist in your Django URLconf,
      // we generate safe local statistics using the current queue data to avoid 404 errors.
      setStats({
        pending: pendingQueue.length,
        completed: 0, // Hook up to your backend once the view is registered
        lowStock: 0,
        revenue: 0
      });
    } catch (err) {
      console.error("Pharmacy Sync Pipeline Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 10 seconds to catch incoming items instantly
  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Process Logic matched to the Dashboard container workflow receiver
  const handleProcessOrder = (patient) => {
    // Look up the actual Prescription key embedded inside the queue model instance.
    // If your Queue object links via a prescription object or prescription field name, 
    // extract it here. Otherwise, it falls back gracefully.
    const actualPrescriptionId = patient.prescription || patient.prescription_id || patient.id;

    // Optimistic UI state adjustment
    setStats(prev => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1)
    }));
    setQueue(prevQueue => prevQueue.filter(p => p.id !== patient.id));
    
    // Safely trigger workflow and shift tabs automatically
    onAction(actualPrescriptionId); 
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
      
      {/* 4-CARD LIGHT KPI TIER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          label="Pending Orders" 
          value={stats.pending} 
          icon={<Users className="text-teal-600"/>} 
          color="teal" 
        />
        <KPICard 
          label="Fulfillment Rate" 
          value={stats.completed} 
          icon={<Pill className="text-blue-600"/>} 
          color="blue" 
        />
        <KPICard 
          label="Inventory Alerts" 
          value={stats.lowStock} 
          icon={<Package className={stats.lowStock > 0 ? "text-red-600" : "text-purple-600"}/>} 
          color={stats.lowStock > 0 ? "red" : "purple"} 
        />
        <KPICard 
          label="Daily Revenue" 
          value={`Ksh ${stats.revenue.toLocaleString()}`} 
          icon={<TrendingUp className="text-green-600"/>}  
          color="green" 
        />
      </div>

      {/* PIPELINE TABLE CONTAINER */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[500px]">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.4)]" />
            <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-xl">Prescription Pipeline</h3>
          </div>
          <button type="button" onClick={fetchData} className="p-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-200 group">
              <RefreshCw size={20} className={`text-slate-400 group-hover:text-teal-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-10">Incoming Patient</th>
                <th className="p-10">Record Number</th>
                <th className="p-10 text-center">Token ID</th>
                <th className="p-10 text-center">Clinic Status</th>
                <th className="p-10 text-right pr-16">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && queue.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-40 text-center">
                    <Loader2 className="animate-spin mx-auto text-teal-500" size={32} />
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-4">Syncing Pipeline Data...</p>
                  </td>
                </tr>
              ) : queue.length > 0 ? (
                queue.map((patient) => (
                  <tr key={patient.id} className="hover:bg-teal-50/20 transition-all group">
                    {/* Patient Identity */}
                    <td className="px-10 py-8">
                      <p className="font-black text-slate-900 text-lg uppercase tracking-tight">
                        {patient.patient_name || patient.patient?.name || "Unknown Patient"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic font-mono mt-1">
                        {patient.patient_id_no || "---_---_----"}
                      </p>
                    </td>

                    {/* Record Number */}
                    <td className="px-10 py-8">
                      <span className="text-sm font-bold font-mono text-teal-600 bg-teal-50/50 border border-teal-100/70 px-3 py-1.5 rounded-lg">
                        {patient.health_record_number || `REF-${patient.id}`}
                      </span>
                    </td>

                    {/* Token ID */}
                    <td className="px-10 py-8 text-center">
                      <span className="bg-slate-900 text-white px-4 py-2 rounded-xl font-mono font-bold shadow-lg group-hover:bg-teal-600 transition-colors">
                        {patient.queue_token || patient.token_id || `TK-${patient.id}`}
                      </span>
                    </td>

                    {/* Clinic Status Badge */}
                    <td className="px-10 py-8 text-center">
                      <span className="px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 italic animate-pulse">
                        Pending Dispense
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="px-10 py-8 text-right pr-16">
                      <button 
                        type="button"
                        onClick={() => handleProcessOrder(patient)}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ml-auto hover:bg-teal-600 transition-all shadow-xl active:scale-95"
                      >
                        View Prescription <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-40 text-center">
                    <Pill size={48} className="mx-auto mb-4 text-slate-200 opacity-40" />
                    <p className="text-slate-300 font-black uppercase tracking-widest text-xs">
                      Pipeline is currently clear
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* REUSABLE LIGHTWEIGHT KPI CARD COMPONENT */
const KPICard = ({ label, value, icon, sub, color }) => {
  const borderColors = {
    blue: 'hover:border-blue-500',
    teal: 'hover:border-teal-500',
    green: 'hover:border-green-500',
    purple: 'hover:border-purple-500',
    red: 'hover:border-red-500'
  };

  return (
    <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group transition-all ${borderColors[color] || 'hover:border-slate-500'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
      </div>
      <h4 className="text-3xl font-black text-slate-950 tracking-tighter italic break-words">{value}</h4>
      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{label}</p>
    </div>
  );
};

export default PharmacyOverview;