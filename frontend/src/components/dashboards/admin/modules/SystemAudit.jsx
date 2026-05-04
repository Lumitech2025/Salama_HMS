import React, { useState } from 'react';
import { ShieldAlert, Fingerprint, Eye, Database, Search, HardDrive } from 'lucide-react';

const SystemAudit = () => {
    // Audit logs would ideally be immutable streams from your Django backend
    const [logs] = useState([
        { id: 1, action: "RECORD_VIEW", user: "Dr. Collins", target: "Patient #882", timestamp: "2026-05-04 10:12:05", severity: "Low" },
        { id: 2, action: "PERMISSION_CHANGE", user: "Admin_Main", target: "Nurse_Janet", timestamp: "2026-05-04 09:45:12", severity: "High" },
        { id: 3, action: "LAB_VALIDATION", user: "Lab_Tech_01", target: "Test_R_404", timestamp: "2026-05-04 09:30:00", severity: "Medium" },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Security Status Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Security & Audit Vault</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Immutable Interaction Logs</p>
                </div>
                <div className="flex space-x-4 bg-white/5 p-2 rounded-2xl border border-white/10">
                    <div className="flex items-center space-x-2 px-4 py-2 border-r border-white/10">
                        <Database size={16} className="text-teal-500" />
                        <span className="text-white text-[10px] font-black uppercase">Database Encrypted</span>
                    </div>
                    <div className="flex items-center space-x-2 px-4 py-2">
                        <ShieldAlert size={16} className="text-amber-500" />
                        <span className="text-white text-[10px] font-black uppercase">MFA Active</span>
                    </div>
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-slate-900/50 border border-white/10 rounded-[2.5rem] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Event Ledger</h3>
                    <div className="flex space-x-2">
                        <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-all"><Search size={18} /></button>
                        <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-all"><HardDrive size={18} /></button>
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identity</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Integrity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center space-x-3">
                                        <Fingerprint size={16} className="text-teal-500" />
                                        <span className="text-sm font-bold text-white tracking-tight">{log.user}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                                        log.severity === 'High' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                        {log.action}
                                    </span>
                                    <span className="ml-3 text-xs text-slate-500">{log.target}</span>
                                </td>
                                <td className="px-8 py-6 text-xs text-slate-400 font-medium font-mono">{log.timestamp}</td>
                                <td className="px-8 py-6 text-right">
                                    <Eye size={16} className="inline text-slate-600 hover:text-teal-500 cursor-pointer transition-colors" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SystemAudit;