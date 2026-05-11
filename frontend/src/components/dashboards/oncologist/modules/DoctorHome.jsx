import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Users, Calendar, CheckCircle, Clock, 
  Search, ArrowRight, ChevronLeft, ChevronRight, Activity, Loader2
} from 'lucide-react';

const DoctorHome = ({ onSelectPatient }) => {
    const [viewMode, setViewMode] = useState('appointments'); 
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState([]);
    
    // Default to actual today's date for the initial view
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    
    const [stats, setStats] = useState({
        inQueue: 0,
        apptsToday: 0, // This is the KPI for the actual current day
        attended: 0,
        criticalLabs: 3
    });

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch appointments filtered by the date selected on the calendar
            // 2. Fetch general analytics for the KPI cards
            const [resAppts, resAnalytics] = await Promise.all([
                API.get(`/appointments/?date=${selectedDate}`),
                API.get('/queue/analytics/?station=DOCTOR') 
            ]);

            // Set the list for the table based on calendar selection
            setAppointments(resAppts.data.results || resAppts.data);
            
            // Set the KPI stats
            setStats(prev => ({
                ...prev,
                inQueue: resAnalytics.data.station_queue || 0,
                // Ensure this KPI always shows the count for 'todayStr', not necessarily 'selectedDate'
                apptsToday: resAnalytics.data.total_appointments_today || 0,
                attended: resAnalytics.data.completed_today || 0,
            }));

        } catch (err) {
            console.error("Fetch error", err);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]); // Refetch whenever the calendar date changes

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Simple helper to generate days for the UI
    const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
            
            {/* KPI TIER */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard label="In Queue" value={stats.inQueue} icon={<Clock className="text-blue-600"/>} sub="Active Waiting" />
                
                {/* This card now correctly shows Today's total regardless of calendar navigation */}
                <KPICard label="Appts Today" value={stats.apptsToday} icon={<Calendar className="text-teal-600"/>} sub="Total Scheduled" />
                
                <KPICard label="Attended" value={stats.attended} icon={<CheckCircle className="text-green-600"/>} sub="Completed" />
                <KPICard label="Critical Labs" value={stats.criticalLabs} icon={<Activity className="text-red-600"/>} sub="Action Required" />
            </div>

            {/* TOGGLE & SEARCH */}
            <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-2">
                    <button onClick={() => setViewMode('queue')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'queue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Live Queue</button>
                    <button onClick={() => setViewMode('appointments')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'appointments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Calendar</button>
                </div>
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                    <input type="text" placeholder="Search appointments..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/5 outline-none transition-all font-medium" />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                {viewMode === 'appointments' ? (
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* CALENDAR SIDE */}
                        <div className="lg:col-span-4 bg-slate-50 rounded-[2.5rem] p-8 h-fit">
                            <div className="flex justify-between items-center mb-8">
                                <h5 className="font-black text-slate-900 uppercase text-xs tracking-widest">May 2026</h5>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft size={18}/></button>
                                    <button className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight size={18}/></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-3">
                                {daysInMonth.map(day => {
                                    const dateKey = `2026-05-${day.toString().padStart(2, '0')}`;
                                    const isSelected = selectedDate === dateKey;
                                    const isToday = todayStr === dateKey;

                                    return (
                                        <button 
                                            key={day}
                                            onClick={() => setSelectedDate(dateKey)}
                                            className={`relative py-3 rounded-2xl text-xs font-bold transition-all 
                                                ${isSelected ? 'bg-slate-900 text-white shadow-xl scale-110 z-10' : 'hover:bg-white text-slate-600'}
                                                ${isToday && !isSelected ? 'border-2 border-teal-500' : ''}`}
                                        >
                                            {day}
                                            {isToday && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-teal-500 rounded-full" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* LIST SIDE */}
                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h4 className="font-black text-slate-900 text-2xl tracking-tight">
                                        {selectedDate === todayStr ? "Today's Schedule" : `Schedule for ${selectedDate}`}
                                    </h4>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                                        {appointments.length} Appointments Found
                                    </p>
                                </div>
                                <div className="bg-teal-50 text-teal-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-teal-100">
                                    {selectedDate}
                                </div>
                            </div>

                            {loading ? (
                                <div className="py-20 text-center"><Loader2 className="animate-spin text-teal-500 mx-auto" size={40} /></div>
                            ) : appointments.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {appointments.map((appt, i) => (
                                        <div key={i} className="flex items-center justify-between p-6 border border-slate-100 rounded-[2rem] hover:border-teal-500 hover:shadow-xl hover:shadow-teal-500/5 transition-all group bg-white">
                                            <div className="flex items-center gap-6">
                                                <div className="bg-slate-900 text-white p-4 rounded-2xl font-black text-sm w-20 text-center shadow-lg">
                                                    {appt.appointment_time?.substring(0, 5) || "00:00"}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-lg uppercase tracking-tight group-hover:text-teal-600 transition-colors">{appt.patient_name}</p>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                                                        <Activity size={14} className="text-teal-500"/> {appt.reason || "Consultation"}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => onSelectPatient(appt)}
                                                className="p-5 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-teal-500 group-hover:text-white transition-all shadow-sm"
                                            >
                                                <ArrowRight size={24} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
                                    <Calendar size={64} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Clean Slate</p>
                                    <p className="text-slate-300 text-xs mt-2">No appointments scheduled for this date.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-10 text-center text-slate-400 italic font-medium uppercase tracking-[0.3em]">
                        Live Queue Module Loading...
                    </div>
                )}
            </div>
        </div>
    );
};

const KPICard = ({ label, value, icon, sub }) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-teal-500 transition-all">
        <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-slate-50 rounded-[1.2rem] group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">{icon}</div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live</span>
        </div>
        <h4 className="text-5xl font-black text-slate-950 tracking-tighter italic">{value}</h4>
        <p className="text-xs font-bold text-slate-500 uppercase mt-2 tracking-widest">{label}</p>
        <div className="mt-4 pt-4 border-t border-slate-50">
            <p className="text-[10px] text-teal-600 font-black uppercase tracking-tighter flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" /> {sub}
            </p>
        </div>
    </div>
);

export default DoctorHome;