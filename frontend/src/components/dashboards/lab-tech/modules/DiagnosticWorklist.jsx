import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '@/api/api';
import { 
    FlaskConical, Save, ChevronDown, Eye, Send, Beaker, Loader2, Microscope, X, ArrowUpRight, ArrowDownRight, ClipboardList, RefreshCw, Search
} from 'lucide-react';

const REFERENCE_RANGES = {
    cbc_hb: { min: 12.0, max: 17.5, label: "Hemoglobin" },
    cbc_wbc: { min: 4.0, max: 11.0, label: "Total WBC Count" },
    cbc_neut: { min: 1.5, max: 7.5, label: "Absolute Neutrophils" },
    cbc_plt: { min: 150, max: 450, label: "Platelets" },
    cbc_mcv: { min: 80, max: 100, label: "Mean Corpuscular Vol (MCV)" },
    
    ue_na: { min: 135, max: 145, label: "Sodium (Na+)" },
    ue_k: { min: 3.5, max: 5.1, label: "Potassium (K+)" },
    ue_creatinine: { min: 50, max: 110, label: "Serum Creatinine" },
    ue_urea: { min: 2.5, max: 7.8, label: "Urea" },
    
    lft_alt: { min: 7, max: 56, label: "Alanine Transaminase (ALT/SGPT)" },
    lft_ast: { min: 10, max: 40, label: "AST / SGOT" },
    lft_tbil: { min: 3, max: 21, label: "Total Bilirubin (T.BIL)" },
    lft_dbil: { min: 0, max: 5.1, label: "Direct Bilirubin" },
    lft_alp: { min: 40, max: 130, label: "Alkaline Phosphatase (ALP)" },
    lft_albumin: { min: 35, max: 50, label: "Albumin" },
    
    psa_total: { min: 0, max: 4.0, label: "Total PSA" }
};

const ALL_AVAILABLE_TESTS = [
    "Full Blood Count (CBC)",
    "Urea, Electrolytes & Creatinine (U&E)",
    "Liver Function Test (LFT)",
    "Prostate Specific Antigen (PSA)",
    "Urinalysis (Routine)",
    "Blood Group & Cross Match",
    "Blood Slide (Malaria Parasite)"
];

// Mapping frontend descriptive titles to backend exact Model field TEST_CHOICES
const FRONTEND_TO_BACKEND_TEST_NAMES = {
    "Full Blood Count (CBC)": "CBC",
    "Prostate Specific Antigen (PSA)": "PSA",
    "Urea, Electrolytes & Creatinine (U&E)": "UE",
    "Liver Function Test (LFT)": "LFT",
    "Urinalysis (Routine)": "URINALYSIS",
    "Blood Group & Cross Match": "BG_CROSS",
    "Blood Slide (Malaria Parasite)": "MALARIA_BS"
};

// Mapping UI parameter names to exact backend option mappings if necessary
const PARAM_VALUE_MAPPINGS = {
    "Positive (+)": "Positive",
    "Negative (-)": "Negative",
    "Not Seen (Negative)": "Not Seen",
    "Seen (+)": "Positive",
    "Seen (++)": "Positive",
    "Seen (+++)": "Positive",
    "+1": "1+",
    "+2": "2+",
    "+3": "3+",
    "+4": "4+"
};

// Helper to evaluate range safely
const evaluateRange = (name, value) => {
    if (!value || isNaN(value) || !REFERENCE_RANGES[name]) return { status: 'NORMAL', note: '' };
    const numVal = parseFloat(value);
    const config = REFERENCE_RANGES[name];

    if (numVal > config.max) {
        return { status: 'HIGH', note: `[CRITICAL HIGH] ${config.label}: ${numVal} exceeds maximum threshold of ${config.max}. ` };
    }
    if (numVal < config.min) {
        return { status: 'LOW', note: `[CRITICAL LOW] ${config.label}: ${numVal} drops below minimum threshold of ${config.min}. ` };
    }
    return { status: 'NORMAL', note: '' };
};

