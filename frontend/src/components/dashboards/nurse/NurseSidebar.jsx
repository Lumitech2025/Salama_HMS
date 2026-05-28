import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard,
    Users, 
    ClipboardCheck, 
    Beaker, 
    Layers, 
    Pill, 
    Bandage, 
    HeartHandshake, 
    FileSearch, 
    LogOut 
} from 'lucide-react';

const NurseSidebar = ({ activeModule, setActiveModule, onLogout }) => {
    const navigate = useNavigate();

    const modules = [
        { id: 'home', name: 'Clinical Overview', icon: <LayoutDashboard size={18} /> },
        { id: 'triage', name: 'Vitals', icon: <ClipboardCheck size={18} /> },
        { id: 'labs', name: 'Lab Results', icon: <Beaker size={18} /> },
        { id: 'imaging', name: 'Radiology & Imaging', icon: <Layers size={18} /> },
        { id: 'prescriptions', name: 'Prescriptions', icon: <Pill size={18} /> },
        { id: 'dressing', name: 'Dressing Room', icon: <Bandage size={18} /> },
        { id: 'wards', name: 'Ward Management', icon: <Users size={18} /> },
        { id: 'palliative', name: 'Palliative Care', icon: <HeartHandshake size={18} /> },
        { id: 'history', name: 'Patient History', icon: <FileSearch size={18} /> },
        { id: 'requisitions', name: 'Requisition Hub', icon: <FileSearch size={18} />  }
    ];

    // Defensive handle logout controller fallback layer
    const handleLogoutClick = () => {
        if (typeof onLogout === 'function') {
            onLogout();
        } else {
            localStorage.clear();
            sessionStorage.clear();
            navigate('/login');
        }
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
            {/* Standardized Corporate Identity Branding */}
            <div className="mb-8 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-blue-500 not-italic font-light">HMS</span>
                </h1>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">
                    Nursing & Care Portal
                </p>
            </div>

            {/* Navigation - High Density for Clinical Work */}
            <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
                {modules.map((mod) => (
                    <button
                        key={mod.id}
                        onClick={() => setActiveModule(mod.id)}
                        className={`w-full flex items-center justify-start px-6 py-4 rounded-2xl transition-all duration-300 ${
                            activeModule === mod.id 
                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 font-bold' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="mr-4 text-current">{mod.icon}</div>
                        <span className="text-[12px] font-bold tracking-widest uppercase truncate">
                            {mod.name}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="pt-8 border-t border-white/5 space-y-4">
                <div className="px-6 text-left">
                    <p className="text-[9px] text-slate-600 font-mono">Version 1.4.0 (Salama Clinical)</p>
                </div>
                <button 
                    onClick={handleLogoutClick}
                    className="flex items-center justify-start space-x-4 px-6 py-4 text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all w-full"
                >
                    <LogOut size={18} />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Log Out</span>
                </button>
            </div>
        </aside>
    );
};

export default NurseSidebar;