import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    Activity, User, ArrowRight, Heart, Thermometer, Ruler, Weight, 
    ClipboardList, Clock, Search, Loader2, AlertCircle, CheckCircle
} from 'lucide-react';

const VitalField = ({ label, icon: Icon, unit, ...props }) => (
    <div className="flex flex-col bg-slate-50 p-4 rounded-3xl border-2 border-transparent focus-within:border-cyan-500 focus-within:bg-white transition-all shadow-sm">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            {Icon && <Icon size={12} className="text-cyan-500" />}
            {label}
        </label>
        <div className="flex items-end gap-2">
            <input {...props} className="bg-transparent w-full outline-none font-black text-slate-800 text-xl" />
            <span className="text-[10px] font-bold text-slate-400 mb-1">{unit}</span>
        </div>
    </div>
);

const TriagePortal = () => {
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [nextStation, setNextStation] = useState('DOCTOR');
    const [liveQueue, setLiveQueue] = useState([]);
    const [vitals, setVitals] = useState({
        temperature: '', systolic_bp: '', diastolic_bp: '', 
        heart_rate: '', respiratory_rate: '', weight: '', height: '', spo2: ''
    });
    const [calculations, setCalculations] = useState({ bmi: '0.0', bsa: '0.0' });

    const fetchData = useCallback(async () => {
        try {
            // Only fetch patients actively waiting at the Triage Station
            const response = await API.get('/queue/?current_station=TRIAGE&status=WAITING');
            setLiveQueue(response.data.results || response.data);
        } catch (err) { console.error("Sync Error", err); }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s refresh for live feel
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        const h = parseFloat(vitals.height);
        const w = parseFloat(vitals.weight);
        if (h > 0 && w > 0) {
            const bmi = (w / ((h / 100) ** 2)).toFixed(1);
            const bsa = Math.sqrt((h * w) / 3600).toFixed(2);
            setCalculations({ bmi, bsa });
        }
    }, [vitals.height, vitals.weight]);

    const handleFinalize = async () => {
    if (!selectedPatient) return;
    
    setLoading(true);
    try {
        // Construct payload: only include appointment if it actually exists
        const vitalsPayload = {
            patient: selectedPatient.id,
            ...vitals,
            bmi: calculations.bmi,
            bsa: calculations.bsa
        };

        // If the patient has a booked appointment, attach it. 
        // If not (Direct Registration), the backend should accept it as null.
        if (selectedPatient.appointment) {
            vitalsPayload.appointment = selectedPatient.appointment;
        }

        // 1. Post Vitals
        await API.post('/vitals/', vitalsPayload);

        // 2. Advance Queue (Using the Queue Record ID)
        await API.post(`/queue/${selectedPatient.queue_id}/move_next/`, {
            target_station: nextStation
        });

        alert(`✅ Triage for ${selectedPatient.name} complete. Forwarded to ${nextStation}.`);
        
        // Reset UI
        setSelectedPatient(null);
        setVitals({ temperature: '', systolic_bp: '', diastolic_bp: '', heart_rate: '', respiratory_rate: '', weight: '', height: '', spo2: '' });
        fetchData();
    } catch (err) {
        console.error("Server Error:", err.response?.data);
        const detail = err.response?.data ? JSON.stringify(err.response.data) : "Check backend logs.";
        alert("Submission failed: " + detail);
    } finally { setLoading(false); }
};

    return (
        <div className="max-w-[1600px] mx-auto p-4 font-['Plus_Jakarta_Sans'] h-[90vh] flex flex-col gap-4 overflow-hidden">
            <header className="bg-[#020617] p-6 rounded-[2.5rem] shadow-2xl flex justify-between items-center border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="bg-cyan-500 p-3 rounded-2xl text-white"><Activity size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Salama <span className="text-cyan-400 text-sm">CLINICAL HUB</span></h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Triage Queue</p>
                    </div>
                </div>
                {selectedPatient && (
                    <div className="flex items-center gap-4 animate-in zoom-in duration-300">
                        <p className="text-white font-black text-md uppercase">{selectedPatient.name}</p>
                        <button onClick={() => setSelectedPatient(null)} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Release</button>
                    </div>
                )}
            </header>

            <div className="flex flex-1 gap-6 overflow-hidden">
                <aside className="w-[400px] flex flex-col bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                    <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Triage Waiting List</span>
                        <span className="bg-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">{liveQueue.length}</span>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input 
                                placeholder="Filter Queue..."
                                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none"
                                onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                            />
                        </div>
                        {liveQueue.filter(p => p.patient_name.toLowerCase().includes(searchTerm)).map((item) => (
                            <div key={item.id} onClick={() => setSelectedPatient({ id: item.patient, name: item.patient_name, queue_id: item.id, appointment: item.appointment })} className={`p-5 rounded-3xl cursor-pointer border-2 transition-all flex justify-between items-center group ${selectedPatient?.queue_id === item.id ? 'bg-cyan-50 border-cyan-500' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                                <div>
                                    <span className="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded tracking-tighter">#{item.token_id}</span>
                                    <p className="font-black text-slate-900 text-sm uppercase mt-1">{item.patient_name}</p>
                                </div>
                                <ArrowRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col relative">
                    {!selectedPatient && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[4px] z-20 flex items-center justify-center">
                            <div className="text-center p-12 bg-white rounded-[3rem] shadow-2xl border border-slate-100">
                                <User size={48} className="text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-black text-slate-800 uppercase italic">Select Patient</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue selection required to open vitals</p>
                            </div>
                        </div>
                    )}
                    <div className="p-10 flex-1 overflow-y-auto space-y-10">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <VitalField label="Temperature" unit="°C" icon={Thermometer} type="number" step="0.1" value={vitals.temperature} onChange={(e) => setVitals({...vitals, temperature: e.target.value})} />
                            <VitalField label="Oxygen Sat" unit="SpO2%" icon={Activity} type="number" value={vitals.spo2} onChange={(e) => setVitals({...vitals, spo2: e.target.value})} />
                            <VitalField label="BP (Systolic)" unit="mmHg" icon={Heart} type="number" value={vitals.systolic_bp} onChange={(e) => setVitals({...vitals, systolic_bp: e.target.value})} />
                            <VitalField label="BP (Diastolic)" unit="mmHg" icon={Heart} type="number" value={vitals.diastolic_bp} onChange={(e) => setVitals({...vitals, diastolic_bp: e.target.value})} />
                            <VitalField label="Height" unit="CM" icon={Ruler} type="number" value={vitals.height} onChange={(e) => setVitals({...vitals, height: e.target.value})} />
                            <VitalField label="Weight" unit="KG" icon={Weight} type="number" value={vitals.weight} onChange={(e) => setVitals({...vitals, weight: e.target.value})} />
                            <VitalField label="Pulse Rate" unit="BPM" icon={Heart} type="number" value={vitals.heart_rate} onChange={(e) => setVitals({...vitals, heart_rate: e.target.value})} />
                            <VitalField label="Respiratory" unit="RPM" icon={Activity} type="number" value={vitals.respiratory_rate} onChange={(e) => setVitals({...vitals, respiratory_rate: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-cyan-50 p-8 rounded-[2.5rem] border-2 border-cyan-100 flex justify-between items-center group">
                                <div><p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-2 italic">BMI</p><p className="text-6xl font-black text-slate-900 tracking-tighter">{calculations.bmi}</p></div>
                                <Activity size={50} className="text-cyan-200" />
                            </div>
                            <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-2 border-emerald-100 flex justify-between items-center group">
                                <div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 italic">BSA (m²)</p><p className="text-6xl font-black text-slate-900 tracking-tighter">{calculations.bsa}</p></div>
                                <Ruler size={50} className="text-emerald-200" />
                            </div>
                        </div>
                    </div>
                    <footer className="p-8 bg-slate-900 flex items-center justify-between gap-6">
                        <div className="flex-1 flex items-center gap-4 bg-white/5 p-2 rounded-[1.5rem] border border-white/10">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-4">Next Station</p>
                            <select value={nextStation} onChange={(e) => setNextStation(e.target.value)} className="bg-transparent text-white font-black text-sm uppercase outline-none flex-1 p-3 cursor-pointer">
                                <option value="DOCTOR" className="text-slate-900">Doctor/Consultation</option>
                                <option value="LAB" className="text-slate-900">Laboratory</option>
                                <option value="PHARMACY" className="text-slate-900">Pharmacy</option>
                            </select>
                        </div>
                        <button onClick={handleFinalize} disabled={loading || !selectedPatient} className="bg-cyan-500 hover:bg-cyan-400 text-white px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] flex items-center gap-4 transition-all shadow-xl shadow-cyan-500/30">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20} /> Finalize Case</>}
                        </button>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default TriagePortal;