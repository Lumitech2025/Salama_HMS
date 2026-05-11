import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OncologistSidebar from './OncologistSidebar';

// Clinical Modules
import DoctorHome from './modules/DoctorHome'; // The new Command Center
import OncologyVitals from './modules/OncologyVitals';
import ClinicalEMR from './modules/ClinicalEMR'; 
import LaboratoryResults from './modules/LaboratoryResults';
import PalliativeCare from './modules/PalliativeCare';

const OncologistDashboard = () => {
    const navigate = useNavigate();
    
    // Initial state set to 'home' for the new analytics/queue view
    const [activeModule, setActiveModule] = useState('home');
    
    // State to hold the patient currently being attended to
    const [selectedPatient, setSelectedPatient] = useState(null);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    // Centralized handler for attending to a patient from the Queue or Registry
    const handleAttendPatient = (patient) => {
        setSelectedPatient(patient);
        setActiveModule('emr'); // Automatically jump to EMR when a patient is selected
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-['Inter'] selection:bg-blue-100">
            {/* Sidebar with dynamic state control */}
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
                                Salama HMS / {activeModule === 'home' ? 'Command Center' : activeModule.replace('-', ' ')}
                            </p>
                            <h1 className="text-4xl font-black text-slate-900 capitalize tracking-tighter">
                                {activeModule === 'home' ? 'Dashboard' : 
                                 activeModule === 'emr' ? 'Clinical EMR' : 
                                 activeModule.replace('-', ' ')}
                            </h1>
                        </div>
                        
                        <div className="flex gap-4">
                             <div className="bg-white px-5 py-3 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Clinic Status</p>
                                    <p className="text-sm font-black text-slate-800">Active Session</p>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Patient Context Bar - Visible when a patient is loaded and doctor is NOT on the home screen */}
                    {selectedPatient && activeModule !== 'home' && (
                        <div className="mb-8 p-6 bg-white rounded-3xl border-l-4 border-l-teal-500 border-y border-r border-slate-200 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
                                    {selectedPatient.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-teal-50 text-[10px] font-black text-teal-600 uppercase rounded-md border border-teal-100">
                                            {selectedPatient.ucrn}
                                        </span>
                                        <span className="px-2 py-0.5 bg-blue-50 text-[10px] font-black text-blue-600 uppercase rounded-md border border-blue-100">
                                            {selectedPatient.status || 'Active'}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-950 tracking-tight">{selectedPatient.name}</h3>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Diagnosis</p>
                                <p className="text-sm font-bold text-slate-700 italic">
                                    {selectedPatient.diagnosis || 'General Consultation'}
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {/* Module Container */}
                    <div className="bg-white rounded-[3rem] p-4 min-h-[75vh] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                        {/* 1. HOME MODULE: Analytics & Queue */}
                        {activeModule === 'home' && (
                            <DoctorHome onSelectPatient={handleAttendPatient} />
                        )}

                        {/* 2. CLINICAL MODULES: Content sensitive to selectedPatient */}
                        {activeModule === 'emr' && (
                            <ClinicalEMR patient={selectedPatient} />
                        )}
                        
                        {activeModule === 'treatment' && <OncologyVitals patient={selectedPatient} />}
                        
                        {activeModule === 'lab' && (
                            <LaboratoryResults patient={selectedPatient} />
                        )}
                        
                        {activeModule === 'palliative' && (
                            <PalliativeCare patient={selectedPatient} />
                        )}

                        
                    </div>
                    
                    {/* Footer Sync Status */}
                    <div className="mt-6 flex justify-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">
                            Salama Oncology Protocol v2.4 • Secure Data Link Active
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

// Simple Icon for fallback
const History = ({ size }) => <span>⏳</span>;

export default OncologistDashboard;