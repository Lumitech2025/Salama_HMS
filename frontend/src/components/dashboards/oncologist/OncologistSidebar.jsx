import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    Microscope, 
    ClipboardList, 
    Beaker, 
    HeartPulse, 
    LogOut 
} from 'lucide-react';

const OncologistSidebar = ({ activeModule, setActiveModule }) => {
    const navigate = useNavigate();

    const modules = [
        { id: 'registry', name: 'Patient Registry', icon: <Users size={20} /> },
        { id: 'treatment', name: 'Treatment', icon: <Microscope size={20} /> },
        { id: 'emr', name: 'Clinical EMR', icon: <ClipboardList size={20} /> },
        { id: 'lab', name: 'Laboratory', icon: <Beaker size={20} /> },
        { id: 'palliative', name: 'Palliative Care', icon: <HeartPulse size={20} /> },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        navigate('/login');
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
            {/* Standardized Brand Identity */}
            <div className="mb-12 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-blue-500 not-italic font-light">HMS</span>
                </h1>
                <p className="text-[11px] text-blue-500/80 font-black uppercase tracking-[0.4em] mt-3">
                    Oncology Portal
                </p>
            </div>

            {/* Navigation - Fixed Alignment Layout */}
            <nav className="flex-1 space-y-2">
                {modules.map((mod) => (
                    <button
                        key={mod.id}
                        onClick={() => setActiveModule(mod.id)}
                        className={`w-full flex items-center justify-start px-6 py-5 rounded-2xl transition-all duration-300 font-['Roboto'] ${
                            activeModule === mod.id 
                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 font-bold' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white text-left'
                        }`}
                    >
                        {/* Fixed-width Icon Container ensures vertical alignment */}
                        <div className={`flex-shrink-0 w-8 flex justify-start ${activeModule === mod.id ? 'text-white' : 'text-slate-500'}`}>
                            {mod.icon}
                        </div>
                        <span className="text-[14px] font-bold tracking-widest uppercase truncate">
                            {mod.name}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="pt-8 border-t border-white/5">
                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-start space-x-4 px-6 py-4 text-red-500/70 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all w-full font-['Inter']"
                >
                    <div className="w-8 flex justify-start">
                        <LogOut size={18} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Terminate Session</span>
                </button>
                
                <div className="mt-8 text-center">
                    <p className="text-[9px] text-slate-800 font-bold uppercase tracking-[0.3em]">
                        Salama HMS v1.0
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default OncologistSidebar;