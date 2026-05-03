import React, { useState } from 'react';
import LabTechSidebar from './LabTechSidebar';
// CRITICAL: Move PatientRegistry to src/components/shared/ so all roles can access it
import PatientRegistry from '../../shared/PatientRegistry'; 
import LabResultEntry from './modules/LabResultEntry';

const LabTechDashboard = () => {
    const [activeModule, setActiveModule] = useState('registry');
    const [selectedPatient, setSelectedPatient] = useState(null);

    // Simplified Workflow: Selecting a patient triggers the "Results" workspace
    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setActiveModule('results'); 
    };

    const handleBackToRegistry = () => {
        setSelectedPatient(null);
        setActiveModule('registry');
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans antialiased">
            {/* Sidebar with minimal navigation */}
            <LabTechSidebar 
                activeModule={activeModule} 
                setActiveModule={(mod) => {
                    setActiveModule(mod);
                    if(mod === 'registry') setSelectedPatient(null);
                }} 
            />

            <main className="flex-1 p-8 overflow-y-auto h-screen">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Dynamic Contextual Header */}
                    <header className="mb-10 flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2">
                                Salama HMS / Diagnostics
                            </p>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                                {selectedPatient ? selectedPatient.name : "Laboratory Operations"}
                            </h1>
                            {selectedPatient && (
                                <div className="mt-2 flex items-center gap-3">
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                        UCRN: {selectedPatient.ucrn}
                                    </span>
                                    <button 
                                        onClick={handleBackToRegistry}
                                        className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                                    >
                                        Change Patient
                                    </button>
                                </div>
                            )}
                        </div>
                    </header>

                    {/* Main Workspace Card */}
                    <section className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-white p-2 min-h-[70vh]">
                        <div className="p-8">
                            {activeModule === 'registry' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <PatientRegistry onSelect={handleSelectPatient} />
                                </div>
                            )}

                            {activeModule === 'results' && selectedPatient && (
                                <div className="animate-in fade-in zoom-in-95 duration-500">
                                    <LabResultEntry 
                                        patient={selectedPatient} 
                                        onComplete={handleBackToRegistry} 
                                    />
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default LabTechDashboard;