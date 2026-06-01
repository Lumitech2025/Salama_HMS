import React, { useState } from 'react';
import FinanceSidebar from './FinanceSidebar';
import FinanceDashboard from './FinanceDashboard';

// Import all functional modules
import MainStoreLedger from './modules/MainStoreLedger';
import SupplierManagement from './modules/SupplierManagement';
import PurchaseOrderManagement from './modules/PurchaseOrderManagement'; // New PO module link
import InsuranceClaimsHub from './modules/InsuranceClaimsHub';
import FinanceRequisitionsTab from './modules/FinanceRequisitionsTab';
import InsuranceProviders from '../billingofficer/modules/InsuranceProviders';
import ServiceCatalogue from '../billingofficer/modules/ServiceCatalogue';

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
      
      case 'inventory': 
        return <MainStoreLedger />;
      
      case 'vendors': 
        return <SupplierManagement />;

      case 'purchase_orders': 
        return <PurchaseOrderManagement />; // Render endpoint for procurement lifecycles
      
      case 'claims': 
        return <InsuranceClaimsHub />; 

      case 'finance_requisitions':
        // The unread polling badge is handled directly inside the Sidebar independently now
        return <FinanceRequisitionsTab />;
      
      case 'insurance_providers':
        return <InsuranceProviders />;
      
      case 'service-catalogue':
        return <ServiceCatalogue />;
      
      default: 
        return <FinanceDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
      {/* Fixed sidebar container handling local state and background threads */}
      <FinanceSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      
      {/* MAIN CONTENT VIEWPORT CONTAINER
        Using w-80 sidebar width offset (pl-80) instead of ml-80 to create a rigid spacing block.
        This provides a safe bounding box for your tables and dashboard metrics.
      */}
      <main className="flex-1 pl-80 min-h-screen w-full transition-all duration-300">
        <div className="p-8 md:p-12 max-w-[1600px] mx-auto w-full animate-in fade-in duration-300">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default FinancePortal;