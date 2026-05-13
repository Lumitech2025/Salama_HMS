import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    Calculator, Activity, Thermometer, Heart, 
    Wind, Scale, ChevronDown, User, AlertCircle, 
    CheckCircle2, Loader2, RefreshCcw, FlaskConical, MessageSquare, Save, Pill, ClipboardCheck
} from 'lucide-react';

const OncologyVitals = ({ selectedPatientFromParent, onTabSwitch }) => {
    const [queue, setQueue] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(selectedPatientFromParent || null);
    const [loading, setLoading] = useState(false);
    const [vitals, setVitals] = useState(null);
    const [hasLabResults, setHasLabResults] = useState(false);
    const [doctorNote, setDoctorNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    
    const [labRequests, setLabRequests] = useState({
        CBC: false, PSA: false, URINALYSIS: false, BG_CROSS: false,
        UE: false, LFT: false, MALARIA_BS: false
    });

    const fetchQueue = useCallback(async () => {
        try {
            const res = await API.get('/queue/', {
                params: { current_station: 'DOCTOR', status: 'WAITING' }
            });
            const data = res.data.results || res.data;
            setQueue(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Queue fetch error", err);
        }
    }, []);

    const fetchPatientData = useCallback(async (queueItem) => {
        if (!queueItem) return;
        setLoading(true);
        try {
            const visitId = queueItem.visit_id || queueItem.visit;
            
            // 1. Fetch Vitals and Lab status in parallel
            const [vitalsRes, labRes] = await Promise.all([
                API.get(`/vitals/?visit=${visitId}`), 
                API.get(`/lab-results/?visit=${visitId}`)
            ]);

            const vData = vitalsRes.data.results || vitalsRes.data;
            // The serializer provides: oxygen_saturation_percentage, bmi, bsa, heart_rate, etc.
            const latestVitals = Array.isArray(vData) ? vData[0] : vData;
            
            if (latestVitals) {
                setVitals(latestVitals);
            } else {
                setVitals(null);
            }

            const lData = labRes.data.results || labRes.data;
            setHasLabResults(lData && lData.some(r => r.status === 'COMPLETED'));
        } catch (err) {
            console.error("Clinical fetch error", err);
            setVitals(null);
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

    const handlePatientChange = (queueEntryId) => {
        const item = queue.find(p => p.id === parseInt(queueEntryId));
        if (item) {
            setSelectedPatient(item);
            fetchPatientData(item);
        }
    };

    const toggleLabTest = (test) => {
        setLabRequests(prev => ({ ...prev, [test]: !prev[test] }));
    };

    const handleSaveNotes = async () => {
        if (!doctorNote || !selectedPatient) return;
        setIsSaving(true);
        try {
            const visitId = selectedPatient.visit_id || selectedPatient.visit;
            await API.post(`/clinical-notes/`, {
                patient: selectedPatient.patient,
                visit: visitId,
                note_type: 'ONCOLOGY',
                content: doctorNote
            });
            alert("✅ Consultation notes saved.");
        } catch (err) {
            alert("Failed to save notes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReferToLab = async () => {
        const selectedTests = Object.keys(labRequests).filter(k => labRequests[k]);
        if (selectedTests.length === 0) {
            alert("Select at least one investigation.");
            return;
        }

        setIsSaving(true);
        try {
            const visitId = selectedPatient.visit_id || selectedPatient.visit;
            const labPromises = selectedTests.map(testKey => 
                API.post('/lab-results/', {
                    patient: selectedPatient.patient,
                    visit: visitId,
                    test_name: testKey,
                    status: 'PENDING'
                })
            );
            await Promise.all(labPromises);
            await API.post(`/queue/${selectedPatient.id}/move_next/`, { target_station: 'LAB' });
            alert(`✅ Patient referred for ${selectedTests.length} tests.`);
            onTabSwitch('home'); 
        } catch (err) {
            alert("Referral failed.");
        } finally { setIsSaving(false); }
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
                                className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                                onChange={(e) => handlePatientChange(e.target.value)}
                                value={selectedPatient?.id || ''}
                            >
                                <option value="" disabled>Select patient from doctor queue...</option>
                                {queue.map(p => (
                                    <option key={p.id} value={p.id}>{p.patient_name} — #{p.token_id}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-10 text-slate-500 pointer-events-none" size={18} />
                        </div>
                        <button onClick={fetchQueue} className="p-4 hover:bg-white/5 rounded-2xl transition-all self-end mb-1">
                            <RefreshCcw size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>
            </div>

            {selectedPatient ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-500">
                    
                    <main className="lg:col-span-8 space-y-6">
                        {/* VISITS VITALS CARD */}
                        <div className="bg-white border border-slate-100 rounded-[3.5rem] p-10 shadow-xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 p-2 rounded-xl text-white"><Activity size={24} /></div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Visit Vitals</h3>
                                </div>
                                {/* Correctly picking BMI from the backend vitals object */}
                                <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    BMI: {vitals?.bmi || '--'}
                                </span>
                            </div>

                            {loading ? (
                                <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" size={40} /></div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    {/* Mapped to exactly match Serializer keys */}
                                    <VitalCard icon={<Heart className="text-rose-500"/>} label="BP" value={vitals ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : '--/--'} unit="mmHg" />
                                    <VitalCard icon={<Activity className="text-blue-500"/>} label="Pulse" value={vitals?.heart_rate || '--'} unit="bpm" />
                                    <VitalCard icon={<Thermometer className="text-orange-500"/>} label="Temp" value={vitals?.temperature || '--'} unit="°C" />
                                    <VitalCard icon={<Wind className="text-teal-500"/>} label="SpO2" value={vitals?.oxygen_saturation_percentage || '--'} unit="%" />
                                    <VitalCard icon={<Scale className="text-indigo-500"/>} label="Weight" value={vitals?.weight || '--'} unit="kg" />
                                    <VitalCard icon={<Activity className="text-slate-500"/>} label="Height" value={vitals?.height || '--'} unit="cm" />
                                </div>
                            )}
                        </div>

                        {/* DOCTOR NOTES */}
                        <div className="bg-[#020617] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="text-blue-400" size={20} />
                                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Consultation Findings</h4>
                                </div>
                                <button 
                                    onClick={handleSaveNotes}
                                    disabled={isSaving || !doctorNote}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save Notes
                                </button>
                            </div>
                            <textarea 
                                className="w-full bg-slate-900 border border-white/10 rounded-[2rem] p-8 text-slate-200 font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                rows="4"
                                placeholder="Enter clinical assessment findings..."
                                value={doctorNote}
                                onChange={(e) => setDoctorNote(e.target.value)}
                            />
                        </div>

                        {/* LAB REQUESTS */}
                        <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-xl">
                            <div className="flex items-center gap-4 mb-8">
                                <FlaskConical className="text-indigo-600" size={28} />
                                <h3 className="text-xl font-black text-slate-900 uppercase italic">Lab Investigations</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { id: 'CBC', label: 'Full Blood Count (CBC)' },
                                    { id: 'PSA', label: 'PSA (Prostate Specific Antigen)' },
                                    { id: 'UE', label: 'Urea & Electrolyte Levels' },
                                    { id: 'LFT', label: 'Liver Function Test (LFT)' },
                                    { id: 'URINALYSIS', label: 'Urinalysis (Routine)' },
                                    { id: 'BG_CROSS', label: 'Blood Group & Cross Match' },
                                    { id: 'MALARIA_BS', label: 'Blood Slide (Malaria Parasite)' },
                                ].map((test) => (
                                    <div 
                                        key={test.id} 
                                        onClick={() => toggleLabTest(test.id)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${labRequests[test.id] ? 'bg-indigo-50 border-indigo-500 shadow-md shadow-indigo-100' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                                    >
                                        <span className={`text-[11px] font-black uppercase ${labRequests[test.id] ? 'text-indigo-700' : 'text-slate-500'}`}>{test.label}</span>
                                        {labRequests[test.id] ? <CheckCircle2 size={18} className="text-indigo-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={handleReferToLab}
                                disabled={isSaving}
                                className="w-full mt-8 bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-[#020617] transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <ClipboardCheck size={20} />} Submit Requisition to Lab
                            </button>
                        </div>
                    </main>

                    {/* RIGHT PANEL */}
                    <aside className="lg:col-span-4 space-y-6">
                        {/* Correctly picking BSA from backend object */}
                        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                            <p className="text-[9px] font-black text-blue-100 uppercase tracking-[0.3em] mb-4">Body Surface Area</p>
                            <div className="text-6xl font-black tracking-tighter italic mb-2">
                                {vitals?.bsa || '0.00'}<span className="text-xl font-light not-italic ml-1">m²</span>
                            </div>
                            <p className="text-[8px] opacity-60 uppercase font-bold tracking-widest">Required for cytotoxic dosing</p>
                            <Calculator size={100} className="absolute -right-4 -bottom-4 text-white/10" />
                        </section>

                        <div className="bg-[#020617] text-white p-8 rounded-[3rem] shadow-2xl border border-white/5">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-2 border-b border-white/5 pb-4">
                                <CheckCircle2 size={16}/> Case Finalization
                            </h3>
                            <div className="space-y-4">
                                {hasLabResults && (
                                    <button 
                                        onClick={() => onTabSwitch('lab')}
                                        className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3"
                                    >
                                        <FlaskConical size={18} /> Review Lab Results
                                    </button>
                                )}
                                <button 
                                    onClick={() => onTabSwitch('prescriptions')}
                                    className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-400 hover:text-white transition-all shadow-xl flex items-center justify-center gap-3"
                                >
                                    <Pill size={18} /> Issue Prescription
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            ) : (
                <div className="bg-white border border-dashed border-slate-200 rounded-[3rem] p-32 text-center shadow-sm">
                    <Activity size={64} className="mx-auto text-slate-200 mb-6 animate-pulse" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-4 italic">Select a patient from the queue hub above to load clinical data.</p>
                </div>
            )}
        </div>
    );
};

const VitalCard = ({ icon, label, value, unit }) => (
    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-blue-500 transition-all duration-300 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-slate-400 group-hover:text-blue-600 transition-colors">
            {icon}
            <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{value}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>
        </div>
    </div>
);

export default OncologyVitals;