import React, { useState } from 'react';
import RadiologistSidebar from './RadiologistSidebar';
import ImagingQueue from './modules/ImagingQueue';
import DiagnosticViewer from './modules/DiagnosticViewer';
import { Bell, Search, Activity } from 'lucide-react';

const RadiologistDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  // State to track which patient is currently being diagnosed
  const [selectedPatient, setSelectedPatient] = useState(null);

  const renderContent = () => {
    // 1. Priority View: If a patient is selected, show the Viewer regardless of the tab
    if (selectedPatient) {
      return (
        <DiagnosticViewer 
          patient={selectedPatient} 
          onBack={() => setSelectedPatient(null)} 
        />
      );
    }

    // 2. Standard Tab Navigation
    switch (activeTab) {
      case 'overview':
      case 'imaging-queue':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Pending Scans', val: '12', color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Urgent (STAT)', val: '03', color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Completed Today', val: '45', color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'Review Required', val: '08', color: 'text-blue-600', bg: 'bg-blue-50' },
              ].map((stat, i) => (
                <div key={i} className={`${stat.bg} p-6 rounded-[2rem] border border-transparent hover:border-slate-200 transition-all`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{stat.label}</p>
                  <h3 className={`text-4xl font-black ${stat.color}`}>{stat.val}</h3>
                </div>
              ))}
            </div>

            {/* The Live Worklist Module */}
            <ImagingQueue onSelectPatient={(patient) => setSelectedPatient(patient)} />
          </div>
        );

      case 'reports':
        return (
          <div className="flex items-center justify-center h-64 bg-white rounded-[2.5rem] border border-slate-200">
            <p className="text-slate-400 italic font-medium">Diagnostic Reports Archive Loading...</p>
          </div>
        );

      default:
        return (
          <div className="p-12 text-slate-400 bg-white rounded-[2.5rem] border border-slate-200 text-center">
            <h3 className="font-bold text-slate-900">Module Under Construction</h3>
            <p className="text-sm">The {activeTab} section is currently being integrated with the Salama HMS core.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-['Inter']">
      {/* Sidebar handles tab switching */}
      <RadiologistSidebar activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedPatient(null); // Clear selection when switching tabs
      }} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Global Radiology Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <div className="bg-teal-500 p-2 rounded-xl text-white">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 capitalize tracking-tight">
                {selectedPatient ? 'Diagnostic Session' : activeTab.replace('-', ' ')}
              </h1>
              {selectedPatient && (
                <p className="text-[10px] text-teal-600 font-black uppercase tracking-widest">Live Analysis</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search patient ID..." 
                className="bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-6 text-sm focus:ring-2 focus:ring-teal-500/20 w-64 transition-all outline-none font-medium"
              />
            </div>
            
            <button className="relative text-slate-400 hover:text-slate-600 transition-colors p-2">
              <Bell size={22} strokeWidth={2} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-900 leading-none">DR. COLLINS</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Senior Radiologist</p>
              </div>
              <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-teal-400 font-black text-xs shadow-lg">
                CK
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Viewport */}
        <section className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          {renderContent()}
        </section>
      </main>
    </div>
  );
};

export default RadiologistDashboard;