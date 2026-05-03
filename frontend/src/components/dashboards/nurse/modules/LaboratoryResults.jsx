import React from 'react';
import { Beaker, AlertTriangle, CheckCircle, ArrowDown, ArrowUp } from 'lucide-react';

const LaboratoryResults = ({ patient }) => {
    // Mock data: In production, this fetches from your Django backend
    const labGroups = [
        {
            category: "Hematology (CBC)",
            timestamp: "2026-05-01 07:30 AM",
            results: [
                { name: "WBC", value: "3.2", unit: "10^3/uL", range: "4.0 - 11.0", status: "low" },
                { name: "Hemoglobin", value: "10.5", unit: "g/dL", range: "12.0 - 16.0", status: "low" },
                { name: "Platelets", value: "155", unit: "10^3/uL", range: "150 - 450", status: "normal" },
                { name: "ANC", value: "1.1", unit: "10^3/uL", range: "> 1.5", status: "critical" }
            ]
        },
        {
            category: "Tumor Markers",
            timestamp: "2026-04-28 09:00 AM",
            results: [
                { name: "CEA", value: "4.2", unit: "ng/mL", range: "< 3.0", status: "high" },
                { name: "CA 15-3", value: "28.0", unit: "U/mL", range: "< 30.0", status: "normal" }
            ]
        }
    ];

    return (
        <div className="p-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Laboratory & Diagnostics</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Integrated Lab Feed</p>
                </div>
            </div>

            <div className="space-y-8">
                {labGroups.map((group, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider">{group.category}</h3>
                            <span className="text-[10px] font-bold text-slate-400 italic">Collected: {group.timestamp}</span>
                        </div>
                        
                        <div className="p-4">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                        <th className="text-left p-4">Test Name</th>
                                        <th className="text-center p-4">Result</th>
                                        <th className="text-left p-4">Reference Range</th>
                                        <th className="text-right p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {group.results.map((res, i) => (
                                        <tr key={i} className="group hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-bold text-slate-700">{res.name}</td>
                                            <td className={`p-4 text-center font-black text-lg ${res.status === 'critical' ? 'text-red-600' : 'text-slate-900'}`}>
                                                {res.value} <span className="text-[10px] font-medium text-slate-400">{res.unit}</span>
                                            </td>
                                            <td className="p-4 text-xs font-medium text-slate-500">{res.range}</td>
                                            <td className="p-4 text-right">
                                                {res.status === 'critical' ? (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase animate-pulse">
                                                        <AlertTriangle size={12} /> Critical
                                                    </span>
                                                ) : res.status === 'low' ? (
                                                    <span className="text-amber-600 font-black flex justify-end items-center gap-1">
                                                        <ArrowDown size={14} /> Low
                                                    </span>
                                                ) : (
                                                    <span className="text-green-500 font-black flex justify-end items-center gap-1">
                                                        <CheckCircle size={14} /> Normal
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LaboratoryResults;