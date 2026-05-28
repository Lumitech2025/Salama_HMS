import React, { useState } from 'react';
import { Calendar, Award, Users, BookOpen, Send, Plus, CheckCircle, RefreshCw } from 'lucide-react';

export default function HroCmeRegistry() {
  // Left Column State: HRIO Records Sync
  const [syncStatus, setSyncStatus] = useState('Pending Execution');
  const syncMetrics = {
    dateContext: '28 May 2026',
    counselingEncounters: '6 Sessions',
    newDiagnoses: '2 Patients',
    activeTracing: '4 Outlines',
    bereavementInitialized: '1 Case'
  };

  // Right Column State: CME Modes ('earned' vs 'hosted')
  const [cmeTab, setCmeTab] = useState('earned'); 

  // Earned CME Credits Registry
  const [earnedCme, setEarnedCme] = useState([
    { id: 'cme_1', title: 'Psychosocial Distress Screening in Palliative Care', hours: 4, date: '12 April 2026', type: 'External' },
    { id: 'cme_2', title: 'Breaking Bad News: Clinical Oncological Frameworks', hours: 6, date: '05 May 2026', type: 'Hospital-Led' }
  ]);

  // Hosted Personnel Training Sessions Registry
  const [hostedSessions, setHostedSessions] = useState([
    { id: 'host_1', topic: 'Compassion Fatigue Management for Oncology Nurses', targetAudience: 'Nursing Staff', hoursAwarded: 2, date: '20 May 2026', attendeesCount: 14 }
  ]);

  // Hosted Training Form States
  const [formTopic, setFormTopic] = useState('');
  const [formAudience, setFormAudience] = useState('Nursing Staff');
  const [formHours, setFormHours] = useState(2);
  const [formDate, setFormDate] = useState('');

  // Calculate cumulative hours for indicator bar
  const totalEarnedHours = earnedCme.reduce((sum, item) => sum + item.hours, 0);

  const handleExecuteSync = () => {
    setSyncStatus('Synchronized');
  };

  const handleCreateHostedSession = (e) => {
    e.preventDefault();
    if (!formTopic || !formDate) return;

    const newSession = {
      id: `host_${Date.now()}`,
      topic: formTopic,
      targetAudience: formAudience,
      hoursAwarded: Number(formHours),
      date: formDate,
      attendeesCount: 0 // Tracked as initialization default
    };

    setHostedSessions([newSession, ...hostedSessions]);
    setFormTopic('');
    setFormDate('');
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen text-slate-800 font-sans">
      
      {/* Header Panel */}
      <div className="pb-4 mb-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Analytics, Admin & HRIO Sync</h1>
        <p className="text-xs text-slate-500 mt-0.5">Review automated clinical visit aggregates for administrative records and log Continuing Medical Education hours.</p>
      </div>

      {/* Main Two-Column Structure Grid matching image_d74454.png */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* LEFT COLUMN: HRO Daily Records Sync (2/5 Span) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">HRO Daily Records Sync</h3>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Clinical visit statistics are gathered silently from database workflows. Confirm metrics below to update Health Records Information Officers.
            </p>

            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 text-xs">
              <div className="p-2.5 flex justify-between bg-slate-50/30">
                <span className="text-slate-500 font-medium">Current Date Context</span>
                <span className="font-semibold text-slate-900 font-mono">{syncMetrics.dateContext}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Total Counseling Encounters</span>
                <span className="font-bold text-slate-900">{syncMetrics.counselingEncounters}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">New Diagnosis Disclosures Logged</span>
                <span className="font-bold text-slate-900">{syncMetrics.newDiagnoses}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Active Tracing Interactions Completed</span>
                <span className="font-bold text-slate-900">{syncMetrics.activeTracing}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Caregiver Bereavement Records Initialized</span>
                <span className="font-bold text-slate-900">{syncMetrics.bereavementInitialized}</span>
              </div>
            </div>

            <button
              onClick={handleExecuteSync}
              disabled={syncStatus === 'Synchronized'}
              className={`w-full text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition uppercase tracking-wide h-10 ${
                syncStatus === 'Synchronized'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{syncStatus === 'Synchronized' ? 'Records Dispatched to HRIO' : 'Execute Daily Records Submission'}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: CME Hub - Earned & Hosted Tracks (3/5 Span) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          
          {/* Section Sub-Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-slate-500" />
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Continuous Medical Education</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Track professional compliance records and hospital-led hours.</p>
              </div>
            </div>

            {/* Credit Target Banner Component */}
            <div className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg text-right shrink-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Annual Compliance Progress</span>
              <span className="text-xs font-bold text-slate-900 font-mono">{totalEarnedHours} / 40 Hours Completed</span>
            </div>
          </div>

          {/* Clean Segmented Sub-Tab Switcher Component */}
          <div className="flex border-b border-slate-100 bg-slate-50/20 px-4">
            <button
              onClick={() => setCmeTab('earned')}
              className={`py-2.5 px-4 text-xs font-bold transition border-b-2 tracking-wide ${
                cmeTab === 'earned' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              My Earned Credits
            </button>
            <button
              onClick={() => setCmeTab('hosted')}
              className={`py-2.5 px-4 text-xs font-bold transition border-b-2 tracking-wide flex items-center space-x-1.5 ${
                cmeTab === 'hosted' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Organize Personnel Training</span>
            </button>
          </div>

          <div className="p-4 space-y-4">
            
            {/* VIEW A: Earned CME Credits Stream */}
            {cmeTab === 'earned' && (
              <div className="space-y-3">
                {earnedCme.map((cme) => (
                  <div key={cme.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50/30 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-white border border-slate-200 rounded-md text-slate-400 shrink-0 mt-0.5">
                        <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-slate-800 leading-tight">{cme.title}</h4>
                        <div className="text-[11px] text-slate-400 font-medium font-mono flex items-center space-x-2">
                          <span>{cme.hours} CME Hours</span>
                          <span>•</span>
                          <span>Certified: {cme.date}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200/50 px-2 py-0.5 rounded shrink-0">
                      Credited
                    </span>
                  </div>
                ))}
                
                <div className="pt-2 flex justify-end">
                  <button className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition tracking-wide shadow-xs">
                    + Register External CME Certificate
                  </button>
                </div>
              </div>
            )}

            {/* VIEW B: Organized / Hosted Internal Personnel Training Stream */}
            {cmeTab === 'hosted' && (
              <div className="space-y-4">
                
                {/* Clean, Minimal Internal Session Creator Form */}
                <form onSubmit={handleCreateHostedSession} className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Organize Hospital Staff Session</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3 space-y-0.5">
                      <label className="text-[10px] font-semibold text-slate-400 block">Training Topic / Seminar Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Palliative Distress Management Protocols"
                        value={formTopic}
                        onChange={(e) => setFormTopic(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium h-8"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-semibold text-slate-400 block">Target Staff Audience</label>
                      <select
                        value={formAudience}
                        onChange={(e) => setFormAudience(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium h-8"
                      >
                        <option value="Nursing Staff">Nursing Staff</option>
                        <option value="Junior Residents">Junior Residents</option>
                        <option value="Clinical Officers">Clinical Officers</option>
                        <option value="All Personnel">All Personnel</option>
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-semibold text-slate-400 block">CME Value extended</label>
                      <select
                        value={formHours}
                        onChange={(e) => setFormHours(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium h-8 font-mono"
                      >
                        <option value={1}>1 CME Hour</option>
                        <option value={2}>2 CME Hours</option>
                        <option value={3}>3 CME Hours</option>
                        <option value={4}>4 CME Hours</option>
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-semibold text-slate-400 block">Scheduled Date</label>
                      <input
                        type="date"
                        required
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium h-8 font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition uppercase tracking-wide h-8"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Deploy Internal Training</span>
                    </button>
                  </div>
                </form>

                {/* Registry Log of Hosted Seminars */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deployed Institutional Sessions</span>
                  {hostedSessions.map((session) => (
                    <div key={session.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50/20 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-white border border-slate-200 rounded-md text-slate-400 shrink-0 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-800 leading-tight">{session.topic}</h4>
                          <div className="text-[11px] text-slate-400 font-medium flex flex-wrap items-center gap-x-2 font-mono">
                            <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-sans text-[10px] font-bold">Audience: {session.targetAudience}</span>
                            <span>•</span>
                            <span>{session.hoursAwarded} CME Hours extended</span>
                            <span>•</span>
                            <span>Date: {session.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold text-slate-700 block">{session.attendeesCount} Staff Verified</span>
                        <span className="text-[9px] text-slate-400 font-medium block uppercase tracking-wider">Attendance Log</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}