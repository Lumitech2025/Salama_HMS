import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './components/dashboards/admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import TriagePortal from "./components/dashboards/receptionist/modules/TriagePortal";
import FinancePortal from './components/dashboards/Finance/FinancePortal';

const Unauthorized = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 font-['Inter']">
    <div className="bg-white/5 border border-white/10 p-12 rounded-[3rem] backdrop-blur-xl text-center shadow-2xl">
      <h1 className="text-5xl font-black mb-4 text-red-500 tracking-tighter italic">403</h1>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">Access Denied: Restricted Department</p>
      <button 
        onClick={() => window.location.href = '/login'} 
        className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-teal-900/20"
      >
        Return to Login
      </button>
    </div>
  </div>
);

function App() {
  // ALIGNED STRINGS: Roles allowed to access clinical switchboard areas and portals
  const CLINICAL_STAFF = [
    'ONCOLOGIST', 
    'NURSE', 
    'RECEPTIONIST', 
    'PHARMACIST', 
    'LAB_TECH', 
    'RADIOLOGIST', 
    'COUNSELING_PSYCHOLOGIST', 
    'MARKETING', // Aligned to user choices model key
    'BILLING',   // Aligned to user choices model key
    'PATIENT', 
    'STAFF'
  ];

  // Roles allowed to access the High-Level Admin & Finance Command Centers
  const ADMIN_ROLES = ['ADMIN', 'HMS_ADMIN', 'FINANCE', 'BILLING'];

  return (
    <Routes>
      {/* 1. Finance & Procurement Portal */}
      <Route 
        path="/finance-dashboard" 
        element = {
          <ProtectedRoute allowedRoles={['FINANCE', 'ADMIN', 'HMS_ADMIN']}>
            <FinancePortal />
          </ProtectedRoute>
        } 
      />

      {/* 2. Admin Command Center */}
      <Route 
        path="/admin-dashboard" 
        element = {
          <ProtectedRoute allowedRoles={ADMIN_ROLES}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />

      {/* 3. Clinical Hub / Switchboard (Psychologist, Receptionist, Marketing, Billing land here) */}
      <Route 
        path="/" 
        element = {
          <ProtectedRoute allowedRoles={[...CLINICAL_STAFF, ...ADMIN_ROLES]}>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      {/* 4. Triage Portal */}
      <Route 
        path="/triage" 
        element = {
          <ProtectedRoute allowedRoles={['NURSE', 'ONCOLOGIST', ...ADMIN_ROLES]}>
            <TriagePortal />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/triage/:patientId" 
        element = {
          <ProtectedRoute allowedRoles={['NURSE', 'ONCOLOGIST', ...ADMIN_ROLES]}>
            <TriagePortal />
          </ProtectedRoute>
        } 
      />

      {/* Security Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Global Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;