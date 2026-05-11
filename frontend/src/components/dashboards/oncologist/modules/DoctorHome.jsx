import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Users, Calendar, CheckCircle, Clock, 
  Search, ArrowRight, Activity, Loader2, Play
} from 'lucide-react';

const DoctorHome = ({ onSelectPatient }) => {
    const [viewMode, setViewMode] = useState('queue'); 
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState([]);
    const [queue, setQueue] = useState([]); 
    
    const systemToday = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(systemToday);
    
    const [stats, setStats] = useState({
        inQueue: 0,
        apptsToday: 0, 
        attended: 0,
        criticalLabs: 3
    });

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch appointments
            const resAppts = await API.get(`/appointments/?appointment_date=${selectedDate}`).catch(() => ({ data: [] }));
            setAppointments(resAppts.data.results || resAppts.data || []);

            // 2. Fetch LIVE QUEUE (Station: DOCTOR)
            const resQueue = await API.get('/queue/?current_station=DOCTOR').catch(() => ({ data: [] }));
            const rawQueue = resQueue.data.results || resQueue.data || [];
            
            // Broaden the filter: Show anyone at DOCTOR station who isn't finished
            const activeQueue = rawQueue.filter(item => 
                item.status !== 'COMPLETED' && 
                item.status !== 'UNDER_CONSULTATION' && 
                item.status !== 'DISCHARGED'
            );
            setQueue(activeQueue);

            // 3. Fetch analytics for KPI cards
            const resAnalytics = await API.get('/queue/analytics/?station=DOCTOR').catch(() => ({ data: {} }));
            const resToday = await API.get(`/appointments/?appointment_date=${systemToday}`).catch(() => ({ data: [] }));
            const todayCount = resToday.data.count || (resToday.data.results?.length) || resToday.data.length || 0;

            setStats({
                inQueue: activeQueue.length,
                apptsToday: todayCount, 
                attended: resAnalytics.data.completed_today || 0,
                criticalLabs: 3
            });

        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, systemToday]);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 15000); // 15s refresh
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const handleAttendPatient = async (pat) => {
        try {
            // 1. Update Backend Status
            await API.patch(`/queue/${pat.id}/`, {
                status: 'UNDER_CONSULTATION'
            });

            // 2. Optimistic Update: Increment UI immediately
            setStats(prev => ({
                ...prev,
                inQueue: Math.max(0, prev.inQueue - 1),
                attended: prev.attended + 1
            }));

            // 3. Clear from local list
            setQueue(prevQueue => prevQueue.filter(item => item.id !== pat.id));

            // 4. Navigate
            onSelectPatient(pat);

        } catch (err) {
            console.error("Attend Error:", err);
            onSelectPatient(pat); // Fallback
        }
    };

    const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
            
            {/* KPI TIER */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard label="In Queue" value={stats.inQueue} icon={<Clock className="text-blue-600"/>} sub="Waiting" color="blue" />
                <KPICard label="Appts Today" value={stats.apptsToday} icon={<Calendar className="text-teal-600"/>} sub="Scheduled" color="teal" />
                <KPICard label="Attended" value={stats.attended} icon={<CheckCircle className="text-green-600"/>} sub="Completed Today" color="green" />
                <KPICard label="Critical Labs" value={stats.criticalLabs} icon={<Activity className="text-red-600"/>} sub="Review Now" color="red" />
            </div>

            {/* TOGGLE & SEARCH */}
            <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-2">
                    <button onClick={() => setViewMode('queue')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'queue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Live Queue</button>
                    <button onClick={() => setViewMode('appointments')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'appointments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Calendar</button>
                </div>
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search incoming patients..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                {viewMode === 'queue' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="p-10">Incoming Patient</th>
                                    <th className="p-10">Token ID</th>
                                    <th className="p-10">Vitals Status</th>
                                    <th className="p-10 text-right">Workflow</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {queue.length > 0 ? queue.map((pat) => (
                                    <tr key={pat.id} className="hover:bg-blue-50/20 transition-all group">
                                        <td className="px-10 py-8">
                                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{pat.patient_name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">UCRN: {pat.patient_id_no}</p>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="bg-slate-900 text-white px-4 py-2 rounded-xl font-mono font-bold shadow-lg group-hover:bg-blue-600 transition-colors">{pat.token_id}</span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100 italic">Vitals Captured</span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <button 
                                                onClick={() => handleAttendPatient(pat)} 
                                                className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ml-auto hover:bg-teal-600 transition-all active:scale-95 shadow-xl"
                                            >
                                                Attend Patient <Play size={14} fill="currentColor"/>
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="py-40 text-center text-slate-400 italic font-medium">No patients currently in the live queue.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Calendar simplified for reliability */}
                        <div className="lg:col-span-4 bg-slate-50 rounded-[2.5rem] p-8 h-fit border border-slate-100 shadow-inner">
                            <h5 className="font-black uppercase text-xs tracking-widest mb-8 text-slate-900">May 2026</h5>
                            <div className="grid grid-cols-7 gap-3">
                                {daysInMonth.map(day => {
                                    const dateKey = `2026-05-${day.toString().padStart(2, '0')}`;
                                    const isSelected = selectedDate === dateKey;
                                    return (
                                        <button 
                                            key={day}
                                            onClick={() => setSelectedDate(dateKey)}
                                            className={`py-3 rounded-2xl text-xs font-bold transition-all ${isSelected ? 'bg-slate-900 text-white shadow-xl' : 'hover:bg-white text-slate-600'}`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lg:col-span-8 space-y-4">
                            <h4 className="font-black text-slate-900 text-2xl tracking-tight mb-6 italic uppercase underline decoration-blue-500 underline-offset-8">Schedule: {selectedDate}</h4>
                            {appointments.length > 0 ? appointments.map((appt) => (
                                <div key={appt.id} className="flex items-center justify-between p-6 border border-slate-100 rounded-[2rem] bg-white hover:border-teal-500 transition-all group shadow-sm">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-slate-900 text-white p-4 rounded-2xl font-black text-sm w-20 text-center group-hover:bg-blue-600 transition-colors shadow-sm">{appt.appointment_time?.substring(0,5)}</div>
                                        <div>
                                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{appt.patient_name}</p>
                                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{appt.reason || "Oncology Review"}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleAttendPatient(appt)} className="p-5 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-sm active:scale-95">
                                        <ArrowRight size={24} />
                                    </button>
                                </div>
                            )) : (
                                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 font-medium italic">No scheduled appointments found.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const KPICard = ({ label, value, icon, sub, color }) => (
    <div className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-${color}-500 transition-all`}>
        <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-slate-50 rounded-[1.2rem] group-hover:scale-110 transition-transform">{icon}</div>
        </div>
        <h4 className="text-5xl font-black text-slate-950 tracking-tighter italic">{value}</h4>
        <p className="text-xs font-bold text-slate-500 uppercase mt-2 tracking-widest">{label}</p>
        <p className={`text-[10px] text-${color === 'green' ? 'teal' : color}-600 font-black uppercase mt-4 flex items-center gap-2`}>
            <span className={`w-1.5 h-1.5 bg-${color === 'green' ? 'teal' : color}-500 rounded-full animate-pulse`} /> {sub}
        </p>
    </div>
);

export default DoctorHome;