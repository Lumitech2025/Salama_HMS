import React from 'react';
import { LayoutDashboard, Megaphone, Users, Radio, BarChart3, DollarSign, LogOut } from 'lucide-react';

const MarketingSidebar = ({ activeTab, setActiveTab, onLogout, stats = { pendingApprovals: 0, activeCamps: 0 } }) => {
    // Pulling active authentication metadata directly from server cache state
    const rawFirstName = localStorage.getItem('first_name') || 'Outreach';
    const rawLastName = localStorage.getItem('last_name') || 'Officer';
    const designation = localStorage.getItem('designation') || 'Marketing & Communications';

    const menuItems = [
        { id: 'overview', label: 'Marketing Overview', icon: <LayoutDashboard size={18} /> },
        { id: 'outreach', label: 'Outreach & Screening', icon: <Megaphone size={18} />, badge: stats.activeCamps, badgeColor: 'bg-teal-500 text-white' },
        { id: 'referrals', label: 'Referral Provider CRM', icon: <Users size={18} /> },
        { id: 'communications', label: 'Communications Hub', icon: <Radio size={18} />, badge: stats.pendingApprovals, badgeColor: 'bg-amber-500 text-slate-950' },
        { id: 'analytics', label: 'Campaign Evaluation', icon: <BarChart3 size={18} /> },
        { id: 'requisitions', label: 'Finance Requisitions', icon: <DollarSign size={18} /> },
    ];

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
            {/* Brand Header */}
            <div className="mb-8 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-teal-400 not-italic font-light">HMS</span>
                </h1>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">
                    Outreach & Public Relations
                </p>
            </div>

            {/* Dynamic User Card */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 text-left mb-6">
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 font-bold border border-teal-500/20 shrink-0 text-sm">
                    {rawFirstName.charAt(0)}{rawLastName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <h4 className="font-semibold text-sm text-white truncate">{rawFirstName} {rawLastName}</h4>
                    <p className="text-[10px] text-slate-400 uppercase mt-1 tracking-wider truncate font-medium">{designation}</p>
                </div>
            </div>

            {/* Navigation - Standardized Teal Variant */}
            <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 ${
                            activeTab === item.id 
                            ? 'bg-teal-600 text-white shadow-xl shadow-teal-600/20 font-bold' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center">
                            <div className="mr-4 text-current">{item.icon}</div>
                            <span className="text-[11.5px] font-bold tracking-widest uppercase truncate">
                                {item.label}
                            </span>
                        </div>
                        {item.badge > 0 && (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md font-mono ${item.badgeColor || 'bg-teal-500 text-white'}`}>
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="pt-8 border-t border-white/5">
                <button 
                    onClick={onLogout}
                    className="flex items-center justify-start space-x-4 px-6 py-4 text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all w-full"
                >
                    <LogOut size={18} />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Log Out</span>
                </button>
            </div>
        </aside>
    );
};

export default MarketingSidebar;