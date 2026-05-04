import React, { useState } from 'react';
import LabSidebar from './LabSidebar';
import DiagnosticWorklist from './modules/DiagnosticWorklist';
import ResultEntry from './modules/ResultEntry';
import PatientHistory from './modules/PatientHistory';
import ReportingEngine from './modules/ReportingEngine';

const LabTechDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Logic to render the correct module based on the active tab
  const renderModule = () => {
    switch (activeTab) {
      case 'worklist': return <DiagnosticWorklist />;
      case 'entry': return <ResultEntry />;
      case 'history': return <PatientHistory />;
      case 'reporting': return <ReportingEngine />;
      default: return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Stats for the Overview Tab */}
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Pending Tests</p>
            <h4 className="text-4xl font-black text-white italic">14</h4>
          </div>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Urgent (STAT)</p>
            <h4 className="text-4xl font-black text-red-500 italic">03</h4>
          </div>
          <div className="bg-teal-600/20 p-8 rounded-[2.5rem] border border-teal-500/20">
            <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2">Completed Today</p>
            <h4 className="text-4xl font-black text-white italic">28</h4>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-200">
      <LabSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              Lab <span className="text-teal-500 underline decoration-2 underline-offset-8">Portal</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">Welcome back, Collins Kimathi</p>
          </div>
          
          <div className="flex items-center space-x-4 bg-white/5 p-2 rounded-2xl border border-white/10">
             <div className="text-right px-2">
               <p className="text-xs font-bold text-white uppercase">Lab Technician</p>
               <p className="text-[10px] text-teal-500 font-black">ID: LAB-0042</p>
             </div>
             <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
               CK
             </div>
          </div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {renderModule()}
        </section>
      </main>
    </div>
  );
};

export default LabTechDashboard;