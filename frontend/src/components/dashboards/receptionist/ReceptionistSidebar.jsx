import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    UserPlus, 
    ShieldCheck, 
    CalendarClock, 
    WalletCards, 
    ListOrdered,
    LogOut,
    UserCircle,
    Settings
} from 'lucide-react';

const ReceptionistSidebar = ({ activeTab, setActiveTab }) => {
    const navigate = useNavigate();

    const menuItems = [
        { id: 'overview', label: 'Dashboard Home', icon: <LayoutDashboard size={20} /> },
        { id: 'registration', label: 'Patient Registration', icon: <UserPlus size={20} /> },
        { id: 'insurance', label: 'SHA/Insurance Verify', icon: <ShieldCheck size={20} /> },
        { id: 'appointments', label: 'Appointments', icon: <CalendarClock size={20} /> },
        { id: 'billing', label: 'Billing & Payments', icon: <WalletCards size={20} /> },
        { id: 'queue', label: 'Live Queue Status', icon: <ListOrdered size={20} /> },
    ];

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login', { replace: true });
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
            {/* Standardized Brand Identity */}
            <div className="mb-12 px-2 flex items-center gap-3">
                <div className="bg-teal-600 p-2 rounded-xl text-white shadow-lg shadow-teal-900/40">
                    <UserCircle size={26} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                        SALAMA <span className="text-teal-500 not-italic font-light">HMS</span>
                    </h1>
                    <p className="text-[10px] text-teal-500/80 font-black uppercase tracking-[0.3em] mt-1">
                        Front Desk Operations
                    </p>
                </div>
            </div>

            {/* Workflow Navigation */}
            <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar pr-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-6">Main Workflow</p>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-start px-6 py-4 rounded-2xl transition-all duration-300 font-['Roboto'] ${
                            activeTab === item.id 
                            ? 'bg-teal-600 text-white shadow-xl shadow-teal-600/20 font-bold' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white text-left'
                        }`}
                    >
                        <div className={`flex-shrink-0 w-8 flex justify-start ${activeTab === item.id ? 'text-white' : 'text-teal-500/60'}`}>
                            {item.icon}
                        </div>
                        <span className="text-[13px] font-bold tracking-widest uppercase truncate">
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Profile & Logout Section */}
            <div className="pt-8 border-t border-white/5 space-y-2">
                <button className="flex items-center justify-start space-x-4 px-6 py-4 text-slate-400 hover:bg-white/5 rounded-2xl transition-all w-full font-['Inter'] group">
                    <div className="w-8 flex justify-start text-slate-500 group-hover:text-teal-400">
                        <Settings size={18} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Profile Settings</span>
                </button>

                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-start space-x-4 px-6 py-4 text-red-500/70 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all w-full font-['Inter'] group"
                >
                    <div className="w-8 flex justify-start">
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default ReceptionistSidebar;