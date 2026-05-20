import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    FlaskConical, Save, ChevronDown, Eye, Send, Beaker, Loader2, Microscope, X, AlertCircle
} from 'lucide-react';

const DiagnosticWorklist = () => {
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [queue, setQueue] = useState([]);
    const [pendingTests, setPendingTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingTests, setFetchingTests] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    
    const [testResults, setTestResults] = useState({});
    const [techNotes, setTechNotes] = useState("");

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const response = await API.get('/queue/', { params: { current_station: 'LAB', status: 'WAITING' }});
            setQueue(response.data.results || response.data || []);
        } catch (err) { 
            console.error("Queue fetch error", err); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);

    const fetchPatientRequisitions = useCallback(async (patient) => {
        if (!patient) return;
        setFetchingTests(true);
        try {
            const visitId = patient.visit_id || patient.visit;
            const res = await API.get(`/lab-results/`, { params: { visit: visitId, status: 'PENDING' }});
            const tests = res.data.results || res.data || [];
            
            // Filter array to ensure we only treat records that match known active physician investigations
            setPendingTests(tests);
            
            const initialResults = {};
            tests.forEach(t => {
                initialResults[t.id] = t.parameters || {};
            });
            setTestResults(initialResults);
        } catch (err) { 
            console.error("Error fetching requisitions", err); 
        } finally { 
            setFetchingTests(false); 
        }
    }, []);

    const handleSelectPatient = (p) => {
        setSelectedPatient(p);
        fetchPatientRequisitions(p);
    };

    const handleParamChange = (testId, fieldName, value) => {
        setTestResults(prev => ({
            ...prev,
            [testId]: { ...prev[testId], [fieldName]: value }
        }));
    };

    const handleCommitResults = async () => {
        if (!selectedPatient) return;
        setSubmitting(true);
        try {
            const promises = pendingTests.map(test => {
                const fieldsForThisTest = testResults[test.id] || {};
                
                return API.patch(`/lab-results/${test.id}/`, {
                    ...fieldsForThisTest,
                    status: 'COMPLETED',
                    technician_notes: techNotes,
                });
            });

            await Promise.all(promises);
            alert("✅ Diagnostic parameters verified and committed down to EMR.");
            fetchPatientRequisitions(selectedPatient);
        } catch (err) {
            alert("❌ Error committing results to server routers.");
        } finally { 
            setSubmitting(false); 
        }
    };

    const handleDispatch = async () => {
        if (!window.confirm("Publish results and return patient to Oncology clinic room?")) return;
        try {
            await API.post(`/queue/${selectedPatient.id}/move_next/`, { target_station: 'DOCTOR' });
            alert("🚀 Patient dispatched back to Doctor workflow queue.");
            setSelectedPatient(null);
            fetchQueue();
        } catch (err) { 
            alert("Dispatch failed."); 
        }
    };

    const renderTestInputs = (test) => {
        const testId = test.id;
        const currentParams = testResults[testId] || {};

        const InputRow = ({ label, name, unit, type = "text", options = null }) => (
            <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex justify-between">
                    <span>{label}</span>
                    {unit && <span className="text-teal-600 font-mono tracking-normal normal-case lowercase">{unit}</span>}
                </label>
                {options ? (
                    <select 
                        value={currentParams[name] || ''} 
                        onChange={(e) => handleParamChange(testId, name, e.target.value)}
                        className="w-full bg-slate-50 text-slate-900 font-bold p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500 transition-all appearance-none text-xs"
                    >
                        <option value="">Select Result</option>
                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                ) : (
                    <input 
                        type={type}
                        step="any"
                        value={currentParams[name] || ''}
                        onChange={(e) => handleParamChange(testId, name, e.target.value)}
                        placeholder={unit ? `Value in ${unit}...` : "Value..."}
                        className="w-full bg-slate-50 text-slate-900 font-mono font-bold p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500 transition-all text-xs"
                    />
                )}
            </div>
        );

        // Standardize normal matching to handle backend variants (e.g., lowercase or full names) safely
        const normalizedTestName = String(test.test_name || test.investigation || '').toUpperCase();

        if (normalizedTestName.includes('CBC') || normalizedTestName.includes('BLOOD COUNT')) {
            return (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <InputRow label="Hemoglobin" name="hb" unit="g/dL" type="number" />
                    <InputRow label="Total WBC Count" name="wbc" unit="x10³/µL" type="number" />
                    <InputRow label="Absolute Neutrophils" name="neut" unit="x10³/µL" type="number" />
                    <InputRow label="Platelets" name="plt" unit="x10³/µL" type="number" />
                    <InputRow label="Mean Corpuscular Vol (MCV)" name="mcv" unit="fL" type="number" />
                </div>
            );
        }
        
        if (normalizedTestName.includes('UE') || normalizedTestName.includes('UREA') || normalizedTestName.includes('ELECTROLYTES')) {
            return (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <InputRow label="Sodium (Na⁺)" name="na" unit="mmol/L" type="number" />
                    <InputRow label="Potassium (K⁺)" name="k" unit="mmol/L" type="number" />
                    <InputRow label="Serum Creatinine" name="creatinine" unit="µmol/L" type="number" />
                    <InputRow label="Urea" name="urea" unit="mmol/L" type="number" />
                </div>
            );
        }

        if (normalizedTestName.includes('LFT') || normalizedTestName.includes('LIVER')) {
            return (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <InputRow label="ALT / SGPT" name="alt" unit="U/L" type="number" />
                    <InputRow label="AST / SGOT" name="ast" unit="U/L" type="number" />
                    <InputRow label="Total Bilirubin (T.BIL)" name="t_bil" unit="µmol/L" type="number" />
                    <InputRow label="Direct Bilirubin (D.BIL)" name="d_bil" unit="µmol/L" type="number" />
                    <InputRow label="Alkaline Phosphatase (ALP)" name="alp" unit="U/L" type="number" />
                    <InputRow label="Albumin" name="albumin" unit="g/L" type="number" />
                </div>
            );
        }

        if (normalizedTestName.includes('PSA') || normalizedTestName.includes('PROSTATE')) {
            return (
                <div className="grid grid-cols-1 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <InputRow label="Total Prostate Specific Antigen" name="total_psa" unit="ng/mL" type="number" />
                </div>
            );
        }

        if (normalizedTestName.includes('URINALYSIS')) {
            return (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <InputRow label="Color" name="color" options={['Straw', 'Yellow', 'Amber', 'Red']} />
                    <InputRow label="Clarity" name="clarity" options={['Clear', 'Cloudy', 'Turbid']} />
                    <InputRow label="Glucose" name="glucose" options={['Negative', 'Trace', '1+', '2+', '3+', '4+']} />
                    <InputRow label="Protein" name="protein" options={['Negative', 'Trace', '1+', '2+', '3+']} />
                    <InputRow label="Nitrites" name="nitrites" options={['Negative', 'Positive']} />
                    <InputRow label="Blood" name="blood" options={['Negative', 'Positive']} />
                </div>
            );
        }

        if (normalizedTestName.includes('CROSS') || normalizedTestName.includes('GROUP')) {
            return (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <InputRow label="Blood Group ABO" name="group" options={['A', 'B', 'AB', 'O']} />
                    <InputRow label="Rhesus Factor" name="rhesus" options={['Positive (+)', 'Negative (-)']} />
                    <InputRow label="Crossmatch Status" name="crossmatch" options={['Compatible', 'Incompatible']} />
                </div>
            );
        }

        if (normalizedTestName.includes('MALARIA') || normalizedTestName.includes('SLIDE')) {
            return (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <InputRow label="MPS Blood Slide Status" name="mps" options={['Not Seen', 'Positive (+)']} />
                    <InputRow label="Parasite Species" name="species" options={['P. falciparum', 'P. vivax', 'N/A']} />
                </div>
            );
        }

        // Generic fallback row so the interface doesn't crash on unmapped tests
        return (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <InputRow label="General Result Value" name="value" />
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20 text-left">
            
            {/* HEADER SELECTION CONTROL TRACK */}
            <div className="bg-[#020617] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative z-30">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex items-center gap-4 flex-1 w-full">
                        <div className="p-4 bg-teal-500/10 rounded-2xl text-teal-500 shadow-inner"><FlaskConical size={24} /></div>
                        <div className="flex-1 relative">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Laboratory Pipeline</p>
                            <select 
                                className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer appearance-none shadow-xl"
                                onChange={(e) => {
                                    const p = queue.find(item => item.id === parseInt(e.target.value));
                                    if(p) handleSelectPatient(p);
                                }}
                                value={selectedPatient?.id || ''}
                            >
                                <option value="" disabled>Select patient identity from queue...</option>
                                {queue.map(p => (
                                    <option key={p.id} value={p.id}>{p.patient_name} — #{p.token_id}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-10 text-slate-500 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {selectedPatient && (
                        <div className="flex items-center gap-3 animate-in zoom-in duration-300">
                            <button onClick={() => setShowPreview(true)} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2">
                                <Eye size={18} className="text-blue-400" /> <span className="text-[9px] font-black uppercase tracking-widest">Preview</span>
                            </button>
                            <button onClick={handleCommitResults} disabled={submitting} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2">
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="text-teal-400" />}
                                <span className="text-[9px] font-black uppercase tracking-widest">Save</span>
                            </button>
                            <button onClick={handleDispatch} className="bg-teal-500 hover:bg-teal-400 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-teal-500/20">
                                <Send size={16} /> Release
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN DATA INPUTS GRID CONTENT */}
            {selectedPatient ? (
                <div className="animate-in slide-in-from-bottom-6 duration-500">
                    <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-xl min-h-[500px]">
                        <div className="flex items-center justify-between mb-12 border-b border-slate-50 pb-8">
                            <div className="flex items-center gap-5">
                                <div className="bg-teal-50 p-4 rounded-[1.5rem] text-teal-600 shadow-sm"><Microscope size={28} /></div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Diagnostic Entry</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">Active Intake: {selectedPatient.patient_name}</p>
                                </div>
                            </div>
                            {fetchingTests && <Loader2 className="animate-spin text-teal-500" size={24} />}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            {pendingTests.length > 0 ? pendingTests.map(test => (
                                <div key={test.id} className="space-y-6 group animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-3 text-blue-600">
                                        <div className="h-8 w-1 bg-blue-500 rounded-full group-hover:h-10 transition-all duration-300" />
                                        <h4 className="text-sm font-black uppercase tracking-[0.15em] italic">
                                            {String(test.test_name || '').toUpperCase().includes('CBC') ? 'Full Blood Count (CBC)' :
                                             String(test.test_name || '').toUpperCase().includes('UE') ? 'Urea, Electrolytes & Creatinine (U&E)' :
                                             String(test.test_name || '').toUpperCase().includes('LFT') ? 'Liver Function Test (LFT)' :
                                             String(test.test_name || '').toUpperCase().includes('PSA') ? 'Prostate Specific Antigen (PSA)' :
                                             String(test.test_name || '').toUpperCase().includes('URINALYSIS') ? 'Routine Urinalysis' :
                                             String(test.test_name || '').toUpperCase().includes('CROSS') ? 'Blood Group & Cross Match' :
                                             String(test.test_name || '').toUpperCase().includes('MALARIA') ? 'Blood Slide for Malaria' : test.test_name}
                                        </h4>
                                    </div>
                                    {renderTestInputs(test)}
                                </div>
                            )) : !fetchingTests && (
                                <div className="col-span-2 py-32 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                     <AlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
                                     <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No pending requisitions for this visit context loop.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-16 pt-10 border-t border-slate-50">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-4">Technical Summary / Remarks</label>
                            <textarea 
                                rows="4" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-6 font-bold text-slate-700 text-sm focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 outline-none transition-all resize-none" 
                                value={techNotes} 
                                onChange={e => setTechNotes(e.target.value)} 
                                placeholder="Append physiological metrics classifications observations for the Doctor review panel..." 
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[4rem] p-40 text-center mx-2 shadow-sm">
                    <Beaker size={80} className="mx-auto text-slate-100 mb-8 animate-pulse" />
                    <h3 className="text-2xl font-black text-slate-300 uppercase italic tracking-tighter">Station Idle</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-4 max-w-xs mx-auto leading-loose">
                        Select a patient from the clinical queue to initialize diagnostic parameters
                    </p>
                </div>
            )}

            {/* PREVIEW MODAL FRAME */}
            {showPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-2xl overflow-hidden shadow-2xl text-left">
                        <div className="bg-[#020617] p-10 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Salama <span className="text-teal-400 font-light not-italic">Lab Verification</span></h2>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Draft Diagnostic Report</p>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-12 space-y-8 overflow-y-auto max-h-[60vh]">
                            {pendingTests.map(test => (
                                <div key={test.id} className="border-b border-slate-100 pb-8 last:border-0">
                                    <p className="text-xs font-black text-blue-600 uppercase mb-4 tracking-widest italic">{test.test_name}</p>
                                    <div className="grid grid-cols-2 gap-y-4 px-6 bg-slate-50 p-6 rounded-3xl">
                                        {Object.entries(testResults[test.id] || {}).map(([k, v]) => (
                                            <React.Fragment key={k}>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{k.replace('_', ' ')}</span>
                                                <span className="text-sm font-black text-slate-900 uppercase text-right italic font-mono">{v || '---'}</span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="bg-teal-50 p-8 rounded-[2rem] italic text-xs text-teal-900 font-bold border border-teal-100 leading-relaxed">
                                " {techNotes || "No technical narrative appended."} "
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiagnosticWorklist;