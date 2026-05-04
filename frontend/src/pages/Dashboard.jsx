import React from 'react';
import OncologistDashboard from "../components/dashboards/oncologist/OncologistDashboard"; 
import NurseDashboard from "../components/dashboards/nurse/NurseDashboard"; 
// 1. Import your new Lab Tech Dashboard
import LabTechDashboard from "../components/dashboards/lab-tech/LabTechDashboard";
import PharmacistDashboard from "../components/dashboards/pharmacist/PharmacistDashboard";
import RadiologistDashboard from "../components/dashboards/radiologist/RadiologistDashboard";
import ReceptionistDashboard from "../components/dashboards/receptionist/ReceptionistDashboard"; // Placeholder for Receptionist Dashboard
import BillingOfficerDashboard from "../components/dashboards/billingofficer/BillingOfficerDashboard";
import PatientDashboard from "../components/dashboards/patient/PatientDashboard";
import AdminDashboard from "../components/dashboards/admin/AdminDashboard";

const Dashboard = () => {
    // We check for 'designation' first (from your latest API response) 
    // and fallback to 'user_role' for backward compatibility.
    const rawRole = localStorage.getItem('designation') || localStorage.getItem('user_role');
    const userRole = rawRole ? rawRole.toUpperCase().trim() : 'GUEST';

    const renderRoleDashboard = () => {
        switch (userRole) {

            case 'ADMIN':
            case 'HMS ADMIN':
            case 'SUPERUSER':
                return <AdminDashboard />;

            
            case 'ONCOLOGIST':
                return <OncologistDashboard />;
            
            case 'NURSE':
                return <NurseDashboard />;

            case 'LAB_TECH':
                return <LabTechDashboard />;

            case 'PHARMACIST':
                 return <PharmacistDashboard />;

            case 'RADIOLOGIST':
                return <RadiologistDashboard />;

            case 'RECEPTIONIST':
                return <ReceptionistDashboard />; // Placeholder for Receptionist Dashboard

            case 'BILLING_OFFICER':
                return <BillingOfficerDashboard />;

            case 'PATIENT':
            case 'CLIENT':
                return <PatientDashboard />;

            default:
                return (
                    <div className="flex flex-col items-center justify-center min-h-screen text-center p-10 bg-slate-950 font-['Inter']">
                        <div className="w-24 h-24 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mb-8 border border-amber-500/20 shadow-2xl shadow-amber-900/20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Verification Pending</h2>
                        <p className="text-slate-400 max-w-sm leading-relaxed mb-8">
                            Your credentials for <strong>{userRole}</strong> are valid, but your access level hasn't been configured in the Salama Registry.
                        </p>
                        <button 
                            onClick={() => window.location.href = '/login'}
                            className="text-teal-400 font-bold text-xs uppercase tracking-[0.2em] hover:text-teal-300 transition-colors"
                        >
                            Back to Secure Login
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {renderRoleDashboard()}
        </div>
    );
};

export default Dashboard;