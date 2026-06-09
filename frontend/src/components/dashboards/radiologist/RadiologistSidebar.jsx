import React from 'react';
import { 
    LayoutDashboard, 
    Scan, 
    History, 
    LogOut 
} from 'lucide-react';

const RadiologistSidebar = ({ activeTab, setActiveTab }) => {
    
    // Explicit 3-Menu Matrix mapped directly to Dashboard workflows
    const menuItems = [
        { 
            id: 'overview', 
            label: 'Overview', 
            icon: <LayoutDashboard size={18} /> 
        }, 
        { 
            id: 'diagnostics', 
            label: 'Diagnostics', 
            icon: <Scan size={18} /> 
        },
        { 
            id: 'history', 
            label: 'Patient History', 
            icon: <History size={18} /> 
        },
    ];

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased select-none">
            {/* Branding Section */}
            <div className="mb-12 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-blue-500 not-italic font-light">HMS</span>
                </h1>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">
                    Radiology Department
                </p>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
                {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center justify-start px-6 py-4 rounded-2xl transition-all duration-300 group ${
                                isActive 
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 font-bold' 
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div className={`mr-4 transition-transform duration-300 ${
                                isActive ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-white'
                            }`}>
                                {item.icon}
                            </div>
                            <span className="text-xs font-black tracking-widest uppercase truncate">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Actions Footer Area */}
            <div className="pt-8 border-t border-white/5">
                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-start px-6 py-4 text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all w-full group"
                >
                    <LogOut size={16} className="mr-4 group-hover:translate-x-0.5 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Log Out</span>
                </button>
            </div>
        </aside>
    );
};

export default RadiologistSidebar;