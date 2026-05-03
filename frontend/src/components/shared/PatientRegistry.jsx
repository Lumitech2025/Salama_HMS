import React, { useState } from 'react';
import { Search, User, ArrowRight, Beaker, Receipt } from 'lucide-react';

const PatientRegistry = ({ onSelect, userRole }) => {
    const [search, setSearch] = useState("");

    // Simulated data with clinical markers
    const patients = [
        { id: 1, name: "Collins Kimathi", ucrn: "UCRN-2026-001", status: "Active", lastLab: "2026-05-01" },
        { id: 2, name: "Jane Moraa", ucrn: "UCRN-2026-042", status: "Pending Labs", lastLab: "N/A" },
    ];

    const filtered = patients.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.ucrn.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6">
            {/* Search Bar */}
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                <input 
                    type="text"
                    placeholder="Find patient by name or UCRN..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 transition-all"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid gap-4">
                {filtered.map(patient => (
                    <div 
                        key={patient.id}
                        className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[2rem] hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
                    >
                        {/* Patient Info Section */}
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => onSelect(patient)}>
                            <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                <User size={24}/>
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 tracking-tight">{patient.name}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{patient.ucrn}</p>
                            </div>
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex items-center gap-3">
                            {/* 1. Lab Results Button (Crucial for Pharmacist) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); alert(`Opening Lab History for ${patient.name}`); }}
                                className="p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2"
                                title="View Lab Results"
                            >
                                <Beaker size={18} />
                                <span className="text-[10px] font-black uppercase tracking-tight hidden md:block">Labs</span>
                            </button>

                            {/* 2. Billing Status Tag */}
                            <span className="text-[10px] font-black px-3 py-1 bg-slate-100 text-slate-500 rounded-full uppercase">
                                {patient.status}
                            </span>

                            {/* 3. Detailed View Trigger */}
                            <button onClick={() => onSelect(patient)} className="p-2 text-slate-300 group-hover:text-indigo-500 transition-colors">
                                <ArrowRight size={22} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PatientRegistry;