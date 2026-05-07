import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, Activity, User, ArrowRight, Heart, Thermometer, Ruler, Weight, ClipboardList, UserPlus } from 'lucide-react';

// --- Styled Clinical Input ---
const ClinicalInput = ({ label, icon: Icon, helper, ...props }) => (
    <div className="flex flex-col w-full group">
        <div className="flex justify-between items-center mb-1.5 px-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {Icon && <Icon size={12} className="text-cyan-500" />}
                {label}
            </label>
            <span className="text-[9px] text-cyan-600 font-bold uppercase">{helper}</span>
        </div>
        <input 
            {...props} 
            className="p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-cyan-500 focus:bg-white outline-none transition-all font-black text-slate-800 text-md shadow-sm" 
        />
    </div>
);

const TriagePortal = () => {
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [waitingQueue, setWaitingQueue] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const [vitals, setVitals] = useState({
        height: '', weight: '', systolic_bp: '', diastolic_bp: '', 
        temperature: '', spo2: '', heart_rate: '', respiratory_rate: ''
    });
    const [calculations, setCalculations] = useState({ bmi: 0, bsa: 0 });

    // --- Data Fetching ---
    const fetchQueue = async () => {
        try {
            const res = await axios.get('/api/appointments/?status=WAITING_TRIAGE');
            setWaitingQueue(Array.isArray(res.data) ? res.data : (res.data.results || []));
        } catch (err) { 
            console.error(err); 
            setWaitingQueue([]); 
        }
    };

    useEffect(() => { fetchQueue(); }, [selectedPatient]);

    const performSearch = useCallback(async (query) => {
        if (query.length < 2) { 
            setSearchResults([]); 
            return; 
        }
        try {
            const res = await axios.get(`/api/patients/?search=${query}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setSearchResults(data);
        } catch (err) { 
            console.error("Search error:", err); 
            setSearchResults([]); 
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => performSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm, performSearch]);

    // --- Clinical Calculations (Now works irregardless of patient selection) ---
    useEffect(() => {
        const h = parseFloat(vitals.height);
        const w = parseFloat(vitals.weight);
        
        if (h > 0 && w > 0) {
            const h_m = h / 100;
            const bmiValue = (w / (h_m * h_m)).toFixed(2);
            const bsaValue = Math.sqrt((h * w) / 3600).toFixed(2);
            setCalculations({ bmi: bmiValue, bsa: bsaValue });
        } else {
            setCalculations({ bmi: 0, bsa: 0 });
        }
    }, [vitals.height, vitals.weight]);

    const handleSubmission = async () => {
        if (!selectedPatient) {
            alert("Warning: You must select a patient before finalizing.");
            return;
        }
        setLoading(true);
        try {
            const payload = {
                patient: selectedPatient.id || selectedPatient.patient,
                appointment: selectedPatient.id || null,
                ...vitals,
                bmi: calculations.bmi,
                bsa: calculations.bsa
            };
            await axios.post('/api/vitals/', payload);
            alert(`Assessment for ${selectedPatient.name || selectedPatient.patient_name} finalized.`);
            setSelectedPatient(null);
            setVitals({ height: '', weight: '', systolic_bp: '', diastolic_bp: '', temperature: '', spo2: '', heart_rate: '', respiratory_rate: '' });
        } catch (err) { alert("Submission failed. Check backend connectivity."); }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-6 font-['Plus_Jakarta_Sans'] h-screen flex flex-col overflow-hidden">
            
            <header className="mb-6 flex items-center justify-between bg-slate-900 p-6 rounded-[2rem] shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-cyan-500 p-3 rounded-xl text-white shadow-lg">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Salama <span className="text-cyan-400">Clinical Hub</span></h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Triage Station</p>
                    </div>
                </div>
                
                {selectedPatient && (
                    <div className="flex items-center gap-4 bg-teal-500/10 px-6 py-2 rounded-2xl border border-teal-500/20 animate-in fade-in slide-in-from-right-4">
                        <div className="text-right">
                            <p className="text-[8px] font-black text-teal-400 uppercase tracking-widest">Active Patient</p>
                            <p className="text-white font-black text-sm uppercase">{selectedPatient.name || selectedPatient.patient_name}</p>
                        </div>
                        <button onClick={() => setSelectedPatient(null)} className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold">RELEASE</button>
                    </div>
                )}
            </header>

            <div className="flex flex-1 gap-6 overflow-hidden pb-6">
                {/* LEFT COLUMN: IDENTIFICATION */}
                <aside className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block italic">Patient</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                className="w-full bg-slate-50 border-none rounded-xl py-3 pl-12 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                                placeholder="Search Registry..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {searchTerm.length >= 2 && (
                        <div className="bg-slate-800 p-6 rounded-[2rem] shadow-xl animate-in zoom-in-95">
                             <h3 className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Search size={12}/> Registry Matches
                             </h3>
                             <div className="space-y-3">
                                {searchResults.map(p => (
                                    <div key={p.id} onClick={() => setSelectedPatient(p)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl cursor-pointer transition-all flex justify-between items-center border border-white/5 group">
                                        <p className="text-white font-bold text-xs uppercase">{p.name}</p>
                                        <UserPlus size={14} className="text-cyan-400 group-hover:scale-125 transition-transform" />
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex-1 overflow-y-auto">
                        <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                            Incoming Queue
                        </h3>
                        <div className="space-y-3">
                            {waitingQueue.length > 0 ? waitingQueue.map(apt => (
                                <div key={apt.id} onClick={() => setSelectedPatient(apt)} className={`p-5 rounded-2xl cursor-pointer transition-all border-2 ${selectedPatient?.id === apt.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}>
                                    <p className="font-black text-slate-900 text-xs uppercase">{apt.patient_name}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{apt.appointment_time} • {apt.visit_type}</p>
                                </div>
                            )) : <div className="text-center py-10 opacity-20 font-black text-[10px] uppercase">No Check-ins</div>}
                        </div>
                    </div>
                </aside>

                {/* RIGHT COLUMN: WORKSPACE (Fully unlocked) */}
                <main className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
                    
                    <div className="p-10 flex-1 overflow-y-auto">
                        <div className="flex items-center justify-between mb-10 border-b border-slate-50 pb-6">
                            <div className="flex items-center gap-3">
                                <ClipboardList className="text-cyan-500" size={24} />
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Vital Signs Recording</h3>
                            </div>
                            {!selectedPatient && (
                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter animate-pulse">
                                    Patient Unselected
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            <ClinicalInput label="Temp" helper="°C" icon={Thermometer} type="number" step="0.1" value={vitals.temperature} onChange={(e) => setVitals({...vitals, temperature: e.target.value})} />
                            <ClinicalInput label="SpO2" helper="%" icon={Activity} type="number" value={vitals.spo2} onChange={(e) => setVitals({...vitals, spo2: e.target.value})} />
                            
                            <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Blood Pressure</label></div>
                                <input className="p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 font-black text-center text-lg" placeholder="SYS" value={vitals.systolic_bp} onChange={(e) => setVitals({...vitals, systolic_bp: e.target.value})} />
                                <input className="p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 font-black text-center text-lg" placeholder="DIA" value={vitals.diastolic_bp} onChange={(e) => setVitals({...vitals, diastolic_bp: e.target.value})} />
                            </div>
                            
                            <ClinicalInput label="Height" helper="CM" icon={Ruler} type="number" value={vitals.height} onChange={(e) => setVitals({...vitals, height: e.target.value})} />
                            <ClinicalInput label="Weight" helper="KG" icon={Weight} type="number" value={vitals.weight} onChange={(e) => setVitals({...vitals, weight: e.target.value})} />
                            <ClinicalInput label="Heart Rate" helper="BPM" icon={Heart} type="number" value={vitals.heart_rate} onChange={(e) => setVitals({...vitals, heart_rate: e.target.value})} />
                            <ClinicalInput label="Resp. Rate" helper="B/M" icon={Activity} type="number" value={vitals.respiratory_rate} onChange={(e) => setVitals({...vitals, respiratory_rate: e.target.value})} />
                        </div>

                        {/* LIVE METRICS (Works independently) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 bg-cyan-50 rounded-[2rem] border-2 border-cyan-100 flex justify-between items-center transition-all">
                                <div>
                                    <p className="text-[9px] font-black text-cyan-600 uppercase tracking-widest mb-2">Calculated BMI</p>
                                    <p className="text-6xl font-black text-slate-900 tracking-tighter">{calculations.bmi}</p>
                                </div>
                                <Activity size={48} className="text-cyan-200" />
                            </div>
                            <div className="p-8 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 flex justify-between items-center transition-all">
                                <div>
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Oncology BSA (m²)</p>
                                    <p className="text-6xl font-black text-slate-900 tracking-tighter">{calculations.bsa}</p>
                                </div>
                                <Ruler size={48} className="text-emerald-200" />
                            </div>
                        </div>
                    </div>

                    {/* ACTION FOOTER */}
                    <footer className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col items-center gap-4">
                        {!selectedPatient && (
                            <p className="text-[9px] font-black text-red-500 uppercase animate-bounce italic">
                                Identification Required: Select a patient to commit vitals
                            </p>
                        )}
                        <button 
                            disabled={loading || !selectedPatient}
                            onClick={handleSubmission}
                            className={`w-full max-w-2xl text-white py-6 rounded-3xl font-black text-sm uppercase tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-4 ${!selectedPatient ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-cyan-600 hover:scale-[1.02] active:scale-95 shadow-cyan-200'}`}
                        >
                            {loading ? "SAVING DATA..." : "COMMIT ASSESSMENT & SEND TO DOCTOR"}
                            <ArrowRight size={20} />
                        </button>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default TriagePortal;