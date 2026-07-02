import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '@/api/api';
import { 
    History, Search, Loader2, RefreshCcw, Beaker, MessageSquare, Pill, Download, 
    X, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import SalamaLogo from '@/assets/Salama Cancer Centre logo.png';

const REFERENCE_RANGES = {
    cbc_hb: { min: 12.0, max: 17.5, label: "Hemoglobin", unit: "g/dL" },
    cbc_wbc: { min: 4.0, max: 11.0, label: "Total WBC Count", unit: "x10^9/L" },
    cbc_neut: { min: 1.5, max: 7.5, label: "Absolute Neutrophils", unit: "x10^9/L" },
    cbc_plt: { min: 150, max: 450, label: "Platelets", unit: "x10^9/L" },
    cbc_mcv: { min: 80, max: 100, label: "Mean Corpuscular Vol (MCV)", unit: "fL" },
    
    ue_na: { min: 135, max: 145, label: "Sodium (Na+)", unit: "mmol/L" },
    ue_k: { min: 3.5, max: 5.1, label: "Potassium (K+)", unit: "mmol/L" },
    ue_creatinine: { min: 50, max: 110, label: "Serum Creatinine", unit: "µmol/L" },
    ue_urea: { min: 2.5, max: 7.8, label: "Clinipak Urea", unit: "mmol/L" },
    
    lft_alt: { min: 7, max: 56, label: "Alanine Transaminase (ALT/SGPT)", unit: "U/L" },
    lft_ast: { min: 10, max: 40, label: "AST / SGOT", unit: "U/L" },
    lft_tbil: { min: 3, max: 21, label: "Total Bilirubin (T.BIL)", unit: "µmol/L" },
    lft_dbil: { min: 0, max: 5.1, label: "Direct Bilirubin", unit: "µmol/L" },
    lft_alp: { min: 40, max: 130, label: "Alkaline Phosphatase (ALP)", unit: "U/L" },
    lft_albumin: { min: 35, max: 50, label: "Albumin", unit: "g/L" },
    
    psa_total: { min: 0, max: 4.0, label: "Total PSA", unit: "ng/mL" }
};

const evaluateRange = (name, value) => {
    if (!value || isNaN(value) || !REFERENCE_RANGES[name]) return { status: 'NORMAL', label: 'Within Range' };
    const numVal = parseFloat(value);
    const config = REFERENCE_RANGES[name];

    if (numVal > config.max) return { status: 'HIGH', label: 'High' };
    if (numVal < config.min) return { status: 'LOW', label: 'Low' };
    return { status: 'NORMAL', label: 'Within Range' };
};

const PatientHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatientRecord, setSelectedPatientRecord] = useState(null);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const [labRes, notesRes, prescriptionRes] = await Promise.all([
                API.get('/lab-results/', { params: { status: 'COMPLETED' } }),
                API.get('/clinical-notes/'),
                API.get('/prescriptions/')
            ]);

            const labData = labRes.data.results || labRes.data || [];
            const notesData = notesRes.data.results || notesRes.data || [];
            const prescriptionData = prescriptionRes.data.results || prescriptionRes.data || [];

            const masterRegistry = {};
            const getGroupKey = (item) => `${item.patient}-${item.visit || item.appointment || 'walk-in'}`;

            labData.forEach(item => {
                const key = getGroupKey(item);
                if (!masterRegistry[key]) {
                    masterRegistry[key] = { 
                        patient_id: item.patient,
                        visit_id: item.visit,
                        patient_name: item.patient_name, 
                        date: item.test_date || item.created_at, 
                        collection_date: item.test_date || item.created_at,
                        labs: [], 
                        notes: [], 
                        prescriptions: [] 
                    };
                }
                
                const targetParameters = item.parameters || item;
                const excludedKeys = ['id', 'patient', 'patient_name', 'visit', 'lab_order', 'test_name', 'test_date', 'created_at', 'status', 'technician_notes', 'is_critical', 'parameters'];
                
                Object.entries(targetParameters).forEach(([paramKey, val]) => {
                    if (val !== "" && val !== null && val !== undefined && !excludedKeys.includes(paramKey)) {
                        const rangeConfig = REFERENCE_RANGES[paramKey] || { label: paramKey.replace('_', ' ').toUpperCase(), min: 'N/A', max: 'N/A', unit: '---' };
                        const evaluation = evaluateRange(paramKey, val);

                        masterRegistry[key].labs.push({
                            paramKey,
                            testLabel: rangeConfig.label,
                            result: val,
                            unit: rangeConfig.unit,
                            min: rangeConfig.min,
                            max: rangeConfig.max,
                            evalLabel: evaluation.label,
                            evalStatus: evaluation.status,
                            profileScope: item.test_name || "Diagnostic Profile"
                        });
                    }
                });

                if (item.technician_notes) {
                    masterRegistry[key].notes.push({ author: "Lab Tech Remarks", content: item.technician_notes, role: 'LAB' });
                }
            });
            notesData.forEach(item => {
                const key = getGroupKey(item);
                if (!masterRegistry[key]) {
                    masterRegistry[key] = { patient_id: item.patient, visit_id: item.visit, patient_name: item.patient_name, date: item.created_at, collection_date: item.created_at, labs: [], notes: [], prescriptions: [] };
                }
                masterRegistry[key].notes.push({ author: item.author_name || "Doctor", content: item.content, role: item.note_type || 'CLINICAL' });
            });

            prescriptionData.forEach(item => {
                const key = getGroupKey(item);
                if (!masterRegistry[key]) {
                    masterRegistry[key] = { patient_id: item.patient, visit_id: item.visit, patient_name: item.patient_name, date: item.created_at, collection_date: item.created_at, labs: [], notes: [], prescriptions: [] };
                }
                const meds = item.items?.map(m => `${m.drug_name} (${m.dosage || m.strength || 'As Directed'})`) || [];
                masterRegistry[key].prescriptions.push({ id: item.id, status: item.status || 'Active', summary: meds.join(", ") });
            });

            const sortedHistory = Object.values(masterRegistry).sort((a, b) => new Date(b.date) - new Date(a.date));
            setHistory(sortedHistory);
            if (sortedHistory.length > 0) setSelectedPatientRecord(sortedHistory[0]);
        } catch (err) {
            console.error("Master History sync error", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB', { 
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
    };

    const filteredHistory = useMemo(() => {
        if (!searchTerm.trim()) return history;
        return history.filter(h => h.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [history, searchTerm]);

    const handlePrintDownload = () => {
        window.print();
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 min-h-screen bg-slate-50/50 p-4 font-['Inter'] text-slate-800 text-left relative">
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * { visibility: hidden !important; }
                    #printable-history-sheet, #printable-history-sheet * { visibility: visible !important; }
                    #printable-history-sheet { 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 100% !important; 
                        display: block !important;
                        background: white !important;
                        color: black !important;
                    }
                    .screen-only { display: none !important; }
                }
            `}} />
            <div className="w-full lg:w-96 bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[calc(100vh-4rem)] lg:sticky lg:top-8 screen-only">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <History className="text-blue-600 animate-pulse" size={22} />
                        <div>
                            <h2 className="font-black uppercase text-sm tracking-tight">EMR Patient History</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clinical Audit Ledger</p>
                        </div>
                    </div>
                    <button onClick={fetchHistory} disabled={loading} className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-slate-50 transition-all">
                        <RefreshCcw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
                    </button>
                </div>

                <div className="relative mb-4">
                    <input 
                        type="text" 
                        placeholder="Search patient medical charts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 text-xs text-slate-800 font-semibold pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <Loader2 size={24} className="animate-spin text-blue-600" />
                            <span className="text-[10px] font-black uppercase text-slate-400">Syncing Master Database...</span>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-medium text-xs italic">No clinical files located.</div>
                    ) : (
                        filteredHistory.map((record, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedPatientRecord(record)}
                                className={`w-full text-left p-4 rounded-2xl transition-all border flex flex-col gap-2 ${
                                    selectedPatientRecord?.patient_id === record.patient_id && selectedPatientRecord?.visit_id === record.visit_id
                                    ? 'bg-[#020617] text-white border-[#020617] shadow-xl' 
                                    : 'bg-slate-50/50 border-slate-100 hover:bg-slate-100/70'
                                }`}
                            >
                                <div className="flex justify-between items-start gap-2 w-full">
                                    <span className="font-black uppercase text-xs tracking-tight truncate block flex-1">{record.patient_name || "Anonymous Case"}</span>
                                    <span className="text-[8px] font-mono opacity-60 whitespace-nowrap">{new Date(record.date).toLocaleDateString('en-GB')}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {record.labs.length > 0 && <span className="bg-teal-500/10 text-teal-500 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Labs</span>}
                                    {record.notes.length > 0 && <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Notes</span>}
                                    {record.prescriptions.length > 0 && <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Meds</span>}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            
            <div className="flex-1 space-y-6 screen-only">
                {selectedPatientRecord ? (
                    <div className="bg-white border border-slate-200/60 rounded-[3rem] p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
                        
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
                            <div>
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Centralized Medical Chart File</span>
                                <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">{selectedPatientRecord.patient_name}</h1>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <p className="text-xs font-mono font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/40">
                                        Registry Entry: {formatDate(selectedPatientRecord.date)}
                                    </p>
                                    <p className="text-xs font-mono font-black text-teal-600 uppercase tracking-wider bg-teal-50/60 px-3 py-1.5 rounded-xl border border-teal-100/40">
                                        Collection Timestamp: {formatDate(selectedPatientRecord.collection_date)}
                                    </p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handlePrintDownload}
                                className="flex items-center justify-center gap-2 bg-[#020617] hover:bg-slate-800 text-white font-black uppercase tracking-widest p-4 rounded-2xl text-xs shadow-md transition-all self-start sm:self-auto"
                            >
                                <Download size={14} className="text-teal-400" /> Download & Print Report
                            </button>
                        </div>

                
                        {selectedPatientRecord.labs.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-black text-xs uppercase text-slate-900 tracking-wider flex items-center gap-2">
                                    <Beaker size={14} className="text-teal-600" /> Laboratory Diagnostics Parameters
                                </h3>
                                <div className="border border-slate-200/60 rounded-2xl overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/70 border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                <th className="py-3.5 px-4">Test Profile</th>
                                                <th className="py-3.5 px-4">Parameter Name</th>
                                                <th className="py-3.5 px-4">Result</th>
                                                <th className="py-3.5 px-4">Unit</th>
                                                <th className="py-3.5 px-4">Reference Range</th>
                                                <th className="py-3.5 px-4 text-right">Evaluation</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                            {selectedPatientRecord.labs.map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-50/30">
                                                    <td className="py-3 px-4 text-slate-400 text-[10px] uppercase font-bold">{row.profileScope}</td>
                                                    <td className="py-3 px-4 font-bold text-slate-900">{row.testLabel}</td>
                                                    <td className="py-3 px-4 font-mono font-bold text-slate-900 bg-slate-50/50">{row.result}</td>
                                                    <td className="py-3 px-4 font-mono text-slate-500 lowercase">{row.unit}</td>
                                                    <td className="py-3 px-4 font-mono text-slate-500">{row.min} - {row.max}</td>
                                                    <td className={`py-3 px-4 text-right font-black text-[10px] flex items-center justify-end gap-1 ${
                                                        row.evalStatus === 'HIGH' ? 'text-rose-600' : row.evalStatus === 'LOW' ? 'text-amber-600' : 'text-teal-600'
                                                    }`}>
                                                        {row.evalStatus !== 'NORMAL' && (row.evalStatus === 'HIGH' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
                                                        {row.evalLabel}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {selectedPatientRecord.notes.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-black text-xs uppercase text-slate-900 tracking-wider flex items-center gap-2">
                                    <MessageSquare size={14} className="text-blue-600" /> Practitioner Progress Records
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {selectedPatientRecord.notes.map((n, i) => (
                                        <div key={i} className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100/50">
                                            <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Source entry: {n.author}</p>
                                            <p className="text-xs text-slate-700 font-semibold italic leading-relaxed">"{n.content}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {selectedPatientRecord.prescriptions.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-black text-xs uppercase text-slate-900 tracking-wider flex items-center gap-2">
                                    <Pill size={14} className="text-rose-600" /> Prescribed Formulations
                                </h3>
                                <div className="space-y-2">
                                    {selectedPatientRecord.prescriptions.map((p, i) => (
                                        <div key={i} className="bg-rose-50/20 p-4 rounded-xl border border-rose-100/40 flex justify-between items-center text-xs">
                                            <p className="font-bold text-slate-800">{p.summary}</p>
                                            <span className="text-[9px] font-black bg-rose-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">{p.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full min-h-[60vh] flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-[3rem] p-12 text-center bg-white">
                        <History size={48} className="text-slate-300 mb-3 stroke-[1.5]" />
                        <h2 className="font-black uppercase text-sm tracking-tight text-slate-400">No Profile Record Selected</h2>
                        <p className="text-xs text-slate-400 max-w-xs mt-1">Activate an entry inside the central audit registry timeline sidebar to build full metrics reports.</p>
                    </div>
                )}
            </div>
            {selectedPatientRecord && (
                <div id="printable-history-sheet" className="hidden bg-white text-black text-left font-['Inter'] p-8">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #020617', paddingBottom: '16px', fontFamily: 'sans-serif' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <img src={SalamaLogo} alt="Salama Cancer Centre" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                            <div>
                                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#020617', letterSpacing: '-0.5px' }}>SALAMA CANCER CENTRE</h1>
                                <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '500', color: '#475569' }}>Holistic Cancer and Palliative Care</p>
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>P.O BOX 19619-40123, Kisumu, Kenya</p>
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>Tel: +254 756 364 419 | Email: scanccentre@gmail.com</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#2563eb', letterSpacing: '1px' }}>CLINICAL REGISTRY HISTORICAL REPORT</h2>
                            <p style={{ margin: '5px 0 0 0', fontSize: '11px', fontFamily: 'monospace' }}><strong>Date Compiled:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '24px 0', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', fontFamily: 'sans-serif', fontSize: '12px' }}>
                        <div>
                            <p style={{ margin: '4px 0' }}><strong>Patient Identifier Name:</strong> {selectedPatientRecord.patient_name}</p>
                            <p style={{ margin: '4px 0' }}><strong>Encounter Record Stamp:</strong> {formatDate(selectedPatientRecord.date)}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '4px 0' }}><strong>Date of Results Collection:</strong> {formatDate(selectedPatientRecord.collection_date)}</p>
                        </div>
                    </div>

                    {selectedPatientRecord.labs.length > 0 && (
                        <div style={{ marginTop: '24px' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#020617', borderBottom: '1px solid #020617', paddingBottom: '6px', marginBottom: '12px', textTransform: 'uppercase' }}>LABORATORY RESULT PARAMETERS METRICS</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif', fontSize: '11px', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #94a3b8', textTransform: 'uppercase', fontSize: '9px', color: '#64748b' }}>
                                        <th style={{ padding: '8px 6px' }}>Investigation Group</th>
                                        <th style={{ padding: '8px 6px' }}>Analyte Label Name</th>
                                        <th style={{ padding: '8px 6px' }}>Reported Result</th>
                                        <th style={{ padding: '8px 6px' }}>Unit</th>
                                        <th style={{ padding: '8px 6px' }}>Reference Targets</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Status Flag</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPatientRecord.labs.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px 6px', color: '#64748b', fontSize: '10px' }}>{row.profileScope}</td>
                                            <td style={{ padding: '8px 6px', fontWeight: 'bold', color: '#0f172a' }}>{row.testLabel}</td>
                                            <td style={{ padding: '8px 6px', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '12px' }}>{row.result}</td>
                                            <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#475569' }}>{row.unit}</td>
                                            <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#475569' }}>{row.min} - {row.max}</td>
                                            <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '900', fontSize: '10px', color: row.evalStatus === 'HIGH' ? '#e11d48' : row.evalStatus === 'LOW' ? '#d97706' : '#0d9488' }}>
                                                {row.evalLabel}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {selectedPatientRecord.notes.length > 0 && (
                        <div style={{ marginTop: '24px' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#020617', borderBottom: '1px solid #020617', paddingBottom: '6px', marginBottom: '12px', textTransform: 'uppercase' }}>CLINICAL TIMELINE PROGRESS NARRATIVES</h3>
                            {selectedPatientRecord.notes.map((note, idx) => (
                                <div key={idx} style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px' }}>
                                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#64748b', fontSize: '9px', textTransform: 'uppercase' }}>Source: {note.author} ({note.role})</p>
                                    <p style={{ margin: 0, fontStyle: 'italic', color: '#334155', lineHeight: '1.5' }}>"{note.content}"</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {selectedPatientRecord.prescriptions.length > 0 && (
                        <div style={{ marginTop: '24px' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#020617', borderBottom: '1px solid #020617', paddingBottom: '6px', marginBottom: '12px', textTransform: 'uppercase' }}>PHARMACEUTICAL FORMULATION MEDICATION ORDERS</h3>
                            {selectedPatientRecord.prescriptions.map((presc, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 6px', borderBottom: '1px solid #e2e8f0', fontSize: '11px', fontFamily: 'sans-serif' }}>
                                    <span style={{ fontWeight: '500' }}>{presc.summary}</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', color: '#64748b' }}>[{presc.status}]</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', fontFamily: 'sans-serif', fontSize: '12px' }}>
                        <div>
                            <p style={{ borderTop: '1px solid #020617', width: '220px', paddingTop: '6px', textAlign: 'center', fontWeight: 'bold' }}>Compiled Records Archivist</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ borderTop: '1px solid #020617', width: '220px', paddingTop: '6px', textAlign: 'center', marginLeft: 'auto', fontWeight: 'bold' }}>Salama Verification Stamp</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientHistory;