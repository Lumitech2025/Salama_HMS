import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Search, FlaskConical, Clock, ArrowLeft, Save, 
  Beaker, Activity, ShieldAlert, Loader2, CheckCircle 
} from 'lucide-react';

const DiagnosticWorklist = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Comprehensive Lab Form State
  const [results, setResultData] = useState({
    wbc: '', hb: '', platelets: '', neutrophils: '', // Hematology
    creatinine: '', bilirubin: '', psa: '', cea: '', // Markers & Organ Function
    findings: '', impressions: ''
  });

  const fetchQueue = useCallback(async () => {
    try {
      const response = await API.get('/queue/?current_station=LAB&status=WAITING');
      setQueue(response.data.results || response.data);
    } catch (err) {
      console.error("Queue fetch error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    // Reset form for new patient
    setResultData({
      wbc: '', hb: '', platelets: '', neutrophils: '',
      creatinine: '', bilirubin: '', psa: '', cea: '',
      findings: '', impressions: ''
    });
  };

  const handleFinalizeResults = async () => {
    setSubmitting(true);
    try {
      // 1. Save results to the backend
      await API.post('/lab-results/', {
        patient: selectedPatient.patient,
        appointment: selectedPatient.appointment,
        ...results
      });

      // 2. Advance the flow back to the Doctor
      await API.post(`/queue/${selectedPatient.id}/move_next/`);

      alert("Diagnostic results secured. Patient returned to Consultation.");
      setSelectedPatient(null);
      fetchQueue();
    } catch (err) {
      alert("Error saving results. Ensure all critical fields are filled.");
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedPatient) {
    return (
      <div className="animate-in slide-in-from-right duration-500 space-y-6">
        {/* FORM HEADER */}
        <div className="flex items-center justify-between bg-white/5 p-6 rounded-[2rem] border border-white/10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedPatient(null)} className="p-3 bg-slate-900 rounded-xl hover:bg-white/10 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                Entry: <span className="text-teal-400">{selectedPatient.patient_name}</span>
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Token: {selectedPatient.token_id}</p>
            </div>
          </div>
          <button 
            onClick={handleFinalizeResults}
            disabled={submitting}
            className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-teal-900/40"
          >
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Commit Results
          </button>
        </div>

        {/* DIAGNOSTIC FORM GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section 1: Hematology (Critical for Chemo) */}
          <div className="lg:col-span-2 bg-white/5 rounded-[2.5rem] border border-white/10 p-10 space-y-8">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Beaker className="text-teal-500" size={24} />
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Hematology Panel (CBC)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">WBC Count (x10⁹/L)</label>
                <input type="number" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white focus:ring-2 focus:ring-teal-500" value={results.wbc} onChange={e => setResultData({...results, wbc: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Hemoglobin (g/dL)</label>
                <input type="number" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white focus:ring-2 focus:ring-teal-500" value={results.hb} onChange={e => setResultData({...results, hb: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Platelets (x10⁹/L)</label>
                <input type="number" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white focus:ring-2 focus:ring-teal-500" value={results.platelets} onChange={e => setResultData({...results, platelets: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">ANC (Neutrophils)</label>
                <input type="number" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white focus:ring-2 focus:ring-teal-500" value={results.neutrophils} onChange={e => setResultData({...results, neutrophils: e.target.value})} />
              </div>
            </div>

            <div className="flex items-center gap-3 border-b border-white/5 pb-4 pt-4">
              <Activity className="text-blue-500" size={24} />
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Tumor Markers & Chemistry</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">PSA (Prostate Specific)</label>
                <input type="number" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white focus:ring-2 focus:ring-blue-500" value={results.psa} onChange={e => setResultData({...results, psa: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">CEA (Carcinoembryonic)</label>
                <input type="number" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white focus:ring-2 focus:ring-blue-500" value={results.cea} onChange={e => setResultData({...results, cea: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section 2: Impressions & Findings */}
          <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-8 space-y-6">
             <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <FlaskConical className="text-amber-500" size={24} />
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Pathology Notes</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Microscopic Findings</label>
                <textarea rows="4" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-medium text-white focus:ring-2 focus:ring-amber-500" value={results.findings} onChange={e => setResultData({...results, findings: e.target.value})} placeholder="Describe cellular morphology..."></textarea>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Final Lab Impression</label>
                <textarea rows="4" className="w-full bg-slate-900 border-none rounded-2xl p-4 font-medium text-white focus:ring-2 focus:ring-amber-500" value={results.impressions} onChange={e => setResultData({...results, impressions: e.target.value})} placeholder="Summary of results..."></textarea>
              </div>
            </div>

            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-start gap-4">
              <ShieldAlert className="text-red-500 mt-1" size={20} />
              <p className="text-[11px] text-red-200 font-medium italic">
                Note: Findings outside the reference range will trigger an automated critical alert to the referring Oncologist.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 backdrop-blur-md animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Diagnostic <span className="text-teal-500">Worklist</span></h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Select a patient to begin sample analysis</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Filter by name or token..." 
            className="w-full bg-slate-950 border-none rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none" 
            onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
              <th className="pb-6 px-6">Identity</th>
              <th className="pb-6 px-6">Token ID</th>
              <th className="pb-6 px-6">Status</th>
              <th className="pb-6 px-6">Wait Time</th>
              <th className="pb-6 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan="5" className="py-20 text-center"><Loader2 className="animate-spin text-teal-500 mx-auto" /></td></tr>
            ) : queue.filter(q => q.patient_name.toLowerCase().includes(searchTerm)).slice(0, 10).map((p) => (
              <tr key={p.id} className="group hover:bg-white/[0.02] transition-all">
                <td className="py-6 px-6">
                  <p className="font-black text-white text-sm uppercase">{p.patient_name}</p>
                  <p className="text-[10px] font-bold text-slate-500">ID: #{p.patient_id_no}</p>
                </td>
                <td className="py-6 px-6 font-black text-teal-500 text-sm italic">{p.token_id}</td>
                <td className="py-6 px-6">
                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Waiting</span>
                </td>
                <td className="py-6 px-6">
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <Clock size={14} /> {p.wait_time}m
                  </div>
                </td>
                <td className="py-6 px-6 text-right">
                  <button 
                    onClick={() => handleSelectPatient(p)}
                    className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ml-auto"
                  >
                    Process Sample <FlaskConical size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && queue.length === 0 && (
          <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs italic">
            Diagnostic queue is currently empty.
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticWorklist;