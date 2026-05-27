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
import NurseRequisitionsTab from './modules/NurseRequisitionsTab';

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
                API.get('/vitals') 
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
        <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
            <NurseSidebar activeModule={activeModule} setActiveModule={setActiveModule} />

            <main className="flex-1 overflow-y-auto h-screen p-8">
                <div className="max-w-[1600px] mx-auto">
                    
                    {activeModule === 'home' ? (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Header */}
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Nursing Operations</p>
                                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">Clinical Dashboard</h1>
                                </div>
                                <div className="flex gap-4">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="Search patient queue..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-80 transition-all shadow-xs"
                                        />
                                    </div>
                                    <button onClick={fetchNurseData} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 transition-all shadow-xs group cursor-pointer">
                                        <RefreshCcw size={18} className={`${loading ? 'animate-spin' : ''} text-slate-500 group-hover:text-blue-600`} />
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

                            {/* Triage Queue Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden min-h-[500px]">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-sm">
                                            <Users size={22} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Patient Queue</h3>
                                            <p className="text-xs text-slate-400 mt-0.5">Awaiting physical baseline assessment</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-xs font-semibold text-slate-700 tracking-wider uppercase">Live Feed</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/80 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Queue ID / Token</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Workflow Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="3" className="py-32 text-center text-slate-400 font-medium text-sm">
                                                        Updating Patient Registry...
                                                    </td>
                                                </tr>
                                            ) : filteredQueue.length > 0 ? (
                                                filteredQueue.map(p => (
                                                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-10 w-10 bg-slate-900 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-xs">
                                                                    {p.patient_name?.charAt(0)}
                                                                </div>
                                                                <p className="font-semibold text-slate-900 text-sm">{p.patient_name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-md text-xs font-bold text-blue-600">
                                                                #{p.token_id}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button 
                                                                onClick={() => handleAttendPatient(p)}
                                                                className="bg-slate-900 text-white px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-blue-600 transition-colors flex items-center gap-2 ml-auto shadow-xs"
                                                            >
                                                                Attend Patient <ArrowRight size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="py-32 text-center">
                                                        <ClipboardList size={40} className="mx-auto text-slate-300 mb-2" />
                                                        <h4 className="text-sm font-semibold text-slate-400">Queue is currently empty</h4>
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
                                    className="group flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-600 hover:text-blue-600 font-bold text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                                >
                                    <RefreshCcw size={13} /> Back to Dashboard
                                </button>
                                {selectedPatient && (
                                    <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-l-4 border-l-blue-500 shadow-sm">
                                        Current Context: {selectedPatient.patient_name}
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 min-h-[75vh] animate-in slide-in-from-bottom-4 duration-500">
                                {activeModule === 'triage' && <TriageVitals selectedPatientFromParent={selectedPatient} />}
                                {activeModule === 'history' && <ClinicalEMR patient={selectedPatient} />}
                                {activeModule === 'labs' && <LaboratoryResults patient={selectedPatient} />}
                                {activeModule === 'palliative' && <PalliativeCare patient={selectedPatient} />}
                                {activeModule === 'administration' && <DrugAdministration patient={selectedPatient} />}
                                {activeModule === 'toxicity' && <ToxicityTracker patient={selectedPatient} />}
                                {activeModule === 'imaging' && <ImagingStudies patient={selectedPatient} />}
                                {activeModule === 'requisitions' && <NurseRequisitionsTab />}
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
        blue: "bg-blue-50/60 text-blue-600 border-blue-100",
        rose: "bg-rose-50/60 text-rose-600 border-rose-100",
        teal: "bg-teal-50/60 text-teal-600 border-teal-100",
        amber: "bg-amber-50/60 text-amber-600 border-amber-100"
    };
    return (
        <div className={`${theme[color]} p-6 rounded-2xl border shadow-xs relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300`}>
            <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2 bg-white rounded-xl shadow-xs">{icon}</div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 relative z-10">{value}</p>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-500">
                {React.cloneElement(icon, { size: 100 })}
            </div>
        </div>
    );
};

export default NurseDashboard;