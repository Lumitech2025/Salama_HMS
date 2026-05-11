import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Calculator, Activity, Thermometer, Heart, 
  Wind, Scale, ChevronDown, User, AlertCircle, 
  CheckCircle2, Loader2, RefreshCcw, FlaskConical, MessageSquare, ArrowRight, Pill, Save
} from 'lucide-react';

const OncologyVitals = ({ selectedPatientFromParent, onTabSwitch }) => {
    const [queue, setQueue] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(selectedPatientFromParent || null);
    const [loading, setLoading] = useState(false);
    const [vitals, setVitals] = useState(null);
    const [hasLabResults, setHasLabResults] = useState(false);
    const [bsa, setBsa] = useState(0);
    const [bmi, setBmi] = useState(0);
    const [doctorNote, setDoctorNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // 1. Fetch patients currently in the DOCTOR queue
    const fetchQueue = useCallback(async () => {
        try {
            const res = await API.get('/queue/?current_station=DOCTOR');
            const data = res.data.results || res.data;
            setQueue(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Queue fetch error", err);
        }
    }, []);

    // 2. Fetch specific dynamic data for the chosen patient from backend models
    const fetchPatientData = useCallback(async (patient) => {
        if (!patient) return;
        setLoading(true);
        try {
            const patientId = patient.patient || patient.id;
            
            const [vitalsRes, labRes] = await Promise.all([
                API.get(`/vital-signs/?patient=${patientId}`),
                API.get(`/lab-results/?patient=${patientId}`)
            ]);

            // Handle Vitals mapping from backend VitalSign model
            const vData = vitalsRes.data.results || vitalsRes.data;
            const latestVitals = Array.isArray(vData) ? vData[0] : vData;
            
            if (latestVitals) {
                setVitals(latestVitals);
                
                // Dynamic BMI Calculation: kg / (m^2)
                const heightInMeters = latestVitals.height / 100;
                const calculatedBmi = (latestVitals.weight / (heightInMeters * heightInMeters)).toFixed(1);
                setBmi(latestVitals.bmi || calculatedBmi);

                // BSA Mosteller Calculation: sqrt((h*w)/3600)
                const calculatedBsa = Math.sqrt((latestVitals.height * latestVitals.weight) / 3600).toFixed(2);
                setBsa(latestVitals.bsa || calculatedBsa);
            } else {
                setVitals(null);
                setBmi(0);
                setBsa(0);
            }

            // Check LaboratoryResult model for existing data
            const lData = labRes.data.results || labRes.data;
            setHasLabResults(lData && lData.length > 0);
        } catch (err) {
            console.error("Clinical fetch error", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);

    useEffect(() => {
        if (selectedPatientFromParent) {
            setSelectedPatient(selectedPatientFromParent);
            fetchPatientData(selectedPatientFromParent);
        }
    }, [selectedPatientFromParent, fetchPatientData]);

    const handlePatientChange = (patientId) => {
        const patient = queue.find(p => p.id === parseInt(patientId));
        if (patient) {
            setSelectedPatient(patient);
            fetchPatientData(patient);
        }
    };

    const handleSaveNotes = async () => {
        if (!doctorNote) return;
        setIsSaving(true);
        try {
            const patientId = selectedPatient.patient || selectedPatient.id;
            // Saving to patient record (ClinicalNote model assumed)
            await API.post(`/clinical-notes/`, {
                patient: patientId,
                note_type: 'ONCOLOGY_ASSESSMENT',
                content: doctorNote
            });
            alert("Clinical notes saved successfully.");
        } catch (err) {
            alert("Failed to save notes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReferToLab = async () => {
        try {
            // PATCH to update queue station to LABORATORY
            await API.patch(`/queue/${selectedPatient.id}/`, { 
                current_station: 'LABORATORY',
                status: 'AWAITING_LAB' 
            });
            alert("Patient referred to Lab Technician. Returning to dashboard.");
            onTabSwitch('home'); 
        } catch (err) {
            alert("Referral failed.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
            
            {/* SELECTION HUB */}
            <div className="bg-[#020617] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex items-center gap-4 flex-1 w-full">
                        <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500"><User size={24} /></div>
                        <div className="flex-1 relative">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Oncology Patient Selection</p>
                            <select 
                                className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                onChange={(e) => handlePatientChange(e.target.value)}
                                value={selectedPatient?.id || ''}
                            >
                                <option value="" disabled>Select patient from doctor queue...</option>
                                {queue.map(p => (
                                    <option key={p.id} value={p.id}>{p.patient_name} — {p.token_id}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 bottom-4 text-slate-500 pointer-events-none" size={18} />
                        </div>
                        <button onClick={fetchQueue} className="p-4 hover:bg-white/5 rounded-2xl transition-all self-end mb-1"><RefreshCcw size={20} className="text-slate-500" /></button>
                    </div>
                </div>
            </div>

            {selectedPatient ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-500">
                    
                    {/* LEFT: DYNAMIC CLINICAL DATA */}
                    <main className="lg:col-span-8 space-y-6">
                        <div className="bg-white border border-slate-100 rounded-[3.5rem] p-10 shadow-xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <Activity className="text-blue-600" size={32} />
                                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Clinical Vitals</h3>
                                </div>
                                <div className="flex gap-2">
                                    <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">BMI: {bmi || '--'}</span>
                                    <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 italic">Captured Today</span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" size={40} /></div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <VitalCard 
                                        icon={<Heart className="text-rose-500"/>} 
                                        label="Blood Pressure" 
                                        value={vitals ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : '--/--'} 
                                        unit="mmHg" 
                                    />
                                    <VitalCard icon={<Activity className="text-blue-500"/>} label="Heart Rate" value={vitals?.heart_rate || '--'} unit="bpm" />
                                    <VitalCard icon={<Thermometer className="text-orange-500"/>} label="Temperature" value={vitals?.temperature || '--'} unit="°C" />
                                    <VitalCard 
                                        icon={<Wind className="text-teal-500"/>} 
                                        label="Oxygen Sat" 
                                        value={vitals ? `${vitals.oxygen_saturation_percentage}` : '--'} 
                                        unit="%" 
                                    />
                                    <VitalCard icon={<Scale className="text-indigo-500"/>} label="Weight" value={vitals?.weight || '--'} unit="kg" />
                                    <VitalCard icon={<Activity className="text-slate-500"/>} label="Height" value={vitals?.height || '--'} unit="cm" />
                                </div>
                            )}
                        </div>

                        {/* DOCTOR NOTES */}
                        <div className="bg-[#020617] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="text-blue-400" size={20} />
                                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Clinical Observation Notes</h4>
                                </div>
                                <button 
                                    onClick={handleSaveNotes}
                                    disabled={isSaving || !doctorNote}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save Observations
                                </button>
                            </div>
                            <textarea 
                                className="w-full bg-slate-900 border border-white/10 rounded-[2rem] p-8 text-slate-200 font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none relative z-10 transition-all"
                                rows="4"
                                placeholder="Enter assessment based on triage results..."
                                value={doctorNote}
                                onChange={(e) => setDoctorNote(e.target.value)}
                            />
                        </div>

                        {/* BSA CALCULATION */}
                        <section className="bg-blue-600 p-10 rounded-[3.5rem] text-white shadow-2xl flex justify-between items-center relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.3em] mb-3">Oncology Standard BSA</p>
                                <h3 className="text-xl font-bold max-w-[250px] leading-tight">Body Surface Area for cytotoxic dosage calculation</h3>
                            </div>
                            <div className="text-right relative z-10">
                                <div className="text-7xl font-black tracking-tighter italic">{bsa} <span className="text-2xl font-light not-italic ml-1">m²</span></div>
                                <p className="text-[9px] font-black bg-white/20 inline-block px-3 py-1 rounded-full uppercase mt-4 tracking-widest italic">Mosteller Calculation</p>
                            </div>
                            <Calculator size={150} className="absolute -left-10 -bottom-10 text-white/[0.05]" />
                        </section>
                    </main>

                    {/* RIGHT SIDEBAR: WORKFLOW LOGIC */}
                    <aside className="lg:col-span-4 space-y-6">
                        <div className="bg-[#020617] text-white p-8 rounded-[3rem] shadow-2xl sticky top-8 border border-white/5">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-2 border-b border-white/5 pb-4">
                                <CheckCircle2 size={16}/> Case Finalization
                            </h3>
                            
                            <div className="space-y-4">
                                {hasLabResults ? (
                                    <button 
                                        onClick={() => onTabSwitch('lab')}
                                        className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 group"
                                    >
                                        <FlaskConical size={18} className="group-hover:rotate-12 transition-transform" /> View Lab Results
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleReferToLab}
                                        className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all shadow-xl flex items-center justify-center gap-3 group"
                                    >
                                        <FlaskConical size={18} className="group-hover:shake transition-transform" /> Visit the Lab
                                    </button>
                                )}

                                <button 
                                    onClick={() => onTabSwitch('prescriptions')}
                                    className="w-full bg-white text-slate-900 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-400 hover:text-white transition-all shadow-xl flex items-center justify-center gap-3"
                                >
                                    <Pill size={18} /> Prescribe Medicine
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            ) : (
                <div className="bg-white border border-dashed border-slate-200 rounded-[3rem] p-32 text-center shadow-sm">
                    <Activity size={64} className="mx-auto text-slate-200 mb-6 animate-pulse" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-4 italic">Select a patient from the queue hub above to load triage vitals.</p>
                </div>
            )}
        </div>
    );
};

const VitalCard = ({ icon, label, value, unit }) => (
    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group hover:border-blue-500 transition-all duration-300">
        <div className="flex items-center gap-3 mb-3 text-slate-400 group-hover:text-blue-600 transition-colors">
            {icon}
            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{unit}</span>
        </div>
    </div>
);

export default OncologyVitals;