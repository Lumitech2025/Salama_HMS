import React, { useState } from 'react';
import { Phone, Users, AlertTriangle, ArrowRight, CheckCircle, Clock, History, Search, Filter } from 'lucide-react';

export default function TracingDesk() {
  // Overdue Patient List
  const [tracingQueue, setTracingQueue] = useState([
    {
      id: 't1',
      name: 'John Doe Njoroge',
      mrn: 'MRN-2026-0412',
      diagnosis: 'Prostate Adenocarcinoma',
      missedSessions: 2,
      lastAttended: '14 May 2026',
      phone: '+254 711 000111',
      status: 'High Priority',
      context: 'No family contact logged. Flagged as lone patient.',
      lastAttempt: '22 May 2026 (Line busy / Unreachable)'
    },
    {
      id: 't2',
      name: 'Alice Awuor',
      mrn: 'MRN-2026-0115',
      diagnosis: 'Cervical Carcinoma',
      missedSessions: 1,
      lastAttended: '02 May 2026',
      phone: '+254 722 999888',
      status: 'Routine',
      context: 'Linked to daughter (Primary Caregiver - 0722000000)',
      lastAttempt: 'None - Pending initial outreach'
    },
    {
      id: 't3',
      name: 'Michael Mwangi',
      mrn: 'MRN-2026-0884',
      diagnosis: 'Colorectal Cancer',
      missedSessions: 3,
      lastAttended: '20 Apr 2026',
      phone: '+254 733 444555',
      status: 'High Priority',
      context: 'Patient experiencing severe treatment fatigue.',
      lastAttempt: '18 May 2026 (Left voicemail)'
    }
  ]);

  // Outbound Diagnostic Tracking List
  const [outboundReferrals] = useState([
    { id: 'o1', name: 'David Mutua', mrn: 'MRN-2026-0334', service: 'Radiotherapy (External Unit)', sentDate: '18 May 2026' },
    { id: 'o2', name: 'Mary Wanjiku', mrn: 'MRN-2026-0981', service: 'High-Resolution CT Scan', sentDate: '25 May 2026' }
  ]);

  // Track currently selected patient for detailed action logging on the right panel
  const [selectedPatientId, setSelectedPatientId] = useState('t3'); // Defaulted to Michael Mwangi to match image_cc5008.png

  const currentPatient = tracingQueue.find(p => p.id === selectedPatientId) || tracingQueue[0];

  // Log a call attempt update
  const handleLogCall = (outcome) => {
    if (!currentPatient) return;
    const timestamp = '28 May 2026';
    
    setTracingQueue(prev => prev.map(p => {
      if (p.id === currentPatient.id) {
        return {
          ...p,
          lastAttempt: `${timestamp} (${outcome})`
        };
      }
      return p;
    }));
  };

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen text-slate-800 font-sans">
      
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-5 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Care Continuity & Tracing Desk</h1>
      </div>

      {/* KPI Stats Scorecard Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-5">
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{tracingQueue.filter(p => p.status === 'High Priority').length} Patients</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">High Priority Overdue Cases</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-5">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{tracingQueue.length} Cases Total</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Active Call Tracking Queue</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-5">
          <div className="p-3.5 bg-teal-50 text-teal-600 rounded-xl">
            <ArrowRight className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{outboundReferrals.length} Pending</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Outbound Referrals Monitoring</div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: Main Tracing Grid Table & Referrals (Occupies 2/3 space) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Overdue Patients Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            
            {/* Table Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Overdue Patients List</h3>
              <p className="text-xs text-slate-400 mt-1">Select a patient row to log call attempts and access contact histories on the right.</p>
            </div>

            {/* Patients Data Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/40 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-5">Patient details</th>
                    <th className="p-4">Missed Sessions</th>
                    <th className="p-4">Last Attended</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {tracingQueue.map((patient) => {
                    const isSelected = patient.id === selectedPatientId;
                    return (
                      <tr 
                        key={patient.id} 
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-teal-50/40 hover:bg-teal-50/60' : 'hover:bg-slate-50/60'}`}
                      >
                        {/* Notice enhanced vertical padding (py-5) for visual breathing room */}
                        <td className="p-4 py-5 pl-5">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-900 text-base block">{patient.name}</span>
                            <div className="text-xs text-slate-500 font-medium flex items-center space-x-2">
                              <span className="font-mono text-slate-400 font-semibold">{patient.mrn}</span>
                              <span>•</span>
                              <span>{patient.diagnosis}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 py-5 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${patient.missedSessions >= 2 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                            {patient.missedSessions} Session{patient.missedSessions > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="p-4 py-5 whitespace-nowrap text-slate-600 font-medium">
                          {patient.lastAttended}
                        </td>
                        <td className="p-4 py-5 whitespace-nowrap">
                          <span className={`text-xs font-bold border px-2.5 py-1 rounded-md ${patient.status === 'High Priority' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {patient.status}
                          </span>
                        </td>
                        <td className="p-4 py-5 pr-5 text-center whitespace-nowrap">
                          <button 
                            type="button"
                            className={`text-xs font-bold px-3.5 py-2 rounded-lg border transition ${isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                          >
                            Open Desk
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outbound Referrals Tracking Panel */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Outbound Referrals Monitoring</h3>
              <p className="text-xs text-slate-400 mt-1">Verify if transferred oncology patients successfully completed their external hospital diagnostic testing paths.</p>
            </div>
            {/* Expanded layout gaps from gap-4 to gap-6 */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              {outboundReferrals.map((ref) => (
                <div key={ref.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-900 text-base block">{ref.name}</span>
                    <p className="text-xs font-bold text-teal-700">{ref.service}</p>
                    <p className="text-xs text-slate-400 font-medium">Sent on: {ref.sentDate} • MRN: {ref.mrn}</p>
                  </div>
                  <button className="text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg border border-slate-200 transition whitespace-nowrap shadow-xs h-10">
                    Confirm Attendance
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Call Logger Workspace Panel (Occupies 1/3 space) */}
        {currentPatient && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-5 space-y-5 sticky top-6">
            
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2 text-teal-600 mb-1.5">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Active Workspace View</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{currentPatient.name}</h3>
              <p className="text-xs text-slate-400 font-mono font-medium mt-0.5">Profile Code: {currentPatient.mrn}</p>
            </div>

            {/* Patient Meta Contact Box */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Patient Telephone Route</span>
                <span className="text-base font-bold text-slate-900 inline-flex items-center space-x-1.5 mt-1">
                  <Phone className="w-4 h-4 text-teal-600" />
                  <span>{currentPatient.phone}</span>
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Social & Family Situation Notes</span>
                <p className="mt-1 font-medium text-slate-700 leading-relaxed">{currentPatient.context}</p>
              </div>
            </div>

            {/* History Log Block */}
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
              <span className="font-bold text-amber-800 uppercase tracking-wider block text-[10px] mb-1.5 inline-flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Last Call Attempt Log Entry</span>
              </span>
              <p className="text-slate-700 text-xs font-medium leading-relaxed">{currentPatient.lastAttempt}</p>
            </div>

            {/* Rapid Actions Dispatched Buttons */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px] mb-1">Log Call Attempt Result</span>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleLogCall('Line Busy / Unreachable')}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-lg text-center transition shadow-2xs"
                >
                  Line Unreachable
                </button>
                <button
                  type="button"
                  onClick={() => handleLogCall('Left voice message with family')}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-lg text-center transition shadow-2xs"
                >
                  Left Msg with Family
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleLogCall('Patient Reconnected - New Session Scheduled')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition shadow-xs uppercase tracking-wider mt-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Patient Safely Reconnected</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}