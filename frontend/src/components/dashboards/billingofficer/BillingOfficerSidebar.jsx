import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    FileSearch, 
    RefreshCcw, 
    Scale, 
    Calculator, 
    History,
    LogOut
} from 'lucide-react';

const BillingOfficerSidebar = ({ activeTab, setActiveTab }) => {
    const navigate = useNavigate();

    const menuItems = [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'claims', label: 'Claims Tracker', icon: <FileSearch size={18} /> },
        { id: 'cycles', label: 'Cycle Billing', icon: <RefreshCcw size={18} /> },
        { id: 'reconciliation', label: 'Pharmacy Recon', icon: <Scale size={18} /> },
        { id: 'estimator', label: 'Financial Estimator', icon: <Calculator size={18} /> },
        { id: 'history', label: 'Invoice History', icon: <History size={18} /> },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        navigate('/login');
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
            {/* Unified Corporate Identity Branding */}
            <div className="mb-8 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-teal-400 not-italic font-light">HMS</span>
                </h1>
                <p className="text-[12px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">
                    Billing Portal
                </p>
            </div>

            {/* Navigation - Tailored to match medical Teal theme at font-12 sizing */}
            <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-start px-6 py-4 rounded-2xl transition-all duration-300 ${
                            activeTab === item.id 
                            ? 'bg-teal-600 text-white shadow-xl shadow-teal-600/20 font-bold' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="mr-4 text-current">{item.icon}</div>
                        <span className="text-[12px] font-bold tracking-widest uppercase truncate">
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="pt-8 border-t border-white/5 space-y-4">
                <div className="px-6 text-left">
                    <p className="text-[9px] text-slate-600 font-mono">Version 1.0.0 (Salama Finance)</p>
                </div>
                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-start space-x-4 px-6 py-4 text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all w-full"
                >
                    <LogOut size={18} />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Log Out</span>
                </button>
            </div>
        </aside>
    );
};

export default BillingOfficerSidebar;