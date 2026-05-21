import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  History, Activity, FlaskConical, Pill, FileText, 
  ImageIcon, Calendar, User, ChevronRight, Search, 
  Filter, Clock, Download, ExternalLink, Loader2, RefreshCcw, AlertCircle
} from 'lucide-react';

const ClinicalEMR = ({ patient }) => {
    const [activeCategory, setActiveCategory] = useState('timeline');
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState({
        vitals: [],
        labs: [],
        imaging: [],
        prescriptions: [],
        clinicalNotes: []
    });

    const fetchMedicalHistory = useCallback(async () => {
        if (!patient) return;
        setLoading(true);
        try {
            const patientId = patient.patient || patient.id;
            
            const [vitalsRes, labsRes, notesRes, scriptRes] = await Promise.all([
                API.get(`/vitals?patient=${patientId}`),
                API.get(`/lab-results?patient=${patientId}`),
                API.get(`/clinical-notes?patient=${patientId}`),
                API.get(`/prescriptions?patient=${patientId}`)
            ])

            setHistoryData({
                vitals: vitalsRes.data.results || vitalsRes.data || [],
                labs: labsRes.data.results || labsRes.data || [],
                clinicalNotes: notesRes.data.results || notesRes.data || [],
                prescriptions: scriptRes.data.results || scriptRes.data || [],
                imaging: [] 
            });
        } catch (err) {
            console.error("Failed to load medical history", err);
        } finally {
            setLoading(false);
        }
    }, [patient]);

    useEffect(() => { fetchMedicalHistory(); }, [fetchMedicalHistory]);

    const generateTimeline = () => {
        const events = [
            ...historyData.vitals.map(v => ({ ...v, type: 'vitals', icon: <Activity size={16}/>, color: 'blue' })),
            ...historyData.labs.map(l => ({ ...l, type: 'lab', icon: <FlaskConical size={16}/>, color: 'teal' })),
            ...historyData.clinicalNotes.map(n => ({ ...n, type: 'note', icon: <FileText size={16}/>, color: 'amber' })),
            ...historyData.prescriptions.map(p => ({ ...p, type: 'prescription', icon: <Pill size={16}/>, color: 'purple' }))
        ];
        return events.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20 p-4">
            
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-slate-100 pb-8">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Longitudinal EMR</h2>
                    <p className="text-slate-500 font-medium italic">Complete clinical dossier for <span className="text-blue-600 font-bold uppercase">{patient?.patient_name}</span></p>
                </div>

                <nav className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 shadow-inner border border-slate-200">
                    <TabBtn active={activeCategory === 'timeline'} onClick={() => setActiveCategory('timeline')} icon={<History size={14}/>} label="Timeline" />
                    <TabBtn active={activeCategory === 'vitals'} onClick={() => setActiveCategory('vitals')} icon={<Activity size={14}/>} label="Vitals" />
                    <TabBtn active={activeCategory === 'labs'} onClick={() => setActiveCategory('labs')} icon={<FlaskConical size={14}/>} label="Laboratory" />
                    <TabBtn active={activeCategory === 'prescriptions'} onClick={() => setActiveCategory('prescriptions')} icon={<Pill size={14}/>} label="Medications" />
                    <TabBtn active={activeCategory === 'notes'} onClick={() => setActiveCategory('notes')} icon={<FileText size={14}/>} label="Clinical Notes" />
                    <button onClick={fetchMedicalHistory} className="p-3 text-slate-400 hover:text-blue-600 transition-all">
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </nav>
            </div>

            {loading ? (
                <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Reconstructing Medical Files...</p>
                </div>
            ) : (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    {activeCategory === 'timeline' && (
                        <div className="space-y-2 max-w-4xl mx-auto w-full">
                            {generateTimeline().length > 0 ? generateTimeline().map((event, idx) => (
                                <TimelineItem key={idx} event={event} />
                            )) : <EmptyState />}
                        </div>
                    )}

                    {activeCategory === 'vitals' && (
                        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        <th className="p-8">Date/Time</th>
                                        <th className="p-8">BP (mmHg)</th>
                                        <th className="p-8">HR/Temp</th>
                                        <th className="p-8">SpO2</th>
                                        <th className="p-8">BMI/BSA</th>
                                        <th className="p-8 text-right">Captured By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {historyData.vitals.map((v, i) => (
                                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-8 text-xs font-black text-slate-900 italic">
                                                {new Date(v.created_at).toLocaleDateString('en-GB')}
                                                <span className="block text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(v.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className="p-8 text-sm font-black text-blue-600">{v.systolic_bp}/{v.diastolic_bp}</td>
                                            <td className="p-8 text-xs font-bold text-slate-800">{v.heart_rate} BPM / {v.temperature}°C</td>
                                            <td className="p-8 text-xs font-black text-teal-600">{v.oxygen_saturation_percentage || v.spo2}%</td>
                                            <td className="p-8 text-[10px] uppercase font-black text-slate-500">
                                                BMI: <span className="text-slate-900">{v.bmi}</span> <br/> 
                                                BSA: <span className="text-slate-900">{v.bsa} m²</span>
                                            </td>
                                            <td className="p-8 text-[10px] text-right font-black uppercase text-slate-400">
                                                {v.recorded_by_name || "Triage Staff"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeCategory === 'labs' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {historyData.labs.map((l, i) => (
                                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-all">
                                                <FlaskConical size={20}/>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 uppercase text-lg tracking-tighter">{l.test_label || l.test_name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(l.created_at).toLocaleDateString('en-GB')}</p>
                                            </div>
                                        </div>
                                        {l.is_critical && <AlertCircle size={20} className="text-rose-500 animate-pulse" />}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                                        {Object.entries(l.parameters || {}).map(([key, val]) => (
                                            <div key={key} className="flex justify-between border-b border-slate-200/50 py-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{key.replace('_', ' ')}</span>
                                                <span className="text-[10px] font-black text-slate-800 uppercase">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] font-medium italic text-slate-500">Note: {l.technician_notes || "No technical caveat provided."}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeCategory === 'notes' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {historyData.clinicalNotes.map((n, i) => (
                                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="px-4 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100">
                                            {n.note_type_display || n.note_type}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(n.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic border-l-4 border-slate-100 pl-6 py-2">
                                        {n.content}
                                    </p>
                                    <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                                        <User size={12}/> Authenticated by: {n.author_name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const TabBtn = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${
            active ? 'bg-white text-blue-600 shadow-lg border border-slate-200' : 'text-slate-500 hover:text-slate-900'
        }`}
    >
        {icon} {label}
    </button>
);

const TimelineItem = ({ event }) => {
    const isVitals = event.type === 'vitals';
    const isLab = event.type === 'lab';
    
    return (
        <div className="relative pl-12 pb-12 group">
            <div className="absolute left-[19px] top-2 bottom-0 w-0.5 bg-slate-100 group-last:bg-transparent" />
            <div className={`absolute left-0 top-1 w-10 h-10 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-blue-500 group-hover:text-blue-500 transition-all z-10 shadow-sm`}>
                {event.icon}
            </div>

            <div className={`bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all ${event.is_critical ? 'border-rose-200' : ''}`}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            {new Date(event.created_at || event.date).toLocaleString('en-GB')}
                        </span>
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                            {isVitals ? 'Physical Assessment' : isLab ? (event.test_label || event.test_name) : (event.note_type_display || 'Clinical Note')}
                        </h4>
                    </div>
                    {event.is_critical && (
                        <span className="bg-rose-500 text-white text-[9px] font-black px-4 py-1 rounded-full uppercase animate-pulse">Critical Result</span>
                    )}
                </div>

                <div className="bg-slate-50/80 rounded-2xl p-6 text-sm text-slate-600 font-medium">
                    {isVitals && (
                        <div className="grid grid-cols-3 gap-4">
                            <div><p className="text-[8px] font-black text-slate-400 uppercase">BP</p><p className="text-sm font-black text-blue-600">{event.systolic_bp}/{event.diastolic_bp}</p></div>
                            <div><p className="text-[8px] font-black text-slate-400 uppercase">SpO2</p><p className="text-sm font-black text-teal-600">{event.oxygen_saturation_percentage || event.spo2}%</p></div>
                            <div><p className="text-[8px] font-black text-slate-400 uppercase">Weight</p><p className="text-sm font-black text-slate-800">{event.weight}kg</p></div>
                        </div>
                    )}
                    {isLab && (
                        <div className="grid grid-cols-2 gap-2">
                             {Object.entries(event.parameters || {}).map(([k, v]) => (
                                <div key={k} className="flex justify-between text-[11px] border-b border-slate-200/50 pb-1">
                                    <span className="font-bold text-slate-400 uppercase">{k.replace('_', ' ')}</span>
                                    <span className="font-black text-slate-900 uppercase">{v}</span>
                                </div>
                             ))}
                        </div>
                    )}
                    {/* FIXED: Changed n.content to event.content */}
                    {event.type === 'note' && event.content}
                    {event.type === 'prescription' && `Ordered: ${event.medication_name}`}
                </div>

                <div className="mt-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-[10px] text-teal-400 font-black border border-slate-700">
                        {event.author_name?.charAt(0) || event.recorded_by_name?.charAt(0) || "S"}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Verified by {event.author_name || event.recorded_by_name || "Medical Staff"}
                    </span>
                </div>
            </div>
        </div>
    );
};

const EmptyState = () => (
    <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
        <Activity size={48} className="mx-auto text-slate-200 mb-4 opacity-50" />
        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">No historical records currently archived.</p>
    </div>
);

export default ClinicalEMR;