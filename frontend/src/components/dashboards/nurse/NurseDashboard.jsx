import React, { useState } from 'react';
import { Users } from 'lucide-react'; 

// 1. Sidebar Neighbor
import NurseSidebar from "./NurseSidebar";

// 2. Shared/Global components
import PatientForm from "../../PatientForm";

// 3. Nurse Modules (from your ./modules/ folder in image_4c255a.png)
import DrugAdministration from "./modules/DrugAdministration";
import ImagingStudies from "./modules/ImagingStudies";
import LaboratoryResults from "./modules/LaboratoryResults";
import PalliativeCare from "./modules/PalliativeCare";
import ToxicityTracker from "./modules/ToxicityTracker";
import TriageVitals from "./modules/TriageVitals";
import VitalsAssessment from "./modules/VitalsAssessment";

// 4. Temporary Internal Definitions to fix ReferenceErrors
// Map the name used in your JSX (TriageECOG) to your file (TriageVitals)
const TriageECOG = TriageVitals; 

// Temporary placeholder for Registry until you move the one from the oncologist folder
const PatientRegistry = ({ onSelect }) => (
    <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
        <Users className="mx-auto mb-4 text-slate-300" size={48} />
        <h2 className="text-xl font-black text-slate-800">Patient Registry Placeholder</h2>
        <p className="text-slate-500 mb-6 text-sm">Select a simulated patient to unlock clinical modules.</p>
        <button 
            onClick={() => onSelect({ name: "John Doe", ucrn: "UCRN-8821", currentCycle: "Cycle 2 Day 1" })}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg shadow-blue-200"
        >
            Simulate Select Patient
        </button>
    </div>
);

const Scheduling = () => <div className="p-10">Scheduling Module Coming Soon</div>;

const NurseDashboard = () => {
    const [activeModule, setActiveModule] = useState('registry'); 
    const [selectedPatient, setSelectedPatient] = useState(null);

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setActiveModule('triage'); 
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            <NurseSidebar activeModule={activeModule} setActiveModule={setActiveModule} />

            <main className="flex-1 overflow-y-auto h-screen p-8">
                <div className="max-w-[1600px] mx-auto">
                    
                    {/* Dynamic Nurse Header */}
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">
                                Salama Care / {activeModule.replace('-', ' ')}
                            </p>
                            <h1 className="text-3xl font-black text-slate-900 capitalize tracking-tighter">
                                {activeModule.replace('-', ' ')}
                            </h1>
                        </div>
                    </div>

                    {/* Patient Context Bar */}
                    {selectedPatient && activeModule !== 'registry' && (
                        <div className="mb-8 p-6 bg-white rounded-3xl border border-blue-100 shadow-sm flex items-center justify-between animate-in slide-in-from-top duration-500">
                            <div className="flex items-center gap-6">
                                <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-200">
                                    {selectedPatient.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">{selectedPatient.name}</h3>
                                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">
                                        {selectedPatient.currentCycle || "Awaiting Cycle Assessment"}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-8 text-right">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">UCRN</p>
                                    <p className="text-sm font-bold text-slate-700">{selectedPatient.ucrn}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Alerts</p>
                                    <p className="text-sm font-bold text-red-500">None Pending</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rendering Logic */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/60 min-h-[70vh] border border-slate-100 transition-all duration-300">
                        {activeModule === 'registry' && <PatientRegistry onSelect={handleSelectPatient} />}
                        {activeModule === 'scheduling' && <Scheduling />}
                        
                        {!selectedPatient && activeModule !== 'registry' && activeModule !== 'scheduling' ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                                <div className="bg-slate-50 p-8 rounded-full mb-4">
                                    <Users className="text-slate-300" size={48} />
                                </div>
                                <h2 className="text-xl font-black text-slate-800">No Patient Selected</h2>
                                <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2">
                                    Please select a patient from the Registry to begin assessment or administration.
                                </p>
                                <button 
                                    onClick={() => setActiveModule('registry')}
                                    className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:scale-105 transition-transform"
                                >
                                    Go to Registry
                                </button>
                            </div>
                        ) : (
                            <>
                                {activeModule === 'vitals' && <VitalsAssessment patient={selectedPatient} />}
                                {activeModule === 'administration' && <DrugAdministration patient={selectedPatient} />}
                                {activeModule === 'triage' && <TriageECOG patient={selectedPatient} />}
                                {activeModule === 'labs' && <LaboratoryResults patient={selectedPatient} />}
                                {activeModule === 'toxicity' && <ToxicityTracker patient={selectedPatient} />}
                                {activeModule === 'palliative' && <PalliativeCare patient={selectedPatient} />}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default NurseDashboard;