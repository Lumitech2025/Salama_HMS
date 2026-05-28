import React, { useState } from 'react';

// Master queue for everyone referred to the counseling Psychologist
const initialRegistry = [
  {
    id: 'REG-109',
    name: 'David Njoroge',
    mrn: 'MRN-105-2026',
    diagnosis: 'Colorectal Carcinoma',
    department: 'Chemotherapy Unit',
    referredBy: 'Dr. Evelyn Mutua',
    stage: 'Acceptance & Coping Integration',
    consent: 'Signed & Logged',
    status: 'Urgent',
    reason: 'Patient experiencing acute anxiety and distress regarding her treatment schedule.'
  },
  {
    id: 'REG-108',
    name: 'Mary Atieno',
    mrn: 'MRN-921-2026',
    diagnosis: 'Cervical Cancer (Stage IIB)',
    department: 'Radiotherapy Dept',
    referredBy: 'Sister Mercy Langat',
    stage: 'Anger & Resentment Support',
    consent: 'Signed & Logged',
    status: 'Routine',
    reason: 'Requires support breaking diagnostic status to family; high emotional avoidance noted.'
  },
  {
    id: 'REG-107',
    name: 'Amina Omondi',
    mrn: 'MRN-475-2026',
    diagnosis: 'Classical Hodgkin Lymphoma',
    department: 'Oncology Ward B',
    referredBy: 'Dr. Al-Amin',
    stage: 'Denial & Shock (Breaking Bad News)',
    consent: 'Pending Signature',
    status: 'Routine',
    reason: 'Lone patient with minimal family support network. Needs linkage and counseling.'
  }
];

