import React from 'react';
import { Beaker, TrendingDown, TrendingUp, AlertCircle, FileSpreadsheet } from 'lucide-react';

const LaboratoryResults = () => {
    const labData = [
        { parameter: 'Hemoglobin', value: 11.2, unit: 'g/dL', status: 'low', trend: 'down', previous: 12.5 },
        { parameter: 'WBC Count', value: 3.8, unit: 'x10⁹/L', status: 'normal', trend: 'down', previous: 4.2 },
        { parameter: 'Neutrophils (ANC)', value: 1.4, unit: 'x10⁹/L', status: 'critical', trend: 'down', previous: 1.9 },
        { parameter: 'Platelets', value: 185, unit: 'x10⁹/L', status: 'normal', trend: 'up', previous: 160 },
        { parameter: 'Creatinine', value: 1.1, unit: 'mg/dL', status: 'normal', trend: 'stable', previous: 1.1 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-['Inter']">
            {/* Module Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Lab & Diagnostics</h2>
                    <p className="text-slate-500 font-medium">Hematology and Chemistry Trend Analysis</p>
                </div>
                <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">
                    <FileSpreadsheet size={16}/> Export Longitudinal Report
                </button>
            </div>

            {/* Critical Alert Banner - Only shows if 'critical' status exists */}
            <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex items-center gap-6 animate-pulse">
                <div className="bg-rose-500 p-3 rounded-2xl text-white">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h4 className="font-black text-rose-900 uppercase text-sm tracking-tight">Critical Neutropenia Risk</h4>
                    <p className="text-rose-700 text-xs font-bold">ANC has dropped below 1.5. Consider dose reduction or G-CSF support.</p>
                </div>
            </div>

            {/* The Lab Grid */}
            <div className="grid grid-cols-1 gap-4">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Parameter</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Result</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reference Range</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trend (Delta)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {labData.map((lab, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg text-slate-400"><Beaker size={14}/></div>
                                            <span className="font-black text-slate-900">{lab.parameter}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xl font-black text-slate-900">{lab.value}</span>
                                        <span className="ml-1 text-[10px] font-bold text-slate-400 uppercase">{lab.unit}</span>
                                    </td>
                                    <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase">
                                        Varies by protocol
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            {lab.trend === 'down' ? <TrendingDown size={16} className="text-rose-500"/> : <TrendingUp size={16} className="text-teal-500"/>}
                                            <span className="text-[10px] font-black text-slate-400">Prev: {lab.previous}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            lab.status === 'critical' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 
                                            lab.status === 'low' ? 'bg-amber-100 text-amber-700' : 
                                            'bg-teal-50 text-teal-600'
                                        }`}>
                                            {lab.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LaboratoryResults;