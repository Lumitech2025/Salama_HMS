import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Pill, 
  ClipboardList, 
  Package, 
  Users,
  Receipt,      
  LogOut 
} from 'lucide-react';

const PharmacistSidebar = ({ activeTab, setActiveTab }) => {
    const navigate = useNavigate();

    const menuItems = [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'prescriptions', label: 'Prescriptions', icon: <ClipboardList size={20} /> },
        { id: 'dispensing', label: 'Dispensing', icon: <Pill size={20} /> },
        { id: 'inventory', label: 'Inventory/Stock', icon: <Package size={20} /> },
        { id: 'patients', label: 'Patient Registry', icon: <Users size={20} /> },
        { id: 'billing', label: 'Billing & Requisitions', icon: <Receipt size={20} /> },
    ];

    const handleLogout = () => {
        // Essential security protocol for shared pharmacy terminals
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        navigate('/login');
    };

    return (
        <aside className="w-80 bg-[#020617] h-screen flex flex-col p-8 border-r border-white/5 font-['Inter'] antialiased">
            {/* Standardized Brand Identity with Teal Pharma Accent */}
            <div className="mb-12 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    SALAMA <span className="text-teal-500 not-italic font-light">PHARMA</span>
                </h1>
                <p className="text-[11px] text-teal-500/80 font-black uppercase tracking-[0.4em] mt-3">
                    Pharmacy Management
                </p>
            </div>

            {/* Navigation - Aligned with Nursing/Oncology Portals */}
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
                        {/* Fixed-width Icon Container for perfect vertical column alignment */}
                        <div className={`flex-shrink-0 w-8 flex justify-start ${activeTab === item.id ? 'text-white' : 'text-teal-500/60'}`}>
                            {item.icon}
                        </div>
                        <span className="text-[14px] font-bold tracking-widest uppercase truncate">
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Footer Actions - Functional Logout */}
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
                        Salama Digital — Meru, KE
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default PharmacistSidebar;