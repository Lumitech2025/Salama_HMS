import React, { useState } from 'react';
import PatientSidebar from './PatientSidebar';
import MyHealthOverview from './modules/MyHealthOverview';
import LabResults from './modules/LabResults';
import ImagingScans from './modules/ImagingScans';
import BillingPayments from './modules/BillingPayments';
import TreatmentHistory from './modules/TreatmentHistory';
import PrescriptionManager from './modules/PrescriptionManager';

const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Router for the different modules
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <MyHealthOverview />;
      case 'lab-results':
        return <LabResults />;
      case 'imaging':
        return <ImagingScans />;
      case 'billing':
        return <BillingPayments />;
      case 'history':
        return <TreatmentHistory />;
      case 'prescriptions':
        return <PrescriptionManager />;
      default:
        return <MyHealthOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FDFDFD]">
      <PatientSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto h-screen">
        {/* Top bar for patient context */}
        <div className="sticky top-0 z-20 bg-[#FDFDFD]/80 backdrop-blur-md px-8 py-4 border-b border-slate-50 flex justify-end">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Patient ID</p>
              <p className="text-sm font-bold text-slate-900 italic">SLM-2026-0042</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-400 font-bold">
              P
            </div>
          </div>
        </div>

        {/* Dynamic Module Content */}
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;