export default function App() {
  const [registry, setRegistry] = useState(initialRegistry);
  const [selectedPatient, setSelectedPatient] = useState(initialRegistry[0]);
  
  // Analytics metrics tracking counter state
  const [metrics, setMetrics] = useState({
    activeTherapy: 14,
    lostToFollowUp: 3,
    griefBereavement: 5
  });

  // Balanced Form Workspace States
  const [psychStage, setPsychStage] = useState('Denial & Shock (Breaking Bad News)');
  const [clinicalStatus, setClinicalStatus] = useState('Active Therapy Line');
  const [therapyNotes, setTherapyNotes] = useState('');
  const [consentSigned, setConsentSigned] = useState(false);
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Updates parameters for the highlighted profile in the queue
  const handleUpdateEvaluation = (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setRegistry(prev => prev.map(item => {
      if (item.id === selectedPatient.id) {
        return {
          ...item,
          stage: psychStage,
          status: clinicalStatus,
          consent: consentSigned ? 'Signed & Logged' : 'Pending Signature'
        };
      }
      return item;
    }));

    setToastMessage(`Updated clinical evaluation parameters for ${selectedPatient.name}.`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Action logic handling Sidebar Appointments context routing
  const handleBookAppointment = (patient) => {
    // 1. Remove the patient from the master referred queue
    setRegistry(prev => prev.filter(item => item.id !== patient.id));
    
    // 2. Clear current workspace selection if that patient was loaded
    if (selectedPatient?.id === patient.id) {
      const remaining = registry.filter(item => item.id !== patient.id);
      setSelectedPatient(remaining.length > 0 ? remaining[0] : null);
    }

    // 3. Trigger notification alert mapping to parent sidebar system routing
    setToastMessage(`Routing ${patient.name} to the Appointments Sidebar Tab...`);
    setShowToast(true);
    
    // Developer Integration Note: Invoke your parent navigation context router here
    // e.g., navigate('/appointments') or setParentTab('APPOINTMENTS')
    setTimeout(() => {
      setShowToast(false);
      alert(`Salama HMS Navigation Hook: Redirecting to the APPOINTMENTS tab on the sidebar layout for patient: ${patient.name}`);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      
      {/* Central Viewport Layout Frame */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Module Header Area */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Psychosocial Desk</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage clinical referrals, consent, and psychosocial therapy intake files.</p>
          </div>
          <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200/50">
            Session Live
          </span>
        </header>

        {/* Dynamic scroll view workspace wrapper */}
        <div className="flex-1 overflow-y-auto space-y-6 pb-8">
          
          {/* SECTION 1: Restored Top Analytics KPI Cards */}
          <section className="bg-white border-b border-slate-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* KPI Card 1: Active Support Cases */}
            <div className="bg-slate-50/60 rounded-2xl border border-slate-200/60 p-5 flex items-center gap-4 hover:shadow-sm transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Active Support</span>
                <span className="text-2xl font-bold text-slate-900 mt-0.5 block">{metrics.activeTherapy} Enrolled</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Ongoing therapeutic intervention lines</span>
              </div>
            </div>

            {/* KPI Card 2: Lost to Follow-Up Tracking */}
            <div className="bg-slate-50/60 rounded-2xl border border-slate-200/60 p-5 flex items-center gap-4 hover:shadow-sm transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Lost To Follow-Up</span>
                <span className="text-2xl font-bold text-slate-900 mt-0.5 block">{metrics.lostToFollowUp} Flagged</span>
                <span className="text-[11px] text-rose-600 font-medium block mt-0.5">Requires community tracing lines</span>
              </div>
            </div>

            {/* KPI Card 3: Grief & Bereavement Logs */}
            <div className="bg-slate-50/60 rounded-2xl border border-slate-200/60 p-5 flex items-center gap-4 hover:shadow-sm transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Grief & Bereavement</span>
                <span className="text-2xl font-bold text-slate-900 mt-0.5 block">{metrics.griefBereavement} Families</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Caregiver support program monitoring logs</span>
              </div>
            </div>

          </section>
          
          {/* SECTION 2: Restored Mid Split Panel layout (With Correct Spacing) */}
          <div className="flex bg-white mx-6 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            
            {/* Split View Left: Select Referral Targets */}
            <section className="w-80 border-r border-slate-200 bg-[#fdfdfd] flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Select Referral Target</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Inbound counseling pipeline.</p>
                </div>
                <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {registry.length} Pending
                </span>
              </div>

              <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
                {registry.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setPsychStage(patient.stage);
                      setConsentSigned(patient.consent === 'Signed & Logged');
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 bg-white ${
                      selectedPatient?.id === patient.id
                        ? 'border-teal-500 bg-teal-50/10 ring-1 ring-teal-500/10'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-slate-900 text-xs block truncate">{patient.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                        patient.status === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {patient.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">MRN: {patient.mrn}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Split View Right: Dynamic Intake Workspace Case Formulation */}
            <section className="flex-1 p-6 bg-white">
              {selectedPatient ? (
                <form onSubmit={handleUpdateEvaluation} className="space-y-4">
                  
                  {/* Selected Profile Header Information banner */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{selectedPatient.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 font-mono">
                        <span>MRN: {selectedPatient.mrn}</span>
                        <span>•</span>
                        <span>Primary Diagnosis: <strong className="font-semibold text-slate-700">{selectedPatient.diagnosis}</strong></span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                      From Unit: <strong className="font-semibold text-slate-700">{selectedPatient.department}</strong>
                    </span>
                  </div>

                  {/* Dropdowns fields group with clean breathing space */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Current Psychological Stage
                      </label>
                      <select 
                        value={psychStage} 
                        onChange={(e) => setPsychStage(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500"
                      >
                        <option>Denial & Shock (Breaking Bad News)</option>
                        <option>Anger & Resentment Support</option>
                        <option>Bargaining / Diagnostic Doubts</option>
                        <option>Depression / Anxiety Care</option>
                        <option>Acceptance & Coping Integration</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Therapy Admission Line
                      </label>
                      <select 
                        value={clinicalStatus} 
                        onChange={(e) => setClinicalStatus(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500"
                      >
                        <option>Active Therapy Line</option>
                        <option>Crisis Stabilization Only</option>
                        <option>Palliative Support Line</option>
                      </select>
                    </div>
                  </div>

                  {/* Clinical observations notes and submit action box */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Clinical Therapy Notes & Intake Formulation
                    </label>
                    <textarea 
                      rows={3}
                      value={therapyNotes}
                      onChange={(e) => setTherapyNotes(e.target.value)}
                      placeholder="Document immediate clinical observations, behavioral indicators and session summary details..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>

                  {/* Bottom Consent and form processing operations banner */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={consentSigned}
                        onChange={(e) => setConsentSigned(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-0"
                      />
                      <span className="text-xs font-bold text-slate-700">Informed Consent Form Signed & Catalogued</span>
                    </label>

                    <button
                      type="submit"
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      Commit Parameters
                    </button>
                  </div>

                </form>
              ) : (
                <div className="text-center py-12 text-sm text-slate-400 font-medium">No target patient context loaded. Selection required.</div>
              )}
            </section>

          </div>

          {/* SECTION 3: True Universal Master Queue Database Table (Full Available Width) */}
          <div className="mx-6">
            <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Active Psychosocial Evaluation Queue</h3>
                  <p className="text-xs text-slate-400 mt-0.5">This list serves as the master queue for all active referrals awaiting clinical counseling psychology action maps.</p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-150">
                  {registry.length} Profiles Listed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4 pl-6">Patient Profile</th>
                      <th className="p-4">MRN Number</th>
                      <th className="p-4">Department Context</th>
                      <th className="p-4">Psychosocial Evaluation Stage</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {registry.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">
                          No inbound patient profiles logged in the referral registry line.
                        </td>
                      </tr>
                    ) : (
                      registry.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 pl-6">
                            <span className="font-bold text-slate-900 block">{entry.name}</span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-sm">{entry.diagnosis}</span>
                          </td>
                          <td className="p-4 font-mono text-slate-600">{entry.mrn}</td>
                          <td className="p-4 text-slate-600 font-medium">{entry.department}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-slate-800">{entry.stage}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                entry.consent === 'Signed & Logged' 
                                  ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {entry.consent}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button 
                              type="button"
                              onClick={() => handleBookAppointment(entry)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Book Appointment
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* FLOATING ACTION DISPATCH NOTIFICATION POPUP */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3.5 border border-slate-800 z-50 transition-all text-xs">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></div>
          <p className="font-medium text-slate-200">{toastMessage}</p>
        </div>
      )}

    </div>
  );
}