import React from 'react';
import { Calendar, Activity, Pill, AlertCircle, ArrowUpRight } from 'lucide-react';

const MyHealthOverview = () => {
  // Logic for fetching patient-specific data will go here
  
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
          Good Morning, <span className="text-blue-600">Patient</span>
        </h1>
        <p className="text-slate-500 font-medium">Here is what is happening with your care today.</p>
      </header>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Calendar size={24} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upcoming</span>
          </div>
          <h3 className="text-sm font-bold text-slate-500">Next Appointment</h3>
          <p className="text-xl font-black text-slate-900 mt-1">May 12, 2026</p>
          <p className="text-slate-400 text-sm font-medium">with Dr. Mwiti • 10:30 AM</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Activity size={24} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Latest</span>
          </div>
          <h3 className="text-sm font-bold text-slate-500">Recent Lab Result</h3>
          <p className="text-xl font-black text-slate-900 mt-1">Full Blood Count</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">Normal</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Pill size={24} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active</span>
          </div>
          <h3 className="text-sm font-bold text-slate-500">Current Medications</h3>
          <p className="text-xl font-black text-slate-900 mt-1">3 Prescriptions</p>
          <button className="text-blue-600 text-sm font-bold mt-2 flex items-center gap-1 hover:underline">
            View Schedule <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Vitals Summary & Important Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-slate-200">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
             My Vitals <span className="text-slate-500 font-medium text-sm">(Last Updated Today)</span>
          </h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Blood Pressure</p>
              <p className="text-3xl font-black italic">120/80 <span className="text-sm font-medium not-italic text-slate-500">mmHg</span></p>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Weight</p>
              <p className="text-3xl font-black italic">72.4 <span className="text-sm font-medium not-italic text-slate-500">kg</span></p>
            </div>
          </div>
        </div>

        <div className="bg-rose-50 rounded-[2rem] p-8 border border-rose-100">
          <h3 className="text-rose-900 text-lg font-bold mb-4 flex items-center gap-2">
            <AlertCircle size={20} /> Care Instructions
          </h3>
          <ul className="space-y-3">
            <li className="flex gap-3 text-rose-800 text-sm font-medium leading-relaxed">
              <div className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1.5 shrink-0" />
              Ensure you take your pre-chemo medication at least 2 hours before your session.
            </li>
            <li className="flex gap-3 text-rose-800 text-sm font-medium leading-relaxed">
              <div className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1.5 shrink-0" />
              Keep hydrated and track your temperature every 6 hours.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MyHealthOverview;