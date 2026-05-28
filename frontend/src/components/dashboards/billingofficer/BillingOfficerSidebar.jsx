import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    FileSpreadsheet, 
    FileSearch, 
    Building2,
    History,
    Scale,
    LogOut
} from 'lucide-react';

const BillingOfficerSidebar = ({ activeTab = 'overview', setActiveTab }) => {
    const navigate = useNavigate();

    // Expanded menu items to encompass full hospital revenue cycle workflows
    const menuItems = [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'clearance', label: 'Insurance Verification', icon: <FileSpreadsheet size={18} /> },
        { id: 'insurance-providers', label: 'Insurance Providers', icon: <Building2 size={18} /> },
        { id: 'service-catalogue', label: 'Service Catalogue', icon: <FileSearch size={18} /> },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        navigate('/login');
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen sticky top-0 flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased shrink-0 overflow-hidden">
            {/* Unified Corporate Identity Branding */}
            <div className="mb-8 px-2 flex-shrink-0">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-teal-400 not-italic font-light">HMS</span>
                </h1>
                <p className="text-[12px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">
                    Billing Portal
                </p>
            </div>

            {/* Navigation - Independent Scroll Track */}
            <nav className="flex-1 space-y-2 overflow-y-auto pr-1 custom-sidebar-scrollbar">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab?.(item.id)}
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

            {/* Footer Actions - Anchored firmly at base */}
            <div className="pt-8 border-t border-white/5 space-y-4 flex-shrink-0">
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