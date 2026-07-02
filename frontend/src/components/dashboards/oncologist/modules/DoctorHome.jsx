import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Users, Calendar, CheckCircle, Clock, 
  Search, ArrowRight, Activity, Loader2, Play, BarChart3,
  ChevronLeft, ChevronRight, ClipboardList, FlaskConical, Pill
} from 'lucide-react';

const DoctorHome = ({ onSelectPatient, attendedSessionCount }) => {
    const [viewMode, setViewMode] = useState('queue'); // 'queue', 'appointments', or 'all_patients'
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState([]);
    const [queue, setQueue] = useState([]); 
    const [historyPatients, setHistoryPatients] = useState([]); // Separate state tracking for global history
    const [searchQuery, setSearchQuery] = useState('');
    
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const systemToday = getTodayString();
    
    const [selectedDate, setSelectedDate] = useState(systemToday);
    
    const [currentYear, setCurrentYear] = useState(new Date(selectedDate).getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate).getMonth()); 

    const [stats, setStats] = useState({
        inQueue: 0,
        apptsToday: 0, 
        attended: 0,
        totalAppts: 0,
        criticalcases: 3
    });

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const resAppts = await API.get(`/appointments/?appointment_date=${selectedDate}`).catch(() => ({ data: [] }));
            const parsedAppts = resAppts.data.results || resAppts.data || [];
            setAppointments(parsedAppts);

            const resQueue = await API.get('/queue?current_station=DOCTOR').catch(() => ({ data: [] }));
            const rawQueue = resQueue.data.results || resQueue.data || [];
            const activeQueue = rawQueue.filter(item => item.status === 'WAITING' || item.status === 'TRIAGED');
            setQueue(activeQueue);

            // Fetch all historical hospital patients context
            const resHistory = await API.get('/queue?all_records=true').catch(() => ({ data: [] }));
            const historicalData = resHistory.data.results || resHistory.data || [];
            setHistoryPatients(historicalData);

            const resTodayAppts = await API.get(`/appointments/?appointment_date=${systemToday}`).catch(() => ({ data: [] }));
            const resAnalytics = await API.get('/queue/analytics/?station=DOCTOR').catch(() => ({ data: {} }));
            
            const todayCount = resTodayAppts.data.count || resTodayAppts.data.results?.length || (Array.isArray(resTodayAppts.data) ? resTodayAppts.data.length : 0);
            const attendedBackend = resAnalytics.data.completed_today || 0;
            const totalHospitalAppts = resAnalytics.data.total_appointments || 0;

            setStats({
                inQueue: activeQueue.length,
                apptsToday: todayCount, 
                attended: attendedBackend + attendedSessionCount, 
                totalAppts: totalHospitalAppts,
                criticalcases: 3
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
            await API.patch(`/queue/${pat.id}/`, { 
                status: 'UNDER_CONSULTATION'
            });
            setQueue(prev => prev.filter(item => item.id !== pat.id));
            onSelectPatient(pat);
        } catch (err) {
            console.error("Attend Error:", err);
            onSelectPatient(pat); 
        }
    };

    const routeToPatientAction = (patient, targetActionTab) => {
        const structuralPatientWrapper = {
            ...patient,
            forcedSubTabTarget: targetActionTab
        };
        onSelectPatient(structuralPatientWrapper);
    };

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInMonthArray = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);

    const firstDayOfWeekIndex = new Date(currentYear, currentMonth, 1).getDay();
    const emptyPaddingSlots = Array.from({ length: firstDayOfWeekIndex });

    const filteredQueue = queue.filter(p => {
        const name = p.patient_name || "";
        const idNo = p.patient_id_no || "";
        const token = p.token_id || "";
        const recordNum = p.health_record_number || "";
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               idNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
               token.toLowerCase().includes(searchQuery.toLowerCase()) ||
               recordNum.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const filteredAppointments = appointments.filter(a => {
        const name = a.patient_name || a.manual_patient_name || "";
        const reason = a.reason || "";
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               reason.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const filteredHistory = historyPatients.filter(p => {
        const name = p.patient_name || "";
        const recordNum = p.health_record_number || "";
        const station = p.current_station || "";
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               recordNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
               station.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long' });

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
            
            {/* 5-CARD KPI TIER */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KPICard label="Live Queue" value={stats.inQueue} icon={<Clock className="text-blue-600"/>} sub="Waiting" color="blue" onClick={() => setViewMode('queue')} />
                <KPICard label="Today's Appointments" value={stats.apptsToday} icon={<Calendar className="text-teal-600"/>} sub="Today" color="teal" onClick={() => setViewMode('appointments')} />
                <KPICard label="Attended" value={stats.attended} icon={<CheckCircle className="text-green-600"/>} sub="Cases Handled" color="green" onClick={() => setViewMode('all_patients')} />
                <KPICard label="Total Appointments" value={stats.totalAppts} icon={<BarChart3 className="text-purple-600"/>} sub="Total Volume" color="purple" onClick={() => setViewMode('appointments')} />
                <KPICard label="Critical Cases" value={stats.criticalcases} icon={<Activity className="text-red-600"/>} sub="Review Now" color="red" onClick={() => setViewMode('queue')} />
            </div>

            {/* TOGGLE & SEARCH */}
            <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-2 shadow-inner">
                    <button onClick={() => setViewMode('queue')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'queue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Live Queue</button>
                    <button onClick={() => setViewMode('all_patients')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'all_patients' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>All Patients</button>
                    <button onClick={() => setViewMode('appointments')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'appointments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Calendar</button>
                </div>
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search patient registry by name, record token or assigned stations..." 
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm" 
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[500px]">
                {viewMode === 'queue' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="p-10">Incoming Patient</th>
                                    <th className="p-10">Record Number</th>
                                    <th className="p-10 text-center">Token ID</th>
                                    <th className="p-10 text-center">Vitals Status</th>
                                    <th className="p-10 text-right pr-16">Workflow</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredQueue.length > 0 ? filteredQueue.map((pat) => (
                                    <tr key={pat.id} className="hover:bg-blue-50/20 transition-all group">
                                        <td className="px-10 py-8">
                                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{pat.patient_name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic font-mono"> {pat.patient_id_no}</p>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-sm font-bold font-mono text-blue-600 bg-blue-50/50 border border-blue-100/70 px-3 py-1.5 rounded-lg">
                                                {pat.health_record_number || "---_---_----"}
                                            </span>
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
                                                className="bg-blue-50 text-slate-900 border border-blue-100 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ml-auto hover:bg-blue-600 hover:text-white transition-all shadow-xl"
                                            >
                                                Attend Patient <Play size={14} fill="currentColor"/>
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="py-40 text-center text-slate-300 italic font-black uppercase tracking-widest text-xs">
                                            {searchQuery ? "No patients match your search filter" : "No pending patients in queue"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : viewMode === 'all_patients' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="p-10">Patient Name</th>
                                    <th className="p-10">Record Number</th>
                                    <th className="p-10 text-center">Current Station</th>
                                    <th className="p-10 text-right pr-16">Clinical Lookup Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredHistory.length > 0 ? filteredHistory.map((pat) => (
                                    <tr key={pat.id} className="hover:bg-slate-50/60 transition-all group">
                                        <td className="px-10 py-8">
                                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{pat.patient_name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic font-mono">{pat.patient_id_no || 'SYSTEM REGISTERED'}</p>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-sm font-bold font-mono text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
                                                {pat.health_record_number || "HRN-NOT-ASSIGNED"}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                                {pat.current_station || 'OUTPATIENT'}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right pr-16">
                                            <div className="flex gap-2 justify-end items-center">
                                                <button 
                                                    onClick={() => routeToPatientAction(pat, 'vitals')}
                                                    className="bg-blue-50 text-slate-900 border border-blue-100 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-blue-600 hover:text-white shadow-md transition-all duration-300"
                                                >
                                                    <Activity size={12} /> Vitals
                                                </button>

                                                <button 
                                                    onClick={() => routeToPatientAction(pat, 'lab')}
                                                    className="bg-blue-50 text-slate-900 border border-blue-100 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-green-600 hover:text-white shadow-md transition-all duration-300"
                                                >
                                                    <FlaskConical size={12} /> Lab
                                                </button>

                                                <button 
                                                    onClick={() => routeToPatientAction(pat, 'prescriptions')}
                                                    className="bg-blue-50 text-slate-900 border border-blue-100 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-purple-600 hover:text-white shadow-md transition-all duration-300"
                                                >
                                                    <Pill size={12} /> Prescription
                                                </button>

                                                <button 
                                                    onClick={() => routeToPatientAction(pat, 'history')}
                                                    className="bg-blue-50 text-slate-900 border border-blue-100 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-slate-700 hover:text-white shadow-md transition-all duration-300"
                                                >
                                                    <ClipboardList size={12} /> Medical History
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="py-40 text-center text-slate-300 italic font-black uppercase tracking-widest text-xs">
                                            {searchQuery ? "No records match your active query filtering" : "No patient visit history logs inside system records"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-right duration-500">
                        
                        <div className="lg:col-span-4 bg-slate-50 rounded-[2.5rem] p-8 h-fit border border-slate-100 shadow-inner">
                            <div className="flex justify-between items-center mb-8">
                                <h5 className="font-black text-slate-900 uppercase text-xs tracking-widest">
                                    {monthName} {currentYear}
                                </h5>
                                <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                    <button type="button" onClick={handlePrevMonth} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button type="button" onClick={handleNextMonth} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                                {['S','M','T','W','T','F','S'].map((d, idx) => (
                                    <span key={idx} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</span>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {emptyPaddingSlots.map((_, idx) => (
                                    <span key={idx} className="py-3 text-xs font-extrabold text-slate-300">
                                        &nbsp;
                                    </span>
                                ))}
                                {daysInMonthArray.map(day => {
                                    const paddedMonth = String(currentMonth + 1).padStart(2, '0');
                                    const paddedDay = String(day).padStart(2, '0');
                                    const dateKey = `${currentYear}-${paddedMonth}-${paddedDay}`;
                                    
                                    const isSelected = selectedDate === dateKey;
                                    const isToday = systemToday === dateKey;

                                    return (
                                        <button 
                                            key={day}
                                            type="button"
                                            onClick={() => setSelectedDate(dateKey)}
                                            className={`py-3 rounded-xl text-xs font-extrabold transition-all border relative ${
                                                isSelected 
                                                ? 'bg-blue-600 text-white shadow-md border-blue-600 scale-105' 
                                                : isToday
                                                ? 'bg-white border-blue-500 text-blue-600 shadow-sm'
                                                : 'hover:bg-white text-slate-700 bg-transparent border-transparent hover:border-slate-200'
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-black text-slate-900 text-2xl tracking-tighter italic uppercase border-b-4 border-blue-500 pb-2">
                                    Schedule: {selectedDate}
                                </h4>
                                <div className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {filteredAppointments.length} Total
                                </div>
                            </div>
                            
                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 font-bold text-xs uppercase tracking-widest">
                                    <Loader2 className="animate-spin text-blue-500" size={24} />
                                    Synchronizing Appointments...
                                </div>
                            ) : filteredAppointments.length > 0 ? filteredAppointments.map((appt) => (
                                <div key={appt.id} className="flex items-center justify-between p-6 border border-slate-100 rounded-[2rem] bg-white hover:border-blue-500 transition-all group shadow-sm hover:shadow-md">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-slate-900 text-white p-4 rounded-2xl font-black text-sm w-24 text-center group-hover:bg-blue-600 transition-colors shadow-sm">
                                            {appt.appointment_time?.substring(0,5) || "00:00"}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight">
                                                {appt.patient_name || appt.manual_patient_name}
                                            </p>
                                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">
                                                {appt.reason || "General Review"}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleAttendPatient(appt)} 
                                        className="p-5 bg-blue-50 text-slate-900 border border-blue-100 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <ArrowRight size={24} />
                                    </button>
                                </div>
                            )) : (
                                <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30 text-slate-400 font-black uppercase tracking-widest text-[11px] px-6">
                                    {searchQuery ? "No appointments fit your active text filter" : "No Appointments found for this date"}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const KPICard = ({ label, value, icon, sub, color, onClick }) => {
    const borderColors = {
        blue: 'hover:border-blue-500',
        teal: 'hover:border-teal-500',
        green: 'hover:border-green-500',
        purple: 'hover:border-purple-500',
        red: 'hover:border-red-500'
    };

    const textColors = {
        blue: 'text-blue-600',
        teal: 'text-teal-600',
        green: 'text-green-600',
        purple: 'text-purple-600',
        red: 'text-red-600'
    };

    const pulseColors = {
        blue: 'bg-blue-500',
        teal: 'bg-teal-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        red: 'bg-red-500'
    };

    return (
        <div 
            onClick={onClick}
            className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group transition-all cursor-pointer ${borderColors[color] || 'hover:border-slate-500'}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
            </div>
            <h4 className="text-4xl font-black text-slate-950 tracking-tighter italic">{value}</h4>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{label}</p>
            <p className={`text-[9px] font-black uppercase mt-3 flex items-center gap-2 ${textColors[color] || 'text-slate-600'}`}>
                <span className={`w-1 h-1 rounded-full animate-pulse ${pulseColors[color] || 'bg-slate-500'}`} /> {sub}
            </p>
        </div>
    );
};

export default DoctorHome;