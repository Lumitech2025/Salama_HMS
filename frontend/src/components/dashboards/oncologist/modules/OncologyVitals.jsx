import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Calculator, Activity, Thermometer, Heart, 
  Wind, Scale, ChevronDown, User, AlertCircle, 
  CheckCircle2, Loader2, RefreshCcw, FlaskConical, MessageSquare, ArrowRight, Pill
} from 'lucide-react';

const OncologyVitals = ({ selectedPatientFromParent, onTabSwitch }) => {
    // We use the patient passed from the Dashboard Queue
    const [selectedPatient, setSelectedPatient] = useState(selectedPatientFromParent || null);
    const [loading, setLoading] = useState(false);
    const [vitals, setVitals] = useState(null);
    const [hasLabResults, setHasLabResults] = useState(false);
    const [bsa, setBsa] = useState(0);
    const [bmi, setBmi] = useState(0);
    const [doctorNote, setDoctorNote] = useState("");

    const fetchPatientContext = useCallback(async (patient) => {
        if (!patient) return;
        setLoading(true);
        try {
            // Patient ID logic to handle different object structures
            const patientId = patient.patient || patient.id;
            
            // 1. Fetch Vitals & Lab Results in parallel to determine UI buttons
            const [vitalsRes, labRes] = await Promise.all([
                API.get(`/vital-signs/?patient=${patientId}`),
                API.get(`/lab-results/?patient=${patientId}`)
            ]);

            // Map Vitals from backend (Matching Image 6)
            const vData = vitalsRes.data.results || vitalsRes.data;
            const latestVitals = Array.isArray(vData) ? vData[0] : vData;
            
            if (latestVitals) {
                setVitals(latestVitals);
                
                // Mosteller Formula: sqrt((h*w)/3600)
                const weight = parseFloat(latestVitals.weight);
                const height = parseFloat(latestVitals.height);
                
                if (weight && height) {
                    setBsa(latestVitals.bsa || Math.sqrt((height * weight) / 3600).toFixed(2));
                    const hMeters = height / 100;
                    setBmi((weight / (hMeters * hMeters)).toFixed(1));
                }
            }

            // Check if results exist to toggle "Proceed to Lab" vs "View Lab Results"
            const lData = labRes.data.results || labRes.data;
            setHasLabResults(lData && lData.length > 0);

        } catch (err) {
            console.error("Context fetch error", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedPatientFromParent) {
            setSelectedPatient(selectedPatientFromParent);
            fetchPatientContext(selectedPatientFromParent);
        }
    }, [selectedPatientFromParent, fetchPatientContext]);

    const handleProceedToLab = async () => {
        try {
            // Push to Lab Tech Queue
            await API.patch(`/queue/${selectedPatient.id}/`, { 
                current_station: 'LABORATORY',
                status: 'AWAITING_LAB' 
            });
            alert("Referral Successful: Patient moved to Laboratory Queue.");
            onTabSwitch('home'); 
        } catch (err) {
            alert("Error updating patient station.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
            {selectedPatient ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-500">
                    
                    {/* LEFT: CLINICAL DATA */}
                    <main className="lg:col-span-8 space-y-6">
                        {/* VITALS GRID - Fields mapped to Image 6 */}
                        <div className="bg-white border border-slate-100 rounded-[3.5rem] p-10 shadow-xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <Activity className="text-teal-500" size={32} />
                                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Clinical Triage Data</h3>
                                </div>
                                <div className="flex gap-2">
                                    <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">BMI: {bmi || '--'}</span>
                                    <span className="bg-teal-50 text-teal-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-100">Live Entry</span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="py-20 text-center"><Loader2 className="animate-spin text-teal-500 mx-auto" size={40} /></div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <VitalCard 
                                        icon={<Heart className="text-red-500"/>} 
                                        label="Blood Pressure" 
                                        value={vitals ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : '--/--'} 
                                        unit="mmHg" 
                                    />
                                    <VitalCard 
                                        icon={<Activity className="text-blue-500"/>} 
                                        label="Heart Rate" 
                                        value={vitals?.heart_rate || '--'} 
                                        unit="bpm" 
                                    />
                                    <VitalCard 
                                        icon={<Thermometer className="text-orange-500"/>} 
                                        label="Temperature" 
                                        value={vitals?.temperature || '--'} 
                                        unit="°C" 
                                    />
                                    <VitalCard 
                                        icon={<Wind className="text-teal-500"/>} 
                                        label="Oxygen Sat" 
                                        value={vitals?.oxygen_saturation_percentage || '--'} 
                                        unit="%" 
                                    />
                                    <VitalCard 
                                        icon={<Scale className="text-indigo-500"/>} 
                                        label="Weight" 
                                        value={vitals?.weight || '--'} 
                                        unit="kg" 
                                    />
                                    <VitalCard 
                                        icon={<Activity className="text-slate-500"/>} 
                                        label="Height" 
                                        value={vitals?.height || '--'} 
                                        unit="cm" 
                                    />
                                </div>
                            )}
                        </div>

                        {/* DOCTOR NOTES AREA */}
                        <div className="bg-[#020617] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-6">
                                <MessageSquare className="text-teal-500" size={20} />
                                <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Clinical Observation Notes</h4>
                            </div>
                            <textarea 
                                className="w-full bg-slate-900 border border-white/10 rounded-[2rem] p-8 text-slate-200 font-medium text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                rows="4"
                                placeholder="Enter clinical assessment based on current vitals..."
                                value={doctorNote}
                                onChange={(e) => setDoctorNote(e.target.value)}
                            />
                        </div>

                        {/* BSA CALCULATION */}
                        <section className="bg-blue-600 p-10 rounded-[3.5rem] text-white shadow-2xl flex justify-between items-center relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.3em] mb-3">Oncology Standard BSA</p>
                                <h3 className="text-xl font-bold max-w-[250px] leading-tight">Body Surface Area for cytotoxic calculation</h3>
                            </div>
                            <div className="text-right relative z-10">
                                <div className="text-7xl font-black tracking-tighter italic">{bsa} <span className="text-2xl font-light not-italic ml-1">m²</span></div>
                                <p className="text-[9px] font-black bg-white/20 inline-block px-3 py-1 rounded-full uppercase mt-4">Verified Calibration</p>
                            </div>
                            <Calculator size={150} className="absolute -left-10 -bottom-10 text-white/[0.05]" />
                        </section>
                    </main>

                    {/* RIGHT: CLEARANCE & WORKFLOW */}
                    <aside className="lg:col-span-4 space-y-6">
                        <div className="bg-[#020617] text-white p-8 rounded-[3rem] shadow-2xl sticky top-8 border border-white/5">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400 mb-8 flex items-center gap-2 border-b border-white/5 pb-4">
                                <CheckCircle2 size={16}/> Protocol Clearance
                            </h3>
                            <div className="space-y-4">
                                <ClearanceItem label="Temperature Safety" status={vitals?.temperature < 38 ? 'safe' : 'warning'} />
                                <ClearanceItem label="SpO2 Stability" status={vitals?.oxygen_saturation_percentage >= 95 ? 'safe' : 'danger'} />
                                <ClearanceItem label="Respiratory Norm" status={vitals?.respiratory_rate < 25 ? 'safe' : 'warning'} />
                            </div>

                            {/* DYNAMIC LAB ROUTING */}
                            {hasLabResults ? (
                                <button 
                                    onClick={() => onTabSwitch('lab')}
                                    className="w-full mt-10 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 group"
                                >
                                    <FlaskConical size={18} className="group-hover:rotate-12 transition-transform" /> View Lab Results
                                </button>
                            ) : (
                                <button 
                                    onClick={handleProceedToLab}
                                    className="w-full mt-10 bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all shadow-xl flex items-center justify-center gap-3"
                                >
                                    <ArrowRight size={18} /> Proceed to Lab
                                </button>
                            )}

                            {/* PRESCRIBE MEDICINE BUTTON */}
                            <button 
                                onClick={() => onTabSwitch('prescriptions')}
                                className="w-full mt-4 bg-white text-slate-900 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-teal-400 hover:text-white transition-all shadow-xl flex items-center justify-center gap-3"
                            >
                                <Pill size={18} /> Prescribe Medicine
                            </button>

                            <div className="mt-8 pt-6 border-t border-white/5">
                                <p className="text-[9px] text-slate-500 font-bold uppercase text-center tracking-[0.3em]">Salama Oncology Protocol</p>
                            </div>
                        </div>
                    </aside>
                </div>
            ) : (
                <div className="p-20 text-center text-slate-400 italic">No patient context found. Please select from dashboard.</div>
            )}
        </div>
    );
};

const VitalCard = ({ icon, label, value, unit }) => (
    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group hover:border-teal-500 transition-all duration-300">
        <div className="flex items-center gap-3 mb-3 text-slate-400 group-hover:text-teal-600 transition-colors">
            {icon}
            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 group-hover:text-teal-600 transition-colors">{value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{unit}</span>
        </div>
    </div>
);

const ClearanceItem = ({ label, status }) => (
    <div className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5 transition-colors">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
        {status === 'safe' ? <CheckCircle2 size={18} className="text-teal-500" /> : <AlertCircle size={18} className={status === 'warning' ? 'text-orange-500' : 'text-red-500'} />}
    </div>
);

export default OncologyVitals;