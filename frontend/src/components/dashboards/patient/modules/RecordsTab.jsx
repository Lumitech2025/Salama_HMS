import React, { useState, useEffect } from 'react';
import { 
  Clipboard, 
  User, 
  Stethoscope, 
  FlaskConical, 
  FileSpreadsheet, 
  Pill, 
  BrainCircuit, 
  Image as ImageIcon, 
  Activity, 
  HeartHandshake,
  Search,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';

const RecordsTab = () => {
  // Navigation tracking state controller
  const [activeSubTab, setActiveSubTab] = useState('diagnoses');
  
  // Patient list & selection state
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);
  
  // Tracking global request error statuses (Authentication, 404, etc)
  const [apiError, setApiError] = useState('');
  
  // Real clinical records state containers (populated via direct API views)
  const [clinicalData, setClinicalData] = useState({
    visitCount: 0,
    nextAppointment: "N/A",
    nextAppointmentPlace: "N/A",
    nextAppointmentPractitioner: "N/A",
    activeMedicationsCount: 0,
    diagnoses: [],
    doctorNotes: [],
    nurseNotes: [],
    orderedLabs: [],
    labResults: [], 
    prescriptions: [],
    psychologyNotes: [],
    imaging: [], 
    chemoSessions: [],
    palliativeNotes: []
  });
  const [loadingRecords, setLoadingRecords] = useState(false);

  const subTabs = [
    { id: 'diagnoses', label: 'Diagnosed Conditions', icon: Clipboard },
    { id: 'doctor-notes', label: 'Doctor Visits', icon: Stethoscope },
    { id: 'nurse-notes', label: 'Nurse Notes', icon: User },
    { id: 'ordered-labs', label: 'Tests & Procedures Ordered', icon: FileSpreadsheet },
    { id: 'lab-results', label: 'Lab & Test Results', icon: FlaskConical },
    { id: 'prescriptions', label: 'Medications Prescribed', icon: Pill },
    { id: 'psychology', label: 'Psychologist Notes', icon: BrainCircuit },
    { id: 'imaging', label: 'Images & Scans', icon: ImageIcon },
    { id: 'oncology', label: 'Chemo Sessions', icon: Activity },
    { id: 'palliative', label: 'Palliative Care', icon: HeartHandshake },
  ];

  // Helper function to dynamically construct headers with auth credentials
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // 1. Fetch available patient registry on initial mount
  useEffect(() => {
    const fetchPatientRegistry = async () => {
      try {
        setLoadingPatients(true);
        setApiError('');
        
        const response = await fetch('/api/patients/', {
          method: 'GET',
          headers: getAuthHeaders()
        }); 

        if (response.status === 401 || response.status === 403) {
          throw new Error("Authentication failed. Please log out and back in again.");
        }
        if (!response.ok) throw new Error("Could not pull patient lists from database registry.");

        const data = await response.json();
        setPatients(data);
        
        if (data.length > 0) {
          setSelectedPatientId(data[0].id); 
        }
      } catch (error) {
        console.error("Error connecting to Salama HMS Patient registry:", error);
        setApiError(error.message || "Failed connecting to system directory components.");
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatientRegistry();
  }, []);

  // 2. Reactive parallel queries whenever selectedPatientId updates
  useEffect(() => {
    if (!selectedPatientId) return;

    const fetchPatientMedicalHistory = async () => {
      try {
        setLoadingRecords(true);
        setApiError('');
        
        // Query target viewset endpoints concurrently using Promise.all
        const [
          diagnosesRes,
          notesRes,
          ordersRes,
          resultsRes,
          prescriptionsRes,
          imagingRes,
          chemoRes,
          appointmentsRes
        ] = await Promise.all([
          fetch(`/api/patient-diagnoses/?patient=${selectedPatientId}`, { headers: getAuthHeaders() }),
          fetch(`/api/clinical-notes/?patient=${selectedPatientId}`, { headers: getAuthHeaders() }),
          fetch(`/api/lab-orders/?patient=${selectedPatientId}`, { headers: getAuthHeaders() }),
          fetch(`/api/lab-results/?patient=${selectedPatientId}`, { headers: getAuthHeaders() }),
          fetch(`/api/prescriptions/?patient=${selectedPatientId}`, { headers: getAuthHeaders() }),
          fetch(`/api/imaging/?patient=${selectedPatientId}`, { headers: getAuthHeaders() }),
          fetch(`/api/chemo-sessions/?patient=${selectedPatientId}`, { headers: getAuthHeaders() }),
          fetch(`/api/appointments/?patient=${selectedPatientId}`, { headers: getAuthHeaders() })
        ]);

        // Safely evaluate responses or fallback to empty lists if any endpoint fails
        const diagnoses = diagnosesRes.ok ? await diagnosesRes.json() : [];
        const clinicalNotes = notesRes.ok ? await notesRes.json() : [];
        const orderedLabs = ordersRes.ok ? await ordersRes.json() : [];
        const labResults = resultsRes.ok ? await resultsRes.json() : [];
        const prescriptions = prescriptionsRes.ok ? await prescriptionsRes.json() : [];
        const imaging = imagingRes.ok ? await imagingRes.json() : [];
        const chemoSessions = chemoRes.ok ? await chemoRes.json() : [];
        const appointments = appointmentsRes.ok ? await appointmentsRes.json() : [];

        // Identify next up-coming scheduled encounter if available
        const nextAppt = appointments.length > 0 ? appointments[0] : null;

        setClinicalData({
          visitCount: diagnoses.length + clinicalNotes.length,
          nextAppointment: nextAppt ? (nextAppt.formatted_date || nextAppt.appointment_date) : "N/A",
          nextAppointmentPlace: nextAppt ? (nextAppt.department || "General Clinic") : "N/A",
          nextAppointmentPractitioner: nextAppt ? (nextAppt.doctor_name || "Assigned Consultant") : "N/A",
          activeMedicationsCount: prescriptions.length,
          diagnoses: diagnoses, 
          doctorNotes: clinicalNotes,
          nurseNotes: clinicalNotes,   
          orderedLabs: orderedLabs,
          labResults: labResults,
          prescriptions: prescriptions,
          psychologyNotes: [], 
          imaging: imaging,
          chemoSessions: chemoSessions,
          palliativeNotes: []
        });
      } catch (error) {
        console.error(`Failed loading records for Patient ID: ${selectedPatientId}`, error);
        setApiError(error.message || "Failed linking historical diagnostic profiles.");
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchPatientMedicalHistory();
  }, [selectedPatientId]);

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300 font-sans w-full max-w-none px-2 pb-12 antialiased">
      
      {/* 1. TITLE HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Health records</h2>
        <p className="text-sm text-slate-500 mt-1">
          This is a history detailing hospital visits and medical history.
        </p>
      </div>

      {/* ERROR BANNER DISPLAY */}
      {apiError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-sm rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* 2. PATIENT REGISTRY IDENTIFIER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xl">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            {loadingPatients ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Search size={18} />}
          </div>
          <select 
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            disabled={loadingPatients || patients.length === 0}
            className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-300 text-slate-800 text-sm font-medium rounded-xl shadow-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
          >
            {loadingPatients ? (
              <option>Loading systems registries...</option>
            ) : patients.length === 0 ? (
              <option>No medical profiles found in database</option>
            ) : (
              patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.name} ({p.health_record_number || p.id})
                </option>
              ))
            )}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        <button 
          type="button" 
          className="bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
          title="Verify identity details"
        >
          <Eye size={18} />
        </button>
      </div>

      <hr className="border-slate-200" />

      {/* Hospital Visits Header Label */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Hospital Visits</h3>
        <p className="text-xs text-slate-400">Select a visit tab module below to read filtered data registries.</p>
      </div>

      {/* 3. HORIZONTAL TOGGLE SUB-TABS MATRIX BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2 scrollbar-none w-full">
        {subTabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <IconComponent size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. GRANULAR DETAILS ROUTED CANVAS */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs min-h-[350px] relative">
        
        {loadingRecords && (
          <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center z-10">
            <div className="flex items-center gap-2 font-medium text-slate-600">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <span>Querying Clinical Registries...</span>
            </div>
          </div>
        )}

        {/* SUB-TAB 1: DIAGNOSED CONDITIONS */}
        {activeSubTab === 'diagnoses' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clipboard size={18} className="text-blue-600" /> Diagnosed Clinical Pathology Records
              </h3>
            </div>
            <div className="space-y-3">
              {clinicalData.diagnoses.length > 0 ? clinicalData.diagnoses.map((diag, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-normal text-slate-700">
                      {diag.icd10_description || diag.long_description}
                    </p>
                    <p className="text-xs text-slate-400">
                      System Entry Date: {diag.formatted_date || diag.created_at?.slice(0, 10) || '—'}
                    </p>
                  </div>
                  <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <span className="text-[10px] bg-slate-200 font-normal px-1.5 py-0.5 rounded text-slate-500">ICD-10 Code</span>
                    <span className="text-sm font-mono text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                      {diag.icd10_code || '—'}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-16 text-slate-400 font-mono text-sm">No diagnosed health registry blocks found.</div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 2: DOCTOR VISITS */}
        {activeSubTab === 'doctor-notes' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Stethoscope size={18} className="text-indigo-600" /> Physician Clinical Narratives
              </h3>
            </div>
            <div className="space-y-4">
              {clinicalData.doctorNotes.length > 0 ? clinicalData.doctorNotes.map((note, idx) => (
                <div key={idx} className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Medical Consultant Evaluation Logs</span>
                    <span className="font-mono bg-white border px-2 py-0.5 rounded shadow-2xs">{note.formatted_date || note.created_at?.slice(0, 10) || '—'}</span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed bg-white p-3 border border-slate-200 rounded-lg shadow-2xs">
                    {note.note_text || note.notes}
                  </p>
                </div>
              )) : (
                <div className="text-center py-16 text-slate-400 font-mono text-sm">No attending physician evaluation notes discovered.</div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 3: NURSE NOTES */}
        {activeSubTab === 'nurse-notes' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <User size={18} className="text-teal-600" /> Nursing Observations & Triage Notes
              </h3>
            </div>
            <div className="space-y-4">
              {clinicalData.nurseNotes.length > 0 ? clinicalData.nurseNotes.map((note, idx) => (
                <div key={idx} className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Clinical Nursing Unit Notes</span>
                    <span className="font-mono bg-white border px-2 py-0.5 rounded shadow-2xs">{note.formatted_date || note.created_at?.slice(0, 10) || '—'}</span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed bg-white p-3 border border-slate-200 rounded-lg shadow-2xs">
                    {note.remarks || note.note_text}
                  </p>
                </div>
              )) : (
                <div className="text-center py-16 text-slate-400 font-mono text-sm">No nursing encounter logs found.</div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: ORDERED LABS */}
        {activeSubTab === 'ordered-labs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-amber-600" /> Pending Lab Panels & Orders In-Flight
              </h3>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="p-3 text-left">Order Placement Date</th>
                    <th className="p-3 text-left">Test/Procedure Parameters</th>
                    <th className="p-3 text-center">Status Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {clinicalData.orderedLabs.length > 0 ? clinicalData.orderedLabs.map((order, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono text-slate-600">{order.formatted_date || order.created_at?.slice(0, 10) || '—'}</td>
                      <td className="p-3 text-left text-slate-800">{order.test_type || 'Diagnostic Panel'}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">
                          {order.status || 'Processing Specimen'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="p-16 text-center text-slate-400 font-mono text-sm">No pending procedures or test structures on sequence.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 5: LAB RESULTS */}
        {activeSubTab === 'lab-results' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FlaskConical size={18} className="text-emerald-600" /> Released Pathology Laboratory Result Ledger
              </h3>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="p-3 text-left">Release Timestamp</th>
                    <th className="p-3 text-left">Lab Test Conducted</th>
                    <th className="p-3 text-center">Reference Flags</th>
                    <th className="p-3 text-right px-6">Observed Result Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {clinicalData.labResults.length > 0 ? clinicalData.labResults.map((lab, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono text-slate-600">{lab.formatted_date || lab.created_at?.slice(0, 10) || '—'}</td>
                      <td className="p-3 text-left text-slate-800">{lab.test_type}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs border ${lab.is_abnormal ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                          {lab.is_abnormal ? 'CRITICAL ABNORMAL' : 'NORMAL RANGE'}
                        </span>
                      </td>
                      <td className="p-3 text-right px-6 font-mono text-blue-600 bg-blue-50/10">{lab.result_value || 'Passed'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="p-16 text-center text-slate-400 font-mono text-sm">No verified result histories located.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 6: PHARMACOLOGICAL PRESCRIPTIONS */}
        {activeSubTab === 'prescriptions' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Pill size={18} className="text-rose-600" /> Pharmacological Prescriptions & Instructions
              </h3>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="p-3 text-left">Authorized Date</th>
                    <th className="p-3 text-left">Medication Name & Strength</th>
                    <th className="p-3 text-left">Dosing & Frequency Directives</th>
                    <th className="p-3 text-right px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {clinicalData.prescriptions.length > 0 ? clinicalData.prescriptions.map((pres, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono text-slate-600">{pres.formatted_date || pres.created_at?.slice(0, 10) || '—'}</td>
                      <td className="p-3 text-left text-slate-800">{pres.medication_name}</td>
                      <td className="p-3 text-left text-slate-600">{pres.dosage_instruction || 'As written by specialist.'}</td>
                      <td className="p-3 text-right px-6">
                        <span className="px-2 py-0.5 rounded text-xs bg-green-50 text-green-700 border border-green-200">Active Dispensation</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="p-16 text-center text-slate-400 font-mono text-sm">No pharmacological records linked to account.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 7: PSYCHOLOGIST NOTES */}
        {activeSubTab === 'psychology' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BrainCircuit size={18} className="text-pink-600" /> Counselling Psychologist Sessions & Notes
              </h3>
            </div>
            <div className="space-y-4">
              {clinicalData.psychologyNotes.length > 0 ? clinicalData.psychologyNotes.map((session, idx) => (
                <div key={idx} className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Psycho-Social Consult Log</span>
                    <span className="font-mono bg-white border px-2 py-0.5 rounded shadow-2xs">{session.formatted_date || session.created_at?.slice(0, 10) || '—'}</span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed bg-white p-3 border border-slate-200 rounded-lg shadow-2xs">
                    {session.session_notes || session.notes}
                  </p>
                </div>
              )) : (
                <div className="text-center py-16 text-slate-400 font-mono text-sm">No counseling session evaluations indexed.</div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 8: IMAGES & SCANS */}
        {activeSubTab === 'imaging' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ImageIcon size={18} className="text-purple-600" /> Radiographic Scans & Advanced Imagery Files
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clinicalData.imaging.length > 0 ? clinicalData.imaging.map((img, i) => (
                <div key={i} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 shrink-0"><ImageIcon size={22} /></div>
                  <div className="space-y-1 flex-1 min-w-0 text-left">
                    <h4 className="text-sm font-medium text-slate-900 truncate">{img.scan_type || 'Radiology File'}</h4>
                    <p className="text-xs font-mono text-slate-400">Captured: {img.formatted_date || img.created_at?.slice(0, 10)}</p>
                    <p className="text-xs text-slate-600 mt-1"><span className="text-slate-400 font-medium">Remarks:</span> {img.radiologist_remarks || 'Awaiting image reading notes.'}</p>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 text-center py-16 text-slate-400 font-mono text-sm">No medical imaging records mapped.</div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 9: CHEMOTHERAPY SESSIONS */}
        {activeSubTab === 'oncology' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Activity size={18} className="text-rose-600" /> Oncology Care Registry & Chemotherapy Cycles
              </h3>
            </div>
            <div className="space-y-4">
              {clinicalData.chemoSessions.length > 0 ? clinicalData.chemoSessions.map((session, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-900 text-white p-3 flex justify-between items-center text-xs font-medium">
                    <span className="text-sm">Regimen Course: {session.regimen_name}</span>
                    <span className="font-mono text-teal-400 bg-slate-800 px-2.5 py-0.5 rounded">{session.date || '—'}</span>
                  </div>
                  <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="block text-slate-400 font-medium">Drugs Administered</span>
                      <p className="text-slate-800 text-sm mt-0.5">{session.drugs_administered}</p>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-medium">Dosage Specification</span>
                      <p className="font-mono text-rose-600 text-sm mt-0.5">{session.dosage_value}</p>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-medium">Toxicity / Side Effects</span>
                      <p className="text-slate-700 mt-0.5">{session.toxicity_reported || 'None Documented'}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-16 text-slate-400 font-mono text-sm">No tracked oncology records discovered.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RecordsTab;