import React, { useState } from 'react';
import { Activity, Thermometer, Gauge, Scale, AlertCircle } from 'lucide-react';

const TriageVitals = ({ patient }) => {
    const [vitals, setVitals] = useState({
        systolic: '',
        diastolic: '',
        pulse: '',
        temp: '',
        spo2: '',
        weight: '',
        height: '',
        ecog: '0'
    });

    const ecogGrades = [
        { grade: '0', desc: 'Fully active, no restrictions' },
        { grade: '1', desc: 'Strenuous activity restricted' },
        { grade: '2', desc: 'Up >50% of waking hours' },
        { grade: '3', desc: 'Limited to chair/bed >50%' },
        { grade: '4', desc: 'Completely disabled' }
    ];

    return (
        <div className="p-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Clinical Triage & Vitals</h2>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Context</p>
                    <p className="text-sm font-bold text-blue-600">{patient?.ucrn || 'N/A'}</p>
                </div>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <VitalInput 
                    label="Blood Pressure" 
                    icon={<Gauge className="text-rose-500" size={18}/>}
                    placeholder="120/80" 
                    unit="mmHg" 
                />
                <VitalInput 
                    label="Heart Rate" 
                    icon={<Activity className="text-red-500" size={18}/>}
                    placeholder="72" 
                    unit="bpm" 
                />
                <VitalInput 
                    label="Temperature" 
                    icon={<Thermometer className="text-orange-500" size={18}/>}
                    placeholder="36.5" 
                    unit="°C" 
                />
                <VitalInput 
                    label="Weight" 
                    icon={<Scale className="text-blue-500" size={18}/>}
                    placeholder="70" 
                    unit="kg" 
                />
            </div>

            {/* ECOG Performance Status - Critical for Oncology */}
            <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <AlertCircle className="text-blue-600" size={20} />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">ECOG Performance Status</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {ecogGrades.map((item) => (
                        <button
                            key={item.grade}
                            onClick={() => setVitals({...vitals, ecog: item.grade})}
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${
                                vitals.ecog === item.grade 
                                ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200' 
                                : 'border-white bg-white hover:border-slate-300 text-slate-600'
                            }`}
                        >
                            <span className="block text-lg font-black mb-1">Grade {item.grade}</span>
                            <span className={`text-[10px] font-bold leading-tight uppercase ${vitals.ecog === item.grade ? 'text-blue-100' : 'text-slate-400'}`}>
                                {item.desc}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black hover:scale-105 transition-transform shadow-xl shadow-slate-200">
                    Save Assessment
                </button>
            </div>
        </div>
    );
};

const VitalInput = ({ label, icon, placeholder, unit }) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
            <input 
                className="text-2xl font-black text-slate-900 w-full focus:outline-none placeholder:text-slate-200" 
                placeholder={placeholder} 
            />
            <span className="text-xs font-bold text-slate-400">{unit}</span>
        </div>
    </div>
);

export default TriageVitals;