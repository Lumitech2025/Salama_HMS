import React, { useState } from 'react';
import { 
  Clipboard, 
  FileText, 
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
  Calendar,
  Layers
} from 'lucide-react';

const RecordsTab = ({ 
  patientName = "COLLINS MWITI",
  healthRecordNumber = "SHA-2026-9931",
  visitCount = 0,
  nextAppointment = "N/A",
  nextAppointmentPlace = "N/A",
  nextAppointmentPractitioner = "N/A",
  activeMedicationsCount = 0,
  diagnoses = [],
  doctorNotes = [],
  nurseNotes = [],
  orderedLabs = [],
  labResults = [], 
  prescriptions = [],
  psychologyNotes = [],
  imaging = [], 
  chemoSessions = [],
  palliativeNotes = []
}) => {
  // Navigation tracking state controller matching reference sub-headers
  const [activeSubTab, setActiveSubTab] = useState('diagnoses');

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

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-300 font-sans w-full max-w-none px-2 pb-12 antialiased">
      
      {/* 1. TITLE HEADER */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Health records</h2>
        <p className="text-sm md:text-base text-slate-500 mt-1">
          This is a history detailing your hospital visits and medical history.
        </p>
      </div>

      {/* 2. PATIENT REGISTRY IDENTIFIER BAR (Mirrors image_f32e81.png layout) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xl">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <select 
            disabled
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 text-slate-900 text-base font-bold rounded-xl shadow-xs appearance-none cursor-not-allowed"
          >
            <option>{patientName} ({healthRecordNumber})</option>
          </select>
        </div>
        <button 
          type="button" 
          className="bg-slate-50 border border-slate-300 p-3 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
          title="Verify identity details"
        >
          <Eye size={20} />
        </button>
      </div>

      {/* 3. TOP LEVEL ANALYTICS METRIC CARDS LAYER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Visits Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <Layers size={22} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">Number of Visits</h4>
            <p className="text-xs text-slate-400 font-medium">Encounter count (last year)</p>
            <p className="text-3xl font-black text-slate-900 pt-1">{visitCount}</p>
          </div>
        </div>

        {/* Next Appointment Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
            <Calendar size={22} />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">Next Appointment</h4>
            <p className="text-xs text-slate-400 font-medium">Scheduled for</p>
            <p className="text-2xl font-black text-slate-900 pt-1 truncate">{nextAppointment}</p>
            {nextAppointment !== "N/A" && (
              <p className="text-xs text-slate-500 font-medium mt-1">
                <span className="font-bold text-slate-700">Place:</span> {nextAppointmentPlace} • <span className="font-bold text-slate-700">Doctor:</span> {nextAppointmentPractitioner}
              </p>
            )}
          </div>
        </div>

        {/* Active Medications Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <Pill size={22} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">Active Medications</h4>
            <p className="text-xs text-slate-400 font-medium">Active prescriptions count</p>
            <p className="text-3xl font-black text-slate-900 pt-1">{activeMedicationsCount}</p>
          </div>
        </div>

      </div>

      <hr className="border-slate-200" />

      {/* Hospital Visits Header Label */}
      <div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight">Hospital Visits</h3>
        <p className="text-xs md:text-sm text-slate-400">Select a visit tab module below to read filtered data registries.</p>
      </div>

      {/* 4. HORIZONTAL TOGGLE SUB-TABS MATRIX BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2 scrollbar-none w-full">
        {subTabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all border ${
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

      {/* 5. GRANULAR DETAILS ROUTED CANVAS */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs min-h-[350px]">
        
        {/* SUB-TAB 1: DIAGNOSED CONDITIONS */}
        {activeSubTab === 'diagnoses' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clipboard size={18} className="text-blue-600" /> Diagnosed Clinical Pathology Records
              </h3>
            </div>
            <div className="space-y-4">
              {diagnoses.length > 0 ? diagnoses.map((diag, idx) => (
                <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-base font-black text-slate-900 uppercase tracking-tight">{diag.condition_name || 'Condition Description File'}</p>
                    <p className="text-xs text-slate-500 font-medium">System Entry Date: {diag.created_at?.slice(0, 10) || '—'}</p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span className="text-xs uppercase bg-slate-200 font-bold px-2 py-0.5 rounded text-slate-700 block mb-1 w-fit sm:ml-auto">ICD-10 Code</span>
                    <span className="text-base font-mono font-black text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-2xs block">{diag.diagnosis_code || '—'}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-16 text-slate-400 font-mono text-sm">No diagnosed health registry blocks found.</div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 2: DOCTOR VISITS (NOTES) */}
        {activeSubTab === 'doctor-notes' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope size={18} className="text-indigo-600" /> Physician Clinical Narratives
              </h3>
            </div>
            <div className="space-y-4">
              {doctorNotes.length > 0 ? doctorNotes.map((note, idx) => (
                <div key={idx} className="p-5 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 font-bold">
                    <span>Medical Consultant Evaluation Logs</span>
                    <span className="font-mono bg-white border px-2 py-0.5 rounded shadow-2xs">{note.created_at?.slice(0, 10) || '—'}</span>
                  </div>
                  <p className="text-slate-800 text-base font-medium leading-relaxed bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
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
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User size={18} className="text-teal-600" /> Nursing Observations & Triage Notes
              </h3>
            </div>
            <div className="space-y-4">
              {nurseNotes.length > 0 ? nurseNotes.map((note, idx) => (
                <div key={idx} className="p-5 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 font-bold">
                    <span>Clinical Nursing Unit Notes</span>
                    <span className="font-mono bg-white border px-2 py-0.5 rounded shadow-2xs">{note.created_at?.slice(0, 10) || '—'}</span>
                  </div>
                  <p className="text-slate-800 text-base font-medium leading-relaxed bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
                    {note.remarks || note.note_text}
                  </p>
                </div>
              )) : (
                <div className="text-center py-16 text-slate-400 font-mono text-sm">No nursing encounter logs found.</div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: TESTS & PROCEDURES ORDERED */}
        {activeSubTab === 'ordered-labs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-amber-600" /> Pending Lab Panels & Orders In-Flight
              </h3>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="p-4 text-left font-bold">Order Placement Date</th>
                    <th className="p-4 text-left font-bold">Test/Procedure Parameters</th>
                    <th className="p-4 text-center font-bold">Status Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orderedLabs.length > 0 ? orderedLabs.map((order, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-semibold text-slate-900">{order.created_at?.slice(0, 10) || '—'}</td>
                      <td className="p-4 text-left font-bold text-slate-900 text-base uppercase tracking-tight">{order.test_type || 'Diagnostic Panel'}</td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
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

        {/* SUB-TAB 5: LAB & TEST RESULTS */}
        {activeSubTab === 'lab-results' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FlaskConical size={18} className="text-emerald-600" /> Released Pathology Laboratory Result Ledger
              </h3>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="p-4 text-left font-bold">Release Timestamp</th>
                    <th className="p-4 text-left font-bold">Lab Test Conducted</th>
                    <th className="p-4 text-center font-bold">Reference Flags</th>
                    <th className="p-4 text-right px-6 font-bold">Observed Result Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {labResults.length > 0 ? labResults.map((lab, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-semibold text-slate-900">{lab.created_at?.slice(0, 10) || '—'}</td>
                      <td className="p-4 text-left font-black text-slate-900 text-base uppercase tracking-tight">{lab.test_type}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold border ${lab.is_abnormal ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                          {lab.is_abnormal ? 'CRITICAL ABNORMAL' : 'NORMAL RANGE'}
                        </span>
                      </td>
                      <td className="p-4 text-right px-6 font-mono font-black text-blue-600 text-lg bg-blue-50/10">{lab.result_value || 'Passed'}</td>
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

        {/* SUB-TAB 6: MEDICATIONS PRESCRIBED */}
        {activeSubTab === 'prescriptions' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pill size={18} className="text-rose-600" /> Pharmacological Prescriptions & Instructions
              </h3>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="p-4 text-left font-bold">Authorized Date</th>
                    <th className="p-4 text-left font-bold">Medication Name & Strength</th>
                    <th className="p-4 text-left font-bold">Dosing & Frequency Directives</th>
                    <th className="p-4 text-right px-6 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescriptions.length > 0 ? prescriptions.map((pres, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-semibold text-slate-900">{pres.created_at?.slice(0, 10) || '—'}</td>
                      <td className="p-4 text-left font-black text-slate-900 text-base tracking-tight">{pres.medication_name}</td>
                      <td className="p-4 text-left font-medium text-slate-700 text-sm">{pres.dosage_instruction || 'As written by specialist.'}</td>
                      <td className="p-4 text-right px-6">
                        <span className="px-2.5 py-1 rounded text-xs font-bold bg-green-50 text-green-700 border border-green-200">Active Dispensation</span>
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
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BrainCircuit size={18} className="text-pink-600" /> Counselling Psychologist Sessions & Notes
              </h3>
            </div>
            <div className="space-y-4">
              {psychologyNotes.length > 0 ? psychologyNotes.map((session, idx) => (
                <div key={idx} className="p-5 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 font-bold">
                    <span>Psycho-Social Consult Log</span>
                    <span className="font-mono bg-white border px-2 py-0.5 rounded shadow-2xs">{session.created_at?.slice(0, 10) || '—'}</span>
                  </div>
                  <p className="text-slate-800 text-base font-medium leading-relaxed bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
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
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon size={18} className="text-purple-600" /> Radiographic Scans & Advanced Imagery Files
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {imaging.length > 0 ? imaging.map((img, i) => (
                <div key={i} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-700 shrink-0"><ImageIcon size={24} /></div>
                  <div className="space-y-1 flex-1 min-w-0 text-left">
                    <h4 className="font-bold text-slate-900 text-base truncate uppercase">{img.scan_type || 'Radiology File'}</h4>
                    <p className="text-xs font-mono text-slate-500 font-medium">Captured: {img.created_at?.slice(0, 10)}</p>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-1"><strong>Remarks:</strong> {img.radiologist_remarks || 'Awaiting image reading notes.'}</p>
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
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity size={18} className="text-rose-600" /> Oncology Care Registry & Chemotherapy Cycles
              </h3>
            </div>
            <div className="space-y-4">
              {chemoSessions.length > 0 ? chemoSessions.map((session, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center text-sm font-bold">
                    <span className="text-base font-black">Regimen Course: {session.regimen_name}</span>
                    <span className="font-mono text-teal-400 font-black bg-slate-800 px-3 py-1 rounded">{session.date || '—'}</span>
                  </div>
                  <div className="p-5 bg-white grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase">Drugs Administered</span>
                      <p className="font-black text-slate-900 text-base mt-0.5">{session.drugs_administered}</p>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase">Dosage Specification</span>
                      <p className="font-mono font-bold text-rose-600 text-base mt-0.5">{session.dosage_value}</p>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase">Toxicity / Side Effects</span>
                      <p className="font-medium text-slate-700 mt-0.5">{session.toxicity_reported || 'None Documented'}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-16 text-slate-400 font-mono text-sm">No oncological infusion cycles verified in system.</div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 10: PALLIATIVE CARE NOTES */}
        {activeSubTab === 'palliative' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HeartHandshake size={18} className="text-cyan-600" /> Comfort-Focused Palliative Care Logs
              </h3>
            </div>
            <div className="space-y-4">
              {palliativeNotes.length > 0 ? palliativeNotes.map((note, i) => (
                <div key={i} className="p-5 border border-dashed border-slate-300 rounded-xl bg-cyan-50/10 text-left space-y-2">
                  <div className="flex justify-between items-center font-mono text-xs text-slate-500">
                    <span className="font-bold text-cyan-800 uppercase tracking-wider bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">Symptom Management</span>
                    <strong>Logged: {note.created_at?.slice(0, 10)}</strong>
                  </div>
                  <p className="text-slate-800 text-base font-medium leading-relaxed bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
                    {note.summary_text || note.notes}
                  </p>
                </div>
              )) : (
                <div className="text-center py-16 text-slate-400 font-mono text-sm">No records logged in palliative frameworks.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RecordsTab;