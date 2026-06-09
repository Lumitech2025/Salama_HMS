import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import UserManagement from './modules/UserManagement';
import PatientMetrics from './modules/PatientMetrics';

// 2. Add an explicit path execution branch inside your switch case matrix


const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Content dispatcher tracking only your explicitly chosen operational layers
  const renderContent = () => {
    switch (activeTab) {
      case 'overview': 
        return (
          <div>
            <h2 className="text-3xl font-serif text-slate-900 italic font-black tracking-tight">
              Command Center <span className="text-teal-600 not-italic font-sans font-light text-xl ml-2">/ Live Analytics</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-sans">Hospital wide systemic performance metrics feed.</p>
          </div>
        );
      
      case 'users': 
        return <UserManagement />;
        
      case 'hr-directory': 
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans uppercase">Staff Directory</h2>
            <p className="text-sm text-slate-500 mt-1">Full registry of active clinical and support professionals.</p>
          </div>
        );
      case 'hr-payroll': 
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans uppercase">Payroll Management</h2>
            <p className="text-sm text-slate-500 mt-1">Track compensation packages, active cycles, and financial benefits.</p>
          </div>
        );
      case 'inventory': 
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans uppercase">Inventory</h2>
            <p className="text-sm text-slate-500 mt-1">Real-time tracking of pharmacological assets and medical equipment.</p>
          </div>
        );
      case 'purchase-orders': 
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans uppercase">Purchase Orders</h2>
            <p className="text-sm text-slate-500 mt-1">Procurement request validation and supply distribution control workflows.</p>
          </div>
        );
      case 'financials': 
        return (
          <div>
            <h2 className="text-3xl font-serif text-slate-900 italic font-black tracking-tight">Financial Analytics</h2>
            <p className="text-sm text-slate-500 mt-1">Operating costs vs intake revenue analytics framework.</p>
          </div>
        );
      case 'insurance': 
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans uppercase">Insurance</h2>
            <p className="text-sm text-slate-500 mt-1">Configure provider tariffs, co-pay ratios, and claim processing pipelines.</p>
          </div>
        );
      case 'patient-metrics': 
        return <PatientMetrics />;
      case 'communications': 
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans uppercase">Communication & Broadcast Center</h2>
            <p className="text-sm text-slate-500 mt-1">Dispatch localized alerts, system announcements, or emergency directives.</p>
          </div>
        );
      default: 
        return <div className="text-slate-900 font-sans">Content Selection Inactive</div>;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F9FA] font-sans antialiased text-slate-900 selection:bg-teal-500/10">
      {/* Finance Portal inspired Dark Navigation deck */}
      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      
      {/* Light Clean Core Panel area matching your portal space layout */}
      <main className="flex-1 h-full overflow-y-auto p-8 lg:p-12">
        <div className="max-w-7xl mx-auto w-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;