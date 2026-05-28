import React, { useState } from 'react';
import { Heart, Activity, Shield, Plus, Calendar, CheckCircle, User, Clock } from 'lucide-react';

export default function PalliativeCare() {
  // Mock Hospital Central Patient Registry Dropdown List
  const patientRegistry = [
    { id: 'pat_1', name: 'Grace Wanjiku', mrn: 'MRN-2026-0094', diagnosis: 'Metastatic Breast Carcinoma', hospiceReferral: 'Pending Review', homeCareVisit: 'Scheduled - 30 May 2026', painMedRefill: 'Authorized (Morphine Sulfate PO)' },
    { id: 'pat_2', name: 'Josphat Mwangi', mrn: 'MRN-2026-0112', diagnosis: 'Advanced Prostatic Adenocarcinoma', hospiceReferral: 'Not Indicated', homeCareVisit: 'None Scheduled', painMedRefill: 'Authorized (Oxycodone HCl)' },
    { id: 'pat_3', name: 'Amina Omondi', mrn: 'MRN-2026-0403', diagnosis: 'Stage IV Colorectal Cancer', hospiceReferral: 'Active Community Track', homeCareVisit: 'Weekly Triage', painMedRefill: 'Pending Consultant Review' }
  ];

  // Active Selected Patient State
  const [selectedPatientId, setSelectedPatientId] = useState('pat_1');
  
  // Find current active patient context data
  const currentPatient = patientRegistry.find(p => p.id === selectedPatientId) || patientRegistry[0];

  // Interactive Symptom Form States
  const [selectedPainScale, setSelectedPainScale] = useState(4);
  const [nauseaLevel, setNauseaLevel] = useState('Mild');
  const [fatigueLevel, setFatigueLevel] = useState('Moderate');
  const [surveillanceSchedule, setSurveillanceSchedule] = useState('3-Month Follow-up');
  const [psychosocialNotes, setPsychosocialNotes] = useState('');

  // Next Session Booking Form States
  const [nextSessionDate, setNextSessionDate] = useState('');
  const [nextSessionType, setNextSessionType] = useState('Symptom Management Review');
  const [nextSessionStatus, setNextSessionStatus] = useState('');

  // Historical Log Grid Tracking keyed dynamically to help simulate persistence per patient context
  const [palliativeLogs, setPalliativeLogs] = useState([
    { id: 'log_1', patientId: 'pat_1', date: '28 May 2026', painIndex: 4, nausea: 'Mild', fatigue: 'Moderate', notes: 'Patient reports mild breakthrough pain in the evening. Coping mechanisms stable.' },
    { id: 'log_2', patientId: 'pat_2', date: '25 May 2026', painIndex: 2, nausea: 'None', fatigue: 'Severe', notes: 'Severe physical fatigue reported following radiation cycle. Pain remains stable.' }
  ]);

  // Filter logs to only display for the active selected patient
  const activePatientLogs = palliativeLogs.filter(log => log.patientId === currentPatient.id);

  const handleLogSymptomCommit = (e) => {
    e.preventDefault();
    
    const newLog = {
      id: `log_${Date.now()}`,
      patientId: currentPatient.id,
      date: '28 May 2026', 
      painIndex: selectedPainScale,
      nausea: nauseaLevel,
      fatigue: fatigueLevel,
      notes: psychosocialNotes || 'Routine clinical symptom assessment executed.'
    };

    setPalliativeLogs([newLog, ...palliativeLogs]);
    setPsychosocialNotes('');
  };

  const handleScheduleNextSession = (e) => {
    e.preventDefault();
    if (!nextSessionDate) return;
    
    setNextSessionStatus(`Confirmed for ${nextSessionDate} (${nextSessionType})`);
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen text-slate-800 font-sans">
      
      {/* Module Title Header */}
      <div className="pb-4 mb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Palliative Care & Follow-up Desk</h1>
        <p className="text-xs text-slate-500 mt-0.5">Symptom Management, Survivorship Logistics & Dynamic Interdisciplinary Care Coordination.</p>
      </div>

      {/* NEW COMPONENT: Master Patient Context Switcher Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 w-full md:max-w-md">
          <label className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Active Patient Registry Context</label>
          <div className="relative">
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setNextSessionStatus(''); // Reset appointment banner alert context on profile switch
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 h-9 cursor-pointer appearance-none"
            >
              {patientRegistry.map(pat => (
                <option key={pat.id} value={pat.id}>{pat.name} — ({pat.mrn})</option>
              ))}
            </select>
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Dynamic Summary Tags for Active Selection */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs md:text-right md:justify-end w-full">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clinical Indication</span>
            <span className="font-semibold text-slate-700">{currentPatient.diagnosis}</span>
          </div>
          <div className="md:border-l md:border-slate-200 md:pl-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tracking Identifier</span>
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] block mt-0.5">{currentPatient.mrn}</span>
          </div>
        </div>
      </div>

      {/* Main Structural Working Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* LEFT COMPONENT: Interactive Symptom Entry and Plan Modifiers (3/5 Grid Block) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Pain Assessment Widget matching image_e4642a.png styling rules */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <Activity className="w-4 h-4" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pain Assessment (NRS Scale)</h3>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-between bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              {[...Array(11).keys()].map((score) => {
                const isSelected = selectedPainScale === score;
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setSelectedPainScale(score)}
                    className={`w-9 h-9 text-xs font-bold rounded-lg border transition-all ${
                      isSelected 
                        ? 'bg-rose-600 text-white border-transparent shadow-xs scale-105' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wide px-1">
              <span>0 - No Pain</span>
              <span>5 - Moderate</span>
              <span>10 - Worst Possible</span>
            </div>
          </div>

          {/* Secondary Clinical Parameters Form */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4">
            <form onSubmit={handleLogSymptomCommit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Secondary Symptom Indices */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Nausea Burden</label>
                  <select
                    value={nauseaLevel}
                    onChange={(e) => setNauseaLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium h-9"
                  >
                    <option value="None">None / Controlled</option>
                    <option value="Mild">Mild / Intermittent</option>
                    <option value="Moderate">Moderate / Distressing</option>
                    <option value="Severe">Severe / Refractory</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Fatigue Tracker</label>
                  <select
                    value={fatigueLevel}
                    onChange={(e) => setFatigueLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium h-9"
                  >
                    <option value="None">None / Functional</option>
                    <option value="Mild">Mild Exertional Fatigue</option>
                    <option value="Moderate">Moderate Cognitive/Physical Fatigue</option>
                    <option value="Severe">Severe / Bed-bound Limitation</option>
                  </select>
                </div>

              </div>

              {/* Psychosocial Observation Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Psychosocial Support & Distress Observations</label>
                <textarea
                  rows={2}
                  value={psychosocialNotes}
                  onChange={(e) => setPsychosocialNotes(e.target.value)}
                  placeholder="Document coping architecture, spiritual distress indicators, or explicit caregiver status lines..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 resize-none font-medium leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-1.5 transition uppercase tracking-wide h-9 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-400" />
                  <span>Commit Palliative Entry</span>
                </button>
              </div>
            </form>
          </div>

          {/* Historical Log Tracking List Layout (Context Filtered) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Symptom Assessment History Logs ({currentPatient.name})</h3>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {activePatientLogs.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic">No previous symptom entries recorded for this patient cycle.</div>
              ) : (
                activePatientLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50/20 space-y-2">
                    <div className="flex justify-between items-center text-[11px] font-mono font-semibold text-slate-400">
                      <span>Log Context Date: {log.date}</span>
                      <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">NRS Pain Index: {log.painIndex}/10</span>
                    </div>
                    <div className="flex gap-4 text-[11px] font-semibold text-slate-600">
                      <span>Nausea: <span className="text-slate-900">{log.nausea || 'None'}</span></span>
                      <span>Fatigue: <span className="text-slate-900">{log.fatigue || 'None'}</span></span>
                    </div>
                    <p className="text-slate-500 italic text-[11px] leading-relaxed">"{log.notes}"</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COMPONENT: Action Panel, Survivorship & Logistics Mapping (2/5 Grid Block) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Survivorship Plan Control Box matching image_e4642a.png dark style */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Survivorship Plan</h3>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recurrence Surveillance Schedule</label>
              <select
                value={surveillanceSchedule}
                onChange={(e) => setSurveillanceSchedule(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-teal-400 h-10"
              >
                <option value="3-Month Follow-up">3-Month Follow-up</option>
                <option value="6-Month Follow-up">6-Month Follow-up</option>
                <option value="Annual General Review">Annual General Review</option>
              </select>
            </div>
          </div>

          {/* NEW COMPONENT: Next Session Booking Engine */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center space-x-2 text-teal-600">
              <Calendar className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Schedule Next Clinical Session</h3>
            </div>
            
            <form onSubmit={handleScheduleNextSession} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 block">Session Track Objective</label>
                <select
                  value={nextSessionType}
                  onChange={(e) => setNextSessionType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500 h-8"
                >
                  <option value="Symptom Management Review">Symptom Management Review</option>
                  <option value="Psychosocial Counseling">Psychosocial Counseling</option>
                  <option value="Palliative Dose Adjustments">Palliative Dose Adjustments</option>
                  <option value="Survivorship Check-in">Survivorship Check-in</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 block">Target Clinical Date</label>
                <input
                  type="date"
                  required
                  value={nextSessionDate}
                  onChange={(e) => setNextSessionDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-teal-500 h-8"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-[11px] py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition uppercase tracking-wide h-8"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Reserve Follow-up Slot</span>
              </button>
            </form>

            {nextSessionStatus && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span className="text-[11px] text-emerald-800 font-medium leading-tight">{nextSessionStatus}</span>
              </div>
            )}
          </div>

          {/* Care Coordination Network Module matching lower block of image_e4642a.png */}
          <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 space-y-4">
            <div className="flex items-center space-x-2 text-blue-700">
              <Heart className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Care Coordination Map</h3>
            </div>

            <div className="space-y-3">
              
              {/* Box A: Hospice Coordination */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center gap-3 shadow-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Hospice Referral Link</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">{currentPatient.hospiceReferral}</span>
                </div>
                <button className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200/50 px-2.5 py-1 rounded-md hover:bg-teal-100/60 transition">
                  Authorize Link
                </button>
              </div>

              {/* Box B: Home Visit Schedules */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center gap-3 shadow-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Home Care Visit</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">{currentPatient.homeCareVisit}</span>
                </div>
                <button className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-100 transition">
                  Reschedule
                </button>
              </div>

              {/* Box C: Controlled Pharmacy Pipeline */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center gap-3 shadow-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pain Med Refill System</span>
                  <span className="text-xs font-bold text-emerald-700 mt-0.5 block font-mono">{currentPatient.painMedRefill}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                  Active
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}