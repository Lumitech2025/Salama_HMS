import React from 'react';
import { 
    LayoutGrid, 
    FlaskConical, 
    History, 
    BookOpen, 
    PackageSearch, 
    LogOut 
} from 'lucide-react';

const LabSidebar = ({ activeTab, setActiveTab, onLogout }) => {
    const menuItems = [
        { id: 'overview', label: 'Home', icon: <LayoutGrid size={18} /> },
        { id: 'diagnostics', label: 'Diagnostics', icon: <FlaskConical size={18} /> },
        { id: 'history', label: 'Patient History', icon: <History size={18} /> },
        { id: 'reference', label: 'Reference Desk', icon: <BookOpen size={18} /> },
        { id: 'inventory', label: 'Inventory', icon: <PackageSearch size={18} /> },
    ];

    // Defensive handle logout controller fallback layer
    const handleLogoutClick = () => {
        if (typeof onLogout === 'function') {
            onLogout();
        } else {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
        }
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
            {/* Standardized Corporate Identity Branding */}
            <div className="mb-8 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-teal-400 not-italic font-light">LAB</span>
                </h1>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">
                    Precision Diagnostics
                </p>
            </div>

            {/* Navigation - Locked to layout-optimized text-12 sizing */}
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
                    <p className="text-[9px] text-slate-600 font-mono">Version 1.0.0 (Salama Lab)</p>
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

export default LabSidebar;