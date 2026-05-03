// src/components/dashboards/nurse/modules/VitalsAssessment.jsx
import React, { useState } from 'react';
import { Activity, Thermometer, Droplets, Heart } from 'lucide-react';

const VitalsAssessment = ({ patient }) => {
    const [vitals, setVitals] = useState({
        bp_systolic: '',
        bp_diastolic: '',
        heart_rate: '',
        temperature: '',
        spO2: '',
        weight: '',
        ecog_score: '0' // Default: Fully active
    });

    const ecogOptions = [
        { value: '0', label: '0 - Fully Active' },
        { value: '1', label: '1 - Restricted Strenuous Activity' },
        { value: '2', label: '2 - Ambulatory, Capable of Self-care' },
        { value: '3', label: '3 - Limited Self-care' },
        { value: '4', label: '4 - Completely Disabled' }
    ];

    return (
        <div className="p-4 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Vitals & Clinical Assessment</h2>
                <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-widest">
                    Last Sync: Just Now
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {/* Visual Metric Cards */}
                <MetricInput 
                    label="Blood Pressure" 
                    icon={<Activity className="text-rose-500" size={18}/>}
                    placeholder="120/80"
                    unit="mmHg"
                />
                <MetricInput 
                    label="Heart Rate" 
                    icon={<Heart className="text-red-500" size={18}/>}
                    placeholder="72"
                    unit="bpm"
                />
                <MetricInput 
                    label="Temperature" 
                    icon={<Thermometer className="text-orange-500" size={18}/>}
                    placeholder="36.5"
                    unit="°C"
                />
                <MetricInput 
                    label="Oxygen Sat" 
                    icon={<Droplets className="text-blue-500" size={18}/>}
                    placeholder="98"
                    unit="%"
                />
            </div>

            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Functional Assessment</h3>
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2">ECOG Performance Status</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {ecogOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setVitals({...vitals, ecog_score: opt.value})}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                    vitals.ecog_score === opt.value 
                                    ? 'border-blue-600 bg-blue-50' 
                                    : 'border-white bg-white hover:border-slate-300'
                                }`}
                            >
                                <p className={`text-xs font-black ${vitals.ecog_score === opt.value ? 'text-blue-600' : 'text-slate-400'}`}>
                                    SCORE {opt.value}
                                </p>
                                <p className="text-[11px] font-bold text-slate-600 leading-tight mt-1">
                                    {opt.label.split('-')[1]}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <button className="mt-10 w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-slate-200">
                Save & Continue to Administration
            </button>
        </div>
    );
};

// Helper component for clean inputs
const MetricInput = ({ label, icon, placeholder, unit }) => (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
            <input 
                type="text" 
                placeholder={placeholder}
                className="text-2xl font-black text-slate-800 w-full focus:outline-none placeholder:text-slate-200"
            />
            <span className="text-xs font-bold text-slate-400">{unit}</span>
        </div>
    </div>
);

export default VitalsAssessment;