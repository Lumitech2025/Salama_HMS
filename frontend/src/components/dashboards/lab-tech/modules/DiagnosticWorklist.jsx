import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Search, FlaskConical, Clock, ArrowLeft, Save, ChevronDown, Eye, Send,
  Beaker, Activity, ShieldAlert, Loader2, CheckCircle, Droplets, Microscope, User, ClipboardList, X, Printer
} from 'lucide-react';

const DiagnosticWorklist = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [testChecklist, setTestChecklist] = useState({
    blood_result: false, psa_level: false, urinalysis: false,
    blood_group: false, urea_electrolyte: false, lft_results: false, malaria_parasite: false
  });

  const [results, setResultData] = useState({
    blood_result: '', psa_level: '', urinalysis: '', 
    blood_group: '', cross_match: '', urea_electrolyte: '', 
    lft_results: '', malaria_parasite: '', notes: ''
  });

  const fetchQueue = useCallback(async () => {
    try {
      const response = await API.get('/queue/?current_station=LAB&status=WAITING');
      setQueue(response.data.results || response.data);
    } catch (err) { console.error("Queue fetch error", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleToggleTest = (testKey) => {
    setTestChecklist(prev => ({ ...prev, [testKey]: !prev[testKey] }));
  };

  const handleSelectPatientFromList = (p) => {
    setSelectedPatient(p);
    setTestChecklist({
      blood_result: false, psa_level: false, urinalysis: false,
      blood_group: false, urea_electrolyte: false, lft_results: false, malaria_parasite: false
    });
  };

  // STEP 1: Save results to the database (Commit)
  const handleCommitResults = async () => {
    if (!selectedPatient) return;
    setSubmitting(true);
    
    try {
      const testsToSave = Object.keys(testChecklist)
        .filter(key => testChecklist[key] && results[key])
        .map(key => ({
          patient: selectedPatient.patient,
          appointment: selectedPatient.appointment,
          test_name: key.toUpperCase().replace('_', ' '),
          result_value: String(results[key]),
          notes: results.notes || ""
        }));

      if (testsToSave.length === 0) {
        alert("Please fill in at least one test result.");
        setSubmitting(false);
        return;
      }

      await Promise.all(testsToSave.map(test => API.post('/lab-results/', test)));
      alert("✅ Results saved to patient record. You can now preview or dispatch.");
    } catch (err) {
      alert("❌ Error saving results: " + JSON.stringify(err.response?.data || "Server Error"));
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 2: Dispatch and move queue
  const handleDispatch = async () => {
    if (!window.confirm("Publish these results and return patient to the Consultation Unit?")) return;
    try {
      await API.post(`/queue/${selectedPatient.id}/move_next/`);
      alert("🚀 Results Dispatched. Doctor notified.");
      setSelectedPatient(null);
      fetchQueue();
    } catch (err) {
      alert("Dispatch failed. Check queue status.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* TIER 1: PATIENT SELECTION */}
      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl relative z-30">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4 flex-1 w-full">
            <div className="p-4 bg-teal-500/10 rounded-2xl text-teal-500"><User size={24} /></div>
            <div className="flex-1 relative">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Active Patient Selection</p>
              <select 
                className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm appearance-none outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                onChange={(e) => {
                  const p = queue.find(item => item.id === parseInt(e.target.value));
                  if(p) handleSelectPatientFromList(p);
                }}
                value={selectedPatient?.id || ''}
              >
                <option value="" disabled>Select patient from queue...</option>
                {queue.map(p => (
                  <option key={p.id} value={p.id}>{p.patient_name} — {p.token_id}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 bottom-4 text-slate-500 pointer-events-none" size={18} />
            </div>
          </div>

          {selectedPatient && (
            <div className="flex items-center gap-3 animate-in zoom-in">
                <button onClick={() => setShowPreview(true)} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2">
                    <Eye size={18} className="text-blue-400" />
                    <span className="text-[9px] font-black uppercase">Preview</span>
                </button>
                <button onClick={handleCommitResults} disabled={submitting} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2">
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="text-teal-400" />}
                    <span className="text-[9px] font-black uppercase">Save</span>
                </button>
                <button onClick={handleDispatch} className="bg-teal-500 hover:bg-teal-400 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-teal-500/20">
                    <Send size={16} /> Dispatch
                </button>
            </div>
          )}
        </div>
      </div>

      {selectedPatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                <ClipboardList className="text-teal-500" size={20} />
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Test Requisition</h4>
              </div>
              <div className="space-y-3">
                {Object.keys(testChecklist).map((key) => (
                  <button key={key} onClick={() => handleToggleTest(key)} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${testChecklist[key] ? 'bg-teal-500/10 border-teal-500 text-white' : 'bg-slate-900 border-transparent text-slate-500 hover:border-white/10'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest">{key.replace('_', ' ')}</span>
                    {testChecklist[key] ? <CheckCircle size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-700" />}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-8 bg-white/5 border border-white/10 rounded-[3rem] p-10 relative overflow-hidden">
            <div className="relative z-10 space-y-10">
                <div className="flex items-center gap-4 mb-4">
                    <Microscope className="text-teal-500" size={32} />
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Clinical Results Entry</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {Object.keys(testChecklist).map(key => testChecklist[key] && (
                        <div key={key} className="space-y-2 animate-in zoom-in duration-300">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                                {key.includes('blood') ? <Droplets size={12} className="text-red-500" /> : <Activity size={12} className="text-blue-500" />}
                                {key.replace('_', ' ')}
                            </label>
                            <input 
                                className="w-full bg-slate-900 border-none rounded-2xl p-5 font-black text-teal-400 text-sm focus:ring-2 focus:ring-teal-500" 
                                value={results[key]} 
                                onChange={e => setResultData({...results, [key]: e.target.value})} 
                                placeholder="Enter value..." 
                            />
                        </div>
                    ))}
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-teal-500 uppercase tracking-widest ml-2">Technician's Narrative</label>
                    <textarea rows="4" className="w-full bg-slate-900 border-none rounded-[2rem] p-6 font-bold text-white text-xs focus:ring-2 focus:ring-teal-500" value={results.notes} onChange={e => setResultData({...results, notes: e.target.value})} placeholder="Enter interpretation notes..." />
                </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-20 text-center animate-in fade-in duration-1000">
            <FlaskConical size={64} className="mx-auto text-slate-800 mb-6 opacity-20" />
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Awaiting Patient Selection</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-4">Select a patient from the dropdown above to load their diagnostic request</p>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl">
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Salama <span className="text-teal-400">Lab Report</span></h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Diagnostic Review</p>
                    </div>
                    <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
                </div>
                <div className="p-10 space-y-8 text-slate-900">
                    <div className="flex justify-between border-b pb-6 border-slate-100">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">Patient Name</p>
                            <p className="font-black uppercase">{selectedPatient?.patient_name}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Date</p>
                            <p className="font-black">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest border-b border-teal-50 pb-2">Diagnostic Summary</p>
                        {Object.keys(testChecklist).filter(k => testChecklist[k]).map(key => (
                            <div key={key} className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-xs font-bold text-slate-500 uppercase">{key.replace('_', ' ')}</span>
                                <span className="font-black text-slate-900">{results[key] || 'N/A'}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Observations</p>
                        <p className="text-xs font-medium text-slate-700 italic">"{results.notes || "No additional technical notes provided."}"</p>
                    </div>
                    <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                        <Printer size={16} /> Print Official Copy
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosticWorklist;