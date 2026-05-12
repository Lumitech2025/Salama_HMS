import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    Activity, User, ArrowRight, Heart, Thermometer, Ruler, Weight, 
    Search, Loader2, AlertCircle, CheckCircle, Clock, Zap
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
            // Fetch patients currently at the Triage station
            const response = await API.get('/queue/?current_station=TRIAGE&status=WAITING');
            const data = response.data.results || response.data;

            // SORTING LOGIC:
            // 1. Urgent cases first
            // 2. Then First-come First-serve (by entered_at)
            const sortedQueue = [...data].sort((a, b) => {
                if (a.is_urgent && !b.is_urgent) return -1;
                if (!a.is_urgent && b.is_urgent) return 1;
                return new Date(a.entered_at) - new Date(b.entered_at);
            });

            setLiveQueue(sortedQueue);
        } catch (err) { console.error("Sync Error", err); }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); 
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
            const vitalsPayload = {
                patient: selectedPatient.id, // This links to the Patient PK
                ...vitals,
                bmi: calculations.bmi,
                bsa: calculations.bsa
            };

            // 1. Post Vitals to clinical records
            await API.post('/vitals/', vitalsPayload);

            // 2. Advance Queue (Using the Queue ID returned by backend)
            await API.post(`/queue/${selectedPatient.queue_id}/move_next/`, {
                target_station: nextStation
            });

            alert(`✅ Triage for ${selectedPatient.name} complete. Forwarded to ${nextStation}.`);
            
            setSelectedPatient(null);
            setVitals({ temperature: '', systolic_bp: '', diastolic_bp: '', heart_rate: '', respiratory_rate: '', weight: '', height: '', spo2: '' });
            fetchData();
        } catch (err) {
            console.error("Server Error:", err.response?.data);
            alert("Submission failed. Check vitals data requirements.");
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 font-['Inter'] h-[90vh] flex flex-col gap-4 overflow-hidden">
            <header className="bg-[#020617] p-6 rounded-[2.5rem] shadow-2xl flex justify-between items-center border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="bg-cyan-500 p-3 rounded-2xl text-white"><Activity size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Salama <span className="text-cyan-400 text-sm">CLINICAL HUB</span></h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Live Triage Queue</p>
                    </div>
                </div>
                {selectedPatient && (
                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-right">
                            <p className="text-white font-black text-sm uppercase tracking-tight">{selectedPatient.name}</p>
                            <p className="text-cyan-500 font-mono font-bold text-[10px] uppercase tracking-widest">{selectedPatient.token}</p>
                        </div>
                        <button onClick={() => setSelectedPatient(null)} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Release</button>
                    </div>
                )}
            </header>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* QUEUE ASIDE */}
                <aside className="w-[400px] flex flex-col bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                    <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Waiting List</span>
                            <span className="bg-cyan-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{liveQueue.length}</span>
                        </div>
                        <Clock size={14} className="text-slate-400" />
                    </div>
                    
                    <div className="p-6 flex-1 overflow-y-auto space-y-3 custom-scrollbar bg-white">
                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input 
                                placeholder="Filter Queue..."
                                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                            />
                        </div>

                        {liveQueue.filter(p => p.patient_name.toLowerCase().includes(searchTerm)).map((item) => (
                            <div 
                                key={item.id} 
                                onClick={() => setSelectedPatient({ id: item.patient, name: item.patient_name, queue_id: item.id, token: item.token_id, urgent: item.is_urgent })} 
                                className={`p-5 rounded-[2rem] cursor-pointer border-2 transition-all flex justify-between items-center group relative overflow-hidden ${selectedPatient?.queue_id === item.id ? 'bg-cyan-50 border-cyan-500 shadow-lg shadow-cyan-100' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                            >
                                {item.is_urgent && (
                                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-rose-500" />
                                )}
                                
                                <div className="z-10">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded tracking-widest uppercase ${item.is_urgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-900 text-white'}`}>
                                            {item.token_id}
                                        </span>
                                        {item.is_urgent && <Zap size={12} className="text-rose-500 fill-rose-500" />}
                                    </div>
                                    <p className={`font-black text-sm uppercase mt-1 tracking-tight ${item.is_urgent ? 'text-rose-900' : 'text-slate-900'}`}>{item.patient_name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(item.entered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <ArrowRight size={18} className={`${selectedPatient?.queue_id === item.id ? 'text-cyan-500' : 'text-slate-300'} group-hover:translate-x-1 transition-transform`} />
                            </div>
                        ))}
                    </div>
                </aside>

                {/* VITALS ENTRY MAIN */}
                <main className="flex-1 bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col relative">
                    {!selectedPatient && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[4px] z-20 flex items-center justify-center">
                            <div className="text-center p-12 bg-white rounded-[3rem] shadow-2xl border border-slate-100">
                                <User size={48} className="text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-black text-slate-800 uppercase italic">Awaiting Selection</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select a patient from the list to begin triage</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="p-10 flex-1 overflow-y-auto space-y-10">
                        {selectedPatient?.urgent && (
                            <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 flex items-center gap-4 text-rose-700 animate-pulse">
                                <AlertCircle size={24} />
                                <div>
                                    <p className="text-xs font-black uppercase">Urgent Triage Case</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">This patient was marked for priority assessment</p>
                                </div>
                            </div>
                        )}

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
                            <div className="bg-cyan-50 p-8 rounded-[2.5rem] border-2 border-cyan-100 flex justify-between items-center">
                                <div><p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-2 italic">BMI</p><p className="text-6xl font-black text-slate-900 tracking-tighter">{calculations.bmi}</p></div>
                                <Activity size={50} className="text-cyan-200" />
                            </div>
                            <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-2 border-emerald-100 flex justify-between items-center">
                                <div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 italic">BSA (m²)</p><p className="text-6xl font-black text-slate-900 tracking-tighter">{calculations.bsa}</p></div>
                                <Ruler size={50} className="text-emerald-200" />
                            </div>
                        </div>
                    </div>

                    <footer className="p-8 bg-slate-900 flex items-center justify-between gap-6">
                        <div className="flex-1 flex items-center gap-4 bg-white/5 p-2 rounded-[1.5rem] border border-white/10">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-4">Forward To</p>
                            <select value={nextStation} onChange={(e) => setNextStation(e.target.value)} className="bg-transparent text-white font-black text-sm uppercase outline-none flex-1 p-3 cursor-pointer">
                                <option value="DOCTOR" className="text-slate-900">Physician Review</option>
                                <option value="LAB" className="text-slate-900">Laboratory</option>
                                <option value="PHARMACY" className="text-slate-900">Direct Dispensary</option>
                            </select>
                        </div>
                        <button onClick={handleFinalize} disabled={loading || !selectedPatient} className="bg-cyan-500 hover:bg-cyan-400 text-white px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] flex items-center gap-4 transition-all shadow-xl shadow-cyan-500/30">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20} /> Submit & Forward</>}
                        </button>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default TriagePortal;