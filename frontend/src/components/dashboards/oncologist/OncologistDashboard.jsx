import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OncologistSidebar from './OncologistSidebar';

// Clinical Modules
import PatientRegistry from './modules/PatientRegistry';
import OncologyTreatment from './modules/OncologyTreatment'; 
import ClinicalEMR from './modules/ClinicalEMR'; 
import LaboratoryResults from './modules/LaboratoryResults';
import PalliativeCare from './modules/PalliativeCare';

const OncologistDashboard = () => {
    const navigate = useNavigate();
    const [activeModule, setActiveModule] = useState('registry');
    
    // In a real HMS, this would be updated when you click a patient in the Registry
    const [selectedPatient, setSelectedPatient] = useState({
        name: "James Kimani",
        ucrn: "UCRN-2026-102",
        diagnosis: "C50.1 (Breast, Central)",
        status: "In-Treatment"
    });

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-['Inter'] selection:bg-blue-100">
            {/* Sidebar with Logout logic passed down */}
            <OncologistSidebar 
                activeModule={activeModule} 
                setActiveModule={setActiveModule} 
                onLogout={handleLogout}
            />

            <main className="flex-1 overflow-y-auto h-screen p-8 lg:p-12">
                <div className="max-w-[1600px] mx-auto">
                    
                    {/* Header Section */}
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">
                                Salama HMS / {activeModule.replace('-', ' ')}
                            </p>
                            <h1 className="text-3xl font-black text-slate-900 capitalize tracking-tighter">
                                {activeModule === 'emr' ? 'Electronic Medical Record' : activeModule.replace('-', ' ')}
                            </h1>
                        </div>
                        
                        {/* Quick Stats or Notifications could go here */}
                        <div className="flex gap-4">
                             <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Clinic Status</p>
                                <p className="text-sm font-black text-green-600">Active Session</p>
                             </div>
                        </div>
                    </div>

                    {/* Patient Context Bar - ONLY shows if a patient is selected and not in Registry */}
                    {selectedPatient && activeModule !== 'registry' && (
                        <div className="mb-8 p-6 bg-white rounded-3xl border-l-4 border-l-blue-600 border-y border-r border-blue-100 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-600/20">
                                    {selectedPatient.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-blue-50 text-[10px] font-black text-blue-600 uppercase rounded-md border border-blue-100">
                                            {selectedPatient.ucrn}
                                        </span>
                                        <span className="px-2 py-0.5 bg-green-50 text-[10px] font-black text-green-600 uppercase rounded-md border border-green-100">
                                            {selectedPatient.status}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedPatient.name}</h3>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Oncology Diagnosis</p>
                                <p className="text-sm font-bold text-slate-700">{selectedPatient.diagnosis}</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Module Container */}
                    <div className="bg-white rounded-[2rem] p-2 min-h-[70vh] shadow-xl shadow-slate-200/50 border border-slate-100">
                        {activeModule === 'registry' && <PatientRegistry onSelectPatient={setSelectedPatient} />}
                        {activeModule === 'treatment' && <OncologyTreatment patient={selectedPatient} />}
                        {activeModule === 'emr' && <ClinicalEMR patient={selectedPatient} />}
                        {activeModule === 'lab' && <LaboratoryResults patient={selectedPatient} />}
                        {activeModule === 'palliative' && <PalliativeCare patient={selectedPatient} />}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default OncologistDashboard;