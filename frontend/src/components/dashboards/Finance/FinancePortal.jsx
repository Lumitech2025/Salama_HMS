import React, { useState } from 'react';
import FinanceSidebar from './FinanceSidebar';
import FinanceDashboard from './FinanceDashboard';
// Import the new module
import RequisitionHub from './modules/RequisitionHub'; 

const FinancePortal = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': 
        return <FinanceDashboard />;
      
      case 'requisitions': 
        // Swapped the placeholder for the real module
        return <RequisitionHub />; 
      
      case 'inventory': 
        return <div className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">Main Store Ledger</div>;
      
      case 'vendors': 
        return <div className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">Vendor Management</div>;
      
      case 'claims': 
        return <div className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">Insurance Reconciliation</div>;
      
      default: 
        return <FinanceDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Pass handleLogout to the sidebar */}
      <FinanceSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 ml-80 p-12 transition-all duration-500">
        <div className="max-w-[1600px] mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default FinancePortal;