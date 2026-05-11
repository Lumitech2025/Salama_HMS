import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Pill, Plus, Trash2, Send, Calculator, 
  User, ChevronDown, Save, Loader2, RefreshCcw, Activity
} from 'lucide-react';

const OncologyPrescription = ({ selectedPatientFromParent, onTabSwitch }) => {
    const [queue, setQueue] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(selectedPatientFromParent || null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Presets for Oncology Workflow
    const commonMeds = ["Doxorubicin", "Cisplatin", "Paclitaxel", "5-Fluorouracil", "Cyclophosphamide", "Ondansetron", "Dexamethasone"];
    const frequencies = ["Once", "Daily", "Twice Daily", "Weekly", "Every 21 Days", "Every 14 Days"];

    const [formData, setNewDrug] = useState({
        drug_name: '',
        dosage: '',
        route: 'IV Infusion',
        frequency: 'Once',
        duration: '1 Day',
        notes: ''
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
        if (!formData.drug_name || !formData.dosage) return;
        setPrescriptions([...prescriptions, { ...formData, id: Date.now() }]);
        setNewDrug({ drug_name: '', dosage: '', route: 'IV Infusion', frequency: 'Once', duration: '1 Day', notes: '' });
    };

    const removeDrug = (id) => setPrescriptions(prescriptions.filter(p => p.id !== id));

    const handleSendToPharmacy = async () => {
        if (prescriptions.length === 0) return alert("Please add at least one medication.");
        setIsSubmitting(true);
        try {
            const patientId = selectedPatient.patient || selectedPatient.id;
            
            // 1. Submit the Prescription details
            await API.post('/prescriptions/', {
                patient: patientId,
                items: prescriptions,
                status: 'PENDING'
            });

            // 2. Push patient to PHARMACY queue
            await API.patch(`/queue/${selectedPatient.id}/`, { 
                current_station: 'PHARMACY',
                status: 'AWAITING_MEDICATION' 
            });

            alert("Success: Order transmitted and patient moved to Pharmacy queue.");
            onTabSwitch('home'); 
        } catch (err) {
            alert("Error in transmission.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
            
            {/* 1. SELECTION HUB */}
            <div className="bg-[#020617] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex items-center gap-4 flex-1 w-full">
                        <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500"><User size={24} /></div>
                        <div className="flex-1 relative">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Regimen Recipient</p>
                            <select 
                                className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* INPUT SIDE */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-5">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Medication Selection</h3>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Drug Name</label>
                                <select 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.drug_name}
                                    onChange={(e) => setNewDrug({...formData, drug_name: e.target.value})}
                                >
                                    <option value="">Select Medication...</option>
                                    {commonMeds.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Dosage (mg)</label>
                                    <input 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 outline-none"
                                        placeholder="e.g. 100"
                                        type="text"
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

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Route & Notes</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-medium text-slate-700 text-sm outline-none"
                                    rows="2"
                                    placeholder="e.g. Infuse over 60 mins..."
                                    value={formData.notes}
                                    onChange={(e) => setNewDrug({...formData, notes: e.target.value})}
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

                    {/* SUMMARY & SUBMISSION SIDE */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-[#020617] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden min-h-[450px]">
                            <div className="flex justify-between items-center mb-10 relative z-10">
                                <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em]">Pending Regimen Order</h3>
                                <div className="bg-white/5 px-4 py-2 rounded-xl text-[10px] font-bold text-slate-400 uppercase">
                                    Recipient: {selectedPatient.patient_name}
                                </div>
                            </div>

                            {prescriptions.length === 0 ? (
                                <div className="text-center py-24 opacity-20">
                                    <Pill size={64} className="mx-auto text-white mb-4" />
                                    <p className="text-white text-xs font-black uppercase tracking-widest">Regimen list is empty</p>
                                </div>
                            ) : (
                                <div className="space-y-4 relative z-10">
                                    {prescriptions.map((drug) => (
                                        <div key={drug.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex justify-between items-center group">
                                            <div className="flex items-center gap-5">
                                                <div className="bg-blue-600/20 p-4 rounded-2xl text-blue-400"><Pill size={20}/></div>
                                                <div>
                                                    <p className="text-white font-black text-lg uppercase tracking-tight">{drug.drug_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{drug.dosage} • {drug.frequency} • {drug.route}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeDrug(drug.id)} className="p-3 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    ))}

                                    <div className="grid grid-cols-2 gap-4 mt-12">
                                        <button className="bg-white/10 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all flex items-center justify-center gap-3">
                                            <Save size={18} /> Save for Record
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
                <div className="p-20 text-center text-slate-400 italic">Please select a patient from the queue hub above to start prescribing.</div>
            )}
        </div>
    );
};

export default OncologyPrescription;