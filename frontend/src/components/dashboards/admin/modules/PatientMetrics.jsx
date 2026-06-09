import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Calendar, UserPlus, HeartPulse, RefreshCw, 
  TrendingUp, Activity, BarChart3, DollarSign 
} from 'lucide-react';
import API from '@/api/api'; 

const PatientMetrics = () => {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState({
    total_patients: 0,
    todays_registrations: 0,
    total_appointments: 0,
    todays_appointments: 0,
    returning_patients_today: 0,
    monthly_trends: [], // Fully dynamic backend list arrays
    payment_modes: []   // Fully dynamic backend list arrays
  });

  const fetchMetricData = useCallback(async () => {
    setLoading(true);
    try {
      const [resStats, resQueueStats] = await Promise.all([
        API.get('/registrations/analytics/'),
        API.get('/queue/analytics')
      ]);

      // Direct mapping to your active production system attributes
      setAnalytics({
        total_patients: resStats.data.total_patients || 0,
        todays_registrations: resStats.data.todays_registrations || 0,
        total_appointments: resQueueStats.data.total_appointments || 0,
        todays_appointments: resQueueStats.data.today_appointments || 0,
        returning_patients_today: resStats.data.returning_today || 0,
        monthly_trends: resStats.data.monthly_trends || [], 
        payment_modes: resStats.data.payment_modes || []     
      });
    } catch (err) {
      console.error("Administrative Analytics sync failure:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetricData();
    const runtimeInterval = setInterval(fetchMetricData, 30000);
    return () => clearInterval(runtimeInterval);
  }, [fetchMetricData]);

  // Establish maximum baseline ceilings dynamically based on live values for scalable chart sizing
  const maxTrendValue = analytics.monthly_trends.length > 0 
    ? Math.max(...analytics.monthly_trends.map(t => t.count || 0), 1) 
    : 1;

  const maxPaymentValue = analytics.payment_modes.length > 0 
    ? Math.max(...analytics.payment_modes.map(p => p.count || 0), 1) 
    : 1;

  // Visual helper to rotate background accents on custom payment mode rows
  const getProgressColor = (index) => {
    const colors = ['bg-amber-500', 'bg-teal-500', 'bg-blue-600', 'bg-purple-500', 'bg-indigo-500', 'bg-emerald-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      
      {/* Title Controller Strip */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase italic">
            <Activity className="text-blue-600" size={22} /> Patient <span className="text-blue-600 not-italic font-light">Ecosystem Metrics</span>
          </h1>
        </div>
        <button 
          onClick={fetchMetricData}
          disabled={loading}
          className="p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all group"
        >
          <RefreshCw size={16} className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPIs Cards Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard icon={Users} label="Total Patients" value={analytics.total_patients} color="blue" />
        <StatCard icon={UserPlus} label="Today's Patients" value={analytics.todays_registrations} color="teal" />
        <StatCard icon={HeartPulse} label="Total Appts" value={analytics.total_appointments} color="orange" />
        <StatCard icon={Calendar} label="Today's Appts" value={analytics.todays_appointments} color="indigo" />
        <StatCard icon={RefreshCw} label="Returning Cases" value={analytics.returning_patients_today} color="rose" />
      </div>

      {/* Dual Column Data Graphic Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Dynamic Monthly Registration Trajectory */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><BarChart3 size={18} /></div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Registration Volume Trajectory</h3>
              <p className="text-[11px] text-slate-400 font-medium">New patient admissions processed per monthly cycle</p>
            </div>
          </div>

          {analytics.monthly_trends.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-400">
              No registration timeline entries captured
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2 pt-6 h-56 px-2">
              {analytics.monthly_trends.map((item, index) => {
                const elementHeightPercentage = ((item.count || 0) / maxTrendValue) * 100;
                return (
                  <div key={index} className="flex flex-col items-center flex-1 group relative">
                    <div className="absolute -top-10 scale-0 group-hover:scale-100 bg-slate-950 text-white font-mono font-bold text-[11px] px-2.5 py-1 rounded-lg transition-all duration-200 z-30 shadow-md">
                      {item.count || 0}
                    </div>
                    
                    <div className="w-full bg-slate-50 hover:bg-slate-100 rounded-xl flex items-end h-48 overflow-hidden transition-all duration-300">
                      <div 
                        style={{ height: `${elementHeightPercentage}%` }}
                        className="w-full bg-blue-600 rounded-t-lg transition-all duration-700 ease-out shadow-lg shadow-blue-600/10 group-hover:bg-blue-500"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 font-mono">
                      {item.month || item.month_name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Financial Coverage Breakdown */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl"><DollarSign size={18} /></div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Financial Coverage Demographics</h3>
              <p className="text-[11px] text-slate-400 font-medium">System wide billing routing profile indexes</p>
            </div>
          </div>

          {analytics.payment_modes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-400">
              No financial payment modes compiled
            </div>
          ) : (
            <div className="space-y-5 flex-1 flex flex-col justify-center px-2">
              {analytics.payment_modes.map((item, index) => {
                const elementWidthPercentage = ((item.count || 0) / maxPaymentValue) * 100;
                return (
                  <div key={index} className="space-y-1.5 group">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wide text-slate-700">
                      <span className="font-sans text-slate-800">{item.mode || item.payment_mode}</span>
                      <span className="font-mono text-slate-500">{item.count || 0} Patients</span>
                    </div>
                    
                    <div className="w-full h-3.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        style={{ width: `${elementWidthPercentage}%` }}
                        className={`h-full ${getProgressColor(index)} rounded-full transition-all duration-1000 ease-out shadow-sm`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const themes = {
    blue: "bg-blue-50/70 text-blue-700 border-blue-100/50",
    teal: "bg-teal-50/70 text-teal-700 border-teal-100/50",
    orange: "bg-orange-50/70 text-orange-700 border-orange-100/50",
    indigo: "bg-indigo-50/70 text-indigo-700 border-indigo-100/50",
    rose: "bg-rose-50/70 text-rose-700 border-rose-100/50"
  };
  return (
    <div className={`${themes[color]} p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group transition-all duration-300`}>
      <div className="flex items-center gap-3.5 mb-3 relative z-10">
        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 text-current">{Icon && <Icon size={16} />}</div>
        <p className="text-[10px] font-black uppercase tracking-wider opacity-85">{label}</p>
      </div>
      <p className="text-3xl font-black tracking-tighter relative z-10 italic">{value}</p>
      <TrendingUp size={80} className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12" />
    </div>
  );
};

export default PatientMetrics;