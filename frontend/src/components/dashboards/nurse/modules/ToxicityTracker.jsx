import React, { useState } from 'react';
import { AlertCircle, Activity, Info, Save } from 'lucide-react';

const ToxicityTracker = ({ patient }) => {
    const [toxicities, setToxicities] = useState({
        nausea: '0',
        fatigue: '0',
        neuropathy: '0',
        diarrhea: '0',
        mucositis: '0'
    });

    const grades = [
        { level: '0', color: 'bg-slate-100 text-slate-400', desc: 'None' },
        { level: '1', color: 'bg-blue-100 text-blue-600', desc: 'Mild' },
        { level: '2', color: 'bg-yellow-100 text-yellow-700', desc: 'Moderate' },
        { level: '3', color: 'bg-orange-100 text-orange-700', desc: 'Severe' },
        { level: '4', color: 'bg-red-100 text-red-700', desc: 'Life-threatening' }
    ];

    const toxicityTypes = [
        { id: 'nausea', name: 'Nausea/Vomiting', category: 'GI' },
        { id: 'fatigue', name: 'Fatigue', category: 'General' },
        { id: 'neuropathy', name: 'Peripheral Neuropathy', category: 'Neurological' },
        { id: 'diarrhea', name: 'Diarrhea', category: 'GI' },
        { id: 'mucositis', name: 'Oral Mucositis', category: 'GI' },
    ];

    return (
        <div className="p-6 animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Toxicity & Side Effect Tracking</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        CTCAE v5.0 Standard Grading
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">
                    <Info size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black text-blue-700 uppercase">Grading Guide Active</span>
                </div>
            </div>

            <div className="space-y-6">
                {toxicityTypes.map((type) => (
                    <div key={type.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{type.category}</p>
                                    <h4 className="font-black text-slate-800 text-lg">{type.name}</h4>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {grades.map((g) => (
                                    <button
                                        key={g.level}
                                        onClick={() => setToxicities({...toxicities, [type.id]: g.level})}
                                        className={`px-4 py-3 rounded-xl border-2 transition-all flex flex-col items-center min-w-[70px] ${
                                            toxicities[type.id] === g.level 
                                            ? 'border-slate-900 bg-slate-900 text-white shadow-lg' 
                                            : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="text-lg font-black leading-none">{g.level}</span>
                                        <span className="text-[8px] font-bold uppercase mt-1 opacity-60">{g.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* Automated Clinical Warning for Grade 3+ */}
                        {parseInt(toxicities[type.id]) >= 3 && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-pulse">
                                <AlertCircle className="text-red-600" size={18} />
                                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">
                                    CRITICAL: Grade {toxicities[type.id]} requires immediate Oncologist review before next cycle.
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-10 flex justify-end">
                <button className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200">
                    <Save size={20} /> Submit Toxicity Report
                </button>
            </div>
        </div>
    );
};

export default ToxicityTracker;