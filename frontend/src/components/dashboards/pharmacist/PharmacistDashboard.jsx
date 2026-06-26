import React, { useState } from 'react';
import PharmacistSidebar from './PharmacistSidebar';
import PharmacyOverview from './modules/PharmacyOverview'; 
import BillingRequisition from './modules/BillingRequisition';
import PrescriptionQueue from './modules/PrescriptionQueue';
import LaboratoryResults from "../oncologist/modules/LaboratoryResults";
import InventoryManager from './modules/InventoryManager';
import PatientRegistry from "../../shared/PatientRegistry";
import PharmacyRequisitionsTab from './modules/PharmacyRequisitionsTab';
import DischargeSummaryTab from './modules/DischargeSummaryTab';

const PharmacistDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  // State to hold the transmitted prescription ID context across tabs
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);

  const handleViewPrescriptionWorkflow = (prescriptionId) => {
    setSelectedPrescriptionId(prescriptionId);
    setActiveTab('prescriptions');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <PharmacyOverview onAction={handleViewPrescriptionWorkflow} />;
        
      case 'prescriptions':
        return (
          <PrescriptionQueue 
            prescriptionId={selectedPrescriptionId} 
            onDispensingComplete={() => {
              setSelectedPrescriptionId(null);
              setActiveTab('overview');
            }}
          />
        );
        
      case 'inventory':
        return <InventoryManager setActiveTab={setActiveTab} />;

      case 'labs':
        return <LaboratoryResults/>;

      case 'requisitions':
        return <PharmacyRequisitionsTab/>;

      case 'discharge':
        return <DischargeSummaryTab/>
        
        
      case 'dispensing': 
        return (
          <div className="p-10 text-slate-400 italic bg-white rounded-[3rem] border border-slate-100 shadow-sm">
            Patient Dispensing History & Clinical Records coming soon...
          </div>
        );
        
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
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
      <PharmacistSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              Salama <span className="text-teal-600 font-light not-italic">Pharma</span>
            </h2>
            <p className="text-slate-500 text-sm font-bold tracking-widest uppercase mt-1">
              Central Hospital • Unit 04
            </p>
          </div>
          
          <div className="bg-white px-6 py-3 rounded-[2rem] shadow-xs border border-slate-200 flex items-center gap-4">
             <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md shadow-teal-200">
               MK
             </div>
             <div className="flex flex-col">
                <span className="text-sm font-black text-slate-800">Meryln Kendi</span>
             </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default PharmacistDashboard;