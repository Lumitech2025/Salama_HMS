import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    Beaker, TrendingDown, TrendingUp, AlertCircle, 
    FileSpreadsheet, MessageSquare, Loader2, Save, Activity, CheckCircle2, ChevronRight
} from 'lucide-react';

const LaboratoryResults = ({ patient }) => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [doctorNotes, setDoctorNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const fetchLabResults = useCallback(async () => {
        if (!patient) return;
        setLoading(true);
        try {
            // Priority: Fetch results for the specific current visit (encounter)
            const visitId = patient.visit_id || patient.visit;
            const res = await API.get(`/lab-results/?visit=${visitId}`);
            
            // Only show COMPLETED results to the doctor
            const completedResults = (res.data.results || res.data).filter(r => r.status === 'COMPLETED');
            setResults(completedResults);
        } catch (err) {
            console.error("Lab fetch error", err);
        } finally {
            setLoading(false);
        }
    }, [patient]);

    useEffect(() => {
        fetchLabResults();
    }, [fetchLabResults]);

    const handleSaveNotes = async () => {
        if (!doctorNotes || !patient) return;
        setIsSaving(true);
        try {
            const visitId = patient.visit_id || patient.visit;
            await API.post(`/clinical-notes/`, {
                patient: patient.patient || patient.id,
                visit: visitId,
                note_type: 'LAB_REPORT', // Tagged as lab interpretation
                content: doctorNotes
            });
            alert("✅ Diagnostic interpretation saved to patient history.");
        } catch (err) {
            alert("Failed to save notes.");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to render JSON parameters into a readable list
    const renderParameters = (params) => {
        if (!params || Object.keys(params).length === 0) return <span className="text-slate-400 italic">No detailed data</span>;
        
        return (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                {Object.entries(params).map(([key, value]) => (
                    <div key={key} className="flex justify-between border-b border-slate-50 py-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{key.replace('_', ' ')}:</span>
                        <span className="text-[10px] font-black text-slate-700 uppercase">{value}</span>
                    </div>
                ))}
            </div>
        );
    };

    const criticalResult = results.find(r => r.is_critical);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-['Inter'] pb-20">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Diagnostic Review</h2>
                    <p className="text-slate-500 font-medium">
                        Verified results for <span className="text-blue-600 font-bold uppercase">{patient?.patient_name || patient?.name}</span>
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-[#020617] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">
                    <FileSpreadsheet size={16}/> Longitudinal View
                </button>
            </div>

            {/* Critical Alert Banner */}
            {criticalResult && (
                <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex items-center gap-6 animate-pulse">
                    <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg shadow-rose-200">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-rose-900 uppercase text-sm tracking-tight">Critical Biological Alert</h4>
                        <p className="text-rose-700 text-xs font-bold uppercase">Abnormal findings detected in {criticalResult.test_label}. Immediate clinical intervention may be required.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Result Detailed List */}
                <div className="lg:col-span-8 space-y-4">
                    {loading ? (
                        <div className="bg-white rounded-[2.5rem] p-20 flex flex-col items-center justify-center border border-slate-100">
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Verified Results...</p>
                        </div>
                    ) : results.length > 0 ? (
                        results.map((lab) => (
                            <div key={lab.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-900 rounded-xl text-teal-400 shadow-lg">
                                            <Beaker size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 uppercase text-lg tracking-tight">{lab.test_label || lab.test_name}</h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Authorized by Lab Tech</p>
                                        </div>
                                    </div>
                                    <span className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${
                                        lab.is_critical ? 'bg-rose-500 text-white border-rose-400 shadow-lg' : 'bg-teal-50 text-teal-600 border-teal-100'
                                    }`}>
                                        {lab.is_critical ? 'Critical Finding' : 'Normal / Verified'}
                                    </span>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2">
                                        <ChevronRight size={12} className="text-blue-500"/> Parameter Breakdown
                                    </p>
                                    {renderParameters(lab.parameters)}
                                </div>

                                {lab.technician_notes && (
                                    <div className="mt-6 flex items-start gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                        <MessageSquare size={14} className="text-blue-400 mt-1" />
                                        <p className="text-[11px] font-medium text-slate-600 italic">" {lab.technician_notes} "</p>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-32 text-center shadow-sm">
                            <Beaker size={48} className="mx-auto text-slate-200 mb-4 opacity-50" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">No laboratory results have been authorized for this visit yet.</p>
                        </div>
                    )}
                </div>

                {/* Clinical Interpretation Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#020617] rounded-[3rem] p-8 shadow-2xl sticky top-8 border border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <CheckCircle2 className="text-blue-400" size={20} />
                            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Doctor's Interpretation</h4>
                        </div>
                        <textarea 
                            className="w-full bg-slate-900 border border-white/10 rounded-[1.5rem] p-5 text-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            rows="10"
                            placeholder="Interpret these findings for chemotherapy protocol adjustment..."
                            value={doctorNotes}
                            onChange={(e) => setDoctorNote(e.target.value)}
                        />
                        <button 
                            onClick={handleSaveNotes}
                            disabled={isSaving || !doctorNotes}
                            className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-xl"
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