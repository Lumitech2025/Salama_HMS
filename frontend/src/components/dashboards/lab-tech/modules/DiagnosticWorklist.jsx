import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '@/api/api';
import { 
    FlaskConical, Save, ChevronDown, Eye, Beaker, Loader2, Microscope, X, 
    ArrowUpRight, ArrowDownRight, ClipboardList, RefreshCw, Search, Download
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

const ALL_AVAILABLE_TESTS = [
    "Full Blood Count (CBC)",
    "Urea, Electrolytes & Creatinine (U&E)",
    "Liver Function Test (LFT)",
    "Prostate Specific Antigen (PSA)",
    "Urinalysis (Routine)",
    "Blood Group & Cross Match",
    "Blood Slide (Malaria Parasite)"
];

const FRONTEND_TO_BACKEND_TEST_NAMES = {
    "Full Blood Count (CBC)": "CBC",
    "Prostate Specific Antigen (PSA)": "PSA",
    "Urea, Electrolytes & Creatinine (U&E)": "UE",
    "Liver Function Test (LFT)": "LFT",
    "Urinalysis (Routine)": "URINALYSIS",
    "Blood Group & Cross Match": "BG_CROSS",
    "Blood Slide (Malaria Parasite)": "MALARIA_BS"
};

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

const formatGender = (genderCode) => {
    if (!genderCode) return "N/A";
    const code = String(genderCode).toUpperCase().trim();
    if (code === 'M' || code === 'MALE') return 'Male';
    if (code === 'F' || code === 'FEMALE') return 'Female';
    if (code === 'O' || code === 'OTHER') return 'Other';
    return genderCode;
};

const evaluateRange = (name, value) => {
    if (!value || isNaN(value) || !REFERENCE_RANGES[name]) return { status: 'NORMAL', label: 'Within Range', note: '' };
    const numVal = parseFloat(value);
    const config = REFERENCE_RANGES[name];

    if (numVal > config.max) {
        return { status: 'HIGH', label: 'High', note: `[CRITICAL HIGH] ${config.label}: ${numVal} exceeds max threshold of ${config.max}. ` };
    }
    if (numVal < config.min) {
        return { status: 'LOW', label: 'Low', note: `[CRITICAL LOW] ${config.label}: ${numVal} drops below min threshold of ${config.min}. ` };
    }
    return { status: 'NORMAL', label: 'Within Range', note: '' };
};

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
    const [fixedOrderedTests, setFixedOrderedTests] = useState([]);

    const initializeBlankResults = () => {
        const initialResults = {};
        ALL_AVAILABLE_TESTS.forEach(testName => {
            initialResults[testName] = {};
        });
        setTestResults(initialResults);
        setTechNotes("");
        setFixedOrderedTests([]);
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
                const targets = activeLabOrders[0].requested_tests || [];
                if (targets.length > 0) {
                    const matched = ALL_AVAILABLE_TESTS.filter(availableTest => 
                        targets.some(requested => requested.toLowerCase().trim() === availableTest.toLowerCase().trim())
                    );
                    setFixedOrderedTests(matched);
                } else {
                    setFixedOrderedTests(ALL_AVAILABLE_TESTS);
                }
            } else {
                setActiveOrder(null);
                const targets = patient.requested_tests || [];
                if (targets.length > 0) {
                    const matched = ALL_AVAILABLE_TESTS.filter(availableTest => 
                        targets.some(requested => requested.toLowerCase().trim() === availableTest.toLowerCase().trim())
                    );
                    setFixedOrderedTests(matched);
                } else {
                    setFixedOrderedTests(ALL_AVAILABLE_TESTS);
                }
            }
        } catch (err) { 
            console.error("Error fetching requisitions from lab-orders", err); 
            const targets = patient.requested_tests || [];
            if (targets.length > 0) {
                const matched = ALL_AVAILABLE_TESTS.filter(availableTest => 
                    targets.some(requested => requested.toLowerCase().trim() === availableTest.toLowerCase().trim())
                );
                setFixedOrderedTests(matched);
            } else {
                setFixedOrderedTests(ALL_AVAILABLE_TESTS);
            }
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

    const explicitDisplayedTests = useMemo(() => {
        if (fixedOrderedTests.length > 0) return fixedOrderedTests;
        return ALL_AVAILABLE_TESTS;
    }, [fixedOrderedTests]);

    const handleCommitAndDispatch = async () => {
        if (!selectedPatient) return;

        const activeSubmissions = explicitDisplayedTests.filter(testName => {
            const parameters = testResults[testName] || {};
            return Object.values(parameters).some(val => val !== "" && val !== undefined && val !== null);
        });

        if (activeSubmissions.length === 0) {
            alert("⚠ Please fill in diagnostic results before attempting to save parameters.");
            return;
        }

        if (!window.confirm("Verify metrics, commit parameters down to EMR and dispatch patient back to Doctor?")) return;

        setSubmitting(true);
        try {
            const visitId = selectedPatient.visit || selectedPatient.visit_id;
            const patientId = selectedPatient.patient || selectedPatient.patient_id || selectedPatient.id;

            const promises = activeSubmissions.map(testName => {
                const coreParameters = testResults[testName] || {};
                const backendTestName = FRONTEND_TO_BACKEND_TEST_NAMES[testName] || testName;

                let localizedCriticalNotes = "";
                let hasCriticalOutlier = false;

                const baseFields = {
                    patient: patientId,
                    visit: visitId,
                    lab_order: activeOrder?.id || null,
                    test_name: backendTestName, 
                    status: 'COMPLETED',
                    technician_notes: techNotes
                };

                Object.entries(coreParameters).forEach(([key, val]) => {
                    if (val !== "" && val !== null && val !== undefined) {
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
            try {
                await API.post(`/queue/${selectedPatient.id}/move_next/`, { target_station: 'DOCTOR' });
                alert("✅ Diagnostic parameters committed and patient successfully dispatched to Doctor.");
            } catch (dispatchErr) {
                console.error("Auto dispatch component warning:", dispatchErr);
                alert("✅ Results saved, but verification required for Doctor station router context.");
            }

            setSelectedPatient(null);
            setActiveOrder(null);
            initializeBlankResults();
            fetchQueue();
        } catch (err) {
            console.error(err);
            alert("❌ Error committing metrics down to server routers.");
        } finally { 
            setSubmitting(false); 
        }
    };

    const flattenedReportRows = useMemo(() => {
        const rows = [];
        explicitDisplayedTests.forEach(testName => {
            const parameters = testResults[testName] || {};
            Object.entries(parameters).forEach(([key, val]) => {
                if (val !== "" && val !== undefined && val !== null) {
                    const ref = REFERENCE_RANGES[key] || { min: 'N/A', max: 'N/A', label: key, unit: '---' };
                    const evaluation = evaluateRange(key, val);
                    rows.push({
                        testLabel: ref.label,
                        result: val,
                        unit: ref.unit,
                        min: ref.min,
                        max: ref.max,
                        evalLabel: evaluation.label,
                        evalStatus: evaluation.status
                    });
                }
            });
        });
        return rows;
    }, [testResults, explicitDisplayedTests]);

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
                        <InputRow label="Clinipak Urea" name="ue_urea" unit="mmol/L" type="number" value={currentParams["ue_urea"]} onChange={changeMapper} />
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
        <div className="flex flex-col lg:flex-row gap-8 min-h-screen bg-slate-50/50 p-4 font-['Inter'] text-slate-800 text-left relative">
            
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    html, body, #root, main, .app-layout-wrapper {
                        visibility: visible !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                    }
                    body > div:not(#printable-lab-sheet), 
                    #root > div:not(#printable-lab-sheet),
                    .screen-only { 
                        display: none !important; 
                        visibility: hidden !important;
                    }
                    #printable-lab-sheet { 
                        display: block !important; 
                        visibility: visible !important;
                        position: absolute; 
                        left: 0;
                        top: 0; 
                        width: 100%; 
                        padding: 10px;
                        background: white !important;
                        color: black !important;
                    }
                }
            `}} />
            <div className="w-full lg:w-80 bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[calc(100vh-4rem)] lg:sticky lg:top-8 screen-only">
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

            <div className="flex-1 space-y-6 screen-only">
                {selectedPatient ? (
                    <div className="bg-white border border-slate-200/60 rounded-[3rem] p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
                        
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
                            <div className="space-y-3 max-w-xl">
                                <div>
                                    <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest block mb-1">Active Lab Request</span>
                                    <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">{selectedPatient.patient_name || selectedPatient.name}</h1>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <p className="text-xs font-mono font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl inline-block border border-slate-200/40">
                                            HRN: {selectedPatient.health_record_number || selectedPatient.patient_hn || "N/A"}
                                        </p>
                                        <p className="text-xs font-mono font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl inline-block border border-slate-200/40">
                                            Age: {selectedPatient.age || selectedPatient.patient_age || "N/A"} Yrs | Sex: {formatGender(selectedPatient.gender || selectedPatient.sex || selectedPatient.patient_gender)}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                                        <ClipboardList size={12} className="text-slate-400" />
                                        <span>Ordered Investigation Profiles:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {explicitDisplayedTests.map((test, index) => (
                                            <span key={index} className="bg-teal-50 text-teal-700 border border-teal-200/60 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide">
                                                {test}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
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
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none resize-none h-24"
                                        placeholder="Add descriptive analysis parameters, cross-matching flags, or sample quality warnings..."
                                    />
                                </div>

                                <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(!showPreview)}
                                        className="border-2 border-slate-200 hover:border-slate-800 text-slate-800 font-black text-xs uppercase tracking-widest p-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm"
                                    >
                                        <Eye size={14} /> {showPreview ? "Hide Report Preview" : "View Report Preview"}
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const printContents = document.getElementById('printable-lab-sheet').innerHTML;
                                            const originalContents = document.body.innerHTML;
                                            document.body.innerHTML = `<div id="printable-lab-sheet" style="padding:20px;">${printContents}</div>`;
                                            window.print();
                                            document.body.innerHTML = originalContents;
                                            window.location.reload();
                                        }}
                                        className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold tracking-wide p-4 rounded-2xl text-xs shadow-sm transition-all"
                                    >
                                        <Download className="h-4 w-4" /> Download Report
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCommitAndDispatch}
                                        disabled={submitting}
                                        className="bg-[#020617] hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest p-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} className="text-teal-400" />} 
                                        Save Results & Send to Doctor
                                    </button>
                                </div>
                            </div>
                        )}
                        {showPreview && (
                            <div className="mt-8 border-4 border-dashed border-slate-200 rounded-[2.5rem] p-6 bg-slate-100/50">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4">Live Dynamic Report Render Output</span>
                                <div className="bg-white shadow-md p-8 rounded-2xl max-w-4xl mx-auto border border-slate-200">
                                    
                                    <div className="flex items-start justify-between border-b pb-6 text-xs">
                                        <div className="flex items-center gap-4">
                                            <img src={SalamaLogo} alt="Salama Cancer Centre Logo" className="w-16 h-16 object-contain" />
                                            <div>
                                                <h2 className="text-base font-black text-slate-900 tracking-tight">SALAMA CANCER CENTRE</h2>
                                                <p className="text-slate-500 font-medium">Holistic Cancer and Palliative Care</p>
                                                <p className="text-slate-400">P.O BOX 19619-40123, Kisumu, Kenya</p>
                                                <p className="text-slate-400">Tel: +254 756 364 419 | Email: scanccentre@gmail.com</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <h3 className="font-black text-sm uppercase text-teal-700 tracking-wider">LABORATORY REPORT</h3>
                                            <p className="text-slate-400 font-mono mt-1">Date: {new Date().toLocaleDateString('en-GB')}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 py-6 border-b text-xs text-slate-700">
                                        <div>
                                            <p><strong className="font-bold text-slate-900">Patient Name:</strong> {selectedPatient.patient_name || selectedPatient.name}</p>
                                            <p className="mt-1"><strong className="font-bold text-slate-900">Health Record Number (HRN):</strong> {selectedPatient.health_record_number || selectedPatient.patient_hn || "N/A"}</p>
                                        </div>
                                        <div className="text-right">
                                            <p><strong className="font-bold text-slate-900">Age / Gender:</strong> {selectedPatient.age || selectedPatient.patient_age || "N/A"} / {formatGender(selectedPatient.gender || selectedPatient.sex || selectedPatient.patient_gender)}</p>
                                            <p className="mt-1"><strong className="font-bold text-slate-900">Investigation Scope:</strong> {explicitDisplayedTests.join(', ')}</p>
                                        </div>
                                    </div>

                                    <table className="w-full text-xs text-left mt-6 border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-slate-200 text-slate-400 uppercase font-black text-[10px]">
                                                <th className="py-2">Lab Test Parameters</th>
                                                <th className="py-2">Result Value</th>
                                                <th className="py-2">Unit</th>
                                                <th className="py-2">Reference Range</th>
                                                <th className="py-2 text-right">Evaluation</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {flattenedReportRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="py-4 text-center italic text-slate-400">No parameter data currently populated.</td>
                                                </tr>
                                            ) : (
                                                flattenedReportRows.map((row, idx) => (
                                                    <tr key={idx} className="text-slate-700">
                                                        <td className="py-3 font-bold text-slate-900">{row.testLabel}</td>
                                                        <td className="py-3 font-mono font-bold">{row.result}</td>
                                                        <td className="py-3 font-mono text-slate-500 lowercase">{row.unit}</td>
                                                        <td className="py-3 font-mono text-slate-500">{row.min} - {row.max}</td>
                                                        <td className={`py-3 text-right font-black uppercase text-[10px] ${
                                                            row.evalStatus === 'HIGH' ? 'text-rose-600' : row.evalStatus === 'LOW' ? 'text-amber-600' : 'text-teal-600'
                                                        }`}>{row.evalLabel}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                    {techNotes && (
                                        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                                            <p className="font-black uppercase tracking-wider text-slate-400 mb-1 text-[9px]">Technician Remarks</p>
                                            <p className="font-medium text-slate-700 whitespace-pre-line">{techNotes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full min-h-[60vh] flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-[3rem] p-12 text-center bg-white">
                        <Beaker size={48} className="text-slate-300 mb-3 stroke-[1.5]" />
                        <h2 className="font-black uppercase text-sm tracking-tight text-slate-400">No Diagnostic Case Activated</h2>
                        <p className="text-xs text-slate-400 max-w-xs mt-1">Select an incoming tracking token from the left worklist pipeline to verify metric arrays.</p>
                    </div>
                )}
            </div>
            {selectedPatient && (
                <div id="printable-lab-sheet" className="hidden print:block bg-white text-black text-left font-['Inter'] antialiased p-2">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '15px', fontFamily: 'sans-serif' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <img src={SalamaLogo} alt="Salama Cancer Centre" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                            <div>
                                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>SALAMA CANCER CENTRE</h1>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: '500', color: '#475569' }}>Holistic Cancer and Palliative Care</p>
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>P.O BOX 19619-40123, Kisumu, Kenya</p>
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>Tel: +254 756 364 419 | Email: scanccentre@gmail.com</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#0d9488', letterSpacing: '1px' }}>LABORATORY DIAGNOSTICS REPORT</h2>
                            <p style={{ margin: '5px 0 0 0', fontSize: '11px', fontFamily: 'monospace' }}><strong>Date of Test:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '20px 0', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0', fontFamily: 'sans-serif', fontSize: '12px' }}>
                        <div>
                            <p style={{ margin: '4px 0' }}><strong>Patient Name:</strong> {selectedPatient.patient_name || selectedPatient.name}</p>
                            <p style={{ margin: '4px 0' }}><strong>Health Record Number (HRN):</strong> {selectedPatient.health_record_number || selectedPatient.patient_hn || "N/A"}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '4px 0' }}><strong>Age / Gender:</strong> {selectedPatient.age || selectedPatient.patient_age || "N/A"} Yrs / {formatGender(selectedPatient.gender || selectedPatient.sex || selectedPatient.patient_gender)}</p>
                            <p style={{ margin: '4px 0' }}><strong>Tests Executed:</strong> {explicitDisplayedTests.join(', ')}</p>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontFamily: 'sans-serif', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #cbd5e1', textTransform: 'uppercase', fontSize: '10px', color: '#64748b' }}>
                                <th style={{ padding: '8px 4px' }}>Lab Test</th>
                                <th style={{ padding: '8px 4px' }}>Result</th>
                                <th style={{ padding: '8px 4px' }}>Unit</th>
                                <th style={{ padding: '8px 4px' }}>Min</th>
                                <th style={{ padding: '8px 4px' }}>Max</th>
                                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Evaluation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flattenedReportRows.map((row, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 4px', fontWeight: 'bold' }}>{row.testLabel}</td>
                                    <td style={{ padding: '10px 4px', fontWeight: 'bold', fontFamily: 'monospace' }}>{row.result}</td>
                                    <td style={{ padding: '10px 4px', fontFamily: 'monospace', color: '#475569' }}>{row.unit}</td>
                                    <td style={{ padding: '10px 4px', fontFamily: 'monospace', color: '#64748b' }}>{row.min}</td>
                                    <td style={{ padding: '10px 4px', fontFamily: 'monospace', color: '#64748b' }}>{row.max}</td>
                                    <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: '900', fontSize: '10px', color: row.evalStatus === 'HIGH' ? '#e11d48' : row.evalStatus === 'LOW' ? '#d97706' : '#0d9488' }}>
                                        {row.evalLabel}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {techNotes && (
                        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'sans-serif', fontSize: '11px' }}>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>Technician Narrative Remarks</p>
                            <p style={{ margin: 0, color: '#334155', whiteSpace: 'pre-line' }}>{techNotes}</p>
                        </div>
                    )}

                    <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', fontFamily: 'sans-serif', fontSize: '12px' }}>
                        <div>
                            <p style={{ borderTop: '1px solid #000', width: '200px', paddingTop: '5px', textAlign: 'center' }}>Performed By (Technician)</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ borderTop: '1px solid #000', width: '200px', paddingTop: '5px', textAlign: 'center', marginLeft: 'auto' }}>Authorized Signature / Stamp</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiagnosticWorklist;