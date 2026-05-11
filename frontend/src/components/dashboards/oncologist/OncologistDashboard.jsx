import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OncologistSidebar from './OncologistSidebar';

// Module Imports
import DoctorHome from './modules/DoctorHome';
import OncologyVitals from './modules/OncologyVitals';
import LaboratoryResults from './modules/LaboratoryResults';
import ClinicalEMR from './modules/ClinicalEMR'; 
import OncologyPrescription from './modules/OncologyPrescription';

const OncologistDashboard = () => {
    const navigate = useNavigate();
    const [activeModule, setActiveModule] = useState('home');
    const [selectedPatient, setSelectedPatient] = useState(null);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleAttendPatient = (patient) => {
        setSelectedPatient(patient);
        setActiveModule('vitals'); 
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-['Inter']">
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
                                Salama HMS / {activeModule.toUpperCase()}
                            </p>
                            <h1 className="text-4xl font-black text-slate-900 capitalize tracking-tighter">
                                {activeModule === 'home' ? 'Command Center' : 'Clinical Portal'}
                            </h1>
                        </div>
                        
                        <div className="bg-white px-5 py-3 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none text-left">Clinic Status</p>
                                <p className="text-sm font-black text-slate-800 italic">Active Session</p>
                            </div>
                        </div>
                    </div>

                    {/* Patient Context Bar - Only shows if a patient is actively loaded */}
                    {selectedPatient && activeModule !== 'home' && (
                        <div className="mb-8 p-6 bg-white rounded-3xl border-l-4 border-l-blue-600 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
                                    {selectedPatient.patient_name?.charAt(0) || "P"}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-blue-50 text-[10px] font-black text-blue-600 uppercase rounded-md border border-blue-100">
                                            {selectedPatient.token_id || "NO-TOKEN"}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-950 tracking-tight">
                                        {selectedPatient.patient_name || "Unknown Patient"}
                                    </h3>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Station</p>
                                <p className="text-sm font-bold text-slate-700 italic">Oncology Review</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Content Area */}
                    <div className="bg-white rounded-[3rem] p-4 min-h-[75vh] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                        {activeModule === 'home' && (
                            <DoctorHome onSelectPatient={handleAttendPatient} />
                        )}

                        {activeModule === 'vitals' && (
                            <OncologyVitals 
                                selectedPatientFromParent={selectedPatient} 
                                onTabSwitch={setActiveModule} 
                            />
                        )}

                        {activeModule === 'lab' && (
                            <LaboratoryResults patient={selectedPatient} onTabSwitch={setActiveModule} />
                        )}

                        {activeModule === 'history' && (
                            <ClinicalEMR patient={selectedPatient} />
                        )}

                        {activeModule === 'prescriptions' && (
                            <OncologyPrescription patient={selectedPatient} />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default OncologistDashboard;