import React, { useState } from 'react';
import LabTechSidebar from './LabTechSidebar';
// Move PatientRegistry to a shared folder so all roles can use it!
import PatientRegistry from '../../shared/PatientRegistry'; 
import LabResultEntry from './modules/LabResultEntry';

const LabTechDashboard = () => {
    const [activeModule, setActiveModule] = useState('registry');
    const [selectedPatient, setSelectedPatient] = useState(null);

    // Streamlined: Picking a patient immediately opens the entry form
    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setActiveModule('results'); 
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            <LabTechSidebar 
                activeModule={activeModule} 
                setActiveModule={(mod) => {
                    setActiveModule(mod);
                    if(mod === 'registry') setSelectedPatient(null);
                }} 
            />

            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    
                    {/* Header: Context-Aware */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            {selectedPatient ? `Results: ${selectedPatient.name}` : "Lab Operations"}
                        </h1>
                        <p className="text-slate-500 font-medium">
                            {selectedPatient ? `UCRN: ${selectedPatient.ucrn}` : "Select a patient to begin documentation"}
                        </p>
                    </div>

                    {/* Main Content Area */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[60vh]">
                        {activeModule === 'registry' && (
                            <PatientRegistry onSelect={handleSelectPatient} />
                        )}

                        {activeModule === 'results' && selectedPatient && (
                            <LabResultEntry 
                                patient={selectedPatient} 
                                onCancel={() => setActiveModule('registry')} 
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LabTechDashboard;