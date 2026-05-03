import React, { useState } from 'react';
import BillingOfficerSidebar from './BillingOfficerSidebar';
import ClaimsTracker from './modules/ClaimsTracker';
import CycleBilling from './modules/CycleBilling';
import PharmacyReconciliation from './modules/PharmacyReconciliation';
import FinancialEstimator from './modules/FinancialEstimator';
import InvoiceHistory from './modules/InvoiceHistory';
import { Bell, UserCircle } from 'lucide-react';

const BillingOfficerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'claims': return <ClaimsTracker />;
      case 'cycles': return <CycleBilling />;
      case 'reconciliation': return <PharmacyReconciliation />;
      case 'estimator': return <FinancialEstimator />;
      case 'history': return <InvoiceHistory />;
      default: return (
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900">Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 text-center">Revenue Today</p>
              <p className="text-4xl font-black text-slate-900 text-center tracking-tighter">KES 412,500</p>
            </div>
            <div className="bg-teal-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-teal-100">
              <p className="text-[10px] font-black text-teal-100 uppercase tracking-[0.2em] mb-2 text-center">Uncollected Claims</p>
              <p className="text-4xl font-black text-center tracking-tighter text-white">KES 1.2M</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 text-center">Active Cycles</p>
              <p className="text-4xl font-black text-slate-900 text-center tracking-tighter">48 Patients</p>
            </div>
          </div>
          {/* Recent activity could go here */}
        </div>
      );
    }
  };

  return (
    <div className="flex bg-slate-50/50 min-h-screen">
      <BillingOfficerSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-10 overflow-y-auto">
        {/* Top Navigation Bar */}
        <div className="flex justify-between items-center mb-10">
          <div className="bg-white px-6 py-2.5 rounded-full border border-slate-100 shadow-sm">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">System Status:</span>
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-tighter">Bank Gateways Online</span>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <Bell size={22} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-black text-slate-900 tracking-tight">Finance Admin</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Dept</p>
              </div>
              <UserCircle size={36} className="text-slate-300" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {renderContent()}
      </main>
    </div>
  );
};

export default BillingOfficerDashboard;