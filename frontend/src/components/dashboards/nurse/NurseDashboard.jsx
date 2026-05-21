import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    Users, Activity, AlertCircle, Clock, 
    CheckCircle2, Loader2, RefreshCcw, ArrowRight,
    TrendingUp, FlaskConical, ClipboardList, ShieldAlert,
    Search, Layout, Beaker
} from 'lucide-react'; 

// Sidebar
import NurseSidebar from "./NurseSidebar";

// Shared Modules
import TriageVitals from "../receptionist/modules/TriagePortal";
import ClinicalEMR from "../oncologist/modules/ClinicalEMR";

// Nurse-Specific Modules
import DrugAdministration from "./modules/DrugAdministration";
import ImagingStudies from "./modules/ImagingStudies";
import LaboratoryResults from "../oncologist/modules/LaboratoryResults";
import PalliativeCare from "./modules/PalliativeCare";
import ToxicityTracker from "./modules/ToxicityTracker";

const NurseDashboard = () => {
    const [activeModule, setActiveModule] = useState('home'); 
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [queue, setQueue] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        awaiting_triage: 0,
        critical_alerts: 0,
        completed_vitals: 0,
        pending_labs: 0
    });

    const fetchNurseData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Triage Queue (Patients waiting for Nurse)
            const queueRes = await API.get('/queue', { params: { current_station: 'TRIAGE', status: 'WAITING' } });
            const queueData = queueRes.data.results || queueRes.data;
            setQueue(Array.isArray(queueData) ? queueData : []);

            // 2. Fetch Functional Stats
            const [labRes, criticalRes, vitalsRes] = await Promise.all([
                API.get('/lab-results', { params: { status: 'PENDING' } }),
                API.get('/lab-results', { params: { is_critical: true } }),
                API.get('/vitals') // In production, filter this by today's date on the backend
            ]);
            
            setStats({
                awaiting_triage: queueData.length,
                critical_alerts: (criticalRes.data.results || criticalRes.data).length,
                completed_vitals: (vitalsRes.data.results || vitalsRes.data).length,
                pending_labs: (labRes.data.results || labRes.data).length
            });
        } catch (err) {
            console.error("Nurse Dashboard Load Error", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Refresh data when mounting or when switching back to 'home'
    useEffect(() => { 
        if (activeModule === 'home') fetchNurseData(); 
    }, [fetchNurseData, activeModule]);

    const handleAttendPatient = (patient) => {
        setSelectedPatient(patient);
        setActiveModule('triage'); 
    };

    const filteredQueue = queue.filter(p => 
        p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.token_id?.toString().includes(searchTerm)
    );

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
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Nursing Operations</p>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Clinical Dashboard</h1>
                                </div>
                                <div className="flex gap-4">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="Search queue..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[1.25rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 w-80 transition-all shadow-sm"
                                        />
                                    </div>
                                    <button onClick={fetchNurseData} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-blue-50 transition-all shadow-sm group">
                                        <RefreshCcw size={20} className={`${loading ? 'animate-spin' : ''} text-slate-400 group-hover:text-blue-600`} />
                                    </button>
                                </div>
                            </div>

                            {/* Functional KPI Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <KpiCard icon={<Clock className="text-blue-500"/>} label="Waitlist" value={stats.awaiting_triage} color="blue" />
                                <KpiCard icon={<ShieldAlert className="text-rose-500"/>} label="Critical Alerts" value={stats.critical_alerts} color="rose" />
                                <KpiCard icon={<CheckCircle2 className="text-teal-500"/>} label="Vitals Recorded" value={stats.completed_vitals} color="teal" />
                                <KpiCard icon={<Beaker className="text-amber-500"/>} label="Pending Labs" value={stats.pending_labs} color="amber" />
                            </div>

                            {/* 3-Column Triage Queue Table */}
                            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden min-h-[500px]">
                                <div className="p-10 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-blue-600 rounded-[1.5rem] text-white shadow-lg">
                                            <Users size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Patient Queue</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Awaiting physical assessment</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Live Feed</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/80 border-b border-slate-100">
                                            <tr>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Name</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Queue ID / Token</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Workflow Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {loading ? (
                                                <tr><td colSpan="3" className="py-32 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">Updating Patient Registry...</td></tr>
                                            ) : filteredQueue.length > 0 ? (
                                                filteredQueue.map(p => (
                                                    <tr key={p.id} className="hover:bg-blue-50/30 transition-all group">
                                                        <td className="px-10 py-8">
                                                            <div className="flex items-center gap-5">
                                                                <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-md">
                                                                    {p.patient_name?.charAt(0)}
                                                                </div>
                                                                <p className="font-black text-slate-900 uppercase text-base tracking-tight">{p.patient_name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <span className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-blue-600 shadow-sm">
                                                                #{p.token_id}
                                                            </span>
                                                        </td>
                                                        <td className="px-10 py-8 text-right">
                                                            <button 
                                                                onClick={() => handleAttendPatient(p)}
                                                                className="bg-[#020617] text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all flex items-center gap-3 ml-auto shadow-md group-hover:scale-105"
                                                            >
                                                                Attend Patient <ArrowRight size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="py-32 text-center">
                                                        <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
                                                        <h4 className="text-sm font-black text-slate-300 uppercase italic tracking-tighter">Queue is currently empty</h4>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <button 
                                    onClick={() => setActiveModule('home')}
                                    className="group flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-slate-500 hover:text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm"
                                >
                                    <RefreshCcw size={14} /> Back to Dashboard
                                </button>
                                {selectedPatient && (
                                    <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-l-4 border-l-blue-500 shadow-lg">
                                        Current Context: {selectedPatient.patient_name}
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 min-h-[75vh] animate-in slide-in-from-bottom-6 duration-700">
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

const KpiCard = ({ icon, label, value, color }) => {
    const theme = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
        teal: "bg-teal-50 text-teal-600 border-teal-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100"
    };
    return (
        <div className={`${theme[color]} p-8 rounded-[2.5rem] border-2 shadow-sm relative overflow-hidden group hover:scale-[1.03] transition-all duration-500`}>
            <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 bg-white rounded-2xl shadow-md">{icon}</div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
            </div>
            <p className="text-5xl font-black tracking-tighter relative z-10">{value}</p>
            <div className="absolute -right-6 -bottom-6 opacity-[0.04] rotate-12 group-hover:rotate-0 transition-all duration-700">
                {React.cloneElement(icon, { size: 140 })}
            </div>
        </div>
    );
};

export default NurseDashboard;
