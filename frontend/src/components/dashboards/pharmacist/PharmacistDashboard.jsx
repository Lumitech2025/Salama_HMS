import React, { useState } from 'react';
import PharmacistSidebar from './PharmacistSidebar';
// Import the actual modules as we build them
import PatientRegistry from "../../shared/PatientRegistry";
import BillingRequisition from './modules/BillingRequisition';
import PrescriptionQueue from './modules/PrescriptionQueue';
import InventoryManager from './modules/InventoryManager';

const PharmacistDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  // Local state to handle patient selection if needed
  const [selectedPatient, setSelectedPatient] = useState(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <PrescriptionQueue />; // Let's make this the default overview
      case 'prescriptions':
        return <PrescriptionQueue />;
      case 'inventory':
        return <InventoryManager />;
      case 'patients':
        return (
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <PatientRegistry onSelect={(p) => setSelectedPatient(p)} userRole="PHARMACIST" />
          </div>
        );
      case 'billing': // Added this case for the new sidebar item
        return <BillingRequisition />;
      default:
        return (
          <div className="p-8 bg-white rounded-[2rem] shadow-sm border border-slate-100 min-h-[400px] flex items-center justify-center">
            <p className="text-slate-400 font-medium italic">Building {activeTab} Module...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar now includes Billing */}
      <PharmacistSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
            <p className="text-slate-500 text-sm font-medium italic">Salama Pharmacy Unit • Central Hospital</p>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="bg-white px-5 py-3 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pharmacist On Duty</span>
                <span className="text-sm font-black text-indigo-600">Collins Kimathi</span>
             </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default PharmacistDashboard;