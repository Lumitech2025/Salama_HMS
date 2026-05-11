import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Pill, Plus, Trash2, Send, Calculator, 
  User, ChevronDown, Save, Loader2, RefreshCcw, Activity, Clock
} from 'lucide-react';

const OncologyPrescription = ({ selectedPatientFromParent, onTabSwitch }) => {
    const [queue, setQueue] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(selectedPatientFromParent || null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Oncology Presets to reduce typing
    const commonMeds = ["Doxorubicin", "Cisplatin", "Paclitaxel", "5-Fluorouracil", "Cyclophosphamide", "Ondansetron", "Dexamethasone", "Methotrexate"];
    const frequencies = ["Once", "Daily", "Twice Daily", "Three Times Daily", "Weekly", "Every 21 Days"];
    const durations = ["1 Day", "3 Days", "5 Days", "7 Days", "14 Days", "1 Cycle"];

    const [formData, setNewDrug] = useState({
        medication_name: '',
        dosage: '',
        route: 'IV Infusion',
        frequency: 'Once',
        duration: '1 Day',
        instructions: ''
    });

    const fetchQueue = useCallback(async () => {
        try {
            const res = await API.get('/queue/?current_station=DOCTOR');
            setQueue(res.data.results || res.data || []);
        } catch (err) { console.error("Queue fetch error", err); }
    }, []);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);

    useEffect(() => {
        if (selectedPatientFromParent) setSelectedPatient(selectedPatientFromParent);
    }, [selectedPatientFromParent]);

    const addDrugToList = () => {
        if (!formData.medication_name || !formData.dosage) return;
        setPrescriptions([...prescriptions, { ...formData, id: Date.now() }]);
        setNewDrug({ medication_name: '', dosage: '', route: 'IV Infusion', frequency: 'Once', duration: '1 Day', instructions: '' });
    };

    const removeDrug = (id) => setPrescriptions(prescriptions.filter(p => p.id !== id));

    const handleSendToPharmacy = async () => {
        if (prescriptions.length === 0) return alert("Please add at least one medication.");
        if (!selectedPatient) return alert("No patient selected.");

        setIsSubmitting(true);
        try {
            // Extract the integer ID correctly
            const patientId = selectedPatient.patient || selectedPatient.id;
            
            // Format the payload to match your backend Serializer exactly
            const payload = {
                patient: patientId,
                status: 'PENDING',
                // Adjusting keys to match standard Salama HMS backend fields
                items: prescriptions.map(({ medication_name, dosage, frequency, duration, route, instructions }) => ({
                    medication_name,
                    dosage,
                    frequency,
                    duration,
                    route,
                    instructions
                }))
            };

            // 1. POST the prescription
            await API.post('/prescriptions/', payload);

            // 2. Automatically update queue station to PHARMACY
            await API.patch(`/queue/${selectedPatient.id}/`, { 
                current_station: 'PHARMACY',
                status: 'AWAITING_MEDICATION' 
            });

            alert("Success: Order transmitted and patient moved to Pharmacy.");
            onTabSwitch('home'); 
        } catch (err) {
            console.error("Transmission Error:", err.response?.data);
            alert("Transmission failed: " + (err.response?.data?.detail || "Check required fields."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
            
            {/* PATIENT SELECTION HUB */}
            <div className="bg-[#020617] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex items-center gap-4 flex-1 w-full">
                        <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500"><User size={24} /></div>
                        <div className="flex-1 relative">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Regimen Recipient</p>
                            <select 
                                className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                                onChange={(e) => {
                                    const p = queue.find(item => item.id === parseInt(e.target.value));
                                    setSelectedPatient(p);
                                }}
                                value={selectedPatient?.id || ''}
                            >
                                <option value="" disabled>Select patient to prescribe...</option>
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
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    
                    {/* BUILDER FORM */}
                    <div className="xl:col-span-5 space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-5">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Medication Builder</h3>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Drug</label>
                                <select 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.medication_name}
                                    onChange={(e) => setNewDrug({...formData, medication_name: e.target.value})}
                                >
                                    <option value="">Select Medication...</option>
                                    {commonMeds.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Dosage</label>
                                    <input 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 outline-none"
                                        placeholder="e.g. 50mg"
                                        value={formData.dosage}
                                        onChange={(e) => setNewDrug({...formData, dosage: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Frequency</label>
                                    <select 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 outline-none"
                                        value={formData.frequency}
                                        onChange={(e) => setNewDrug({...formData, frequency: e.target.value})}
                                    >
                                        {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Duration</label>
                                    <select 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 outline-none"
                                        value={formData.duration}
                                        onChange={(e) => setNewDrug({...formData, duration: e.target.value})}
                                    >
                                        {durations.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Route</label>
                                    <select 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 outline-none"
                                        value={formData.route}
                                        onChange={(e) => setNewDrug({...formData, route: e.target.value})}
                                    >
                                        <option>IV Infusion</option>
                                        <option>Oral</option>
                                        <option>SC Injection</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Instructions</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-medium text-slate-700 text-sm outline-none"
                                    rows="2"
                                    placeholder="Instructions for pharmacy..."
                                    value={formData.instructions}
                                    onChange={(e) => setNewDrug({...formData, instructions: e.target.value})}
                                />
                            </div>

                            <button 
                                onClick={addDrugToList}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16}/> Add to Regimen
                            </button>
                        </div>
                    </div>

                    {/* ORDER SUMMARY */}
                    <div className="xl:col-span-7 space-y-6">
                        <div className="bg-[#020617] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden min-h-[500px] border border-white/5">
                            <div className="flex justify-between items-center mb-10 relative z-10">
                                <div>
                                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Clinical Order Summary</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight italic">Drafting for {selectedPatient.patient_name}</p>
                                </div>
                            </div>

                            {prescriptions.length === 0 ? (
                                <div className="text-center py-24 opacity-20 border-2 border-dashed border-white/10 rounded-[2rem]">
                                    <Pill size={64} className="mx-auto text-white mb-4" />
                                    <p className="text-white text-xs font-black uppercase tracking-widest">Regimen List Empty</p>
                                </div>
                            ) : (
                                <div className="space-y-4 relative z-10">
                                    {prescriptions.map((drug) => (
                                        <div key={drug.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex justify-between items-center group hover:bg-white/10 transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="bg-blue-600/20 p-4 rounded-2xl text-blue-400"><Pill size={20}/></div>
                                                <div>
                                                    <p className="text-white font-black text-lg uppercase tracking-tight">{drug.medication_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{drug.dosage} • {drug.frequency} • {drug.route}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeDrug(drug.id)} className="p-3 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    ))}

                                    <div className="grid grid-cols-2 gap-4 mt-12">
                                        <button className="bg-white/5 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                                            <Save size={18} /> Save Progress
                                        </button>
                                        <button 
                                            onClick={handleSendToPharmacy}
                                            disabled={isSubmitting}
                                            className="bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-xl"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                                            Push to Pharmacy
                                        </button>
                                    </div>
                                </div>
                            )}
                            <Activity size={250} className="absolute -right-20 -bottom-20 text-white/[0.02] pointer-events-none" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-dashed border-slate-200 rounded-[3rem] p-32 text-center shadow-sm">
                    <Clock size={64} className="mx-auto text-slate-200 mb-6 animate-pulse" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-4 italic">Select a patient from the queue hub above to generate clinical orders.</p>
                </div>
            )}
        </div>
    );
};

export default OncologyPrescription;