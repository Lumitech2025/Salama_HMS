import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard,
    Users, 
    ClipboardCheck, 
    Activity, 
    Beaker, 
    Layers, 
    Pill, 
    Bandage, 
    HeartHandshake, 
    FileSearch, 
    LogOut 
} from 'lucide-react';

const NurseSidebar = ({ activeModule, setActiveModule }) => {
    const navigate = useNavigate();

    const modules = [
        { id: 'home', name: 'Clinical Overview', icon: <LayoutDashboard size={20} /> },
        { id: 'registry', name: 'Patient Registry', icon: <Users size={20} /> },
        { id: 'triage', name: 'Vitals', icon: <ClipboardCheck size={20} /> },
        { id: 'labs', name: 'Lab Results', icon: <Beaker size={20} /> },
        { id: 'imaging', name: 'Radiology & Imaging', icon: <Layers size={20} /> },
        { id: 'prescriptions', name: 'Prescriptions', icon: <Pill size={20} /> },
        { id: 'dressing', name: 'Dressing Room', icon: <Bandage size={20} /> },
        { id: 'palliative', name: 'Palliative Care', icon: <HeartHandshake size={20} /> },
        { id: 'history', name: 'Patient History', icon: <FileSearch size={20} /> },
    ];

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased sticky top-0">
            {/* Brand Identity */}
            <div className="mb-10 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-blue-500 not-italic font-light">HMS</span>
                </h1>
                <p className="text-[10px] text-blue-500/80 font-black uppercase tracking-[0.4em] mt-3">
                    Nursing & Care Portal
                </p>
            </div>

            {/* Navigation - High Density for Clinical Work */}
            <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar pr-2">
                {modules.map((mod) => (
                    <button
                        key={mod.id}
                        onClick={() => setActiveModule(mod.id)}
                        className={`w-full flex items-center justify-start px-5 py-4 rounded-2xl transition-all duration-200 ${
                            activeModule === mod.id 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className={`flex-shrink-0 w-8 flex justify-start ${activeModule === mod.id ? 'text-white' : 'text-blue-500/50'}`}>
                            {mod.icon}
                        </div>
                        <span className="text-[12px] font-bold tracking-widest uppercase truncate">
                            {mod.name}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="pt-6 border-t border-white/5 mt-4">
                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-start space-x-4 px-6 py-4 text-red-500/70 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all w-full"
                >
                    <div className="w-8 flex justify-start">
                        <LogOut size={18} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Terminate Session</span>
                </button>
                
                <div className="mt-6 text-center opacity-30">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.3em]">
                        Salama Clinical v1.4
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default NurseSidebar;