import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    FileSearch, 
    RefreshCcw, 
    Scale, 
    Calculator, 
    History,
    LogOut,
    ShieldCheck
} from 'lucide-react';

const BillingOfficerSidebar = ({ activeTab, setActiveTab }) => {
    const navigate = useNavigate();

    const menuItems = [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'claims', label: 'Claims Tracker', icon: <FileSearch size={20} /> },
        { id: 'cycles', label: 'Cycle Billing', icon: <RefreshCcw size={20} /> },
        { id: 'reconciliation', label: 'Pharmacy Recon', icon: <Scale size={20} /> },
        { id: 'estimator', label: 'Financial Estimator', icon: <Calculator size={20} /> },
        { id: 'history', label: 'Invoice History', icon: <History size={20} /> },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        navigate('/login');
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
            {/* Unified Brand Identity */}
            <div className="mb-12 px-2 flex items-center gap-3">
                <div className="bg-teal-600 p-2 rounded-xl text-white shadow-lg shadow-teal-900/40">
                    <ShieldCheck size={26} />
                </div>
                <div>
                    <h1 className="text-1xl font-black text-white tracking-tighter uppercase italic">
                        SALAMA Finance<span className="text-teal-500 not-italic font-light"></span>
                    </h1>
                    <p className="text-[10px] text-teal-500/80 font-black uppercase tracking-[0.3em] mt-1">
                        
                    </p>
                </div>
            </div>

            {/* Navigation - Dark Mode Sync */}
            <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar pr-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-start px-6 py-5 rounded-2xl transition-all duration-300 font-['Roboto'] ${
                            activeTab === item.id 
                            ? 'bg-teal-600 text-white shadow-xl shadow-teal-600/20 font-bold' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white text-left'
                        }`}
                    >
                        {/* Perfect vertical alignment container */}
                        <div className={`flex-shrink-0 w-8 flex justify-start ${activeTab === item.id ? 'text-white' : 'text-teal-500/60'}`}>
                            {item.icon}
                        </div>
                        <span className="text-[14px] font-bold tracking-widest uppercase truncate">
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="pt-8 border-t border-white/5">
                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-start space-x-4 px-6 py-4 text-red-500/70 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all w-full font-['Inter'] group"
                >
                    <div className="w-8 flex justify-start">
                        <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Terminate Session</span>
                </button>
                
                <div className="mt-8 text-center">
                    <p className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.3em]">
                        Salama HMS v1.0
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default BillingOfficerSidebar;