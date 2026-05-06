import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- Reusable UI Elements ---
const Input = ({ label, ...props }) => (
    <div className="flex flex-col w-full">
        {label && <label className="text-sm font-semibold text-gray-700 mb-1">{label}</label>}
        <input {...props} className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none transition-all" />
    </div>
);

const Button = ({ children, variant, ...props }) => {
    const base = "px-6 py-2 rounded-md font-bold transition-all active:scale-95 disabled:opacity-50";
    const styles = variant === 'primary' ? "bg-cyan-600 text-white hover:bg-cyan-700 shadow-md" : "border-2 border-gray-300 text-gray-600 hover:bg-gray-50";
    return <button {...props} className={`${base} ${styles}`}>{children}</button>;
};

const TriagePortal = () => {
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [waitingQueue, setWaitingQueue] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [vitals, setVitals] = useState({
        height: '', weight: '', systolic: '', diastolic: '', temperature: '', spo2: '',
    });
    const [calculations, setCalculations] = useState({ bmi: 0, bsa: 0 });
    const [loading, setLoading] = useState(false);

    // --- 1. Fetch Patients Waiting for Triage ---
    useEffect(() => {
        const fetchQueue = async () => {
            try {
                // Adjust endpoint to match your Django URL for appointments with 'PENDING' or 'CHECKED_IN' status
                const res = await axios.get('/api/appointments/?status=WAITING_TRIAGE');
                setWaitingQueue(res.data);
            } catch (err) {
                console.error("Queue fetch failed", err);
            }
        };
        if (!selectedPatient) fetchQueue();
    }, [selectedPatient]);

    // --- 2. Clinical Logic: BMI & BSA ---
    useEffect(() => {
        if (vitals.height > 0 && vitals.weight > 0) {
            const h_m = vitals.height / 100;
            const bmi = (vitals.weight / (h_m * h_m)).toFixed(2);
            const bsa = Math.sqrt((vitals.height * vitals.weight) / 3600).toFixed(2);
            setCalculations({ bmi, bsa });
        }
    }, [vitals.height, vitals.weight]);

    const handleSubmission = async (targetStatus) => {
        if (!selectedPatient) return;
        setLoading(true);
        try {
            await axios.post('/api/vitals/', {
                patient: selectedPatient.patient.id,
                appointment: selectedPatient.id,
                ...vitals,
                bmi: calculations.bmi,
                bsa: calculations.bsa
            });

            if (targetStatus === 'PROCEED') {
                await axios.patch(`/api/appointments/${selectedPatient.id}/`, { status: 'TRIAGED' });
            }

            alert("Vitals saved successfully!");
            setSelectedPatient(null); // Return to list
            setVitals({ height: '', weight: '', systolic: '', diastolic: '', temperature: '', spo2: '' });
        } catch (error) {
            alert("Error saving data. Check API connection.");
        } finally {
            setLoading(false);
        }
    };

    // --- VIEW A: Patient Selection ---
    if (!selectedPatient) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-2xl font-black text-slate-800">Triage Queue</h2>
                    <p className="text-gray-500">Select a patient to begin recording vitals.</p>
                </div>
                <Input 
                    placeholder="Search by Name or Reg No..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
                <div className="mt-6 grid gap-4">
                    {waitingQueue.filter(apt => apt.patient.name.toLowerCase().includes(searchTerm.toLowerCase())).map(apt => (
                        <div 
                            key={apt.id} 
                            onClick={() => setSelectedPatient(apt)}
                            className="p-4 border rounded-xl hover:border-cyan-500 hover:bg-cyan-50 cursor-pointer transition-all flex justify-between items-center group"
                        >
                            <div>
                                <h3 className="font-bold text-slate-700 group-hover:text-cyan-700">{apt.patient.name}</h3>
                                <p className="text-xs text-gray-400">REG: {apt.patient.registry_no}</p>
                            </div>
                            <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded uppercase">Waiting</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- VIEW B: Vitals Entry (Your Existing Form) ---
    return (
        <div className="p-8 bg-white shadow-xl rounded-2xl max-w-5xl mx-auto border border-gray-100">
            <header className="mb-10 flex justify-between items-center border-b pb-6">
                <button onClick={() => setSelectedPatient(null)} className="text-cyan-600 hover:underline text-sm font-bold">← Back to Queue</button>
                <div className="text-right">
                    <h1 className="text-2xl font-black text-slate-800">{selectedPatient.patient.name}</h1>
                    <p className="text-xs text-gray-400">ID: {selectedPatient.patient.registry_no}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
                <Input label="Height (cm)" type="number" value={vitals.height} onChange={(e) => setVitals({...vitals, height: e.target.value})} />
                <Input label="Weight (kg)" type="number" value={vitals.weight} onChange={(e) => setVitals({...vitals, weight: e.target.value})} />
                <Input label="Temp (°C)" type="number" step="0.1" value={vitals.temperature} onChange={(e) => setVitals({...vitals, temperature: e.target.value})} />
                <Input label="SpO2 (%)" type="number" value={vitals.spo2} onChange={(e) => setVitals({...vitals, spo2: e.target.value})} />
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Blood Pressure (mmHg)</label>
                    <div className="flex gap-3">
                        <input className="p-2 border rounded-md w-full" placeholder="Sys" value={vitals.systolic} onChange={(e) => setVitals({...vitals, systolic: e.target.value})} />
                        <span className="text-xl font-bold text-gray-300">/</span>
                        <input className="p-2 border rounded-md w-full" placeholder="Dia" value={vitals.diastolic} onChange={(e) => setVitals({...vitals, diastolic: e.target.value})} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest">BMI</span>
                    <div className="text-4xl font-black text-blue-900">{calculations.bmi}</div>
                </div>
                <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">BSA</span>
                    <div className="text-4xl font-black text-emerald-900">{calculations.bsa} <small className="text-lg">m²</small></div>
                </div>
            </div>

            <footer className="flex justify-end gap-4 border-t pt-8">
                <Button onClick={() => handleSubmission('SAVED')} disabled={loading}>Save Results</Button>
                <Button variant="primary" onClick={() => handleSubmission('PROCEED')} disabled={loading}>Proceed to Doctor</Button>
            </footer>
        </div>
    );
};

export default Triage;