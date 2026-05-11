import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Users, Calendar, CheckCircle, Clock, 
  Search, ArrowRight, Activity, Loader2, Play, BarChart3
} from 'lucide-react';

const DoctorHome = ({ onSelectPatient, attendedSessionCount }) => {
    const [viewMode, setViewMode] = useState('queue'); 
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState([]);
    const [queue, setQueue] = useState([]); 
    
    // We use a helper to get the exact YYYY-MM-DD string
    const getTodayString = () => new Date().toISOString().split('T')[0];
    const systemToday = getTodayString();
    
    const [selectedDate, setSelectedDate] = useState(systemToday);
    
    const [stats, setStats] = useState({
        inQueue: 0,
        apptsToday: 0, 
        attended: 0,
        totalAppts: 0, // Total volume of the hospital
        criticalLabs: 3
    });

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch appointments for the SPECIFIC SELECTED DATE
            // Ensure the backend endpoint respects the query param ?appointment_date=
            const resAppts = await API.get(`/appointments/?appointment_date=${selectedDate}`).catch(() => ({ data: [] }));
            setAppointments(resAppts.data.results || resAppts.data || []);

            // 2. Fetch LIVE QUEUE (Station: DOCTOR)
            const resQueue = await API.get('/queue/?current_station=DOCTOR').catch(() => ({ data: [] }));
            const rawQueue = resQueue.data.results || resQueue.data || [];
            const activeQueue = rawQueue.filter(item => item.status === 'WAITING' || item.status === 'TRIAGED');
            setQueue(activeQueue);

            // 3. Fetch KPI DATA strictly for Today
            const resTodayAppts = await API.get(`/appointments/?appointment_date=${systemToday}`).catch(() => ({ data: [] }));
            const resAnalytics = await API.get('/queue/analytics/?station=DOCTOR').catch(() => ({ data: {} }));
            
            // Extract counts correctly
            const todayCount = resTodayAppts.data.count || (resTodayAppts.data.results?.length) || 0;
            const attendedBackend = resAnalytics.data.completed_today || 0;
            const totalHospitalAppts = resAnalytics.data.total_appointments || 0;

            setStats({
                inQueue: activeQueue.length,
                apptsToday: todayCount, 
                attended: attendedBackend + attendedSessionCount, 
                totalAppts: totalHospitalAppts,
                criticalLabs: 3
            });

        } catch (err) {
            console.error("Dashboard Sync Error:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, systemToday, attendedSessionCount]);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 15000); 
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const handleAttendPatient = async (pat) => {
        try {
            // Update Backend to mark as seen
            await API.patch(`/queue/${pat.id}/`, { status: 'UNDER_CONSULTATION' });
            
            // Optimistic UI updates
            setQueue(prev => prev.filter(item => item.id !== pat.id));
            
            // Trigger parent logic (increments session count and switches tab)
            onSelectPatient(pat);
        } catch (err) {
            console.error("Attend Error:", err);
            onSelectPatient(pat); 
        }
    };

    const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
            
            {/* 5-CARD KPI TIER */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KPICard label="Live Queue" value={stats.inQueue} icon={<Clock className="text-blue-600"/>} sub="Waiting" color="blue" />
                <KPICard label="Today's Appointments" value={stats.apptsToday} icon={<Calendar className="text-teal-600"/>} sub="Strictly Today" color="teal" />
                <KPICard label="Attended" value={stats.attended} icon={<CheckCircle className="text-green-600"/>} sub="Cases Handled" color="green" />
                <KPICard label="Total Appointments" value={stats.totalAppts} icon={<BarChart3 className="text-purple-600"/>} sub="Total Volume" color="purple" />
                <KPICard label="Critical Labs" value={stats.criticalLabs} icon={<Activity className="text-red-600"/>} sub="Review Now" color="red" />
            </div>

            {/* TOGGLE & SEARCH */}
            <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-2 shadow-inner">
                    <button onClick={() => setViewMode('queue')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'queue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Live Queue</button>
                    <button onClick={() => setViewMode('appointments')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'appointments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Calendar</button>
                </div>
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search incoming patients..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm" />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[500px]">
                {viewMode === 'queue' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="p-10">Incoming Patient</th>
                                    <th className="p-10 text-center">Token ID</th>
                                    <th className="p-10 text-center">Vitals Status</th>
                                    <th className="p-10 text-right pr-16">Workflow</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {queue.length > 0 ? queue.map((pat) => (
                                    <tr key={pat.id} className="hover:bg-blue-50/20 transition-all group">
                                        <td className="px-10 py-8">
                                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{pat.patient_name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic font-mono">UCRN: {pat.patient_id_no}</p>
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <span className="bg-slate-900 text-white px-4 py-2 rounded-xl font-mono font-bold shadow-lg group-hover:bg-blue-600 transition-colors">{pat.token_id}</span>
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <span className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100 italic">Vitals Captured</span>
                                        </td>
                                        <td className="px-10 py-8 text-right pr-16">
                                            <button 
                                                onClick={() => handleAttendPatient(pat)} 
                                                className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ml-auto hover:bg-blue-600 transition-all shadow-xl"
                                            >
                                                Attend Patient <Play size={14} fill="currentColor"/>
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="py-40 text-center text-slate-300 italic font-black uppercase tracking-widest text-xs">No pending patients in queue</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-right duration-500">
                        <div className="lg:col-span-4 bg-slate-50 rounded-[2.5rem] p-8 h-fit border border-slate-100 shadow-inner">
                            <h5 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-8 flex justify-between">
                                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                <Calendar size={14} />
                            </h5>
                            <div className="grid grid-cols-7 gap-3">
                                {daysInMonth.map(day => {
                                    // Construct date key for 2026-05
                                    const dateKey = `2026-05-${day.toString().padStart(2, '0')}`;
                                    const isSelected = selectedDate === dateKey;
                                    return (
                                        <button 
                                            key={day}
                                            onClick={() => setSelectedDate(dateKey)}
                                            className={`py-3 rounded-2xl text-xs font-bold transition-all ${isSelected ? 'bg-slate-900 text-white shadow-xl scale-110' : 'hover:bg-white text-slate-600'}`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-black text-slate-900 text-2xl tracking-tighter italic uppercase border-b-4 border-blue-500 pb-2">Schedule: {selectedDate}</h4>
                                <div className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">{appointments.length} Total</div>
                            </div>
                            {appointments.length > 0 ? appointments.map((appt) => (
                                <div key={appt.id} className="flex items-center justify-between p-6 border border-slate-100 rounded-[2rem] bg-white hover:border-blue-500 transition-all group shadow-sm hover:shadow-md">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-slate-900 text-white p-4 rounded-2xl font-black text-sm w-24 text-center group-hover:bg-blue-600 transition-colors shadow-sm">{appt.appointment_time?.substring(0,5)}</div>
                                        <div>
                                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{appt.patient_name}</p>
                                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{appt.reason || "General Review"}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleAttendPatient(appt)} className="p-5 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                        <ArrowRight size={24} />
                                    </button>
                                </div>
                            )) : (
                                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 font-black uppercase tracking-widest text-[10px]">No Appointments found for this date</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const KPICard = ({ label, value, icon, sub, color }) => (
    <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-${color}-500 transition-all`}>
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
        </div>
        <h4 className="text-4xl font-black text-slate-950 tracking-tighter italic">{value}</h4>
        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{label}</p>
        <p className={`text-[9px] text-${color === 'green' ? 'teal' : (color === 'red' ? 'red' : 'blue')}-600 font-black uppercase mt-3 flex items-center gap-2`}>
            <span className={`w-1 h-1 bg-${color === 'green' ? 'teal' : (color === 'red' ? 'red' : 'blue')}-500 rounded-full animate-pulse`} /> {sub}
        </p>
    </div>
);

export default DoctorHome;