// Extracted InputRow to keep it a stable component instance across re-renders
const InputRow = ({ label, name, unit, type = "text", options = null, value, onChange }) => {
    const evalResult = evaluateRange(name, value);
    
    return (
        <div className="flex flex-col gap-1 text-left relative">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex justify-between items-center">
                <span>{label}</span>
                {unit && <span className="text-teal-600 font-mono tracking-normal normal-case lowercase">{unit}</span>}
            </label>
            
            <div className="relative flex items-center">
                {options ? (
                    <div className="relative w-full">
                        <select 
                            value={value || ''} 
                            onChange={(e) => onChange(name, e.target.value)}
                            className="w-full bg-slate-50 text-slate-900 font-bold p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500 transition-all appearance-none text-xs pr-10"
                        >
                            <option value="">Select Result</option>
                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <ChevronDown size={14} />
                        </div>
                    </div>
                ) : (
                    <input 
                        type={type}
                        value={value || ''} 
                        onChange={(e) => onChange(name, e.target.value)}
                        className={`w-full bg-slate-50 text-slate-900 font-mono font-bold p-3 rounded-xl border outline-none focus:ring-2 transition-all text-xs ${
                            evalResult.status === 'HIGH' ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30' :
                            evalResult.status === 'LOW' ? 'border-amber-300 focus:ring-amber-500 bg-amber-50/30' :
                            'border-slate-200 focus:ring-teal-500'
                        }`}
                        placeholder="0.0"
                    />
                )}
                {evalResult.status !== 'NORMAL' && !options && (
                    <div className={`absolute right-3 p-1 rounded-md ${evalResult.status === 'HIGH' ? 'text-rose-500' : 'text-amber-500'}`}>
                        {evalResult.status === 'HIGH' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                )}
            </div>
        </div>
    );
};

const DiagnosticWorklist = () => {
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [queue, setQueue] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeOrder, setActiveOrder] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [fetchingTests, setFetchingTests] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    
    const [testResults, setTestResults] = useState({});
    const [techNotes, setTechNotes] = useState("");

    const initializeBlankResults = () => {
        const initialResults = {};
        ALL_AVAILABLE_TESTS.forEach(testName => {
            initialResults[testName] = {};
        });
        setTestResults(initialResults);
        setTechNotes("");
    };

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const response = await API.get('/queue', { params: { current_station: 'LAB', status: 'WAITING' }});
            setQueue(response.data.results || response.data || []);
        } catch (err) { 
            console.error("Queue fetch error", err); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => { 
        fetchQueue(); 
        initializeBlankResults();
    }, [fetchQueue]);

    // Live search filters against client state metrics
    const filteredQueue = useMemo(() => {
        if (!searchQuery.trim()) return queue;
        const normQuery = searchQuery.toLowerCase();
        return queue.filter(p => {
            const name = (p.patient_name || p.name || "").toLowerCase();
            const id = String(p.id || "");
            const token = (p.token_id || "").toLowerCase();
            const record = (p.health_record_number || "").toLowerCase();
            return name.includes(normQuery) || id.includes(normQuery) || token.includes(normQuery) || record.includes(normQuery);
        });
    }, [queue, searchQuery]);

    const fetchPatientRequisitions = useCallback(async (patient) => {
        if (!patient) return;
        setFetchingTests(true);
        try {
            const visitId = patient.visit || patient.visit_id;
            const res = await API.get(`/lab-orders/`, { params: { visit: visitId } });
            const orders = res.data.results || res.data || [];
            
            const activeLabOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING' || o.status === 'WAITING');
            
            if (activeLabOrders.length > 0) {
                setActiveOrder(activeLabOrders[0]);
            } else {
                setActiveOrder(null);
            }
        } catch (err) { 
            console.error("Error fetching requisitions from lab-orders", err); 
        } finally { 
            setFetchingTests(false); 
        }
    }, []);

    const handleSelectPatient = (p) => {
        setSelectedPatient(p);
        initializeBlankResults();
        fetchPatientRequisitions(p);
    };

    const handleParamChange = (testName, fieldName, value) => {
        setTestResults(prev => ({
            ...prev,
            [testName]: { ...prev[testName], [fieldName]: value }
        }));
    };

    // Computes dynamically which test panel to show based on the patient registration context
    const explicitDisplayedTests = useMemo(() => {
        const targets = activeOrder?.requested_tests || selectedPatient?.requested_tests || [];
        if (targets.length === 0) return ALL_AVAILABLE_TESTS;
        
        // Dynamic lookup capturing matching configurations safely
        return ALL_AVAILABLE_TESTS.filter(availableTest => 
            targets.some(requested => requested.toLowerCase().trim() === availableTest.toLowerCase().trim())
        );
    }, [activeOrder, selectedPatient]);

    const handleCommitResults = async () => {
        if (!selectedPatient) return;
        setSubmitting(true);
        try {
            const visitId = selectedPatient.visit || selectedPatient.visit_id;
            const patientId = selectedPatient.patient || selectedPatient.patient_id || selectedPatient.id;

            // Only consider panels where parameters are actively filled
            const activeSubmissions = explicitDisplayedTests.filter(testName => {
                const parameters = testResults[testName] || {};
                return Object.values(parameters).some(val => val !== "" && val !== undefined && val !== null);
            });

            if (activeSubmissions.length === 0) {
                alert("⚠ Please fill in diagnostic results before attempting to save parameters.");
                setSubmitting(false);
                return;
            }

            const promises = activeSubmissions.map(testName => {
                const coreParameters = testResults[testName] || {};
                const backendTestName = FRONTEND_TO_BACKEND_TEST_NAMES[testName] || testName;

                let localizedCriticalNotes = "";
                let hasCriticalOutlier = false;

                // Build a flattened wide-column dataset mapping directly to specific model field attributes
                const baseFields = {
                    patient: patientId,
                    visit: visitId,
                    lab_order: activeOrder?.id || null,
                    test_name: backendTestName, 
                    status: 'COMPLETED',
                    technician_notes: techNotes
                };

                // Extract fields out into flat key/value layout matching Model targets
                Object.entries(coreParameters).forEach(([key, val]) => {
                    if (val !== "" && val !== null && val !== undefined) {
                        // Apply sanitization map for Choice inputs if matching
                        const databaseSafeValue = PARAM_VALUE_MAPPINGS[val] || val;
                        baseFields[key] = databaseSafeValue;

                        const evaluation = evaluateRange(key, val);
                        if (evaluation.status !== 'NORMAL') {
                            localizedCriticalNotes += evaluation.note;
                            hasCriticalOutlier = true;
                        }
                    }
                });

                if (localizedCriticalNotes) {
                    baseFields.technician_notes = `${localizedCriticalNotes.trim()}\n\nTech Remarks: ${techNotes}`.trim();
                }
                baseFields.is_critical = hasCriticalOutlier;

                return API.post(`/lab-results/`, baseFields);
            });

            await Promise.all(promises);

            if (activeOrder?.id) {
                await API.patch(`/lab-orders/${activeOrder.id}/`, { status: 'COMPLETED' });
            }

            alert("✅ Diagnostic parameters verified and committed down to EMR.");
            fetchPatientRequisitions(selectedPatient);
        } catch (err) {
            console.error(err);
            alert("❌ Error committing results to server routers. Check choice configurations.");
        } finally { 
            setSubmitting(false); 
        }
    };

    const handleDispatch = async () => {
        if (!selectedPatient) return;
        if (!window.confirm("Publish results and return patient to Clinic room?")) return;
        try {
            await API.post(`/queue/${selectedPatient.id}/move_next/`, { target_station: 'DOCTOR' });
            alert("🚀 Patient dispatched back to Doctor workflow queue.");
            setSelectedPatient(null);
            setActiveOrder(null);
            fetchQueue();
        } catch (err) { 
            alert("Dispatch failed. Confirm endpoint architecture specifications."); 
        }
    };

    const renderTestInputs = (testName) => {
        const currentParams = testResults[testName] || {};
        const changeMapper = (fieldName, val) => handleParamChange(testName, fieldName, val);

        switch(testName) {
            case "Full Blood Count (CBC)":
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <InputRow label="Hemoglobin (Hb)" name="cbc_hb" unit="g/dL" type="number" value={currentParams["cbc_hb"]} onChange={changeMapper} />
                        <InputRow label="Total WBC" name="cbc_wbc" unit="x10^9/L" type="number" value={currentParams["cbc_wbc"]} onChange={changeMapper} />
                        <InputRow label="Absolute Neutrophils" name="cbc_neut" unit="x10^9/L" type="number" value={currentParams["cbc_neut"]} onChange={changeMapper} />
                        <InputRow label="Platelets" name="cbc_plt" unit="x10^9/L" type="number" value={currentParams["cbc_plt"]} onChange={changeMapper} />
                        <InputRow label="MCV" name="cbc_mcv" unit="fL" type="number" value={currentParams["cbc_mcv"]} onChange={changeMapper} />
                    </div>
                );
            case "Urea, Electrolytes & Creatinine (U&E)":
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputRow label="Sodium (Na+)" name="ue_na" unit="mmol/L" type="number" value={currentParams["ue_na"]} onChange={changeMapper} />
                        <InputRow label="Potassium (K+)" name="ue_k" unit="mmol/L" type="number" value={currentParams["ue_k"]} onChange={changeMapper} />
                        <InputRow label="Serum Creatinine" name="ue_creatinine" unit="µmol/L" type="number" value={currentParams["ue_creatinine"]} onChange={changeMapper} />
                        <InputRow label="Urea" name="ue_urea" unit="mmol/L" type="number" value={currentParams["ue_urea"]} onChange={changeMapper} />
                    </div>
                );
            case "Liver Function Test (LFT)":
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <InputRow label="ALT / SGPT" name="lft_alt" unit="U/L" type="number" value={currentParams["lft_alt"]} onChange={changeMapper} />
                        <InputRow label="AST / SGOT" name="lft_ast" unit="U/L" type="number" value={currentParams["lft_ast"]} onChange={changeMapper} />
                        <InputRow label="Total Bilirubin" name="lft_tbil" unit="µmol/L" type="number" value={currentParams["lft_tbil"]} onChange={changeMapper} />
                        <InputRow label="Direct Bilirubin" name="lft_dbil" unit="µmol/L" type="number" value={currentParams["lft_dbil"]} onChange={changeMapper} />
                        <InputRow label="Alkaline Phosphatase (ALP)" name="lft_alp" unit="U/L" type="number" value={currentParams["lft_alp"]} onChange={changeMapper} />
                        <InputRow label="Albumin" name="lft_albumin" unit="g/L" type="number" value={currentParams["lft_albumin"]} onChange={changeMapper} />
                    </div>
                );
            case "Prostate Specific Antigen (PSA)":
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputRow label="Total PSA" name="psa_total" unit="ng/mL" type="number" value={currentParams["psa_total"]} onChange={changeMapper} />
                    </div>
                );
            case "Urinalysis (Routine)":
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputRow label="Color" name="urine_color" options={["Straw", "Yellow", "Amber", "Red"]} value={currentParams["urine_color"]} onChange={changeMapper} />
                        <InputRow label="Clarity" name="urine_clarity" options={["Clear", "Cloudy", "Turbid"]} value={currentParams["urine_clarity"]} onChange={changeMapper} />
                        <InputRow label="Glucose" name="urine_glucose" options={["Negative", "Trace", "+1", "+2", "+3", "+4"]} value={currentParams["urine_glucose"]} onChange={changeMapper} />
                        <InputRow label="Protein" name="urine_protein" options={["Negative", "Trace", "+1", "+2", "+3"]} value={currentParams["urine_protein"]} onChange={changeMapper} />
                        <InputRow label="Nitrites" name="urine_nitrites" options={["Negative", "Positive"]} value={currentParams["urine_nitrites"]} onChange={changeMapper} />
                        <InputRow label="Blood" name="urine_blood" options={["Negative", "Positive"]} value={currentParams["urine_blood"]} onChange={changeMapper} />
                    </div>
                );
            case "Blood Group & Cross Match":
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputRow label="ABO Blood Group" name="bg_abo" options={["A", "B", "AB", "O"]} value={currentParams["bg_abo"]} onChange={changeMapper} />
                        <InputRow label="Rhesus Factor" name="bg_rhesus" options={["Positive (+)", "Negative (-)"]} value={currentParams["bg_rhesus"]} onChange={changeMapper} />
                        <InputRow label="Compatibility" name="bg_compatibility" options={["Compatible", "Incompatible"]} value={currentParams["bg_compatibility"]} onChange={changeMapper} />
                    </div>
                );
            case "Blood Slide (Malaria Parasite)":
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputRow label="MPS Status" name="malaria_mps" options={["Not Seen (Negative)", "Seen (+)", "Seen (++)", "Seen (+++)"]} value={currentParams["malaria_mps"]} onChange={changeMapper} />
                        <InputRow label="Parasite Species" name="malaria_species" options={["P. falciparum", "P. vivax", "N/A"]} value={currentParams["malaria_species"]} onChange={changeMapper} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 min-h-screen bg-slate-50/50 p-4 font-['Inter'] text-slate-800 text-left">
            {/* Sidebar Control Interface */}
            <div className="w-full lg:w-80 bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[calc(100vh-4rem)] lg:sticky lg:top-8">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <Microscope className="text-teal-600 animate-pulse" size={22} />
                        <div>
                            <h2 className="font-black uppercase text-sm tracking-tight">Lab Worklist</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Queue Tracking Engine</p>
                        </div>
                    </div>
                    <button 
                        onClick={fetchQueue}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-teal-600 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                        title="Refresh Pipeline Queue"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin text-teal-600" : ""} />
                    </button>
                </div>

                {/* Queue Filter Input */}
                <div className="relative mb-4">
                    <input 
                        type="text" 
                        placeholder="Search patient, token, record..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 text-xs text-slate-800 font-semibold pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Container Stack Render */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <Loader2 size={24} className="animate-spin text-teal-600" />
                            <span className="text-[10px] font-black uppercase text-slate-400">Loading pipeline...</span>
                        </div>
                    ) : filteredQueue.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-medium text-xs italic">
                            {queue.length === 0 ? "No waiting tasks." : "No matching targets found."}
                        </div>
                    ) : (
                        filteredQueue.map(patient => (
                            <button
                                key={patient.id}
                                onClick={() => handleSelectPatient(patient)}
                                className={`w-full text-left p-4 rounded-2xl transition-all border flex flex-col gap-1.5 ${
                                    selectedPatient?.id === patient.id 
                                    ? 'bg-[#020617] text-white border-[#020617] shadow-xl' 
                                    : 'bg-slate-50/50 border-slate-100 hover:bg-slate-100/70'
                                }`}
                            >
                                <span className="font-black uppercase text-xs tracking-tight truncate block">
                                    {patient.patient_name || patient.name}
                                </span>
                                <div className="flex justify-between items-center w-full">
                                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${selectedPatient?.id === patient.id ? 'bg-white/10 text-teal-400' : 'bg-slate-200/60 text-slate-500'}`}>
                                        #{patient.token_id || patient.id}
                                    </span>
                                    <span className={`text-[9px] uppercase tracking-wider font-bold ${
                                        (patient.urgency || "ROUTINE") === "STAT" || (patient.urgency || "ROUTINE") === "EMERGENCY" 
                                        ? "text-rose-500 font-black animate-pulse" 
                                        : "opacity-60"
                                    }`}>
                                        {patient.urgency || "ROUTINE"}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Diagnostics Panels */}
            <div className="flex-1 space-y-6">
                {selectedPatient ? (
                    <div className="bg-white border border-slate-200/60 rounded-[3rem] p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
                        
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
                            <div className="space-y-3 max-w-xl">
                                <div>
                                    <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest block mb-1">Active Diagnostic Profile</span>
                                    <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">{selectedPatient.patient_name || selectedPatient.name}</h1>
                                    <p className="text-xs font-mono font-black text-slate-500 uppercase tracking-wider mt-1 bg-slate-100 px-3 py-1.5 rounded-xl inline-block border border-slate-200/40">
                                        HRN: {selectedPatient.health_record_number || "N/A"}
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                                        <ClipboardList size={12} className="text-slate-400" />
                                        <span>Requested Investigations:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeOrder?.requested_tests?.length > 0 ? (
                                            activeOrder.requested_tests.map((test, index) => (
                                                <span key={index} className="bg-teal-50 text-teal-700 border border-teal-200/60 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide">
                                                    {test}
                                                </span>
                                            ))
                                        ) : selectedPatient.requested_tests?.length > 0 ? (
                                            selectedPatient.requested_tests.map((test, index) => (
                                                <span key={index} className="bg-teal-50 text-teal-700 border border-teal-200/60 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide">
                                                    {test}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-slate-400 text-xs italic font-semibold">
                                                No specific testing subsets attached. Defaulting to all matrices.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleDispatch}
                                className="bg-[#020617] hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl flex items-center gap-2 shadow-lg transition-all self-start sm:mt-1 whitespace-nowrap"
                            >
                                <Send size={14} className="text-teal-400" /> Dispatch back to Room
                            </button>
                        </div>

                        {fetchingTests ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3">
                                <Loader2 size={32} className="animate-spin text-teal-600" />
                                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Syncing requisitions...</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {explicitDisplayedTests.map(testName => (
                                    <div key={testName} className="border border-slate-100 rounded-[2rem] p-6 bg-slate-50/20">
                                        <h3 className="font-black text-xs uppercase text-slate-900 tracking-wider mb-4 flex items-center gap-2">
                                            <FlaskConical size={14} className="text-teal-600" /> {testName}
                                        </h3>
                                        {renderTestInputs(testName)}
                                    </div>
                                ))}

                                <div className="space-y-3 pt-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technician Narrative Remarks</label>
                                    <textarea 
                                        value={techNotes}
                                        onChange={(e) => setTechNotes(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none resize-none min-h-[100px]"
                                        placeholder="Add descriptive observations, sample tracking alerts, or verification notes..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button 
                                        onClick={() => setShowPreview(true)}
                                        className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl flex items-center gap-2 transition-all"
                                    >
                                        <Eye size={14} /> Preview Schema
                                    </button>
                                    <button 
                                        onClick={handleCommitResults}
                                        disabled={submitting}
                                        className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded-2xl flex items-center gap-2 shadow-lg shadow-teal-600/10 transition-all"
                                    >
                                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Commit & Save Parameters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-[calc(100vh-4rem)] border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center p-8 text-center bg-white">
                        <Beaker size={48} className="text-slate-300 mb-3" />
                        <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest">Workspace Idling</h3>
                        <p className="text-slate-400 font-medium text-xs max-w-xs mt-1">Select an active patient registration profile from the sidebar list workflow to populate testing sheets.</p>
                    </div>
                )}
            </div>

            {/* JSON Schema Preview Overlay Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#020617] text-white">
                            <span className="font-black uppercase text-xs tracking-widest text-teal-400">JSON API Transmit Matrix</span>
                            <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-white/15 rounded-xl transition-all">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-[11px] text-teal-300 text-left">
                            <pre>{JSON.stringify(testResults, null, 4)}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiagnosticWorklist;