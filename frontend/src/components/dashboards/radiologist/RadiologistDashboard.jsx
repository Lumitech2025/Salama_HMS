import React, { useState, useEffect, useCallback } from 'react';
import RadiologistSidebar from './RadiologistSidebar';
import RadiologistHome from './modules/RadiologistHome'; 
import DiagnosticViewer from './modules/DiagnosticViewer';
import LaboratoryResults from "../oncologist/modules/LaboratoryResults";
import PatientDiagnosticsArchive from './modules/PatientDiagnosticsArchive';
import API from '@/api/api';
import { Bell, Search, Activity, Loader2, FileScan } from 'lucide-react';

const RadiologistDashboard = () => {
  // Synchronized to match the exact structural menu IDs of the Sidebar Matrix
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [attendedSessionCount, setAttendedSessionCount] = useState(0);

  // Synchronized callback handle to increment state statistics locally when completing procedures
  const handlePatientDiagnosticsComplete = useCallback(() => {
    setAttendedSessionCount(prev => prev + 1);
    setSelectedPatient(null);
    setActiveTab('overview'); // Return to the queue screen upon completion
  }, []);

  // Centralized hook to handle workflow execution focus targets cleanly
  const handleSelectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    if (patient) {
      setActiveTab('diagnostics'); // Sync active sidebar layout node dynamically
    }
  }, []);

  const renderContent = () => {
    // Priority Workflow Interceptor: Active diagnosis mode isolates view focus 
    if (selectedPatient) {
      return (
        <DiagnosticViewer 
          patient={selectedPatient} 
          onBack={() => {
            setSelectedPatient(null);
            setActiveTab('overview'); // Clean reversal to active worklists
          }} 
          onComplete={handlePatientDiagnosticsComplete}
        />
      );
    }

    // Standard Module Router matching our explicit 3-tier pillar system
    switch (activeTab) {
      case 'overview':
        return (
          <RadiologistHome 
            onSelectPatient={handleSelectPatient} 
            attendedSessionCount={attendedSessionCount}
          />
        );

      case 'diagnostics':
        // Intercept: Tab is selected directly but no patient pipeline is loaded yet
        return (
          <div className="py-32 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-xl max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-300">
            <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
              <FileScan size={32} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-md">
                No Diagnostic Session Initialized
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                To access interpretation workspaces, medical imaging views, or write radiology logs, please choose an outstanding patient order from the active queue worklist first.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg mx-auto"
            >
              View Active Patient Queue
            </button>
          </div>
        );

        case 'labs':
        return <LaboratoryResults/>;

      case 'history':
        return (
          <PatientDiagnosticsArchive />
        );

      default:
        return (
          <div className="p-16 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-xl">
            <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">
              Module Under Construction
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
              The configuration for <span className="text-blue-500 font-bold font-mono">"{activeTab}"</span> is currently being registered with the Salama HMS core.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-['Inter'] antialiased selection:bg-blue-500/10">
      {/* Structural Sidebar Controller */}
      <RadiologistSidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedPatient(null); // Explicit cleanup block to reset active workspace pipeline
        }} 
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Global Structural Command Header Bar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-slate-900 p-2.5 rounded-xl text-white shadow-md">
              <Activity size={18} className="text-teal-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-md font-black text-slate-950 uppercase tracking-wider font-mono">
                {selectedPatient ? 'Diagnostic Session' : activeTab.replace('-', ' ')}
              </h1>
              {selectedPatient ? (
                <p className="text-[9px] text-red-500 font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Isolating Critical Acquisition Data
                </p>
              ) : (
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Salama HMS / Radiology Portal
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Context Search Utility */}
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />
              <input 
                type="text" 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Global telemetry search..." 
                className="bg-slate-100 border border-transparent rounded-xl py-2.5 pl-12 pr-6 text-xs focus:bg-white focus:border-slate-200 w-64 transition-all outline-none font-bold tracking-tight text-slate-800"
              />
            </div>
            
            {/* System Notifications Alert Hook */}
            <button className="relative text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-50">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full ring-4 ring-white"></span>
            </button>

            {/* Profile Context Tier Layout */}
            <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-900 leading-none tracking-wide">DR. COLLINS</p>
                <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mt-1">Senior Radiologist</p>
              </div>
              <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-teal-400 font-black text-xs shadow-md border border-slate-800">
                CK
              </div>
            </div>
          </div>
        </header>

        {/* Scalable Execution Viewport */}
        <section className="flex-1 overflow-y-auto p-10 bg-slate-50/40">
          {renderContent()}
        </section>
      </main>
    </div>
  );
};

export default RadiologistDashboard;