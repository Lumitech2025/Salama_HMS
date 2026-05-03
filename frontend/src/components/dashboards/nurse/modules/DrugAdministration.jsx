import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';

const DrugAdministration = ({ patient }) => {
    const [isVerified, setIsVerified] = useState(false);
    const [infusionStatus, setInfusionStatus] = useState('pending'); // pending, running, completed

    // Mock data based on Oncologist's prescription
    const prescription = {
        drugName: "Paclitaxel",
        dose: "175 mg/m²",
        calculatedDose: "315 mg",
        route: "IV Infusion",
        preMeds: ["Dexamethasone", "Diphenhydramine"],
        protocol: "Weekly Taxol - Cycle 2 / Day 8"
    };

    return (
        <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header: Protocol Context */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Medication Administration (MAR)</h2>
                    <p className="text-sm font-bold text-blue-600">{prescription.protocol}</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2">
                        <AlertTriangle size={14} /> High Alert Medication
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: The Prescription Verification */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <ShieldCheck size={120} />
                        </div>
                        
                        <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6">Verified Prescription</h3>
                        <div className="grid grid-cols-2 gap-8 relative z-10">
                            <div>
                                <p className="text-slate-400 text-xs font-bold mb-1">Drug Name</p>
                                <p className="text-2xl font-black">{prescription.drugName}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold mb-1">Total Dose</p>
                                <p className="text-2xl font-black text-blue-400">{prescription.calculatedDose}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold mb-1">Route</p>
                                <p className="text-lg font-bold">{prescription.route}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold mb-1">Dosing Logic</p>
                                <p className="text-lg font-bold">{prescription.dose}</p>
                            </div>
                        </div>
                    </div>

                    {/* Pre-medication Checklist */}
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8">
                        <h3 className="text-sm font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
                            <CheckCircle2 className="text-green-500" size={18} /> Pre-medication Verification
                        </h3>
                        <div className="space-y-3">
                            {prescription.preMeds.map((med, index) => (
                                <label key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all cursor-pointer group">
                                    <span className="font-bold text-slate-700">{med} Administered?</span>
                                    <input type="checkbox" className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Infusion Control Panel */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Infusion Timer</h3>
                        
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="text-5xl font-black text-slate-900 mb-2 tracking-tighter">00:00:00</div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">Elapsed Time</p>
                        </div>

                        <div className="space-y-3 pt-6">
                            {infusionStatus === 'pending' && (
                                <button 
                                    onClick={() => setInfusionStatus('running')}
                                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                                >
                                    <Play size={20} fill="currentColor" /> Start Infusion
                                </button>
                            )}
                            
                            {infusionStatus === 'running' && (
                                <button 
                                    onClick={() => setInfusionStatus('completed')}
                                    className="w-full py-5 bg-green-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-green-200 transition-all"
                                >
                                    <CheckCircle2 size={20} /> Complete Session
                                </button>
                            )}

                            <button className="w-full py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
                                Report Reaction / Stop
                            </button>
                        </div>
                    </div>

                    {/* Batch Tracking */}
                    <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6">
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-4 tracking-widest">Pharmacy Batch Info</p>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-slate-500 italic">Batch #TX-9902</p>
                                <p className="text-xs font-bold text-slate-500 italic">Expires: 14:00 Today</p>
                            </div>
                            <Clock size={20} className="text-blue-300" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DrugAdministration;