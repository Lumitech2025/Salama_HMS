import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  History, Activity, FlaskConical, Pill, FileText, 
  Image as ImageIcon, Calendar, User, ChevronRight, Search, 
  Filter, Clock, Download, ExternalLink, Loader2
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
            
            // Concurrent fetch of all historical domains
            const [vitalsRes, labsRes, notesRes, scriptRes] = await Promise.all([
                API.get(`/vital-signs/?patient=${patientId}`),
                API.get(`/lab-results/?patient=${patientId}`),
                API.get(`/clinical-notes/?patient=${patientId}`),
                API.get(`/prescriptions/?patient=${patientId}`)
            ]);

            setHistoryData({
                vitals: vitalsRes.data.results || [],
                labs: labsRes.data.results || [],
                clinicalNotes: notesRes.data.results || [],
                prescriptions: scriptRes.data.results || [],
                imaging: [] // Connect to your specific imaging endpoint if available
            });
        } catch (err) {
            console.error("Failed to load medical history", err);
        } finally {
            setLoading(false);
        }
    }, [patient]);

    useEffect(() => {
        fetchMedicalHistory();
    }, [fetchMedicalHistory]);

    // Flatten all events into a single sorted timeline
    const generateTimeline = () => {
        const events = [
            ...historyData.vitals.map(v => ({ ...v, type: 'vitals', icon: <Activity />, color: 'blue' })),
            ...historyData.labs.map(l => ({ ...l, type: 'lab', icon: <FlaskConical />, color: 'teal' })),
            ...historyData.clinicalNotes.map(n => ({ ...n, type: 'note', icon: <FileText />, color: 'amber' })),
            ...historyData.prescriptions.map(p => ({ ...p, type: 'prescription', icon: <Pill />, color: 'purple' }))
        ];

        return events.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
            
            {/* Header & Category Toggles */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Longitudinal EMR</h2>
                    <p className="text-slate-500 font-medium italic">Comprehensive clinical history for {patient?.patient_name}</p>
                </div>

                <nav className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-2 shadow-inner">
                    <TabBtn active={activeCategory === 'timeline'} onClick={() => setActiveCategory('timeline')} icon={<History size={14}/>} label="Timeline" />
                    <TabBtn active={activeCategory === 'vitals'} onClick={() => setActiveCategory('vitals')} icon={<Activity size={14}/>} label="Vitals" />
                    <TabBtn active={activeCategory === 'labs'} onClick={() => setActiveCategory('labs')} icon={<FlaskConical size={14}/>} label="Lab Results" />
                    <TabBtn active={activeCategory === 'imaging'} onClick={() => setActiveCategory('imaging')} icon={<ImageIcon size={14}/>} label="Imaging" />
                    <TabBtn active={activeCategory === 'prescriptions'} onClick={() => setActiveCategory('prescriptions')} icon={<Pill size={14}/>} label="Orders" />
                    <TabBtn active={activeCategory === 'notes'} onClick={() => setActiveCategory('notes')} icon={<FileText size={14}/>} label="Notes" />
                </nav>
            </div>

            {loading ? (
                <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Reconstructing Medical Files...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {activeCategory === 'timeline' && (
                        <div className="space-y-6 max-w-4xl mx-auto w-full">
                            {generateTimeline().map((event, idx) => (
                                <TimelineItem key={idx} event={event} />
                            ))}
                        </div>
                    )}

                    {activeCategory === 'vitals' && (
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="p-8">Date/Time</th>
                                        <th className="p-8">BP (mmHg)</th>
                                        <th className="p-8">HR/Temp</th>
                                        <th className="p-8">SpO2</th>
                                        <th className="p-8">BMI/BSA</th>
                                        <th className="p-8">Practitioner</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                                    {historyData.vitals.map((v, i) => (
                                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-8 text-xs font-bold text-slate-900">
                                                {new Date(v.created_at).toLocaleDateString()}
                                                <span className="block text-[10px] text-slate-400 font-normal">{new Date(v.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className="p-8 text-sm font-black text-blue-600">{v.systolic_bp}/{v.diastolic_bp}</td>
                                            <td className="p-8 text-xs">{v.heart_rate} bpm / {v.temperature}°C</td>
                                            <td className="p-8 text-xs font-bold">{v.oxygen_saturation_percentage}%</td>
                                            <td className="p-8 text-[10px] uppercase font-bold text-slate-500">
                                                BMI: {v.bmi || '--'} <br/> BSA: {v.bsa || '--'} m²
                                            </td>
                                            <td className="p-8 text-xs italic">{v.recorded_by_name || "Triage Nurse"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Labs, Notes, and Prescriptions would follow a similar specialized table or card pattern */}
                </div>
            )}
        </div>
    );
};

// UI Sub-components
const TabBtn = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
        }`}
    >
        {icon} {label}
    </button>
);

const TimelineItem = ({ event }) => {
    const formattedDate = new Date(event.created_at || event.date).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    return (
        <div className="relative pl-12 pb-10 group">
            {/* Timeline Line */}
            <div className="absolute left-[19px] top-2 bottom-0 w-0.5 bg-slate-100 group-last:bg-transparent" />
            
            {/* Timeline Dot */}
            <div className={`absolute left-0 top-1 w-10 h-10 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-blue-500 group-hover:text-blue-500 transition-all z-10 shadow-sm shadow-slate-100`}>
                {event.icon}
            </div>

            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <Clock size={10}/> {formattedDate}
                        </span>
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                            {event.type === 'vitals' && 'Physical Assessment'}
                            {event.type === 'lab' && (event.test_name || 'Laboratory Report')}
                            {event.type === 'note' && (event.note_type?.replace('_', ' ') || 'Clinical Note')}
                            {event.type === 'prescription' && 'Medication Order'}
                        </h4>
                    </div>
                    <div className="flex gap-2">
                         <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Download size={16}/></button>
                         <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><ExternalLink size={16}/></button>
                    </div>
                </div>

                {/* Event specific data summary */}
                <div className="bg-slate-50/50 rounded-2xl p-4 text-sm text-slate-600 font-medium">
                    {event.type === 'vitals' && `Vitals recorded: BP ${event.systolic_bp}/${event.diastolic_bp}, HR ${event.heart_rate} bpm.`}
                    {event.type === 'lab' && `Technician Narrative: ${event.technician_narrative || "Results pending review."}`}
                    {event.type === 'note' && event.content}
                    {event.type === 'prescription' && `Ordered: ${event.medication_name || "Chemotherapy Protocol"}`}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-white font-black">
                        {event.practitioner_name?.charAt(0) || "D"}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        Authenticated by: {event.recorded_by_name || event.prescribed_by_name || "Medical Staff"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ClinicalEMR;