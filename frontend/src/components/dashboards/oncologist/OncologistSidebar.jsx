import React from 'react';
import { 
    LayoutDashboard, 
    Activity, 
    FlaskConical, 
    History, 
    Pill, 
    BookOpen, // Added for the Protocol Master training tab
    LogOut 
} from 'lucide-react';

const OncologistSidebar = ({ activeModule, setActiveModule, onLogout }) => {
    
    const menuItems = [
        { id: 'home', label: 'Home', icon: <LayoutDashboard size={20} /> },
        { id: 'vitals', label: 'Vitals', icon: <Activity size={20} /> },
        { id: 'lab', label: 'Lab Results', icon: <FlaskConical size={20} /> },
        { id: 'history', label: 'Medical History', icon: <History size={20} /> },
        { id: 'protocol-master', label: 'Protocol Master', icon: <BookOpen size={20} /> }, // Tab 1: The Brain/Training Engine
        { id: 'prescriptions', label: 'Patient Dosing', icon: <Pill size={20} /> },     // Tab 2: The Execution Engine
    ];

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
            <div className="mb-12 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-blue-500 not-italic font-light">HMS</span>
                </h1>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">
                    Oncology Portal
                </p>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveModule(item.id)}
                        className={`w-full flex items-center justify-start px-6 py-4 rounded-2xl transition-all duration-300 ${
                            activeModule === item.id 
                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 font-bold' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="mr-4">{item.icon}</div>
                        <span className="text-sm font-bold tracking-widest uppercase truncate">
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>

            <div className="pt-8 border-t border-white/5">
                <button 
                    onClick={onLogout}
                    className="flex items-center justify-start space-x-4 px-6 py-4 text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all w-full"
                >
                    <LogOut size={18} />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Terminate Session</span>
                </button>
            </div>
        </aside>
    );
};

export default OncologistSidebar;