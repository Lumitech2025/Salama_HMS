import React, { useState } from 'react';
import { Search, UserPlus, FileSignature, Layers3, Activity } from 'lucide-react';

const PatientRegistry = () => {
    // Placeholder data for prototyping
    const patients = [
        { ucrn: 'UCRN-2026-102', name: 'James Kimani', dob: '12 May 1978', diagnosis: 'C50.1 (Breast, Central)', stage: 'T2 N1 M0', status: 'On Treatment' },
        { ucrn: 'UCRN-2026-305', name: 'Mary Achieng', dob: '04 Oct 1985', diagnosis: 'C34.0 (Lung, Main Bronchus)', stage: 'T3 N2 M0', status: 'Lab Pending' },
        { ucrn: 'UCRN-2026-004', name: 'Patient Sample 03', dob: '29 Jun 1960', diagnosis: 'C61 (Prostate, Gland)', stage: 'T1c N0 M0', status: 'New Referral' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-['Inter']">
            {/* Contextual Header with Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-8">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Clinical Registry</h2>
                    <p className="text-slate-500 font-medium">Verify patient identity, ICD-O-3 diagnosis, and biomarker profile.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm text-sm font-bold flex items-center gap-2 hover:bg-slate-50 text-slate-800 transition-all">
                        <FileSignature size={16} />
                        Update Consent
                    </button>
                    <button className="bg-teal-600 px-5 py-3 rounded-xl shadow-lg shadow-teal-500/20 text-white text-sm font-bold flex items-center gap-2 hover:bg-teal-500 transition-all">
                        <UserPlus size={16} />
                        New Referral Entry
                    </button>
                </div>
            </div>

            {/* Powerful Search & Filter Bar */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600" size={20} />
                    <input 
                        type="text" 
                        placeholder="SEARCH BY UCRN, NAME, OR ICD-O-3 CODE" 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-teal-500/5 focus:border-teal-600 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium text-lg uppercase tracking-wide"
                    />
                </div>
                <button className="text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-teal-600 transition-colors">
                    Advanced Filters
                </button>
            </div>

            {/* The Unified Cancer Registry Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <HeaderCell label="UCRN / DEMOGRAPHICS" icon={<Layers3 size={12}/>}/>
                            <HeaderCell label="DIAGNOSIS (ICD-O-3)" icon={<Microscope size={12}/>}/>
                            <HeaderCell label="STAGE (TNM)" icon={<Microscope size={12}/>}/>
                            <HeaderCell label="CLINICAL STATUS" icon={<Activity size={12}/>}/>
                            <HeaderCell label="ACTIONS" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {patients.map((pat, index) => (
                            <tr key={index} className="hover:bg-teal-50/20 transition-colors group">
                                <td className="p-6">
                                    <p className="text-xs font-black uppercase tracking-widest text-teal-600 bg-teal-50 inline-block px-2 py-0.5 rounded-md mb-1">{pat.ucrn}</p>
                                    <p className="text-xl font-extrabold text-slate-950 tracking-tight">{pat.name}</p>
                                    <p className="text-xs text-slate-400 font-medium">{pat.dob}</p>
                                </td>
                                <td className="p-6 text-sm font-semibold text-slate-700 font-mono">{pat.diagnosis}</td>
                                <td className="p-6 text-sm font-bold text-slate-900">{pat.stage}</td>
                                <td className="p-6">
                                    <StatusBadge status={pat.status} />
                                </td>
                                <td className="p-6">
                                    <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg group-hover:bg-teal-600 transition-all">
                                        Open Records
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-6 border-t border-slate-100 bg-slate-50/30 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Salama Cancer Registry • Data Sync: Optimal</p>
                </div>
            </div>
        </div>
    );
};

// UI Sub-components for consistency
const HeaderCell = ({ label, icon }) => (
    <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">
        <div className="flex items-center gap-2">
            {icon} {label}
        </div>
    </th>
);

const Microscope = ({size}) => <span style={{fontSize: size}}>🔬</span>; // Simple placeholder icon

const StatusBadge = ({ status }) => {
    let color = 'slate';
    if (status === 'On Treatment') color = 'teal';
    if (status === 'Lab Pending') color = 'amber';
    if (status === 'New Referral') color = 'blue';

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-${color}-50 text-${color}-600 border border-${color}-100`}>
            <span className={`h-1.5 w-1.5 rounded-full bg-${color}-500`}></span>
            {status}
        </span>
    );
};

export default PatientRegistry;