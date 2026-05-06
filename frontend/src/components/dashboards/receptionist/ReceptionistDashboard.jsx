import React, { useState } from 'react';
import ReceptionistSidebar from './ReceptionistSidebar';
import Registration from './modules/Registration';
import InsuranceVerification from './modules/InsuranceVerification';
import AppointmentCalendar from './modules/AppointmentCalendar';
import PaymentPortal from './modules/PaymentPortal';
import QueueStatus from './modules/QueueStatus';
import Triage from './modules/triage';

const ReceptionistDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Router for the internal modules
  const renderModule = () => {
    switch (activeTab) {
      case 'registration':
        return <Registration />;
      case 'insurance':
        return <InsuranceVerification />;
      case 'triage':
        return <Triage />;
      case 'appointments':
        return <AppointmentCalendar />;
      case 'billing':
        return <PaymentPortal />;
      case 'queue':
        return <QueueStatus />;
      case 'overview':
      default:
        return (
          <div className="p-10 text-center animate-in fade-in zoom-in-95 duration-500">
             <div className="bg-teal-50 border-2 border-dashed border-teal-200 rounded-[3rem] p-20">
               <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Welcome back, Front Desk</h2>
               <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">
                 Select a module from the sidebar to begin registering patients or managing the hospital queue.
               </p>
               <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <p className="text-2xl font-black text-teal-600">12</p>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Check-ins Today</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <p className="text-2xl font-black text-blue-600">4</p>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pending Bills</p>
                  </div>
               </div>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <ReceptionistSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto max-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {renderModule()}
        </div>
      </main>
    </div>
  );
};

export default ReceptionistDashboard;