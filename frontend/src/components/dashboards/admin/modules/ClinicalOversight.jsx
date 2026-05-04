import React from 'react';
import { Activity, Users, Clock, AlertTriangle, ChevronRight, Zap } from 'lucide-react';

const ClinicalOversight = () => {
    // Mock data representing live hospital "Vitals"
    const departments = [
        { name: 'Triage & Nursing', load: 85, patients: 12, status: 'High' },
        { name: 'Oncology Lab', load: 40, patients: 4, status: 'Stable' },
        { name: 'Radiology', load: 15, patients: 1, status: 'Idle' },
        { name: 'Pharmacy', load: 60, patients: 8, status: 'Stable' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 1. Executive Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={<Users />} label="Total In-Patients" value="42" color="teal" />
                <StatCard icon={<Clock />} label="Avg. Wait Time" value="18m" color="blue" />
                <StatCard icon={<Activity />} label="Lab Turnaround" value="2.4h" color="purple" />
                <StatCard icon={<AlertTriangle />} label="Critical Pending" value="3" color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 2. Departmental Load Monitor */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Live Departmental Load</h3>
                        <Zap size={20} className="text-teal-500 animate-pulse" />
                    </div>
                    <div className="space-y-6">
                        {departments.map((dept) => (
                            <div key={dept.name} className="group cursor-help">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">{dept.name}</span>
                                    <span className={`text-xs font-black uppercase ${dept.status === 'High' ? 'text-red-400' : 'text-teal-400'}`}>
                                        {dept.patients} Patients • {dept.load}%
                                    </span>
                                </div>
                                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${dept.status === 'High' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.4)]'}`}
                                        style={{ width: `${dept.load}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Real-Time Activity Feed */}
                <div className="bg-slate-900/50 border border-white/10 rounded-[2.5rem] p-8">
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-8">System Activity</h3>
                    <div className="space-y-6">
                        <ActivityItem time="2m ago" text="Lab Result Validated: EMP-2026-4" type="lab" />
                        <ActivityItem time="14m ago" text="New Patient Triage: Ward 4C" type="nursing" />
                        <ActivityItem time="22m ago" text="Pharmacy Restock: Docetaxel 80mg" type="pharmacy" />
                        <ActivityItem time="45m ago" text="Admin: New Staff Registered" type="system" />
                    </div>
                    <button className="w-full mt-8 py-4 border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                        View Full Audit Logs
                    </button>
                </div>
            </div>
        </div>
    );
};

// Sub-components for clean architecture
const StatCard = ({ icon, label, value, color }) => (
    <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:border-teal-500/30 transition-all group">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
            color === 'red' ? 'bg-red-500/10 text-red-500' : 'bg-teal-500/10 text-teal-500'
        }`}>
            {React.cloneElement(icon, { size: 24 })}
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">{value}</p>
    </div>
);

const ActivityItem = ({ time, text, type }) => (
    <div className="flex items-start space-x-4">
        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 shadow-[0_0_8px_teal]" />
        <div>
            <p className="text-xs text-white font-bold leading-tight">{text}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mt-1">{time}</p>
        </div>
    </div>
);

export default ClinicalOversight;