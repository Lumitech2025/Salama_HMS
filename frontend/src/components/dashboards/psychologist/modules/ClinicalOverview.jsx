import React from 'react';
import { LayoutDashboard, Users, AlertCircle, Heart } from 'lucide-react';

export default function ClinicalOverview() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Welcome Banner */}
      <div className="border-b border-slate-200 pb-5 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Clinical Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back to the Salama HMS Psychosocial Workstation. Select a module from the sidebar to begin active patient care.
        </p>
      </div>

      {/* High-Level Departmental Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Active Intakes</span>
            <span className="text-xl font-bold text-slate-900">Monitoring Desk</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Continuity Tracking</span>
            <span className="text-xl font-bold text-slate-900">Tracing Active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-slate-900 text-slate-200 rounded-xl">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Family Care</span>
            <span className="text-xl font-bold text-slate-900">Bereavement Registry</span>
          </div>
        </div>
      </div>
    </div>
  );
}