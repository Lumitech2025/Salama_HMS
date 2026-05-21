import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    Beaker, AlertCircle, FileSpreadsheet, MessageSquare, Loader2, Save, 
    CheckCircle2, ChevronRight, ChevronDown, Calendar, Send, Plus
} from 'lucide-react';

const AVAILABLE_INVESTIGATIONS = [
    { id: 'cbc', name: 'Full Blood Count (CBC)' },
    { id: 'ue', name: 'Urea, Electrolytes & Creatinine (U&E)' },
    { id: 'lft', name: 'Liver Function Test (LFT)' },
    { id: 'psa', name: 'Prostate Specific Antigen (PSA)' },
    { id: 'urinalysis', name: 'Urinalysis (Routine)' },
    { id: 'blood_group', name: 'Blood Group & Cross Match' },
    { id: 'malaria', name: 'Blood Slide (Malaria Parasite)' }
];

const LaboratoryResults = () => {
    const [queue, setQueue] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingQueue, setFetchingQueue] = useState(true);
    const [doctorNotes, setDoctorNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    
    const [selectedTests, setSelectedTests] = useState([]);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

    // 1. Fetch active pipeline queue on mount
    const fetchQueue = useCallback(async () => {
        setFetchingQueue(true);
        try {
            const response = await API.get('/queue', { params: { status: 'WAITING' } });
            const queueData = response.data.results || response.data || [];
            setQueue(queueData);
            
            if (queueData.length > 0 && !selectedPatient) {
                setSelectedPatient(queueData[0]);
            }
        } catch (err) {
            console.error("Queue tracking pipeline fetch error", err);
        } finally {
            setFetchingQueue(false);
        }
    }, [selectedPatient]);

    // 2. Fetch completed lab results matching active scope choice
    const fetchLabResults = useCallback(async (patientObj) => {
        if (!patientObj) return;
        setLoading(true);
        try {
            // Check cross-compatible layout tracking
            const visitId = patientObj.visit || patientObj.visit_id;
            const res = await API.get(`/lab-results/`, { params: { visit: visitId } });
            
            const rawResults = res.data.results || res.data || [];
            // Match completed statuses
            const completedResults = rawResults.filter(r => String(r.status).toUpperCase() === 'COMPLETED');
            setResults(completedResults);
        } catch (err) {
            console.error("Lab results parsing breakdown error", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQueue();
    }, []);

    useEffect(() => {
        if (selectedPatient) {
            fetchLabResults(selectedPatient);
            setDoctorNote("");
            setSelectedTests([]); 
        }
    }, [selectedPatient, fetchLabResults]);

    const handlePatientChange = (e) => {
        const patientId = parseInt(e.target.value);
        const match = queue.find(p => p.id === patientId);
        if (match) setSelectedPatient(match);
    };

    const handleToggleTest = (testName) => {
        setSelectedTests(prev => 
            prev.includes(testName) ? prev.filter(t => t !== testName) : [...prev, testName]
        );
    };

    const handleDispatchLabOrder = async () => {
        if (selectedTests.length === 0) {
            alert("Please pick at least one test profile before compiling data downstream.");
            return;
        }
        setIsSubmittingOrder(true);
        try {
            const visitId = selectedPatient.visit || selectedPatient.visit_id;
            const patientId = selectedPatient.patient || selectedPatient.patient_id || selectedPatient.id;

            const promises = selectedTests.map(testName => {
                return API.post(`/lab-orders/`, {
                    patient: patientId,
                    visit: visitId,
                    test_name: testName,
                    status: 'PENDING',
                    doctor_notes: doctorNotes || "Ordered from Diagnostic Assessment Desk Pipeline"
                });
            });

            await Promise.all(promises);
            alert(`🚀 ${selectedTests.length} Laboratory Requisitions dispatched successfully.`);
            setSelectedTests([]);
            fetchLabResults(selectedPatient); 
        } catch (err) {
            console.error("Dispatch transaction failure", err);
            alert("Failed to submit laboratory test directives. Confirm structural backend constraints.");
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!doctorNotes || !selectedPatient) return;
        setIsSaving(true);
        try {
            const visitId = selectedPatient.visit || selectedPatient.visit_id;
            await API.post(`/clinical-notes/`, {
                patient: selectedPatient.patient || selectedPatient.patient_id || selectedPatient.id,
                visit: visitId,
                note_type: 'LAB_REPORT', 
                content: doctorNotes
            });
            alert("✅ Diagnostic interpretation saved to patient history.");
        } catch (err) {
            alert("Failed to save clinical notes parameter.");
        } finally {
            setIsSaving(false);
        }
    };

    const renderParameters = (params) => {
        if (!params || Object.keys(params).length === 0) return <span className="text-slate-400 italic text-[11px]">No structural param metrics compiled.</span>;
        
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-2">
                {Object.entries(params).map(([key, value]) => (
                    <div key={key} className="flex justify-between border-b border-slate-100 py-2 items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-xs font-mono font-black text-slate-800 uppercase bg-slate-100 px-2.5 py-0.5 rounded-md">{value}</span>
                    </div>
                ))}
            </div>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Recent Assessment";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const criticalResult = results.find(r => r.is_critical);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-['Inter'] pb-20 text-left">
            <div className="bg-[#020617] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative z-30">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex items-center gap-4 flex-1 w-full">
                        <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 shadow-inner"><Beaker size={24} /></div>
                        <div className="flex-1 relative">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Active Medical Scope Switcher</p>
                            {fetchingQueue ? (
                                <div className="w-full bg-slate-900 rounded-2xl p-4 text-slate-400 font-bold text-xs flex items-center gap-3"><Loader2 size={14} className="animate-spin text-blue-500" /> Compiling live case trackers...</div>
                            ) : (
                                <div className="relative">
                                    <select 
                                        className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none shadow-xl pr-12"
                                        onChange={handlePatientChange}
                                        value={selectedPatient?.id || ''}
                                    >
                                        <option value="" disabled>Select patient identity from workflow records...</option>
                                        {queue.map(p => (
                                            <option key={p.id} value={p.id}>{p.patient_name || p.name} — #{p.token_id || p.id}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-4.5 text-slate-500 pointer-events-none" size={18} />
                                </div>
                            )}
                        </div>
                    </div>

                    <button className="flex items-center gap-2 bg-white/5 text-white border border-white/10 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all shadow-xl h-full mt-auto">
                        <FileSpreadsheet size={16} className="text-teal-400"/> Longitudinal View
                    </button>
                </div>
            </div>

            {criticalResult && (
                <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex items-center gap-6 animate-pulse">
                    <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg shadow-rose-200">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-rose-900 uppercase text-sm tracking-tight">Critical Biological Alert</h4>
                        <p className="text-rose-700 text-xs font-bold uppercase">Abnormal findings flagged in system profile tests. Direct immediate clinical intervention parameters.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-6">
                    {loading ? (
                        <div className="bg-white rounded-[2.5rem] p-32 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parsing database parameter tables...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-4">
                            {results.map((lab) => (
                                <div key={lab.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-[#020617] rounded-xl text-teal-400 shadow-md">
                                                <Beaker size={20}/>
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900 uppercase text-lg tracking-tight leading-none mb-2">{lab.test_name || lab.test_label}</h3>
                                                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                                                    <Calendar size={12} className="text-blue-500" />
                                                    <span>{formatDate(lab.created_at || lab.updated_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${
                                            lab.is_critical ? 'bg-rose-500 text-white border-rose-400 shadow-lg' : 'bg-teal-50 text-teal-600 border-teal-100'
                                        }`}>
                                            {lab.is_critical ? 'Critical Outlier' : 'Verified Lab Signature'}
                                        </span>
                                    </div>

                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2">
                                            <ChevronRight size={12} className="text-blue-500"/> Parameter Analysis Breakdown
                                        </p>
                                        {renderParameters(lab.parameters)}
                                    </div>

                                    {lab.technician_notes && (
                                        <div className="mt-6 flex items-start gap-3 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
                                            <MessageSquare size={14} className="text-blue-500 mt-1 flex-shrink-0" />
                                            <div>
                                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider block mb-1">Laboratory Narrative Remarks:</span>
                                                <p className="text-xs font-medium text-slate-700 italic">"{lab.technician_notes}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-xl animate-in fade-in duration-300">
                            <div className="text-center max-w-md mx-auto mb-10">
                                <Beaker size={54} className="mx-auto text-slate-200 mb-4" />
                                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">No Active Results Registered</h3>
                                <p className="text-slate-400 text-xs font-medium mt-2">
                                    No completed diagnostic data was found for this specific encounter. Use the requisition panel below to request a work-up profile.
                                </p>
                            </div>

                            <div className="border-t border-slate-100 pt-8">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 ml-2">
                                    Select Tests to Send down to Lab Pipeline:
                                </label>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {AVAILABLE_INVESTIGATIONS.map((test) => {
                                        const isChecked = selectedTests.includes(test.name);
                                        return (
                                            <button
                                                key={test.id}
                                                type="button"
                                                onClick={() => handleToggleTest(test.name)}
                                                className={`p-4 rounded-2xl border text-left font-black text-xs uppercase tracking-wide transition-all flex items-center justify-between group ${
                                                    isChecked 
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/10' 
                                                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
                                                }`}
                                            >
                                                <span>{test.name}</span>
                                                <div className={`p-1 rounded-md transition-all ${isChecked ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-400 group-hover:text-slate-600'}`}>
                                                    <Plus size={14} className={`transform transition-transform ${isChecked ? 'rotate-45' : ''}`} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleDispatchLabOrder}
                                        disabled={isSubmittingOrder || selectedTests.length === 0}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all disabled:opacity-40 shadow-xl shadow-blue-600/10 w-full sm:w-auto justify-center"
                                    >
                                        {isSubmittingOrder ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                        Submit Requisition to Lab
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4 sticky top-8">
                    <div className="bg-[#020617] rounded-[3.5rem] p-8 shadow-2xl border border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <CheckCircle2 className="text-blue-400" size={20} />
                            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Doctor's Interpretation</h4>
                        </div>
                        
                        <textarea 
                            className="w-full bg-slate-900 border border-white/10 rounded-[2rem] p-6 text-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none min-h-[250px]"
                            rows="12"
                            placeholder={results.length > 0 ? "Interpret these metrics for clinical review/chemotherapy adjustments..." : "Add directives or specific notes to accompany this lab order packet..."}
                            value={doctorNotes}
                            onChange={(e) => setDoctorNote(e.target.value)}
                        />
                        
                        <button 
                            onClick={handleSaveNotes}
                            disabled={isSaving || !doctorNotes || !selectedPatient}
                            className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-30"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                            Authorize Findings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaboratoryResults;