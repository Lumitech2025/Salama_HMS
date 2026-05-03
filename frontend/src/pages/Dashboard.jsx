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

const Dashboard = () => {
    // We check for 'designation' first (from your latest API response) 
    // and fallback to 'user_role' for backward compatibility.
    const rawRole = localStorage.getItem('designation') || localStorage.getItem('user_role');
    const userRole = rawRole ? rawRole.toUpperCase().trim() : 'GUEST';

    const renderRoleDashboard = () => {
        switch (userRole) {
            case 'ONCOLOGIST':
                return <OncologistDashboard />;
            
            case 'NURSE':
                return <NurseDashboard />;

            case 'LAB_TECH':
            case 'LABORATORY':
                return <LabTechDashboard />;
            
            case 'ADMIN':
            case 'HMS ADMIN':
            case 'SUPERUSER':
                return <OncologistDashboard />; 

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
                    <div className="flex flex-col items-center justify-center min-h-screen text-center p-10 bg-white">
                        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Access Restricted</h2>
                        <p className="text-slate-500 mt-2 max-w-sm">
                            Your account is authenticated, but no clinical role has been assigned to <strong>{userRole}</strong>.
                        </p>
                        <p className="text-blue-600 font-bold mt-4 text-sm uppercase tracking-widest">Contact IT Operations</p>
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