import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    Calculator, Activity, Thermometer, Heart, 
    Wind, Scale, ChevronDown, User, AlertCircle, 
    CheckCircle2, Loader2, RefreshCcw, FlaskConical, MessageSquare, Save, Pill, ClipboardCheck
} from 'lucide-react';

const AVAILABLE_LAB_TESTS = [
    { id: 'CBC', label: 'Full Blood Count (CBC)' },
    { id: 'PSA', label: 'Prostate Specific Antigen (PSA)' },
    { id: 'UE', label: 'Urea, Electrolytes & Creatinine (U&E)' },
    { id: 'LFT', label: 'Liver Function Test (LFT)' },
    { id: 'URINALYSIS', label: 'Urinalysis (Routine)' },
    { id: 'BG_CROSS', label: 'Blood Group & Cross Match' },
    { id: 'MALARIA_BS', label: 'Blood Slide for Malaria' },
];

const INITIAL_LAB_STATE = {
    CBC: false, PSA: false, URINALYSIS: false, BG_CROSS: false,
    UE: false, LFT: false, MALARIA_BS: false
};

const OncologyVitals = ({ selectedPatientFromParent, onTabSwitch }) => {
    const [queue, setQueue] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(selectedPatientFromParent || null);
    const [loading, setLoading] = useState(false);
    const [vitals, setVitals] = useState(null);
    const [hasLabResults, setHasLabResults] = useState(false);
    const [doctorNote, setDoctorNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [labRequests, setLabRequests] = useState(INITIAL_LAB_STATE);

    const fetchQueue = useCallback(async () => {
        try {
            const res = await API.get('/queue', {
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
            
            const [vitalsRes, labRes] = await Promise.all([
                API.get(`/vitals?visit=${visitId}`), 
                API.get(`/lab-results?visit=${visitId}`)
            ]);

            const vData = vitalsRes.data.results || vitalsRes.data;
            const latestVitals = Array.isArray(vData) ? vData[0] : vData;
            
            setVitals(latestVitals || null);

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
            setLabRequests(INITIAL_LAB_STATE);
            setDoctorNote("");
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

    /**
     * ALIGNED WITH LABORDER MODEL & SERIALIZER
     * Packages checked keys back into string arrays matching target options
     */
    const handleReferToLab = async () => {
        // Map checked internal object states to canonical frontend descriptive labels
        const selectedTests = AVAILABLE_LAB_TESTS
            .filter(test => labRequests[test.id])
            .map(test => test.label);

        if (selectedTests.length === 0) {
            alert("Select at least one investigation.");
            return;
        }

        setIsSaving(true);
        try {
            const visitId = selectedPatient.visit_id || selectedPatient.visit;
            
            // Send single atomic request object structure handled by LabOrderViewSet
            await API.post('/lab-orders/', {
                patient: selectedPatient.patient,
                visit: visitId,
                requested_tests: selectedTests, // Clean Array mapping intercepted by Serializer
                status: 'PENDING',
                doctor_notes: doctorNote || "" // Passes running clinical logs down directly
            });
            
            // Advance tracker through workflow sequence
            await API.post(`/queue/${selectedPatient.id}/move_next/`, { target_station: 'LAB' });
            
            alert(`Success: Patient routed to Lab for ${selectedTests.length} investigation(s).`);
            setLabRequests(INITIAL_LAB_STATE);
            onTabSwitch('home'); 
        } catch (err) {
            console.error("Lab referral failure:", err.response?.data || err.message);
            alert(`Referral failed: ${JSON.stringify(err.response?.data || "Check network connections or endpoint schemas")}`);
        } finally { 
            setIsSaving(false); 
        }
    };

    return (
        <div className="space-y-6 animate-in face-in duration-700 font-['Inter'] pb-20 max-w-[1600px] mx-auto px-4">
            
            {/* 1. ACTIVE PATIENT PROFILE BANNER */}
            {selectedPatient && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-[2rem] p-6 shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-900/40">
                            {selectedPatient.patient_name?.charAt(0) || <User size={24} />}
                        </div>
                        <div>
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 font-black px-2.5 py-1 rounded-md uppercase tracking-wider">Active Consultation</span>
                            <h2 className="text-2xl font-black tracking-tight text-white mt-1">{selectedPatient.patient_name}</h2>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">Token ID: <span className="text-slate-200">#{selectedPatient.token_id}</span></p>
                        </div>
                    </div>
                    {vitals?.bmi && (
                        <div className="bg-blue-600/10 border border-blue-500/20 px-6 py-3 rounded-2xl text-right">
                            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Calculated BMI</p>
                            <p className="text-2xl font-black text-white tracking-tight mt-0.5">{vitals.bmi}</p>
                        </div>
                    )}
                </div>
            )}

            {/* SELECTION HUB */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex items-center gap-4 flex-1 w-full">
                        <div className="p-3.5 bg-slate-100 rounded-xl text-slate-700"><User size={20} /></div>
                        <div className="flex-1 relative">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">Switch Patient Queue Entry</p>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 font-semibold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer appearance-none transition-all"
                                onChange={(e) => handlePatientChange(e.target.value)}
                                value={selectedPatient?.id || ''}
                            >
                                <option value="" disabled>Select patient from doctor queue...</option>
                                {queue.map(p => (
                                    <option key={p.id} value={p.id}>{p.patient_name} — #{p.token_id}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-9 text-slate-400 pointer-events-none" size={16} />
                        </div>
                        <button onClick={fetchQueue} className="p-3.5 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 rounded-xl transition-all self-end shadow-sm">
                            <RefreshCcw size={18} className="text-slate-600" />
                        </button>
                    </div>
                </div>
            </div>

            {selectedPatient ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-6 duration-500">
                    
                    <main className="lg:col-span-8 space-y-6">
                        {/* VISITS VITALS CARD */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-md relative overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-sm shadow-blue-500/20"><Activity size={20} /></div>
                                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Vitals</h3>
                                </div>
                                <span className="bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black tracking-wide border border-emerald-500/20">
                                    BMI: {vitals?.bmi || '--'}
                                </span>
                            </div>

                            {loading ? (
                                <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" size={32} /></div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <VitalCard icon={<Heart size={18} className="text-rose-500"/>} label="Blood Pressure" value={vitals ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : '--/--'} unit="mmHg" />
                                    <VitalCard icon={<Activity size={18} className="text-blue-500"/>} label="Pulse Rate" value={vitals?.heart_rate || '--'} unit="bpm" />
                                    <VitalCard icon={<Thermometer size={18} className="text-orange-500"/>} label="Temperature" value={vitals?.temperature || '--'} unit="°C" />
                                    <VitalCard icon={<Wind size={18} className="text-teal-500"/>} label="SpO2 Saturation" value={vitals?.oxygen_saturation_percentage || '--'} unit="%" />
                                    <VitalCard icon={<Scale size={18} className="text-indigo-500"/>} label="Weight Metric" value={vitals?.weight || '--'} unit="kg" />
                                    <VitalCard icon={<Activity size={18} className="text-slate-500"/>} label="Patient Height" value={vitals?.height || '--'} unit="cm" />
                                </div>
                            )}
                        </div>

                        {/* NOTES */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-md">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-900 p-2.5 rounded-xl text-white"><MessageSquare size={18} /></div>
                                    <h4 className="text-md font-bold text-slate-900">Notes</h4>
                                </div>
                                <button 
                                    onClick={handleSaveNotes}
                                    disabled={isSaving || !doctorNote}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save Notes
                                </button>
                            </div>
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-800 font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none"
                                rows="4"
                                placeholder="Enter clinical assessment findings and diagnostics summary..."
                                value={doctorNote}
                                onChange={(e) => setDoctorNote(e.target.value)}
                            />
                        </div>

                        {/* LAB REQUESTS */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-md">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-sm shadow-indigo-500/20"><FlaskConical size={18} /></div>
                                <h3 className="text-md font-bold text-slate-900">Lab Investigations Requisition</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {AVAILABLE_LAB_TESTS.map((test) => (
                                    <div 
                                        key={test.id} 
                                        onClick={() => toggleLabTest(test.id)}
                                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${labRequests[test.id] ? 'bg-indigo-50/60 border-indigo-500 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                                    >
                                        <span className={`text-xs font-bold ${labRequests[test.id] ? 'text-indigo-900' : 'text-slate-600'}`}>{test.label}</span>
                                        {labRequests[test.id] ? <CheckCircle2 size={18} className="text-indigo-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={handleReferToLab}
                                disabled={isSaving}
                                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-100"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />} Submit Requisition to Lab
                            </button>
                        </div>

                        {/* PRESCRIPTION HUB */}
                        <div className="bg-slate-950 border border-slate-900 rounded-[2.5rem] p-8 shadow-xl">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-md font-bold text-white flex items-center gap-2">
                                        <Pill size={18} className="text-emerald-400" /> Medical Prescription Plan
                                    </h3>
                                    <p className="text-xs font-medium text-slate-400 mt-1">Deploy cytotoxic treatments, supportive regimens, or oncology therapy orders.</p>
                                </div>
                                <button 
                                    onClick={() => onTabSwitch('prescriptions')}
                                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/20 whitespace-nowrap"
                                >
                                    Issue Patient Prescription
                                </button>
                            </div>
                        </div>
                    </main>

                    {/* RIGHT PANEL */}
                    <aside className="lg:col-span-4 space-y-6">
                        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                            <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-3">Body Surface Area (BSA)</p>
                            <div className="text-5xl font-black tracking-tight mb-1 flex items-baseline">
                                {vitals?.bsa || '0.00'}
                                <span className="text-lg font-normal ml-1 opacity-80">m²</span>
                            </div>
                            <p className="text-[10px] opacity-75 font-semibold tracking-wide">Critical index value required for safe cytotoxic dosing setup</p>
                            <Calculator size={80} className="absolute -right-4 -bottom-4 text-white/10 pointer-events-none" />
                        </section>

                        <div className="bg-white border border-slate-100 text-slate-900 p-6 rounded-[2rem] shadow-md">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <CheckCircle2 size={14} className="text-blue-500"/> Pipeline Utilities
                            </h3>
                            <div className="space-y-3">
                                {hasLabResults ? (
                                    <button 
                                        onClick={() => onTabSwitch('lab')}
                                        className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 py-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                                    >
                                        <FlaskConical size={16} /> Review Lab Results
                                    </button>
                                ) : (
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                                        <p className="text-xs font-medium text-slate-400">No active lab results ready for inspection</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-24 text-center shadow-sm">
                    <Activity size={48} className="mx-auto text-slate-300 mb-4 animate-pulse" />
                    <p className="text-slate-500 font-bold tracking-wide text-xs">Select a patient from the active workspace dropdown above to load telemetry metadata records.</p>
                </div>
            )}
        </div>
    );
};

const VitalCard = ({ icon, label, value, unit }) => (
    <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200/60 group hover:border-blue-500 hover:bg-white transition-all duration-200 shadow-sm">
        <div className="flex items-center gap-1.5 mb-2 text-slate-400 group-hover:text-blue-600 transition-colors">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 group-hover:text-blue-600 tracking-tight transition-colors">{value}</span>
            <span className="text-[10px] font-semibold text-slate-400 lowercase">{unit}</span>
        </div>
    </div>
);

export default OncologyVitals;