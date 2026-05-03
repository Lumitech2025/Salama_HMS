import React, { useState, useEffect } from 'react';
import { Calculator, Beaker, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

const OncologyTreatment = () => {
    // State for the Calculator
    const [weight, setWeight] = useState(70); // kg
    const [height, setHeight] = useState(170); // cm
    const [bsa, setBsa] = useState(0);

    // Calculate BSA using Mosteller Formula: sqrt((h*w)/3600)
    useEffect(() => {
        const calculatedBsa = Math.sqrt((height * weight) / 3600).toFixed(2);
        setBsa(calculatedBsa);
    }, [weight, height]);

    const protocols = [
        { name: 'FOLFOX', indication: 'Colorectal Cancer', cycleDays: 14, drugs: ['Oxaliplatin', 'Leucovorin', '5-FU'] },
        { name: 'CHOP', indication: 'Non-Hodgkin Lymphoma', cycleDays: 21, drugs: ['Cyclophosphamide', 'Doxorubicin', 'Vincristine', 'Prednisone'] },
    ];

    return (
        <div className="flex gap-8 animate-in fade-in duration-500 font-['Inter']">
            {/* Main Treatment Area */}
            <div className="flex-1 space-y-8">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Oncology Treatment</h2>
                    <p className="text-slate-500 font-medium">Protocol initialization and dosage verification engine.</p>
                </div>

                {/* 1. The Dose Calculator (Mechanical Necessity) */}
                <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Calculator size={20}/></div>
                        <h3 className="text-xl font-bold text-slate-900">BSA Dose Calculator</h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-8 items-center">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Weight (kg)</label>
                            <input 
                                type="number" 
                                value={weight} 
                                onChange={(e) => setWeight(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-2xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Height (cm)</label>
                            <input 
                                type="number" 
                                value={height} 
                                onChange={(e) => setHeight(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-2xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            />
                        </div>
                        <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-600/20">
                            <label className="block text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Calculated BSA</label>
                            <div className="text-4xl font-black tracking-tighter">{bsa} <span className="text-lg font-light">m²</span></div>
                        </div>
                    </div>
                </section>

                {/* 2. Protocol Selection */}
                <section className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Select Regimen</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {protocols.map((p) => (
                            <div key={p.name} className="bg-white border border-slate-200 p-6 rounded-[2rem] hover:border-blue-500 cursor-pointer transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase">{p.indication}</p>
                                    </div>
                                    <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-black text-slate-500">{p.cycleDays} DAY CYCLE</div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {p.drugs.map(drug => (
                                        <span key={drug} className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-100">{drug}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Clinical Safety Sidebar */}
            <div className="w-96 space-y-6">
                <div className="bg-[#020617] text-white p-8 rounded-[2.5rem] shadow-2xl">
                    <h3 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                        <AlertTriangle size={16}/> Pre-Chemo Clearance
                    </h3>
                    <div className="space-y-6">
                        <SafetyItem label="ANC (Neutrophils)" value="1.8" unit="x10⁹/L" status="safe" />
                        <SafetyItem label="Platelets" value="165" unit="x10⁹/L" status="safe" />
                        <SafetyItem label="Creatinine" value="0.9" unit="mg/dL" status="safe" />
                        <SafetyItem label="LVEF (Cardiac)" value="58" unit="%" status="safe" />
                    </div>
                    <button className="w-full mt-8 bg-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30">
                        Initialize Cycle 1
                    </button>
                </div>
            </div>
        </div>
    );
};

const SafetyItem = ({ label, value, unit, status }) => (
    <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{label}</p>
            <p className="text-lg font-black">{value} <span className="text-[10px] font-normal text-slate-400">{unit}</span></p>
        </div>
        <CheckCircle2 size={18} className="text-teal-500" />
    </div>
);

export default OncologyTreatment;