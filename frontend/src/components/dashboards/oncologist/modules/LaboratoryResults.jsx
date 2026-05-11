import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Beaker, TrendingDown, TrendingUp, AlertCircle, 
  FileSpreadsheet, MessageSquare, Loader2, Save, Activity 
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
            // Mapping ID: Handling both visit objects and direct patient objects
            const patientId = patient.patient || patient.id;
            const res = await API.get(`/lab-results/?patient=${patientId}`);
            setResults(res.data.results || res.data);
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
        setIsSaving(true);
        try {
            // Assuming endpoint to update clinical notes on the lab record or patient visit
            await API.post(`/lab-results/add_notes/`, {
                patient_id: patient.patient || patient.id,
                notes: doctorNotes
            });
            alert("Clinical observations synced to patient record.");
        } catch (err) {
            alert("Failed to save notes.");
        } finally {
            setIsSaving(false);
        }
    };

    // Logic to detect if a critical value exists for the alert banner
    const criticalResult = results.find(r => r.status?.toLowerCase() === 'critical');

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-['Inter'] pb-20">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Lab & Diagnostics</h2>
                    <p className="text-slate-500 font-medium">
                        Showing results for <span className="text-teal-600 font-bold">{patient?.patient_name || patient?.name}</span>
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">
                    <FileSpreadsheet size={16}/> Export Longitudinal Report
                </button>
            </div>

            {/* Dynamic Critical Alert Banner */}
            {criticalResult && (
                <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex items-center gap-6 animate-pulse">
                    <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg shadow-rose-200">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-rose-900 uppercase text-sm tracking-tight">Clinical Alert: {criticalResult.parameter}</h4>
                        <p className="text-rose-700 text-xs font-bold">Result: {criticalResult.value} {criticalResult.unit}. Requires immediate review before protocol initialization.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Result Table */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Parameter</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Result</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trend</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-teal-500" /></td></tr>
                                ) : results.length > 0 ? results.map((lab, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:text-teal-500 transition-colors"><Beaker size={14}/></div>
                                                <span className="font-black text-slate-900">{lab.parameter}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xl font-black text-slate-900">{lab.value}</span>
                                            <span className="ml-1 text-[10px] font-bold text-slate-400 uppercase">{lab.unit}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                {lab.trend === 'down' ? <TrendingDown size={16} className="text-rose-500"/> : <TrendingUp size={16} className="text-teal-500"/>}
                                                <span className="text-[10px] font-black text-slate-400">Prev: {lab.previous_value || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                lab.status?.toLowerCase() === 'critical' ? 'bg-rose-500 text-white shadow-lg' : 
                                                lab.status?.toLowerCase() === 'low' ? 'bg-amber-100 text-amber-700' : 'bg-teal-50 text-teal-600'
                                            }`}>
                                                {lab.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="py-20 text-center text-slate-400 italic">No lab records found for this patient session.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Clinical Notes Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#020617] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <MessageSquare className="text-teal-500" size={20} />
                            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Clinical Findings</h4>
                        </div>
                        <textarea 
                            className="w-full bg-slate-900 border border-white/10 rounded-[1.5rem] p-5 text-slate-200 text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                            rows="8"
                            placeholder="Interpret results for chemotherapy clearance..."
                            value={doctorNotes}
                            onChange={(e) => setDoctorNote(e.target.value)}
                        />
                        <button 
                            onClick={handleSaveNotes}
                            disabled={isSaving || !doctorNotes}
                            className="w-full mt-6 bg-teal-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-400 transition-all flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                            Save Observations
                        </button>
                        <Activity size={150} className="absolute -right-10 -bottom-10 text-white/[0.02] pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaboratoryResults;