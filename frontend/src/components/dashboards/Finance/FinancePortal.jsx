import React, { useState } from 'react';
import FinanceSidebar from './FinanceSidebar';
import FinanceDashboard from './FinanceDashboard';

// Import all functional modules
import RequisitionHub from './modules/RequisitionHub';
import MainStoreLedger from './modules/MainStoreLedger';
import SupplierManagement from './modules/SupplierManagement';
import InsuranceClaimsHub from './modules/InsuranceClaimsHub'; 

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
        return <RequisitionHub />; 
      
      case 'inventory': 
        return <MainStoreLedger />;
      
      case 'vendors': 
        return <SupplierManagement />;
      
      case 'claims': 
        // Replaced the placeholder with the functional Hub
        return <InsuranceClaimsHub />; 
      
      default: 
        return <FinanceDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* The sidebar controls the activeTab state */}
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