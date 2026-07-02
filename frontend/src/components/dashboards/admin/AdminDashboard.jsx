import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import UserManagement from './modules/UserManagement';
import PatientMetrics from './modules/PatientMetrics';
import FinanceDashboard from '../Finance/FinanceDashboard';
import MainStoreLedger from '../Finance/modules/MainStoreLedger';
import InsuranceClaimsHub from '../Finance/modules/InsuranceClaimsHub';
import FinanceRequisitionsTab from '../Finance/modules/FinanceRequisitionsTab';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': 
        return (
          <div className="p-8">
            <h2 className="text-3xl font-serif text-slate-900 italic font-black tracking-tight">
              Command Center <span className="text-teal-600 not-italic font-sans font-light text-xl ml-2">/ Live Analytics</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-sans">Hospital wide systemic performance metrics feed.</p>
          </div>
        );
      case 'users': return <UserManagement />;
      case 'financials': return <FinanceDashboard/>;
      case 'inventory': return <MainStoreLedger/>;
      case 'insurance': return <InsuranceClaimsHub/>;
      case 'requisitions': return <FinanceRequisitionsTab/>;
      case 'patient-metrics': return <PatientMetrics />;
      case 'communications': 
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans uppercase">Communication & Broadcast Center</h2>
            <p className="text-sm text-slate-500 mt-1">Dispatch localized alerts, system announcements, or emergency directives.</p>
          </div>
        );
      default: return <div className="p-8 text-slate-900 font-sans">Content Selection Inactive</div>;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F9FA] font-sans antialiased text-slate-900 selection:bg-teal-500/10">

      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 h-full overflow-y-auto p-4 lg:p-6">
        <div className="w-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;