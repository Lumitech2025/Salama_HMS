import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    Users, Activity, AlertCircle, Clock, 
    CheckCircle2, Loader2, RefreshCcw, ArrowRight,
    TrendingUp, FlaskConical, ClipboardList, ShieldAlert,
    UserPlus, Search
} from 'lucide-react'; 

// Sidebar
import NurseSidebar from "./NurseSidebar";

// Shared Modules (pointing to your existing sources)
import TriageVitals from "../receptionist/modules/TriagePortal";
import ClinicalEMR from "../oncologist/modules/ClinicalEMR";

// Nurse-Specific Modules
import DrugAdministration from "./modules/DrugAdministration";
import ImagingStudies from "./modules/ImagingStudies";
import LaboratoryResults from "./modules/LaboratoryResults";
import PalliativeCare from "./modules/PalliativeCare";
import ToxicityTracker from "./modules/ToxicityTracker";

const NurseDashboard = () => {
    const [activeModule, setActiveModule] = useState('home'); 
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        awaiting_triage: 0,
        critical_labs: 0,
        completed_today: 0,
        active_chemo: 0
    });

    const fetchNurseData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Queue for TRIAGE station
            const res = await API.get('/queue/', { params: { current_station: 'TRIAGE', status: 'WAITING' } });
            const queueData = res.data.results || res.data;
            setQueue(queueData);

            // Fetch Count of Critical Labs (Safety KPI)
            const labRes = await API.get('/lab-results/', { params: { is_critical: true } });
            
            setStats({
                awaiting_triage: queueData.length,
                critical_labs: (labRes.data.results || labRes.data).length,
                completed_today: 12, 
                active_chemo: 4     
            });
        } catch (err) {
            console.error("Nurse Dashboard Load Error", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchNurseData(); }, [fetchNurseData]);

    const handleStartTriage = (patient) => {
        setSelectedPatient(patient);
        setActiveModule('triage'); 
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-['Inter']">
            <NurseSidebar activeModule={activeModule} setActiveModule={setActiveModule} />

            <main className="flex-1 overflow-y-auto h-screen p-8">
                <div className="max-w-[1600px] mx-auto">
                    
                    {activeModule === 'home' ? (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Header */}
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Nursing Command Center</p>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">Clinical Overview</h1>
                                </div>
                                <div className="flex gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Search queue..." 
                                            className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                                        />
                                    </div>
                                    <button onClick={fetchNurseData} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-blue-50 transition-all group shadow-sm">
                                        <RefreshCcw size={18} className={`${loading ? 'animate-spin' : ''} text-slate-400 group-hover:text-blue-600`} />
                                    </button>
                                </div>
                            </div>

                            {/* Analytics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <KpiCard icon={<Clock className="text-blue-500"/>} label="Waitlist" value={stats.awaiting_triage} color="blue" />
                                <KpiCard icon={<ShieldAlert className="text-rose-500"/>} label="Critical Alerts" value={stats.critical_labs} color="rose" />
                                <KpiCard icon={<Activity className="text-teal-500"/>} label="Vitals Done" value={stats.completed_today} color="teal" />
                                <KpiCard icon={<FlaskConical className="text-amber-500"/>} label="Chemo Rounds" value={stats.active_chemo} color="amber" />
                            </div>

                            {/* Triage Queue Table */}
                            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden min-h-[400px]">
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                            <ClipboardList size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Awaiting Assessment</h3>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Pending Clinical Intake</p>
                                        </div>
                                    </div>
                                    <span className="px-5 py-2 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200">
                                        {queue.length} Active in Queue
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity & Token</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Wait Time</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Station Origin</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="4" className="py-20 text-center">
                                                        <Loader2 className="animate-spin mx-auto text-blue-500 mb-2" size={32} />
                                                        <p className="text-[10px] font-black text-slate-400 uppercase">Synchronizing Live Data...</p>
                                                    </td>
                                                </tr>
                                            ) : queue.length > 0 ? (
                                                queue.map(p => (
                                                    <tr key={p.id} className="hover:bg-blue-50/20 transition-all group">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md group-hover:scale-110 transition-transform">
                                                                    {p.patient_name?.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{p.patient_name}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="px-2 py-0.5 bg-blue-50 text-[9px] font-black text-blue-600 rounded border border-blue-100 uppercase">
                                                                            Token: #{p.token_id}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                                                                <Clock size={12} className="text-amber-500" />
                                                                <span className="text-[10px] font-black text-slate-600">~12 MINS</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reception Desk</p>
                                                            <p className="text-[9px] font-bold text-slate-400 italic">Self-Check In</p>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <button 
                                                                onClick={() => handleStartTriage(p)}
                                                                className="bg-[#020617] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 ml-auto shadow-lg"
                                                            >
                                                                Attend Patient <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="py-24 text-center">
                                                        <Users size={48} className="mx-auto text-slate-200 mb-4" />
                                                        <h4 className="text-sm font-black text-slate-400 uppercase italic">The Triage Queue is Clear</h4>
                                                        <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">New registrations will appear here automatically</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Module Rendering with Back Button */
                        <div className="space-y-6">
                            <button 
                                onClick={() => setActiveModule('home')}
                                className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                            >
                                <RefreshCcw size={14} /> Back to Command Center
                            </button>
                            
                            <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 min-h-[75vh]">
                                {activeModule === 'triage' && <TriageVitals selectedPatientFromParent={selectedPatient} />}
                                {activeModule === 'history' && <ClinicalEMR patient={selectedPatient} />}
                                {activeModule === 'labs' && <LaboratoryResults patient={selectedPatient} />}
                                {activeModule === 'palliative' && <PalliativeCare patient={selectedPatient} />}
                                {activeModule === 'administration' && <DrugAdministration patient={selectedPatient} />}
                                {activeModule === 'toxicity' && <ToxicityTracker patient={selectedPatient} />}
                                {activeModule === 'imaging' && <ImagingStudies patient={selectedPatient} />}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// Reusable KPI Component with Pulse effect for Critical
const KpiCard = ({ icon, label, value, color }) => {
    const theme = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100 animate-pulse-subtle",
        teal: "bg-teal-50 text-teal-600 border-teal-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100"
    };
    return (
        <div className={`${theme[color]} p-8 rounded-[2.5rem] border-2 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
            <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:rotate-12 transition-transform">{icon}</div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
            </div>
            <p className="text-5xl font-black tracking-tighter relative z-10">{value}</p>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-all">
                {React.cloneElement(icon, { size: 120 })}
            </div>
        </div>
    );
};

export default NurseDashboard;