import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    Activity, User, ArrowRight, Heart, Thermometer, Ruler, Weight, 
    ClipboardList, Clock, Search, Loader2, AlertCircle, Users, CheckCircle
} from 'lucide-react';

// --- Reusable Clinical Input ---
const VitalField = ({ label, icon: Icon, unit, ...props }) => (
    <div className="flex flex-col bg-slate-50 p-4 rounded-3xl border-2 border-transparent focus-within:border-cyan-500 focus-within:bg-white transition-all shadow-sm">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            {Icon && <Icon size={12} className="text-cyan-500" />}
            {label}
        </label>
        <div className="flex items-end gap-2">
            <input 
                {...props} 
                className="bg-transparent w-full outline-none font-black text-slate-800 text-xl" 
            />
            <span className="text-[10px] font-bold text-slate-400 mb-1">{unit}</span>
        </div>
    </div>
);

const TriagePortal = () => {
    const [sidebarTab, setSidebarTab] = useState('queue'); 
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [nextStation, setNextStation] = useState('DOCTOR');
    const [registry, setRegistry] = useState([]);
    const [liveQueue, setLiveQueue] = useState([]);

    const [vitals, setVitals] = useState({
        temperature: '', systolic_bp: '', diastolic_bp: '', 
        heart_rate: '', respiratory_rate: '', weight: '', height: '', spo2: ''
    });

    const [calculations, setCalculations] = useState({ bmi: '0.0', bsa: '0.0' });

    const fetchData = useCallback(async () => {
        try {
            const [resReg, resQueue] = await Promise.all([
                API.get('/patients/?ordering=-created_at'),
                API.get('/queue/?current_station=TRIAGE&status=WAITING')
            ]);
            setRegistry(resReg.data.results?.slice(0, 10) || resReg.data.slice(0, 10));
            setLiveQueue(resQueue.data.results || resQueue.data);
        } catch (err) { console.error("Sync Error", err); }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        const h = parseFloat(vitals.height);
        const w = parseFloat(vitals.weight);
        if (h > 0 && w > 0) {
            const bmi = (w / ((h / 100) ** 2)).toFixed(1);
            const bsa = Math.sqrt((h * w) / 3600).toFixed(2);
            setCalculations({ bmi, bsa });
        } else {
            setCalculations({ bmi: '0.0', bsa: '0.0' });
        }
    }, [vitals.height, vitals.weight]);

    const handleFinalize = async () => {
        if (!selectedPatient) return;
        
        // ⚠️ CRITICAL VALIDATION: Check if appointment exists
        if (!selectedPatient.appointment) {
            alert("⚠️ Cannot finalize: This patient has no active appointment record. Please go to the 'Appointments' tab and set their status to 'Checked-in' first.");
            return;
        }

        setLoading(true);
        try {
            // 1. Post Vitals with linked Appointment ID
            await API.post('/vitals/', {
                patient: selectedPatient.id,
                appointment: selectedPatient.appointment, 
                ...vitals,
                bmi: calculations.bmi,
                bsa: calculations.bsa
            });

            // 2. Advance Queue (Using the Queue ID)
            await API.post(`/queue/${selectedPatient.queue_id}/move_next/`, {
                target_station: nextStation
            });

            alert(`✅ Triage for ${selectedPatient.name} complete. Moving to ${nextStation}.`);
            
            setSelectedPatient(null);
            setVitals({ temperature: '', systolic_bp: '', diastolic_bp: '', heart_rate: '', respiratory_rate: '', weight: '', height: '', spo2: '' });
            fetchData();
        } catch (err) {
            const msg = err.response?.data ? JSON.stringify(err.response.data) : "Network error.";
            alert("Submission failed: " + msg);
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 font-['Plus_Jakarta_Sans'] h-[90vh] flex flex-col gap-4 overflow-hidden">
            
            {/* Header */}
            <header className="bg-[#020617] p-6 rounded-[2.5rem] shadow-2xl flex justify-between items-center border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="bg-cyan-500 p-3 rounded-2xl text-white shadow-lg"><Activity size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Salama <span className="text-cyan-400 text-sm">CLINICAL HUB</span></h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Triage Station</p>
                    </div>
                </div>
                
                {selectedPatient && (
                    <div className="flex items-center gap-4 animate-in zoom-in duration-300 bg-white/5 p-2 pr-4 rounded-3xl border border-white/10">
                        <div className="w-10 h-10 bg-cyan-500 rounded-2xl flex items-center justify-center text-white font-black">{selectedPatient.name.charAt(0)}</div>
                        <div className="text-left">
                            <p className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">Selected Patient</p>
                            <p className="text-white font-black text-sm uppercase">{selectedPatient.name}</p>
                        </div>
                        <button onClick={() => setSelectedPatient(null)} className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Release</button>
                    </div>
                )}
            </header>

            <div className="flex flex-1 gap-6 overflow-hidden">
                
                {/* Sidebar */}
                <aside className="w-[450px] flex flex-col bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                    <div className="p-2 flex border-b border-slate-100 bg-slate-50/50">
                        <button onClick={() => setSidebarTab('queue')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'queue' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>
                            <Clock size={14} /> Live Queue
                        </button>
                        <button onClick={() => setSidebarTab('registry')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'registry' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>
                            <Users size={14} /> All Patients
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input 
                                placeholder="Search by name or ID..."
                                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                                onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                            />
                        </div>

                        {(sidebarTab === 'queue' ? liveQueue : registry)
                          .filter(p => (p.name || p.patient_name || "").toLowerCase().includes(searchTerm))
                          .map((item) => (
                            <div 
                                key={item.id} 
                                onClick={() => setSelectedPatient({
                                    id: item.patient || item.id,
                                    name: item.patient_name || item.name,
                                    queue_id: item.id, 
                                    appointment: item.appointment // 👈 Ensuring Appointment ID is passed
                                })}
                                className={`p-5 rounded-3xl cursor-pointer border-2 transition-all flex justify-between items-center group ${selectedPatient?.queue_id === item.id ? 'bg-cyan-50 border-cyan-500' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded tracking-tighter">
                                            {item.token_id || "ID: " + (item.registry_no || "TEMP")}
                                        </span>
                                        {!item.appointment && sidebarTab === 'registry' && (
                                            <span className="text-[7px] font-black text-red-500 uppercase border border-red-100 px-1 rounded">No Active Visit</span>
                                        )}
                                    </div>
                                    <p className="font-black text-slate-900 text-sm uppercase">{item.name || item.patient_name}</p>
                                </div>
                                <ArrowRight size={18} className={`transition-transform group-hover:translate-x-1 ${selectedPatient?.id === (item.patient || item.id) ? 'text-cyan-600' : 'text-slate-300'}`} />
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Assessment */}
                <main className="flex-1 bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col relative">
                    {!selectedPatient && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[4px] z-20 flex items-center justify-center">
                            <div className="text-center space-y-4 bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
                                <div className="bg-slate-100 p-8 rounded-full inline-block text-slate-300"><User size={48} /></div>
                                <h3 className="text-xl font-black text-slate-800 uppercase italic">Awaiting Patient</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[220px] mx-auto leading-relaxed">Select a patient from the Live Queue to begin vitals capture</p>
                            </div>
                        </div>
                    )}

                    <div className="p-10 flex-1 overflow-y-auto space-y-10 custom-scrollbar">
                        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                            <ClipboardList className="text-cyan-500" size={32} />
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Vital Signs Module</h3>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <VitalField label="Temperature" unit="°C" icon={Thermometer} type="number" step="0.1" value={vitals.temperature} onChange={(e) => setVitals({...vitals, temperature: e.target.value})} />
                            <VitalField label="Oxygen Sat" unit="SpO2%" icon={Activity} type="number" value={vitals.spo2} onChange={(e) => setVitals({...vitals, spo2: e.target.value})} />
                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                <VitalField label="BP (Systolic)" unit="mmHg" icon={Heart} type="number" value={vitals.systolic_bp} onChange={(e) => setVitals({...vitals, systolic_bp: e.target.value})} />
                                <VitalField label="BP (Diastolic)" unit="mmHg" icon={Heart} type="number" value={vitals.diastolic_bp} onChange={(e) => setVitals({...vitals, diastolic_bp: e.target.value})} />
                            </div>
                            <VitalField label="Height" unit="CM" icon={Ruler} type="number" value={vitals.height} onChange={(e) => setVitals({...vitals, height: e.target.value})} />
                            <VitalField label="Weight" unit="KG" icon={Weight} type="number" value={vitals.weight} onChange={(e) => setVitals({...vitals, weight: e.target.value})} />
                            <VitalField label="Pulse Rate" unit="BPM" icon={Activity} type="number" value={vitals.heart_rate} onChange={(e) => setVitals({...vitals, heart_rate: e.target.value})} />
                            <VitalField label="Respiratory" unit="RPM" icon={Activity} type="number" value={vitals.respiratory_rate} onChange={(e) => setVitals({...vitals, respiratory_rate: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-cyan-50 p-8 rounded-[2.5rem] border-2 border-cyan-100 flex justify-between items-center group">
                                <div>
                                    <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-2 italic tracking-tighter">Body Mass Index (BMI)</p>
                                    <p className="text-6xl font-black text-slate-900 tracking-tighter">{calculations.bmi}</p>
                                </div>
                                <Activity size={50} className="text-cyan-200 group-hover:rotate-12 transition-transform duration-500" />
                            </div>
                            <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-2 border-emerald-100 flex justify-between items-center group">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 italic tracking-tighter">Surface Area (BSA m²)</p>
                                    <p className="text-6xl font-black text-slate-900 tracking-tighter">{calculations.bsa}</p>
                                </div>
                                <Ruler size={50} className="text-emerald-200 group-hover:rotate-12 transition-transform duration-500" />
                            </div>
                        </div>
                    </div>

                    <footer className="p-8 bg-slate-900 flex items-center justify-between gap-6">
                        <div className="flex-1 flex items-center gap-4 bg-white/5 p-2 rounded-[1.5rem] border border-white/10">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-4">Forward To</p>
                            <select 
                                value={nextStation}
                                onChange={(e) => setNextStation(e.target.value)}
                                className="bg-transparent text-white font-black text-sm uppercase outline-none flex-1 p-3 cursor-pointer"
                            >
                                <option value="DOCTOR" className="text-slate-900">Consultation Unit</option>
                                <option value="LAB" className="text-slate-900">Laboratory Station</option>
                                <option value="PHARMACY" className="text-slate-900">Pharmacy Desk</option>
                            </select>
                        </div>
                        
                        <button 
                            onClick={handleFinalize}
                            disabled={loading || !selectedPatient}
                            className="bg-cyan-500 hover:bg-cyan-400 text-white px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] flex items-center gap-4 transition-all shadow-xl shadow-cyan-500/30 disabled:bg-slate-700 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20} /> Finalize Case</>}
                        </button>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default TriagePortal;