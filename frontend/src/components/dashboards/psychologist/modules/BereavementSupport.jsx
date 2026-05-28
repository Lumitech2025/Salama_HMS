import React, { useState } from 'react';
import { Heart, UserX, Plus, MessageSquare, User } from 'lucide-react';

export default function BereavementSupport() {
  const [activeRegistry, setActiveRegistry] = useState([
    { id: 'reg_1', name: 'John Doe Njoroge', mrn: 'MRN-2026-0412', diagnosis: 'Prostate Adenocarcinoma', caregiverName: 'Jane Njoroge', caregiverPhone: '0711000111' },
    { id: 'reg_2', name: 'Alice Awuor', mrn: 'MRN-2026-0115', diagnosis: 'Cervical Carcinoma', caregiverName: 'Peter Awuor', caregiverPhone: '0722222333' }
  ]);

  const [bereavementCases, setBereavementCases] = useState([
    {
      id: 'grief_1',
      caregiverName: 'Grace Wanjiku',
      relationship: 'Mother',
      caregiverPhone: '0722111222',
      deceasedPatient: 'Baby Liam',
      deceasedMrn: 'MRN-2026-0094',
      dateOpened: '2026-05-10',
      griefStage: 'Anger & Bargaining',
      sessionsCompleted: 2,
      lastSessionNotes: 'Discussing healthy emotional outlets. Showing progress in grief cycles.',
      status: 'Active Therapy'
    }
  ]);

  const [selectedCaseId, setSelectedCaseId] = useState('grief_1');
  const [mortalityPatientId, setMortalityPatientId] = useState('');
  const [mortalityDate, setMortalityDate] = useState('');
  const [causeOfDeath, setCauseOfDeath] = useState('Disease Progression');
  const [placeOfDeath, setPlaceOfDeath] = useState('In-Patient Ward');
  const [confirmLock, setConfirmLock] = useState(false);
  const [sessionNotesInput, setSessionNotesInput] = useState('');
  const [selectedGriefStage, setSelectedGriefStage] = useState('Shock & Denial');

  const currentGriefCase = bereavementCases.find(c => c.id === selectedCaseId) || bereavementCases[0];

  const handleLogMortality = (e) => {
    e.preventDefault();
    if (!mortalityPatientId || !confirmLock || !mortalityDate) return;

    const targetedPatient = activeRegistry.find(p => p.id === mortalityPatientId);
    if (!targetedPatient) return;

    const newGriefCase = {
      id: `grief_${Date.now()}`,
      caregiverName: targetedPatient.caregiverName,
      relationship: 'Primary Caregiver',
      caregiverPhone: targetedPatient.caregiverPhone,
      deceasedPatient: targetedPatient.name,
      deceasedMrn: targetedPatient.mrn,
      dateOpened: mortalityDate,
      griefStage: 'Shock & Denial',
      sessionsCompleted: 0,
      lastSessionNotes: `Case initialized following patient mortality report. Cause: ${causeOfDeath}.`,
      status: 'Active Therapy'
    };

    setBereavementCases(prev => [newGriefCase, ...prev]);
    setActiveRegistry(prev => prev.filter(p => p.id !== mortalityPatientId));
    setSelectedCaseId(newGriefCase.id);
    setMortalityPatientId('');
    setMortalityDate('');
    setConfirmLock(false);
  };

  const handleLogGriefSession = (e) => {
    e.preventDefault();
    if (!currentGriefCase || !sessionNotesInput) return;

    setBereavementCases(prev => prev.map(c => {
      if (c.id === currentGriefCase.id) {
        return {
          ...c,
          sessionsCompleted: c.sessionsCompleted + 1,
          griefStage: selectedGriefStage,
          lastSessionNotes: sessionNotesInput
        };
      }
      return c;
    }));

    setSessionNotesInput('');
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen text-slate-800 font-sans">
      
      {/* Header Panel */}
      <div className="pb-4 mb-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Bereavement & Caregiver Support Desk</h1>
        <p className="text-xs text-slate-500 mt-0.5">Document patient mortalities, trigger administrative record lockouts, and log updates to ongoing grief therapy.</p>
      </div>

      <div className="space-y-6">
        
        {/* Document Mortality Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserX className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Document Patient Loss & System Guardrail</h2>
            </div>
          </div>

          <form onSubmit={handleLogMortality} className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Select Patient Profile</label>
                <select
                  required
                  value={mortalityPatientId}
                  onChange={(e) => setMortalityPatientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 h-9 font-medium"
                >
                  <option value="">-- Choose Profile --</option>
                  {activeRegistry.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Date of Occurrence</label>
                <input 
                  type="date" 
                  required
                  value={mortalityDate}
                  onChange={(e) => setMortalityDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 h-9 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Primary Cause of Death</label>
                <select
                  value={causeOfDeath}
                  onChange={(e) => setCauseOfDeath(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 h-9 font-medium"
                >
                  <option value="Disease Progression">Disease Progression</option>
                  <option value="Cardiorespiratory Arrest">Cardiorespiratory Arrest</option>
                  <option value="Secondary System Infection">Secondary System Infection</option>
                  <option value="Treatment Refractory Shock">Treatment Refractory Shock</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Place of Death</label>
                <select
                  value={placeOfDeath}
                  onChange={(e) => setPlaceOfDeath(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 h-9 font-medium"
                >
                  <option value="In-Patient Ward">In-Patient Ward</option>
                  <option value="Home/Hospice Care Address">Home / Hospice Care</option>
                  <option value="External Emergency Unit">External Emergency Unit</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <label className="flex items-start space-x-2.5 cursor-pointer select-none max-w-3xl">
                <input
                  type="checkbox"
                  checked={confirmLock}
                  onChange={(e) => setConfirmLock(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                />
                <span className="text-xs text-slate-500 leading-normal">
                  I confirm this submission will lock the core clinical file, disable future automated messages, and move family contacts into the active bereavement queue.
                </span>
              </label>
              <button
                type="submit"
                disabled={!confirmLock}
                className={`font-bold text-xs px-4 py-2 rounded-lg transition tracking-wide shrink-0 h-9 ${
                  confirmLock ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                Log Loss & Lock File
              </button>
            </div>
          </form>
        </div>

        {/* Dual Panel Queue Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Active Registry Queue Table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Grief Counseling Registry</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-3 pl-4">Caregiver Coordinate</th>
                    <th className="p-3">Deceased Profile</th>
                    <th className="p-3">Observed Stage</th>
                    <th className="p-3 pr-4 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {bereavementCases.map((griefCase) => {
                    const isSelected = griefCase.id === selectedCaseId;
                    return (
                      <tr 
                        key={griefCase.id}
                        onClick={() => setSelectedCaseId(griefCase.id)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-teal-50/30 hover:bg-teal-50/50' : 'hover:bg-slate-50/40'}`}
                      >
                        <td className="p-3 pl-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 block">{griefCase.caregiverName}</span>
                            <span className="text-[11px] text-slate-400 font-medium font-mono">{griefCase.caregiverPhone} • {griefCase.relationship}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-700">{griefCase.deceasedPatient}</span>
                            <span className="text-[11px] text-slate-400 font-mono block">{griefCase.deceasedMrn}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="bg-teal-50 text-teal-800 border border-teal-200/60 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {griefCase.griefStage}
                          </span>
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <button
                            type="button"
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-md border transition ${isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
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

          {/* Right Action Log Workspace */}
          {currentGriefCase && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-4">
              
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-0.5">Active Focus Panel</span>
                <h3 className="text-base font-bold text-slate-900">{currentGriefCase.caregiverName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Caregiver link for deceased: <span className="text-slate-600 font-medium">{currentGriefCase.deceasedPatient}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Date Logged</span>
                  <span className="text-slate-900 font-mono font-bold mt-0.5 block">{currentGriefCase.dateOpened}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Sessions</span>
                  <span className="text-teal-700 font-bold mt-0.5 block inline-flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {currentGriefCase.sessionsCompleted} Logged runs
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Last Session Entry</span>
                <p className="text-slate-600 italic leading-relaxed">"{currentGriefCase.lastSessionNotes}"</p>
              </div>

              <form onSubmit={handleLogGriefSession} className="space-y-3 pt-3 border-t border-slate-100">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Log Counseling Update</span>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 block">Current Evaluation Stage</label>
                  <select
                    value={selectedGriefStage}
                    onChange={(e) => setSelectedGriefStage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 h-8 font-medium"
                  >
                    <option value="Shock & Denial">Shock & Denial</option>
                    <option value="Anger & Bargaining">Anger & Bargaining</option>
                    <option value="Depression & Reflection">Depression & Reflection</option>
                    <option value="Acceptance & Re-orientation">Acceptance & Re-orientation</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 block">Progress Notes</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Document clinical observations, active response markers, or immediate care path goals..."
                    value={sessionNotesInput}
                    onChange={(e) => setSessionNotesInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 resize-none font-medium leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition uppercase tracking-wide h-9 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-400" />
                  <span>Update Caregiver Record</span>
                </button>
              </form>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}