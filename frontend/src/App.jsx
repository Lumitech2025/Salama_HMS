import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

// Styled Unauthorized Page to match Salama HMS Aesthetic
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
  // Master list of clinical and administrative roles for Salama HMS
  const ALL_STAFF = [
    'ADMIN', 
    'HMS ADMIN', 
    'ONCOLOGIST', 
    'NURSE', 
    'RECEPTIONIST', 
    'PHARMACIST', 
    'BILLING', 
    'STAFF',
    'LAB_TECH',     // Required for Meryln's module
    'LABORATORY'    // Support for flexible DB naming
  ];

  return (
    <Routes>
      {/* 1. Main Entry Point: ProtectedRoute evaluates role and renders Dashboard */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute allowedRoles={ALL_STAFF}>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      {/* 2. Authentication & Security Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* 3. Global Fallback: Resolves weird URLs by bouncing to the Gatekeeper (/) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;