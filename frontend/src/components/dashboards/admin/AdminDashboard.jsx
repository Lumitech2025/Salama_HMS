import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import ClinicalOversight from './modules/ClinicalOversight';
import UserManagement from './modules/UserManagement';
import FinancialAnalytics from './modules/FinancialAnalytics';
import InventoryCommand from './modules/InventoryCommand';
import SystemAudit from './modules/SystemAudit';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <ClinicalOversight />;
      case 'users': return <UserManagement />;
      case 'financials': return <FinancialAnalytics />;
      case 'inventory': return <InventoryCommand />;
      case 'audit': return <SystemAudit />;
      // We will plug in the Departmental Views later as discussed
      case 'view-lab': return <div className="text-white p-10 font-black italic uppercase">Lab Oversight Feed Loading...</div>;
      default: return <ClinicalOversight />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans selection:bg-teal-500/30">
      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 h-screen overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 p-8">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;