import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Search, Activity, User, ArrowRight, Heart, 
    Thermometer, Ruler, Weight, ClipboardList, 
    UserPlus, Clock, Hash, AlertCircle, ChevronDown, Loader2 
} from 'lucide-react';

// --- Styled Clinical Input Component ---
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
    const { patientId } = useParams(); // Catches ID from Registration redirect
    const navigate = useNavigate();
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [waitingQueue, setWaitingQueue] = useState([]);
    const [recentPatients, setRecentPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    const [vitals, setVitals] = useState({
        height: '', weight: '', systolic_bp: '', diastolic_bp: '', 
        temperature: '', spo2: '', heart_rate: '', respiratory_rate: ''
    });
    const [calculations, setCalculations] = useState({ bmi: 0, bsa: 0 });

    // --- 1. FETCH REGISTRY (Dropdown) & QUEUE ---
    const fetchData = useCallback(async () => {
        try {
            // Get most recent patients for the dropdown
            const resPatients = await axios.get('/api/patients/?ordering=-created_at');
            setRecentPatients(Array.isArray(resPatients.data) ? resPatients.data : (resPatients.data.results || []));

            // Get live queue for the triage station
            const resQueue = await axios.get('/api/queue/?current_station=TRIAGE&status=WAITING');
            setWaitingQueue(Array.isArray(resQueue.data) ? resQueue.data : (resQueue.data.results || []));
        } catch (err) { console.error("Extraction error:", err); }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 20000); // Poll every 20s
        return () => clearInterval(interval);
    }, [fetchData]);

    // --- 2. AUTO-SELECT PATIENT FROM REGISTRATION REDIRECT ---
    useEffect(() => {
        if (patientId) {
            axios.get(`/api/patients/${patientId}/`)
                .then(res => setSelectedPatient(res.data))
                .catch(err => console.error("Patient record extraction failed", err));
        }
    }, [patientId]);

    // Handle clicking outside the patient dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- 3. CLINICAL CALCULATIONS ---
    useEffect(() => {
        const h = parseFloat(vitals.height);
        const w = parseFloat(vitals.weight);
        if (h > 0 && w > 0) {
            const bmi = (w / ((h / 100) ** 2)).toFixed(2);
            const bsa = Math.sqrt((h * w) / 3600).toFixed(2);
            setCalculations({ bmi, bsa });
        } else { setCalculations({ bmi: 0, bsa: 0 }); }
    }, [vitals.height, vitals.weight]);

    const handleSubmission = async () => {
        if (!selectedPatient) return;
        setLoading(true);
        try {
            const payload = {
                patient: selectedPatient.id,
                appointment: selectedPatient.appointment || null,
                ...vitals,
            };
            await axios.post('/api/vitals/', payload);
            alert(`Assessment for ${selectedPatient.name} recorded. Case moved to Consultation.`);
            setSelectedPatient(null);
            setVitals({ height: '', weight: '', systolic_bp: '', diastolic_bp: '', temperature: '', spo2: '', heart_rate: '', respiratory_rate: '' });
            navigate('/triage'); // Clear ID from URL
            fetchData();
        } catch (err) { alert("Submission failed. Check if patient is already triaged."); }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-6 font-['Plus_Jakarta_Sans'] h-screen flex flex-col overflow-hidden bg-slate-50/50">
            <header className="mb-6 flex items-center justify-between bg-[#020617] p-6 rounded-[2rem] shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-cyan-500 p-3 rounded-xl text-white shadow-lg"><Activity size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Salama <span className="text-cyan-400">Clinical Hub</span></h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Triage station</p>
                    </div>
                </div>
                {selectedPatient && (
                    <div className="flex items-center gap-4 bg-teal-500/10 px-6 py-2 rounded-2xl border border-teal-500/20">
                        <div className="text-right">
                            <p className="text-[8px] font-black text-teal-400 uppercase tracking-widest">Active File</p>
                            <p className="text-white font-black text-sm uppercase">{selectedPatient.name}</p>
                        </div>
                        <button onClick={() => setSelectedPatient(null)} className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold">RELEASE</button>
                    </div>
                )}
            </header>

            <div className="flex flex-1 gap-8 overflow-hidden pb-6">
                <aside className="w-[400px] flex flex-col gap-6 overflow-hidden">
                    {/* DROPDOWN SELECTOR */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 relative" ref={dropdownRef}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block italic">Select Patient Name</label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                                onFocus={() => setShowDropdown(true)}
                                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-cyan-500 transition-all"
                                placeholder="Start typing name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {showDropdown && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 overflow-hidden">
                                <div className="max-h-[250px] overflow-y-auto">
                                    {recentPatients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                                        <div key={p.id} onClick={() => { setSelectedPatient(p); setShowDropdown(false); setSearchTerm(''); }} className="px-6 py-4 hover:bg-cyan-50 cursor-pointer border-b border-slate-50 flex flex-col">
                                            <span className="text-xs font-black text-slate-800 uppercase">{p.name}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">ID: {p.registry_no}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* LIVE QUEUE */}
                    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
                            Incoming Queue
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {waitingQueue.map(q => (
                                <div key={q.id} onClick={() => setSelectedPatient(q)} className={`p-5 rounded-[2rem] cursor-pointer transition-all border-2 flex flex-col gap-2 ${selectedPatient?.id === q.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="bg-[#020617] text-white text-[10px] font-black px-3 py-0.5 rounded-lg italic tracking-tighter">{q.token_id}</span>
                                        <span className="text-[9px] font-black text-teal-600 uppercase">{q.status}</span>
                                    </div>
                                    <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{q.patient_name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-2"><Clock size={10} /> {q.wait_time}m Wait</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="flex-1 bg-white rounded-[4rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative">
                    <div className="p-12 flex-1 overflow-y-auto">
                        <div className="flex items-center justify-between mb-12 border-b border-slate-100 pb-8">
                            <div className="flex items-center gap-4">
                                <ClipboardList className="text-cyan-500" size={32} />
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Vitals Assessment</h3>
                            </div>
                            {!selectedPatient && (
                                <div className="flex items-center gap-3 bg-amber-50 text-amber-600 px-6 py-3 rounded-2xl border border-amber-100 animate-bounce">
                                    <AlertCircle size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Case Selection</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mb-16">
                            <ClinicalInput label="Body Temp" helper="°C" icon={Thermometer} type="number" step="0.1" value={vitals.temperature} onChange={(e) => setVitals({...vitals, temperature: e.target.value})} />
                            <ClinicalInput label="Oxygen Sat" helper="SpO2 %" icon={Activity} type="number" value={vitals.spo2} onChange={(e) => setVitals({...vitals, spo2: e.target.value})} />
                            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                                <div className="col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Blood Pressure (mmHg)</label></div>
                                <input className="p-5 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 font-black text-center text-xl shadow-inner" placeholder="SYS" value={vitals.systolic_bp} onChange={(e) => setVitals({...vitals, systolic_bp: e.target.value})} />
                                <input className="p-5 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 font-black text-center text-xl shadow-inner" placeholder="DIA" value={vitals.diastolic_bp} onChange={(e) => setVitals({...vitals, diastolic_bp: e.target.value})} />
                            </div>
                            <ClinicalInput label="Height" helper="CM" icon={Ruler} type="number" value={vitals.height} onChange={(e) => setVitals({...vitals, height: e.target.value})} />
                            <ClinicalInput label="Weight" helper="KG" icon={Weight} type="number" value={vitals.weight} onChange={(e) => setVitals({...vitals, weight: e.target.value})} />
                            <ClinicalInput label="Heart Rate" helper="BPM" icon={Heart} type="number" value={vitals.heart_rate} onChange={(e) => setVitals({...vitals, heart_rate: e.target.value})} />
                            <ClinicalInput label="Respiratory" helper="B/Min" icon={Activity} type="number" value={vitals.respiratory_rate} onChange={(e) => setVitals({...vitals, respiratory_rate: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-10 bg-cyan-50 rounded-[3rem] border-2 border-cyan-100 flex justify-between items-center group">
                                <div>
                                    <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-4">Patient BMI</p>
                                    <p className="text-7xl font-black text-slate-900 tracking-tighter">{calculations.bmi}</p>
                                </div>
                                <Activity size={64} className="text-cyan-200 group-hover:rotate-12 transition-transform duration-500" />
                            </div>
                            <div className="p-10 bg-emerald-50 rounded-[3rem] border-2 border-emerald-100 flex justify-between items-center group">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Oncology BSA (m²)</p>
                                    <p className="text-7xl font-black text-slate-900 tracking-tighter">{calculations.bsa}</p>
                                </div>
                                <Ruler size={64} className="text-emerald-200 group-hover:rotate-12 transition-transform duration-500" />
                            </div>
                        </div>
                    </div>

                    <footer className="p-10 bg-[#020617] flex flex-col items-center gap-4">
                        <button 
                            disabled={loading || !selectedPatient}
                            onClick={handleSubmission}
                            className={`w-full max-w-3xl text-white py-8 rounded-[2rem] font-black text-md uppercase tracking-[0.5em] transition-all shadow-2xl flex items-center justify-center gap-5 ${!selectedPatient ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-400 hover:shadow-cyan-500/40 active:scale-95'}`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Finalize & Move to Doctor"}
                            <ArrowRight size={24} />
                        </button>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default TriagePortal;