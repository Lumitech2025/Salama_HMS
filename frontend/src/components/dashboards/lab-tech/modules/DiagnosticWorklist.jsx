import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Search, FlaskConical, Clock, ArrowLeft, Save, ChevronDown, Eye, Send,
  Beaker, Activity, ShieldAlert, Loader2, CheckCircle, Droplets, Microscope, 
  User, ClipboardList, X, Printer, RefreshCcw, AlertCircle, FileText, ChevronRight
} from 'lucide-react';

const DiagnosticWorklist = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [queue, setQueue] = useState([]);
  const [pendingTests, setPendingTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingTests, setFetchingTests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Results state: { testId: { parameterName: value } }
  const [testResults, setTestResults] = useState({});
  const [techNotes, setTechNotes] = useState("");

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API.get('/queue/', { params: { current_station: 'LAB', status: 'WAITING' }});
      setQueue(response.data.results || response.data || []);
    } catch (err) { console.error("Queue fetch error", err); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const fetchPatientRequisitions = useCallback(async (patient) => {
    if (!patient) return;
    setFetchingTests(true);
    try {
      const visitId = patient.visit_id || patient.visit;
      const res = await API.get(`/lab-results/`, { params: { visit: visitId, status: 'PENDING' }});
      const tests = res.data.results || res.data || [];
      setPendingTests(tests);
      
      // Pre-populate state for each test
      const initialResults = {};
      tests.forEach(t => {
        initialResults[t.id] = t.parameters || {};
      });
      setTestResults(initialResults);
    } catch (err) { console.error("Error fetching requisitions", err); } 
    finally { setFetchingTests(false); }
  }, []);

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    fetchPatientRequisitions(p);
  };

  const handleParamChange = (testId, paramName, value) => {
    setTestResults(prev => ({
      ...prev,
      [testId]: { ...prev[testId], [paramName]: value }
    }));
  };

  const handleCommitResults = async () => {
    if (!selectedPatient) return;
    setSubmitting(true);
    try {
      const promises = pendingTests.map(test => {
        return API.patch(`/lab-results/${test.id}/`, {
          parameters: testResults[test.id], // Sending structured JSON
          status: 'COMPLETED',
          technician_notes: techNotes,
          recorded_by: null // Backend handles this via request.user
        });
      });

      await Promise.all(promises);
      alert("✅ All diagnostic parameters verified and committed.");
      fetchPatientRequisitions(selectedPatient);
    } catch (err) {
      alert("❌ Error committing results. Check if all fields are filled correctly.");
    } finally { setSubmitting(false); }
  };

  

  const handleDispatch = async () => {
    if (!window.confirm("Publish results and return patient to Oncology?")) return;
    try {
      await API.post(`/queue/${selectedPatient.id}/move_next/`, { target_station: 'DOCTOR' });
      alert("🚀 Patient dispatched. Results available in Medical History.");
      setSelectedPatient(null);
      fetchQueue();
    } catch (err) { alert("Dispatch failed."); }
  };

  // Helper to render specific inputs based on the test type
  const renderTestInputs = (test) => {
    const testId = test.id;
    const currentParams = testResults[testId] || {};

    const InputRow = ({ label, name, type = "text", options = null }) => (
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>
        {options ? (
          <select 
            value={currentParams[name] || ''} 
            onChange={(e) => handleParamChange(testId, name, e.target.value)}
            className="w-full bg-slate-900 text-teal-400 font-bold p-3 rounded-xl border border-white/5 outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Select Result</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input 
            type={type}
            value={currentParams[name] || ''}
            onChange={(e) => handleParamChange(testId, name, e.target.value)}
            placeholder="Value..."
            className="w-full bg-slate-900 text-teal-400 font-bold p-3 rounded-xl border border-white/5 outline-none focus:ring-1 focus:ring-teal-500"
          />
        )}
      </div>
    );

    switch(test.test_name) {
      case 'URINALYSIS':
        return (
          <div className="grid grid-cols-2 gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
            <InputRow label="Color" name="color" options={['Straw', 'Yellow', 'Amber', 'Red', 'Tea-colored']} />
            <InputRow label="Clarity" name="clarity" options={['Clear', 'Slightly Cloudy', 'Turbid']} />
            <InputRow label="Glucose" name="glucose" options={['Negative', '1+', '2+', '3+', '4+']} />
            <InputRow label="Protein" name="protein" options={['Negative', 'Trace', '1+', '2+', '3+']} />
            <InputRow label="Nitrites" name="nitrites" options={['Negative', 'Positive']} />
            <InputRow label="Blood" name="blood" options={['Negative', 'Trace', 'Positive']} />
          </div>
        );
      case 'CBC':
        return (
          <div className="grid grid-cols-2 gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
            <InputRow label="Hemoglobin (g/dL)" name="hb" type="number" />
            <InputRow label="WBC (x10⁹/L)" name="wbc" type="number" />
            <InputRow label="Platelets (x10⁹/L)" name="plt" type="number" />
            <InputRow label="MCV (fL)" name="mcv" type="number" />
          </div>
        );
      case 'UE':
        return (
          <div className="grid grid-cols-2 gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
            <InputRow label="Sodium (mmol/L)" name="na" type="number" />
            <InputRow label="Potassium (mmol/L)" name="k" type="number" />
            <InputRow label="Creatinine (μmol/L)" name="creatinine" type="number" />
            <InputRow label="Urea (mmol/L)" name="urea" type="number" />
          </div>
        );
      case 'LFT':
        return (
          <div className="grid grid-cols-2 gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
            <InputRow label="ALT (U/L)" name="alt" type="number" />
            <InputRow label="AST (U/L)" name="ast" type="number" />
            <InputRow label="Bilirubin (μmol/L)" name="bilirubin" type="number" />
            <InputRow label="Albumin (g/L)" name="albumin" type="number" />
          </div>
        );
      case 'BG_CROSS':
        return (
            <div className="grid grid-cols-2 gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
              <InputRow label="Blood Group" name="group" options={['A', 'B', 'AB', 'O']} />
              <InputRow label="Rhesus" name="rhesus" options={['Positive', 'Negative']} />
              <InputRow label="Compatibility" name="crossmatch" options={['Compatible', 'Incompatible']} />
            </div>
          );
      case 'PSA':
        return (
            <div className="grid grid-cols-1 gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
              <InputRow label="Total PSA (ng/mL)" name="total_psa" type="number" />
            </div>
        );
      case 'MALARIA_BS':
        return (
            <div className="grid grid-cols-2 gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
              <InputRow label="MPS Status" name="mps" options={['Not Seen', 'Positive (+)', 'Positive (++)', 'Positive (+++)']} />
              <InputRow label="Species" name="species" options={['P. falciparum', 'P. vivax', 'N/A']} />
            </div>
        );
      default:
        return <input className="w-full bg-slate-900 text-teal-400 p-4 rounded-xl" placeholder="Enter general result..." onChange={(e) => handleParamChange(testId, 'value', e.target.value)} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
      
      {/* HEADER SELECTION */}
      <div className="bg-[#020617] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative z-30">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4 flex-1 w-full">
            <div className="p-4 bg-teal-500/10 rounded-2xl text-teal-500"><FlaskConical size={24} /></div>
            <div className="flex-1 relative">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Laboratory Worklist</p>
              <select 
                className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer appearance-none"
                onChange={(e) => {
                  const p = queue.find(item => item.id === parseInt(e.target.value));
                  if(p) handleSelectPatient(p);
                }}
                value={selectedPatient?.id || ''}
              >
                <option value="" disabled>Select patient from incoming queue...</option>
                {queue.map(p => (
                  <option key={p.id} value={p.id}>{p.patient_name} — #{p.token_id}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-10 text-slate-500 pointer-events-none" size={18} />
            </div>
            <button onClick={fetchQueue} className="p-4 hover:bg-white/5 rounded-2xl transition-all self-end mb-1">
                {loading ? <Loader2 size={20} className="animate-spin text-teal-500" /> : <RefreshCcw size={20} className="text-slate-500" />}
            </button>
          </div>

          {selectedPatient && (
            <div className="flex items-center gap-3 animate-in zoom-in">
                <button onClick={() => setShowPreview(true)} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2">
                    <Eye size={18} className="text-blue-400" /> <span className="text-[9px] font-black uppercase">Preview Report</span>
                </button>
                <button onClick={handleCommitResults} disabled={submitting} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2">
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="text-teal-400" />}
                    <span className="text-[9px] font-black uppercase">Commit Results</span>
                </button>
                <button onClick={handleDispatch} className="bg-teal-500 hover:bg-teal-400 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-teal-500/40">
                    <Send size={16} /> Dispatch to Doctor
                </button>
            </div>
          )}
        </div>
      </div>

      {selectedPatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          
          <main className="lg:col-span-12 space-y-8">
            <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-xl">
                <div className="flex items-center gap-4 mb-10 border-b border-slate-50 pb-6">
                    <div className="bg-slate-900 p-2 rounded-xl text-teal-400"><Microscope size={24} /></div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Diagnostic Data Entry</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {pendingTests.length > 0 ? pendingTests.map(test => (
                        <div key={test.id} className="space-y-6">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <ChevronRight size={18} />
                                <h4 className="text-sm font-black uppercase tracking-widest">{test.test_label || test.test_name}</h4>
                            </div>
                            {renderTestInputs(test)}
                        </div>
                    )) : (
                        <div className="col-span-2 py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                             <AlertCircle size={40} className="mx-auto text-slate-300 mb-4" />
                             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No pending investigations found for this encounter.</p>
                        </div>
                    )}
                </div>

                <div className="mt-12 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Technician's Narrative / Interpretation</label>
                    <textarea 
                        rows="3" 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 font-bold text-slate-700 text-xs focus:border-teal-500 outline-none transition-all" 
                        value={techNotes} 
                        onChange={e => setTechNotes(e.target.value)} 
                        placeholder="Provide summary of critical findings..." 
                    />
                </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-32 text-center">
            <Beaker size={64} className="mx-auto text-slate-200 mb-6 animate-pulse" />
            <h3 className="text-xl font-black text-slate-400 uppercase italic tracking-tighter">Awaiting Laboratory Workflow</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-4">Select a patient from the queue hub to initialize diagnostic parameters</p>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] w-full max-w-3xl overflow-hidden shadow-2xl">
                <div className="bg-[#020617] p-10 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Salama <span className="text-teal-400">Lab Summary</span></h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Verification Receipt</p>
                    </div>
                    <button onClick={() => setShowPreview(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white"><X size={24} /></button>
                </div>
                <div className="p-12 space-y-8 overflow-y-auto max-h-[70vh]">
                    {pendingTests.map(test => (
                        <div key={test.id} className="border-b border-slate-100 pb-6">
                            <p className="text-[11px] font-black text-teal-600 uppercase mb-4 tracking-widest">{test.test_label || test.test_name}</p>
                            <div className="grid grid-cols-2 gap-y-2">
                                {Object.entries(testResults[test.id] || {}).map(([k, v]) => (
                                    <React.Fragment key={k}>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{k.replace('_', ' ')}</span>
                                        <span className="text-xs font-black text-slate-900 uppercase text-right">{v || 'N/A'}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="bg-slate-50 p-6 rounded-2xl italic text-xs text-slate-600 border border-slate-100">
                        " {techNotes || "No specific technical notes appended."} "
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosticWorklist;