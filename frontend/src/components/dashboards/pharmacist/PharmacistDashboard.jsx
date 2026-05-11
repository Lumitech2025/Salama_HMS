import React, { useState } from 'react';
import PharmacistSidebar from './PharmacistSidebar';
import PharmacyOverview from './modules/PharmacyOverview'; // New Component
import BillingRequisition from './modules/BillingRequisition';
import PrescriptionQueue from './modules/PrescriptionQueue';
import InventoryManager from './modules/InventoryManager';
import PatientRegistry from "../../shared/PatientRegistry";

const PharmacistDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <PharmacyOverview onAction={(p) => setActiveTab('prescriptions')} />;
      case 'prescriptions':
        return <PrescriptionQueue />;
      case 'inventory':
        return <InventoryManager />;
      case 'patients':
        return (
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <PatientRegistry userRole="PHARMACIST" />
          </div>
        );
      case 'billing':
        return <BillingRequisition />;
      default:
        return <div className="p-10 text-slate-400 italic">Module under construction...</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <PharmacistSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              Salama <span className="text-teal-600 font-light not-italic">Pharma</span>
            </h2>
            <p className="text-slate-500 text-sm font-bold tracking-widest uppercase mt-1">
              Central Hospital • Unit 04
            </p>
          </div>
          
          <div className="bg-white px-6 py-3 rounded-[2rem] shadow-sm border border-slate-200 flex items-center gap-4">
             <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg shadow-teal-200">
               CK
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Pharmacist on Duty</span>
                <span className="text-sm font-black text-slate-800">Collins Kimathi</span>
             </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default PharmacistDashboard;