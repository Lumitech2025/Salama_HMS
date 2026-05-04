import React from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { 
  Beaker, 
  ClipboardList, 
  History, 
  FileText, 
  LogOut,
  Microscope,
  LayoutDashboard
} from 'lucide-react';

const LabSidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate(); // 2. Initialize the hook

  // 3. The Sign Out Logic
  const handleSignOut = () => {
    // Clear all session data
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('designation');
    
    // Optional: Clear everything if you aren't storing persistent UI settings
    // localStorage.clear(); 

    // 4. Redirect to Login
    navigate('/login', { replace: true });
  };

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'worklist', label: 'Diagnostic Worklist', icon: <ClipboardList size={20} /> },
    { id: 'entry', label: 'Result Entry', icon: <Microscope size={20} /> },
    { id: 'history', label: 'Patient History', icon: <History size={20} /> },
    { id: 'reporting', label: 'Reports & Sharing', icon: <FileText size={20} /> },
  ];

  return (
    <div className="w-72 bg-slate-950 min-h-screen p-6 flex flex-col border-r border-white/5">
      {/* Brand Logo */}
      <div className="flex items-center space-x-3 mb-12 px-2">
        <div className="bg-teal-500 p-2 rounded-2xl shadow-lg shadow-teal-500/20 text-white">
          <Beaker size={24} />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Salama <span className="text-teal-400 font-light">LAB</span>
        </h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
              activeTab === item.id 
              ? 'bg-teal-600 text-white shadow-xl shadow-teal-900/40' 
              : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <span className={`${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-teal-400'}`}>
              {item.icon}
            </span>
            <span className="font-bold text-sm tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout Section */}
      <div className="pt-6 border-t border-white/5">
         <button 
          onClick={handleSignOut} // 5. Attach the function
          className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group"
         >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default LabSidebar;