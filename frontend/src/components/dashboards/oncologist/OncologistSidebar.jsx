import React from 'react';
import { 
    Users, 
    Microscope, 
    ClipboardList, 
    Beaker, 
    HeartPulse, 
    Settings, 
    LogOut 
} from 'lucide-react';

const OncologistSidebar = ({ activeModule, setActiveModule }) => {
    const modules = [
        { id: 'registry', name: 'Patient Registry', icon: <Users size={20} /> },
        { id: 'treatment', name: 'Oncology Treatment', icon: <Microscope size={20} /> },
        { id: 'emr', name: 'Clinical EMR', icon: <ClipboardList size={20} /> },
        { id: 'lab', name: 'Laboratory', icon: <Beaker size={20} /> },
        { id: 'palliative', name: 'Palliative Care', icon: <HeartPulse size={20} /> },
    ];

    return (
        <aside className="w-72 bg-[#020617] h-screen flex flex-col p-6 border-r border-white/5">
            <div className="mb-10">
                <h1 className="text-2xl font-black text-white tracking-tighter italic">
                    SALAMA <span className="text-blue-500 not-italic font-light">HMS</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">
                    Oncology Portal
                </p>
            </div>

            <nav className="flex-1 space-y-2">
                {modules.map((mod) => (
                    <button
                        key={mod.id}
                        onClick={() => setActiveModule(mod.id)}
                        className={`w-full flex items-center space-x-4 px-4 py-4 rounded-2xl transition-all duration-300 ${
                            activeModule === mod.id 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        {mod.icon}
                        <span className="text-sm tracking-wide">{mod.name}</span>
                    </button>
                ))}
            </nav>

            <div className="pt-6 border-t border-slate-800 space-y-4">
                <button className="flex items-center space-x-4 px-4 py-2 text-slate-500 hover:text-slate-300 transition-colors w-full">
                    <Settings size={18} />
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

export default OncologistSidebar;