import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './components/dashboards/admin/AdminDashboard'; // Import the new Brain
import ProtectedRoute from './components/ProtectedRoute';

const Unauthorized = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 font-['Inter']">
    <div className="bg-white/5 border border-white/10 p-12 rounded-[3rem] backdrop-blur-xl text-center">
      <h1 className="text-5xl font-black mb-4 text-red-500 tracking-tighter">403</h1>
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
  // Roles allowed to access the standard Clinical Dashboard
  const CLINICAL_STAFF = [
    'ONCOLOGIST', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 
    'BILLING_OFFICER', 'STAFF', 'LAB_TECH', 'RADIOLOGIST', 'PATIENT', 'CLIENT'
  ];

  // Roles allowed to access the High-Level Admin Command Center
  const ADMIN_ROLES = ['ADMIN', 'HMS ADMIN'];

  return (
    <Routes>
      {/* 1. Admin Command Center: Specialized layout for system management */}
      <Route 
        path="/admin-dashboard" 
        element={
          <ProtectedRoute allowedRoles={ADMIN_ROLES}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />

      {/* 2. Clinical Dashboard: The main hub for medical staff */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute allowedRoles={[...CLINICAL_STAFF, ...ADMIN_ROLES]}>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      {/* 3. Authentication & Security Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* 4. Global Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;