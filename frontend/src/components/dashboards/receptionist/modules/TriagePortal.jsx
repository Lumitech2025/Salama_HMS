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
        heart_rate: '', respiratory_rate: '', weight: '', 
        height: '', spo2: ''
    });

    const [calculations, setCalculations] = useState({ bmi: '0.0', bsa: '0.0' });

    const fetchData = useCallback(async () => {
        try {
            const response = await API.get('/queue', {
                params: {
                    current_station: 'TRIAGE',
                    status: 'WAITING'
                }
            });
            const data = response.data.results || response.data || [];

            const sortedQueue = [...data].sort((a, b) => {
                const aUrgent = a.is_urgent || a.priority === 'EMERGENCY';
                const bUrgent = b.is_urgent || b.priority === 'EMERGENCY';
                if (aUrgent && !bUrgent) return -1;
                if (!aUrgent && bUrgent) return 1;
                return new Date(a.entered_at) - new Date(b.entered_at);
            });

            setLiveQueue(sortedQueue);
        } catch (err) { 
            console.error("Queue Sync Error:", err); 
        }
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
            const bmi = (w / ((h / 100) ** 2)).toFixed(2);
            const bsa = Math.sqrt((h * w) / 3600).toFixed(2);
            setCalculations({ bmi, bsa });
        }
    }, [vitals.height, vitals.weight]);

    const handleFinalize = async () => {
        if (!selectedPatient) return;
        setLoading(true);
        try {
            const vitalsPayload = {
                patient: selectedPatient.patient_id,
                visit: selectedPatient.visit_id,
                temperature: parseFloat(vitals.temperature),
                systolic_bp: parseInt(vitals.systolic_bp),
                diastolic_bp: parseInt(vitals.diastolic_bp),
                heart_rate: parseInt(vitals.heart_rate),
                respiratory_rate: parseInt(vitals.respiratory_rate),
                weight: parseFloat(vitals.weight),
                height: parseFloat(vitals.height),
                spo2: parseInt(vitals.spo2),
                bmi: parseFloat(calculations.bmi),
                bsa: parseFloat(calculations.bsa)
            };

            // 1. Save Vitals
            await API.post('/vitals', vitalsPayload);

            const moveResponse = await API.post(`/queue/${selectedPatient.queue_entry_id}/move_next`, {
                target_station: nextStation 
            });

            let alertMessage = `Triage for ${selectedPatient.name} finalized. Patient moved to: ${moveResponse.data.next_station}`;
            if (nextStation === 'DOCTOR') {
                alertMessage += `\n\n Consultation charge generated. Patient must clear at Cashier before seeing the Doctor.`;
            }

            alert(alertMessage);
            
            // Reset UI
            setSelectedPatient(null);
            setVitals({ temperature: '', systolic_bp: '', diastolic_bp: '', heart_rate: '', respiratory_rate: '', weight: '', height: '', spo2: '' });
            fetchData();
        } catch (err) {
            console.error("Submission Error:", err.response?.data);
            alert("Submission failed. Ensure all vital signs are within valid numeric ranges.");
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 font-['Inter'] h-[90vh] flex flex-col gap-4 overflow-hidden">
            <header className="bg-[#020617] p-6 rounded-[2.5rem] shadow-2xl flex justify-between items-center border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="bg-cyan-500 p-3 rounded-2xl text-white"><Activity size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Salama <span className="text-cyan-400 text-sm">TRIAGE HUB</span></h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 italic tracking-[0.2em]">Clinical Intake Monitor</p>
                    </div>
                </div>
                {selectedPatient && (
                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-right">
                            <p className="text-white font-black text-md uppercase tracking-tight">{selectedPatient.name}</p>
                            <p className="text-cyan-500 font-mono font-bold text-[10px] uppercase">TOKEN: {selectedPatient.token}</p>
                        </div>
                        <button onClick={() => setSelectedPatient(null)} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Release</button>
                    </div>
                )}
            </header>

            <div className="flex flex-1 gap-6 overflow-hidden">
                <aside className="w-[420px] flex flex-col bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <Clock size={16} className="text-cyan-600" />
                            <h3 className="font-black text-slate-900 uppercase italic text-sm">Waiting List</h3>
                        </div>
                        <span className="bg-[#020617] text-white text-[10px] font-black px-3 py-1 rounded-full">{liveQueue.length}</span>
                    </div>
                    
                    <div className="p-6 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input 
                                placeholder="Search by name or token..."
                                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
                                onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                            />
                        </div>

                        {liveQueue.filter(p => p.patient_name?.toLowerCase().includes(searchTerm)).map((item) => (
                            <div 
                                key={item.id} 
                                onClick={() => setSelectedPatient({ 
                                    patient_id: item.patient,        
                                    visit_id: item.visit_id, 
                                    queue_entry_id: item.id,         
                                    name: item.patient_name, 
                                    token: item.token_id, 
                                    urgent: item.is_urgent 
                                })} 
                                className={`p-6 rounded-[2.5rem] cursor-pointer border-2 transition-all relative overflow-hidden group ${selectedPatient?.queue_entry_id === item.id ? 'bg-cyan-50 border-cyan-500 shadow-lg shadow-cyan-100' : 'bg-white border-slate-100 hover:border-cyan-200'}`}
                            >
                                {item.is_urgent && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-rose-500 animate-pulse" />}
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded tracking-widest ${item.is_urgent ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'}`}>
                                                {item.token_id}
                                            </span>
                                            {item.is_urgent && <Zap size={10} className="text-rose-500 fill-rose-500" />}
                                        </div>
                                        <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{item.patient_name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Status: {item.status_display}</p>
                                    </div>
                                    <ArrowRight size={20} className={`${selectedPatient?.queue_entry_id === item.id ? 'text-cyan-500' : 'text-slate-200'} group-hover:translate-x-1 transition-transform`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col relative">
                    {!selectedPatient && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[6px] z-20 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <User size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic">Select patient to record vitals</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 tracking-[0.2em]">Clinical Session Inactive</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="p-10 flex-1 overflow-y-auto space-y-12">
                        {selectedPatient?.urgent && (
                            <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 flex items-center gap-5 text-rose-700 animate-pulse">
                                <div className="bg-rose-500 p-2 rounded-lg text-white"><AlertCircle size={18} /></div>
                                <div>
                                    <p className="text-xs font-black uppercase italic">Urgent Case</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <VitalField label="Temperature" unit="°C" icon={Thermometer} type="number" step="0.1" value={vitals.temperature} onChange={(e) => setVitals({...vitals, temperature: e.target.value})} />
                            <VitalField label="BP (Systolic)" unit="mmHg" icon={Heart} type="number" value={vitals.systolic_bp} onChange={(e) => setVitals({...vitals, systolic_bp: e.target.value})} />
                            <VitalField label="BP (Diastolic)" unit="mmHg" icon={Heart} type="number" value={vitals.diastolic_bp} onChange={(e) => setVitals({...vitals, diastolic_bp: e.target.value})} />
                            <VitalField label="Oxygen Sat" unit="SpO2%" icon={Activity} type="number" value={vitals.spo2} onChange={(e) => setVitals({...vitals, spo2: e.target.value})} />
                            <VitalField label="Pulse Rate" unit="BPM" icon={Heart} type="number" value={vitals.heart_rate} onChange={(e) => setVitals({...vitals, heart_rate: e.target.value})} />
                            <VitalField label="Respiratory" unit="RPM" icon={Activity} type="number" value={vitals.respiratory_rate} onChange={(e) => setVitals({...vitals, respiratory_rate: e.target.value})} />
                            <VitalField label="Weight" unit="KG" icon={Weight} type="number" step="0.01" value={vitals.weight} onChange={(e) => setVitals({...vitals, weight: e.target.value})} />
                            <VitalField label="Height" unit="CM" icon={Ruler} type="number" step="0.1" value={vitals.height} onChange={(e) => setVitals({...vitals, height: e.target.value})} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-cyan-50 p-8 rounded-[2.5rem] border border-cyan-100 flex justify-between items-center group">
                                <div><p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-2 italic">Calculated BMI</p><p className="text-6xl font-black text-slate-900 tracking-tighter">{calculations.bmi}</p></div>
                                <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><Activity size={40} className="text-cyan-500" /></div>
                            </div>
                            <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 flex justify-between items-center group">
                                <div><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 italic">BSA (m²)</p><p className="text-6xl font-black text-slate-900 tracking-tighter">{calculations.bsa}</p></div>
                                <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><Ruler size={40} className="text-indigo-500" /></div>
                            </div>
                        </div>

                        {nextStation === 'DOCTOR' && selectedPatient && (
                            <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex items-center gap-4 text-amber-900 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                
                                
                            </div>
                        )}
                    </div>

                    <footer className="p-10 bg-slate-900 flex items-center justify-between gap-8">
                        <div className="flex-1 flex items-center gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/10">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-6">Target Station</p>
                            <select value={nextStation} onChange={(e) => setNextStation(e.target.value)} className="bg-transparent text-white font-black text-xs uppercase outline-none flex-1 p-4 cursor-pointer">
                                <option value="DOCTOR" className="text-slate-900">Physician Consultation</option>
                                <option value="LAB" className="text-slate-900">Lab Investigations</option>
                                <option value="RADIOLOGY" className="text-slate-900">Radiology / Imaging</option>
                                <option value="PHARMACY" className="text-slate-900">Direct Dispensing</option>
                            </select>
                        </div>
                        <button onClick={handleFinalize} disabled={loading || !selectedPatient} className="bg-cyan-500 hover:bg-cyan-400 text-white px-16 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-4 transition-all shadow-2xl shadow-cyan-500/40">
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle size={18} /> Complete Triage</>}
                        </button>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default TriagePortal;