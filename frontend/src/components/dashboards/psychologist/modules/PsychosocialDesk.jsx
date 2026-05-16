import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { FileSignature, CheckCircle2, RefreshCw } from 'lucide-react';

const PsychosocialDesk = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [enrollForm, setEnrollForm] = useState({
    patient_name: '',
    medical_record_no: '',
    diagnosis: '',
    current_stage: 'DENIAL',
    location_department: 'CHEMO_SUITE',
    status: 'IN_THERAPY',
    consent_form_signed: false,
    initial_intake_note: ''
  });

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const res = await API.get('/psychology-enrollments/');
      setEnrollments(res.data.results || res.data);
    } catch (err) {
      console.error("Error pulling clinical enrollments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await API.post('/psychology-enrollments/', enrollForm);
      fetchEnrollments();
      setEnrollForm({
        patient_name: '',
        medical_record_no: '',
        diagnosis: '',
        current_stage: 'DENIAL',
        location_department: 'CHEMO_SUITE',
        status: 'IN_THERAPY',
        consent_form_signed: false,
        initial_intake_note: ''
      });
    } catch (err) {
      alert("Validation failed: Ensure Medical Record Number (MRN) is unique.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-10 font-['Inter'] text-left animate-in fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ENROLLMENT FORM */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Support Enrollment</h3>
            <p className="text-xs text-slate-400 mt-1">Onboard an oncology patient directly to psychosocial therapeutic lines</p>
          </div>

          <form onSubmit={handleEnroll} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Patient Full Name</label>
                <input required type="text" placeholder="John Doe Njoroge" className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 px-4 text-xs font-medium outline-none focus:border-teal-500 bg-white transition-all" value={enrollForm.patient_name} onChange={e => setEnrollForm({...enrollForm, patient_name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Medical Record Number (MRN)</label>
                <input required type="text" placeholder="MRN-2026-XXXX" className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 px-4 text-xs font-medium outline-none focus:border-teal-500 bg-white transition-all" value={enrollForm.medical_record_no} onChange={e => setEnrollForm({...enrollForm, medical_record_no: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Oncology Diagnosis Context</label>
                <input required type="text" placeholder="e.g. Prostate Adenocarcinoma" className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 px-4 text-xs font-medium outline-none focus:border-teal-500 bg-white transition-all" value={enrollForm.diagnosis} onChange={e => setEnrollForm({...enrollForm, diagnosis: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Psychological Stage</label>
                <select className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 px-4 text-xs font-semibold outline-none" value={enrollForm.current_stage} onChange={e => setEnrollForm({...enrollForm, current_stage: e.target.value})}>
                  <option value="DENIAL">Denial & Shock (Breaking Bad News)</option>
                  <option value="ANGER">Anger / Resistance</option>
                  <option value="BARGAINING">Bargaining Process</option>
                  <option value="DEPRESSION">Depression Stage</option>
                  <option value="ACCEPTANCE">Acceptance & Compliance</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Enrolling Department Location</label>
                <select className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 px-4 text-xs font-semibold outline-none" value={enrollForm.location_department} onChange={e => setEnrollForm({...enrollForm, location_department: e.target.value})}>
                  <option value="CHEMO_SUITE">Chemo Suite</option>
                  <option value="PHARMACY_REFILL">Pharmacy Refill</option>
                  <option value="RADIOLOGY_REF">Radiology Reference</option>
                  <option value="LABORATORY">Laboratory</option>
                  <option value="WARDS">In-Patient Wards</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Initial Clinical Status</label>
                <select name="status" className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 px-4 text-xs font-semibold outline-none" value={enrollForm.status} onChange={e => setEnrollForm({...enrollForm, status: e.target.value})}>
                  <option value="IN_THERAPY">Active Therapy Line</option>
                  <option value="BAD_NEWS_DEBRIEF">Bad News Debriefing</option>
                  <option value="SUPPORT_GROUP">Assigned Support Group</option>
                  <option value="LOST_TO_FOLLOW_UP">Lost to Follow Up (Flagged)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Clinical Therapy Notes</label>
              <textarea rows="3" placeholder="Clinical justification or observation markers..." className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 px-4 text-xs font-medium outline-none resize-none" value={enrollForm.initial_intake_note} onChange={e => setEnrollForm({...enrollForm, initial_intake_note: e.target.value})}></textarea>
            </div>

            <label className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer select-none">
              <input type="checkbox" checked={enrollForm.consent_form_signed} className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" onChange={e => setEnrollForm({...enrollForm, consent_form_signed: e.target.checked})} />
              <div>
                <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5"><FileSignature size={14} className="text-teal-600"/> Administrative Pre-Requisite</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Therapeutic Consent Form has been signed and logged in physical file</p>
              </div>
            </label>

            <button type="submit" disabled={submitLoading} className="w-full bg-slate-900 text-teal-400 py-4 rounded-xl font-semibold text-xs tracking-wider hover:bg-slate-800 active:scale-95 transition-all shadow-md">
              {submitLoading ? "COMMITTING TO REGISTRY..." : "Commit Case File to Database"}
            </button>
          </form>
        </div>

        {/* GUIDELINES BOX */}
        <div className="lg:col-span-5 bg-[#020617] text-white rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <h4 className="text-lg font-bold tracking-tight text-teal-400">Breaking Bad News Protocol</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              When a patient is routed immediately following initial staging verification or malignant diagnosis disclosure, conform with clinical milestones:
            </p>
            <ul className="space-y-4 text-xs text-slate-300 font-medium">
              <li className="flex gap-3 items-start"><CheckCircle2 size={16} className="text-teal-400 shrink-0 mt-0.5"/> Administer emergency psychosocial crisis stabilization post-consult.</li>
              <li className="flex gap-3 items-start"><CheckCircle2 size={16} className="text-teal-400 shrink-0 mt-0.5"/> Confirm and verify administrative signatures are uploaded securely.</li>
              <li className="flex gap-3 items-start"><CheckCircle2 size={16} className="text-teal-400 shrink-0 mt-0.5"/> Route caregiver contacts to parallel tracking lanes for family linkage.</li>
            </ul>
          </div>
          <div className="bg-white/5 border border-white/5 p-5 rounded-xl mt-6">
            <p className="text-[11px] font-bold uppercase text-teal-400 tracking-wider mb-1">Shared Case Visibility</p>
            <p className="text-xs text-slate-400 leading-normal">Once committed, data is accessible dynamically inside medical records, ensuring multi-disciplinary teams stay updated.</p>
          </div>
        </div>
      </div>

      {/* LOWER AREA: REGISTRY TABLE */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h4 className="text-lg font-bold text-slate-900 tracking-tight">Active Evaluation Records</h4>
            <p className="text-xs text-slate-400 mt-1">Live tracking database of psychological profiles inside the institution</p>
          </div>
          {/* FIX: Swapped fetchInventory here to call fetchEnrollments securely */}
          <button onClick={fetchEnrollments} className="p-2.5 bg-slate-50 border hover:bg-slate-100 rounded-xl transition-all" title="Refresh Database">
            <RefreshCw size={14} className={loading ? 'animate-spin text-teal-500' : 'text-slate-500'} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="p-4 px-6 font-semibold text-left">Patient Identity & Diagnosis</th>
                <th className="p-4 font-semibold text-left">MRN Number</th>
                <th className="p-4 font-semibold text-left">Department Loc</th>
                <th className="p-4 font-semibold text-left">Current Stage</th>
                <th className="p-4 font-semibold text-left">Consent Status</th>
                <th className="p-4 text-right px-6 font-semibold">Tracking State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="6" className="p-10 text-center text-slate-400 animate-pulse font-medium">Fetching secure system logs...</td></tr>
              ) : enrollments.length > 0 ? enrollments.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="p-4 px-6 text-left">
                    <p className="font-semibold text-slate-900">{entry.patient_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{entry.diagnosis}</p>
                  </td>
                  <td className="p-4 text-left font-mono text-[11px] text-slate-700">{entry.medical_record_no}</td>
                  <td className="p-4 text-left"><span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{entry.department_display}</span></td>
                  <td className="p-4 text-left font-medium text-slate-800">{entry.stage_display}</td>
                  <td className="p-4 text-left">
                    <span className={`text-[11px] font-medium ${entry.consent_form_signed ? 'text-teal-600' : 'text-amber-600'}`}>
                      {entry.consent_form_signed ? '✓ Signed & Verified' : '⚠ Action Required'}
                    </span>
                  </td>
                  <td className="p-4 text-right px-6">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border ${
                      entry.status === 'LOST_TO_FOLLOW_UP' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-teal-50 text-teal-600 border-teal-100'
                    }`}>
                      {entry.status_display}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="p-16 text-center text-slate-300 font-medium tracking-wide">No patient configurations registered. Onboard a case above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PsychosocialDesk;