// src/components/dashboards/nurse/NurseSidebar.jsx
import React from 'react';
import { 
    Users, 
    Syringe, 
    Activity, 
    ClipboardCheck, 
    Calendar,
    Settings, 
    LogOut,
    Beaker,
    HeartPulse,
    History
} from 'lucide-react';

const NurseSidebar = ({ activeModule, setActiveModule }) => {
    const modules = [
        // GROUP 1: PATIENT ONBOARDING (Shared)
        { id: 'registry', name: 'Patient Registry', icon: <Users size={20} /> },
        
        // GROUP 2: CLINICAL ASSESSMENT (Nurse Primary)
        { id: 'triage', name: 'Triage & ECOG', icon: <ClipboardCheck size={20} /> },
        { id: 'vitals', name: 'Vitals & VAD Care', icon: <Activity size={20} /> },
        
        // GROUP 3: TREATMENT & SAFETY (The Core)
        { id: 'labs', name: 'Lab & Imaging', icon: <Beaker size={20} /> },
        { id: 'administration', name: 'Drug Administration', icon: <Syringe size={20} /> },
        
        // GROUP 4: MONITORING & SURVIVORSHIP
        { id: 'toxicity', name: 'Toxicity Tracker', icon: <HeartPulse size={20} /> },
        { id: 'palliative', name: 'Palliative Care', icon: <History size={20} /> },
        
        // GROUP 5: OPERATIONS (Shared)
        { id: 'scheduling', name: 'Treatment Schedule', icon: <Calendar size={20} /> },
    ];

    return (
        <aside className="w-72 bg-[#060a1f] h-screen flex flex-col p-6 border-r border-white/5 shadow-2xl">
            <div className="mb-10">
                <h1 className="text-2xl font-black text-white tracking-tighter italic">
                    SALAMA <span className="text-blue-400 not-italic font-light">HMS</span>
                </h1>
                <p className="text-[10px] text-blue-300/50 font-bold uppercase tracking-[0.3em] mt-2">
                    Nursing & Care Portal
                </p>
            </div>

            {/* Scrollable area for the extensive oncology modules */}
            <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar pr-2">
                {modules.map((mod) => (
                    <button
                        key={mod.id}
                        onClick={() => setActiveModule(mod.id)}
                        className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                            activeModule === mod.id 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <span className={`${activeModule === mod.id ? 'text-white' : 'text-blue-400/50'}`}>
                            {mod.icon}
                        </span>
                        <span className="text-sm tracking-wide">{mod.name}</span>
                    </button>
                ))}
            </nav>

            <div className="pt-6 border-t border-slate-800/50 space-y-4">
                <button className="flex items-center space-x-4 px-4 py-2 text-slate-500 hover:text-slate-300 transition-colors w-full group">
                    <Settings size={18} className="group-hover:rotate-45 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Settings</span>
                </button>
                <button className="flex items-center space-x-4 px-4 py-2 text-red-400/60 hover:text-red-400 transition-colors w-full">
                    <LogOut size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default NurseSidebar;