import React from 'react';
import { LayoutDashboard, User, Activity, Calendar, Clipboard, FlaskConical, Shield, LogOut } from 'lucide-react';

const PatientSidebar = ({ activeTab, setActiveTab, onLogout, patientData }) => {
    const menuItems = [
        { id: 'overview', label: 'Home / Overview', icon: <LayoutDashboard size={18} /> },
        { id: 'profile', label: 'My Profile', icon: <User size={18} /> },
        { id: 'vitals', label: 'Personal Health & Vitals', icon: <Activity size={18} /> },
        { id: 'appointments', label: 'Appointments Hub', icon: <Calendar size={18} /> },
        { id: 'records', label: 'Health Records & History', icon: <Clipboard size={18} /> },
        { id: 'prescriptions', label: 'My Prescriptions', icon: <FlaskConical size={18} /> },
        { id: 'insurance', label: 'Insurance Cover & SHA', icon: <Shield size={18} /> },
    ];

    // 🛠️ Defensive logout controller fallback
    const handleLogoutClick = () => {
        if (typeof onLogout === 'function') {
            onLogout();
        } else {
            // Self-healing fallback if parent prop binding is missing
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
        }
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
            {/* Unified Corporate Identity Branding */}
            <div className="mb-8 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-indigo-400 not-italic font-light">PORTAL</span>
                </h1>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">
                    Patient Dashboard
                </p>
            </div>

            {/* NAVIGATION LINKS TRACK - Styled using Light Blue-Purple variant */}
            <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-start px-6 py-4 rounded-2xl transition-all duration-300 ${
                            activeTab === item.id 
                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 font-bold' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="mr-4 text-current">{item.icon}</div>
                        <span className="text-[13px] font-bold tracking-widest uppercase truncate">
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>

            {/* FOOTER METADATA & ACTIONS */}
            <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="px-6 text-left">
                    <p className="text-[9px] text-slate-600 font-mono">Version 1.0.167 (Salama Portal)</p>
                </div>
                <button 
                    onClick={handleLogoutClick} // 🚀 Rerouted to defensive safety function
                    className="flex items-center justify-start space-x-4 px-6 py-4 text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all w-full"
                >
                    <LogOut size={18} />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Log Out</span>
                </button>
            </div>
        </aside>
    );
};

export default PatientSidebar;