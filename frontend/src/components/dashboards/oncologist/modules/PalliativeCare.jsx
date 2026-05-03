import React, { useState } from 'react';
import { Heart, Activity, Wind, Brain, Sliders, MessageSquare } from 'lucide-react';

const PalliativeCare = () => {
    // ESAS Scores (0-10)
    const [symptoms, setSymptoms] = useState([
        { id: 'pain', label: 'Pain', score: 6, icon: <Activity size={18}/>, color: 'rose' },
        { id: 'tired', label: 'Tiredness', score: 8, icon: <Wind size={18}/>, color: 'amber' },
        { id: 'nausea', label: 'Nausea', score: 2, icon: <Heart size={18}/>, color: 'teal' },
        { id: 'anxiety', label: 'Anxiety', score: 5, icon: <Brain size={18}/>, color: 'indigo' },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Palliative & Supportive</h2>
                    <p className="text-slate-500 font-medium">Holistic Symptom Management & Quality of Life</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">Symptom History</button>
                    <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">New Assessment</button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Symptom Scoring (ESAS) */}
                <div className="col-span-12 lg:col-span-7 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-10">
                        <Sliders className="text-slate-400" />
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Symptom Intensity (ESAS)</h3>
                    </div>

                    <div className="space-y-8">
                        {symptoms.map((s) => (
                            <div key={s.id} className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 bg-${s.color}-50 text-${s.color}-600 rounded-xl`}>{s.icon}</div>
                                        <span className="font-bold text-slate-700 uppercase text-xs tracking-widest">{s.label}</span>
                                    </div>
                                    <span className={`text-xl font-black text-${s.color}-600`}>{s.score}/10</span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full bg-${s.color}-500 rounded-full transition-all duration-1000`} 
                                        style={{ width: `${s.score * 10}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Psychosocial & Spiritual Support */}
                <div className="col-span-12 lg:col-span-5 space-y-6">
                    <div className="bg-indigo-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-black tracking-tight mb-2">Psychosocial Status</h3>
                            <p className="text-indigo-300 text-sm mb-6 font-medium">Last updated by Oncology Social Worker</p>
                            
                            <div className="space-y-4">
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Coping Strategy</p>
                                    <p className="text-sm font-bold">Resilient - Active engagement with family support.</p>
                                </div>
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Spiritual Care</p>
                                    <p className="text-sm font-bold">Counseling requested for upcoming week.</p>
                                </div>
                            </div>
                        </div>
                        <Heart className="absolute -right-10 -bottom-10 text-indigo-800" size={200} strokeWidth={1} />
                    </div>

                    {/* Care Coordination Note */}
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200">
                        <div className="flex items-center gap-3 mb-4 text-slate-900">
                            <MessageSquare size={20} />
                            <h3 className="font-black uppercase text-xs tracking-widest">Interdisciplinary Note</h3>
                        </div>
                        <p className="text-sm text-slate-500 italic leading-relaxed">
                            "Patient experiencing breakthrough pain at night. Recommended adjusting Morphine sulfate extended-release dosage. Family meeting scheduled for Friday to discuss home care transition."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PalliativeCare;