import React, { useState, useEffect, useCallback } from 'react';
import API from '../../../api/api';
import { 
  Calendar, Clock, UserPlus, Activity, List, 
  RefreshCcw, TrendingUp, Users, HeartPulse, FileText
} from 'lucide-react';

import Registration from './modules/Registration';
import InsuranceVerification from './modules/InsuranceVerification';
import AppointmentCalendar from './modules/AppointmentCalendar';
import PaymentPortal from './modules/PaymentPortal';
import QueueStatus from './modules/QueueStatus';
import TriagePortal from './modules/TriagePortal';
import ReceptionistSidebar from './ReceptionistSidebar';
import ServiceCatalogue from '../billingofficer/modules/ServiceCatalogue';

const ReceptionistDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [view, setView] = useState('live-queue'); 
  const [stats, setStats] = useState({ total_appts: 0, today_appts: 0, total_reg: 0, today_reg: 0 });
  const [liveQueue, setLiveQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (activeTab !== 'overview') return;
    setLoading(true);
    try {
      const [resQueue, resAppts, resStats] = await Promise.all([
        API.get('/queue'),
        API.get('/appointments'),
        API.get('/queue/analytics') 
      ]);

      setLiveQueue(Array.isArray(resQueue.data) ? resQueue.data : (resQueue.data.results || []));
      setAppointments(Array.isArray(resAppts.data) ? resAppts.data : (resAppts.data.results || []));
      
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

  const StatCard = ({ icon: Icon, label, value, color }) => {
    const themes = {
      blue: "bg-blue-50 text-blue-600 border-blue-100",
      teal: "bg-teal-50 text-teal-600 border-teal-100",
      orange: "bg-orange-50 text-orange-600 border-orange-100",
      indigo: "bg-indigo-50 text-indigo-600 border-indigo-100"
    };
    return (
      <div className={`${themes[color]} p-8 rounded-[2.5rem] border-2 shadow-sm relative overflow-hidden group transition-all duration-500`}>
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="p-3 bg-white rounded-2xl shadow-md">{Icon && <Icon size={20} />}</div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{label}</p>
        </div>
        <p className="text-5xl font-black tracking-tighter relative z-10 italic">{value}</p>
        <TrendingUp size={100} className="absolute -right-6 -bottom-6 opacity-[0.04] rotate-12" />
      </div>
    );
  };

  const renderModule = () => {
    switch (activeTab) {
      case 'registration': return <Registration />;
      case 'insurance': return <InsuranceVerification />;
      case 'triage': return <TriagePortal />;
      case 'appointments': return <AppointmentCalendar onStatusUpdated={fetchDashboardData} />;
      case 'billing': return <PaymentPortal />;
      case 'queue': return <QueueStatus />;
      case 'service-catalogue': return <ServiceCatalogue />;
      case 'overview':
      default:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={Users} label="Total Appointments" value={stats.total_appts} color="blue" />
              <StatCard icon={Calendar} label="Today's Appointments" value={stats.today_appts} color="teal" />
              <StatCard icon={HeartPulse} label="Total Registrations" value={stats.total_reg} color="orange" />
              <StatCard icon={UserPlus} label="Today's Registrations" value={stats.today_reg} color="indigo" />
            </div>

            <div className="flex items-center justify-between bg-[#020617] p-5 rounded-[2.5rem] shadow-2xl">
              <div className="flex gap-4 bg-white/5 p-2 rounded-3xl">
                <button 
                  onClick={() => setView('live-queue')}
                  className={`flex items-center gap-3 px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${view === 'live-queue' ? 'bg-teal-500 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
                >
                  <Activity size={16} /> Live Patient Flow
                </button>
                <button 
                  onClick={() => setView('appointments')}
                  className={`flex items-center gap-3 px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${view === 'appointments' ? 'bg-teal-500 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
                >
                  <List size={16} /> Appointments
                </button>
              </div>
              <button 
                onClick={fetchDashboardData} 
                className="mr-4 p-4 hover:bg-white/10 rounded-2xl transition-all group"
              >
                <RefreshCcw size={20} className={`text-teal-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[500px]">
              <div className="p-10">
                {view === 'live-queue' ? (
                  <div className="animate-in fade-in duration-500">
                    <div className="flex items-center gap-4 mb-10 border-b border-slate-50 pb-8">
                      <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Patient Live Tracking</h3>
                      </div>
                    </div>

                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                          <th className="px-8 py-6">Queue ID</th>
                          <th className="px-8 py-6">Record Number</th>
                          <th className="px-8 py-6">Patient</th>
                          <th className="px-8 py-6 text-center">Current Station</th>
                          <th className="px-8 py-6 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {liveQueue.map((item) => {
                          // Enhanced structural normalization fallback to handle synchronized fields seamlessly
                          const calculatedHrn = 
                            item.health_record_number || 
                            item.patient?.health_record_number || 
                            item.patient_details?.health_record_number ||
                            item.visit?.health_record_number ||
                            item.visit_details?.health_record_number ||
                            '---_000_2026';

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-8 py-7">
                                  <span className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-teal-600 shadow-sm italic">
                                      #{item.token_id || item.queue_id}
                                  </span>
                              </td>
                              <td className="px-8 py-7">
                                <span className="font-mono font-bold text-xs text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100/50 tracking-wide inline-flex items-center gap-1.5">
                                  <FileText size={12} className="text-teal-500" />
                                  {calculatedHrn}
                                </span>
                              </td>
                              <td className="px-8 py-7">
                                <p className="font-black text-slate-900 text-base uppercase tracking-tight leading-none mb-1">{item.patient_name || item.patient?.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{item.patient_id_no || item.id_number}</p>
                              </td>
                              <td className="px-8 py-7 text-center">
                                  <span className="bg-slate-900 text-teal-400 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 inline-block">
                                    {item.station_display || item.current_station}
                                  </span>
                              </td>
                              <td className="px-8 py-7 text-right">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block animate-pulse">
                                    {item.status_display || item.status}
                                  </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-500">
                    <div className="flex items-center gap-4 mb-10 border-b border-slate-50 pb-8">
                      <div className="p-4 bg-teal-500 rounded-2xl text-white shadow-lg">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Confirmed Appointments</h3>
                      </div>
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                          <th className="px-8 py-6">Date</th>
                          <th className="px-8 py-6">Time Slot</th>
                          <th className="px-8 py-6">Patient</th>
                          <th className="px-8 py-6 text-right">Practitioner</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {appointments.map((appt) => (
                          <tr key={appt.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-8 py-7 font-black text-teal-600 text-sm italic">{appt.appointment_date}</td>
                            <td className="px-8 py-7">
                              <div className="flex items-center gap-2 font-black text-slate-900 text-sm tracking-tighter">
                                <Clock size={14} className="text-blue-500" /> {appt.appointment_time}
                              </div>
                            </td>
                            <td className="px-8 py-7 font-black text-slate-800 text-base uppercase tracking-tight">
                              {appt.patient_name || appt.manual_patient_name}
                            </td>
                            <td className="px-8 py-7 text-right">
                              <p className="text-[11px] font-black text-slate-900 uppercase leading-none mb-1">{appt.practitioner_name || "Unassigned"}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">{appt.practitioner_role}</p>
                            </td>
                          </tr>
                        ))}
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
    <div className="flex bg-slate-50 min-h-screen overflow-hidden font-['Inter']">
      <ReceptionistSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto max-h-screen p-10 lg:p-16">
        <div className="max-w-[1400px] mx-auto">
          {renderModule()}
        </div>
      </main>
    </div>
  );
};

export default ReceptionistDashboard;