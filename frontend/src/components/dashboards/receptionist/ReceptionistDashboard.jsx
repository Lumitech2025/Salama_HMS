import React, { useState, useEffect, useCallback } from 'react';
import API from '../../../api/api';
import { 
  Calendar, Clock, UserPlus, Activity, List, 
  ArrowRight, RefreshCcw, TrendingUp, Users, 
  CheckCircle2, AlertCircle, Loader2, HeartPulse
} from 'lucide-react';

// Import modules
import Registration from './modules/Registration';
import InsuranceVerification from './modules/InsuranceVerification';
import AppointmentCalendar from './modules/AppointmentCalendar';
import PaymentPortal from './modules/PaymentPortal';
import QueueStatus from './modules/QueueStatus';
import TriagePortal from './modules/TriagePortal';
import ReceptionistSidebar from './ReceptionistSidebar';

const ReceptionistDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dashboard State
  const [view, setView] = useState('live-queue'); 
  const [stats, setStats] = useState({ 
    total_appts: 0, 
    today_appts: 0, 
    total_reg: 0, 
    today_reg: 0 
  });
  const [liveQueue, setLiveQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // 📡 Sync Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    if (activeTab !== 'overview') return;
    setLoading(true);
    try {
      const [resQueue, resAppts, resStats] = await Promise.all([
        API.get('/queue/'),
        API.get('/appointments/'),
        API.get('/queue/analytics/') 
      ]);

      setLiveQueue(Array.isArray(resQueue.data) ? resQueue.data : (resQueue.data.results || []));
      setAppointments(Array.isArray(resAppts.data) ? resAppts.data : (resAppts.data.results || []));
      
      // Update stats based on the new 4-KPI backend response
      setStats({
        total_appts: resStats.data.total_appointments || 0,
        today_appts: resStats.data.today_appointments || 0,
        total_reg: resStats.data.total_registrations || 0,
        today_reg: resStats.data.today_total || 0
      });
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); 
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const StatCard = ({ icon: Icon, label, value, gradient, shadowColor }) => (
    <div className={`relative overflow-hidden bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl ${shadowColor} transition-all hover:-translate-y-1`}>
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
          <p className="text-4xl font-black text-slate-900 tracking-tighter italic">{value}</p>
        </div>
        <div className={`p-3 rounded-xl text-white shadow-lg ${gradient}`}>
          <Icon size={20} strokeWidth={3} />
        </div>
      </div>
      <TrendingUp size={60} className="absolute -right-4 -bottom-4 text-slate-50 opacity-40" />
    </div>
  );

  const renderModule = () => {
    switch (activeTab) {
      case 'registration': return <Registration />;
      case 'insurance': return <InsuranceVerification />;
      case 'triage': return <TriagePortal />;
      case 'appointments':  return <AppointmentCalendar onStatusUpdated={fetchDashboardData} />;
      case 'billing': return <PaymentPortal />;
      case 'queue': return <QueueStatus />;
      case 'overview':
      default:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 1. KPI SECTION (Updated to 4 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
              <StatCard 
                icon={Users} 
                label="Total Appointments" 
                value={stats.total_appts} 
                gradient="bg-gradient-to-br from-blue-700 to-blue-400"
                shadowColor="shadow-blue-500/10"
              />
              <StatCard 
                icon={Calendar} 
                label="Today's Appointments" 
                value={stats.today_appts} 
                gradient="bg-gradient-to-br from-teal-600 to-emerald-400"
                shadowColor="shadow-teal-500/10"
              />
              <StatCard 
                icon={HeartPulse} 
                label="Total Registrations" 
                value={stats.total_reg} 
                gradient="bg-gradient-to-br from-orange-600 to-amber-400"
                shadowColor="shadow-orange-500/10"
              />
              <StatCard 
                icon={UserPlus} 
                label="Today's Intakes" 
                value={stats.today_reg} 
                gradient="bg-gradient-to-br from-indigo-600 to-purple-500"
                shadowColor="shadow-indigo-500/10"
              />
            </div>

            {/* 2. TOGGLE CONTROLS */}
            <div className="flex items-center justify-between bg-[#020617] p-5 rounded-[2.5rem] shadow-2xl mx-2">
              <div className="flex gap-4 bg-white/5 p-2 rounded-3xl">
                <button 
                  onClick={() => setView('live-queue')}
                  className={`flex items-center gap-3 px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all ${view === 'live-queue' ? 'bg-teal-500 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
                >
                  <Activity size={16} /> Live Patient Flow
                </button>
                <button 
                  onClick={() => setView('appointments')}
                  className={`flex items-center gap-3 px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all ${view === 'appointments' ? 'bg-teal-500 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
                >
                  <List size={16} /> Appointments
                </button>
              </div>
              <button 
                onClick={fetchDashboardData} 
                className={`mr-4 p-4 hover:bg-white/10 rounded-2xl transition-all group ${loading ? 'opacity-50' : ''}`}
              >
                <RefreshCcw size={20} className={`text-teal-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* 3. TABLE SECTION */}
            <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden mx-2">
              <div className="p-10">
                {view === 'live-queue' ? (
                  <div className="animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-10 border-b border-slate-50 pb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(20,184,166,0.8)]" />
                        <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Hospital Distribution Monitor</h3>
                      </div>
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                          <th className="px-8 py-5">Token</th>
                          <th className="px-8 py-5">Patient Identity</th>
                          <th className="px-8 py-5 text-center">Station & Status</th>
                          <th className="px-8 py-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {liveQueue.length > 0 ? (
                          liveQueue.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-8 py-7 font-black text-teal-600 text-sm italic underline decoration-teal-100 decoration-4">#{item.token_id}</td>
                              <td className="px-8 py-7">
                                <p className="font-black text-slate-900 text-base uppercase tracking-tight">{item.patient_name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.patient_id_no}</p>
                              </td>
                              <td className="px-8 py-7 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <span className="px-6 py-2 rounded-xl bg-[#020617] text-teal-400 text-[10px] font-black uppercase tracking-widest border border-white/10">
                                    {item.station_display}
                                  </span>
                                  {/* Added Status Display here */}
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {item.status_display}
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-7 text-right">
                                <button className="p-4 bg-slate-50 hover:bg-teal-500 hover:text-white rounded-2xl transition-all shadow-sm">
                                  <ArrowRight size={18} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No patients in live flow</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-500">
                    <div className="flex items-center gap-4 mb-10 border-b border-slate-50 pb-8">
                        <Calendar className="text-blue-500" size={24} />
                        <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Confirmed Appointments</h3>
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Time Slot</th>
                          <th className="px-8 py-5">Patient Name</th>
                          <th className="px-8 py-5">Practitioner</th>
                          <th className="px-8 py-5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {appointments.length > 0 ? (
                          appointments.map((appt) => (
                            <tr key={appt.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="px-8 py-7 font-black text-teal-600 text-sm italic">{appt.appointment_date}</td>
                              <td className="px-8 py-7 font-black text-slate-900 text-sm tracking-tighter">
                                <div className="flex items-center gap-2">
                                  <Clock size={14} className="text-blue-500" />
                                  {appt.appointment_time}
                                </div>
                              </td>
                              <td className="px-8 py-7 font-black text-slate-800 text-base uppercase tracking-tight">
                                {appt.patient_name || appt.manual_patient_name}
                              </td>
                              <td className="px-8 py-7">
                                <p className="text-[11px] font-black text-slate-900 uppercase">{appt.practitioner_name || "Unassigned"}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{appt.practitioner_role}</p>
                              </td>
                              <td className="px-8 py-7 text-right">
                                <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                  appt.status === 'CONFIRMED' 
                                    ? 'bg-teal-50 text-teal-600 border-teal-100' 
                                    : 'bg-blue-50 text-blue-600 border-blue-100'
                                }`}>
                                  {appt.status_display || appt.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No scheduled appointments</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex bg-[#f1f5f9] min-h-screen overflow-hidden">
      <ReceptionistSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto max-h-screen p-8 lg:p-14 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {renderModule()}
        </div>
      </main>
    </div>
  );
};

export default ReceptionistDashboard;