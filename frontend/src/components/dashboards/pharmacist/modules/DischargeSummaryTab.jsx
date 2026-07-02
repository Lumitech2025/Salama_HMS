import React, { useState, useEffect } from 'react';
import { Printer, Save, FileText, CheckSquare, Square, Loader2, AlertCircle, Users } from 'lucide-react';
import SalamaLogo from "@/assets/Salama Cancer Centre logo.png";

const DischargeSummaryTab = () => {
    // 1. Patient Queue State Matrix
    const [completedQueue, setCompletedQueue] = useState([]);
    const [selectedVisitId, setSelectedVisitId] = useState('');
    
    // Core Workflow State
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        id: null,
        visit: '',
        patient: '',
        summary_number: '', 
        patient_name: '',
        age: '',
        gender: '',
        date_of_service: '',
        primary_diagnosis: '',
        side_effects_present: '',
        // Updated state layout to support matrix rows with checkable tick states
        chemo_meds_matrix: [
            { text_left: '', text_right: '', checked_left: false, checked_right: false },
            { text_left: '', text_right: '', checked_left: false, checked_right: false },
            { text_left: '', text_right: '', checked_left: false, checked_right: false },
            { text_left: '', text_right: '', checked_left: false, checked_right: false },
            { text_left: '', text_right: '', checked_left: false, checked_right: false }
        ],
        reason_for_visit: {
            chemoAdministration: false,
            treatmentSideEffects: false,
            routineFollowUp: false,
            psychosocialCounselling: false
        },
        service_disposition: {
            completedCourse: false,
            transferredHigherLevel: false,
            patientTerminated: false,
            continuingChemo: false,
            transferredFacility: false,
            transferredFacilityDetails: ''
        },
        discharge_meds_matrix: [
            { text_left: '', text_right: '' },
            { text_left: '', text_right: '' },
            { text_left: '', text_right: '' },
            { text_left: '', text_right: '' },
            { text_left: '', text_right: '' }
        ],
        date_of_next_visit: '',
        oncologist_name: 'DR. WATTANGA L.A.',
        nurse_name: 'SR. HELLEN OKELLO'
    });

    // Helper utility to safely pull the bearer token and construct secure headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('access_token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    // Fetch patients who have completed the pharmacy queue stage
    useEffect(() => {
        const fetchCompletedPharmacyQueue = async () => {
            try {
                const response = await fetch('/api/queue/?current_station=PHARMACY&status=COMPLETED', {
                    method: 'GET',
                    headers: getAuthHeaders()
                });
                if (response.status === 401) throw new Error("Session expired. Please log in again.");
                if (!response.ok) throw new Error("Failed to load completed pharmacy workflow queue.");
                
                const data = await response.json();
                console.log("Pharmacy Queue Raw Response Data:", data);

                if (data && Array.isArray(data.results)) {
                    setCompletedQueue(data.results);
                } else if (Array.isArray(data)) {
                    setCompletedQueue(data);
                } else {
                    console.warn("API response format unexpected. Not an array:", data);
                    setCompletedQueue([]);
                }
            } catch (err) {
                console.error(err);
                setError(err.message || "Error pulling pharmacy queue elements.");
            }
        };
        fetchCompletedPharmacyQueue();
    }, []);

    // Fetch or prefill discharge details when a patient is selected
    const handlePatientChange = async (visitId) => {
        if (!visitId) {
            setSelectedVisitId('');
            return;
        }
        setSelectedVisitId(visitId);
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/discharge-summaries/?visit=${visitId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            if (response.status === 401) throw new Error("Authentication failed. Please re-authenticate.");
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    // Normalize backend structure safely if chemo_meds_matrix doesn't exist yet
                    const record = data[0];
                    if (!record.chemo_meds_matrix) {
                        record.chemo_meds_matrix = [
                            { text_left: '', text_right: '', checked_left: false, checked_right: false },
                            { text_left: '', text_right: '', checked_left: false, checked_right: false },
                            { text_left: '', text_right: '', checked_left: false, checked_right: false },
                            { text_left: '', text_right: '', checked_left: false, checked_right: false },
                            { text_left: '', text_right: '', checked_left: false, checked_right: false }
                        ];
                    }
                    setFormData(record);
                    setIsLoading(false);
                    return;
                }
            }

            const prefillResponse = await fetch(`/api/discharge-summaries/prefill/?visit_id=${visitId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!prefillResponse.ok) throw new Error("Failed to pull automated prefill vectors.");
            const prefillData = await prefillResponse.json();
            
            if (!prefillData.chemo_meds_matrix) {
                prefillData.chemo_meds_matrix = [
                    { text_left: '', text_right: '', checked_left: false, checked_right: false },
                    { text_left: '', text_right: '', checked_left: false, checked_right: false },
                    { text_left: '', text_right: '', checked_left: false, checked_right: false },
                    { text_left: '', text_right: '', checked_left: false, checked_right: false },
                    { text_left: '', text_right: '', checked_left: false, checked_right: false }
                ];
            }
            setFormData(prefillData);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSummary = async () => {
        if (!selectedVisitId) return alert("Please select a valid patient file first.");
        setIsSaving(true);
        
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `/api/discharge-summaries/${formData.id}/` : '/api/discharge-summaries/';

        try {
            const response = await fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });
            if (response.status === 401) throw new Error("Unauthorized submission. Session might be invalid.");
            if (!response.ok) throw new Error("Failed to preserve summary record to central databases.");
            const savedData = await response.json();
            setFormData(savedData);
            alert("Discharge summary saved successfully!");
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Form Mutation Triggers
    const toggleReason = (key) => {
        setFormData(prev => ({
            ...prev,
            reason_for_visit: { ...prev.reason_for_visit, [key]: !prev.reason_for_visit[key] }
        }));
    };

    const toggleDisposition = (key) => {
        setFormData(prev => ({
            ...prev,
            service_disposition: { ...prev.service_disposition, [key]: !prev.service_disposition[key] }
        }));
    };

    const updateMedMatrixRow = (idx, field, val) => {
        const updated = [...formData.discharge_meds_matrix];
        updated[idx] = { ...updated[idx], [field]: val };
        setFormData(prev => ({ ...prev, discharge_meds_matrix: updated }));
    };

    const updateChemoMatrixRow = (idx, field, val) => {
        const updated = [...formData.chemo_meds_matrix];
        updated[idx] = { ...updated[idx], [field]: val };
        setFormData(prev => ({ ...prev, chemo_meds_matrix: updated }));
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 font-sans text-slate-800 dashboard-app-shell">
            
            {/* 1. SELECTION CONTROLS BAR */}
            <div className="print:hidden bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Users size={20} />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Patient (Completed Pharmacy Queue)</label>
                        <select 
                            value={selectedVisitId}
                            onChange={(e) => handlePatientChange(e.target.value)}
                            className="w-full md:w-72 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-sm text-slate-800 outline-none focus:border-indigo-500"
                        >
                            <option value="">-- Choose Patient --</option>
                            {completedQueue && completedQueue.length > 0 ? (
                                completedQueue.map((ticket) => {
                                    const visitId = ticket.visit_id || ticket.visit?.id || "";
                                    const token = ticket.token_id || ticket.visit?.queue_id || "N/A";
                                    const patientName = ticket.patient_name || ticket.patient?.name || "Unknown Patient";

                                    return (
                                        <option key={ticket.id || visitId} value={visitId}>
                                            {token} - {patientName}
                                        </option>
                                    );
                                })
                            ) : (
                                <option value="" disabled>No active files found</option>
                            )}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto justify-end">
                    <button 
                        type="button" 
                        disabled={isSaving || !selectedVisitId}
                        onClick={handleSaveSummary}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold uppercase rounded-lg transition-all"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Commit Entries
                    </button>
                    <button 
                        type="button" 
                        disabled={!selectedVisitId}
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-200 text-slate-950 disabled:text-slate-400 text-xs font-black uppercase rounded-lg transition-all shadow-xs"
                    >
                        <Printer size={14} /> Print Document
                    </button>
                </div>
            </div>

            {error && (
                <div className="print:hidden p-4 bg-rose-50 text-rose-700 font-semibold rounded-xl text-sm flex items-center gap-2 border border-rose-100">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* 2. MAIN DOCUMENT FORM CONTAINER */}
            {isLoading ? (
                <div className="text-center py-12 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <Loader2 className="animate-spin text-indigo-600 mx-auto mb-2" size={24} />
                    <p className="text-sm font-medium text-slate-500">Compiling patient diagnosis histories and tracking datasets...</p>
                </div>
            ) : (
                <div className="print-window-target bg-white border border-slate-200 shadow-sm rounded-xl p-8 md:p-12">
                    
                    {/* Header Matrix Block */}
                    <div className="text-center flex flex-col items-center border-b-2 border-slate-950 pb-4 mb-6 relative">
                        <img 
                            src={SalamaLogo} 
                            alt="Salama Cancer Centre Logo" 
                            className="w-48 object-contain mb-2"
                        />
                        <p className="text-xs font-bold text-rose-600 tracking-wide uppercase">Holistic Cancer and Palliative Care</p>
                        
                        <h2 className="text-sm font-extrabold tracking-widest text-slate-700 uppercase bg-slate-100 px-4 py-1.5 rounded-md mt-4 border border-slate-200 print:bg-transparent print:border-slate-400">
                            Outpatient Chemotherapy Discharge Summary
                        </h2>
                    </div>

                    {/* Patient Context Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm mb-6 pb-4 border-b border-dashed border-slate-300">
                        <div className="md:col-span-1 flex items-baseline gap-1">
                            <span className="font-bold text-slate-800 whitespace-nowrap">Patient's Name:</span>
                            <input 
                                type="text"
                                value={formData.patient_name || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, patient_name: e.target.value }))}
                                placeholder="Enter name manually or select patient..."
                                className="w-full border-b border-slate-400 px-1 font-semibold text-slate-900 outline-none bg-transparent placeholder:font-normal placeholder:text-slate-300 print:placeholder:hidden"
                            />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="font-bold text-slate-800 whitespace-nowrap">Age:</span>
                            <input 
                                type="text"
                                value={formData.age || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                                className="w-16 border-b border-slate-400 text-center font-semibold text-slate-900 outline-none bg-transparent"
                            />
                            <span className="text-xs font-bold text-slate-400">(yrs)</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="font-bold text-slate-800 whitespace-nowrap">Gender:</span>
                            <input 
                                type="text"
                                value={formData.gender || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                                className="w-full border-b border-slate-400 px-1 font-semibold text-slate-900 outline-none bg-transparent"
                            />
                        </div>
                        <div className="md:col-span-1 flex items-baseline gap-1">
                            <span className="font-bold text-slate-800 whitespace-nowrap">Date of Service:</span>
                            <input 
                                type="text"
                                value={formData.date_of_service || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, date_of_service: e.target.value }))}
                                className="w-full border-b border-slate-400 px-1 font-semibold text-slate-900 outline-none bg-transparent"
                            />
                        </div>
                        
                        <div className="md:col-span-1 flex items-baseline gap-1">
                            <span className="font-bold text-slate-800 whitespace-nowrap">Discharge No:</span>
                            <div className="w-full border-b border-slate-400 px-1 font-black text-rose-700 font-mono tracking-tight min-h-[20px]">
                                {formData.summary_number || "Draft Plan"}
                            </div>
                        </div>

                        <div className="md:col-span-1 flex items-baseline gap-1">
                        </div>

                        <div className="md:col-span-3 flex items-baseline gap-1">
                            <span className="font-bold text-slate-800 whitespace-nowrap">Primary Diagnosis:</span>
                            <input 
                                type="text"
                                value={formData.primary_diagnosis || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, primary_diagnosis: e.target.value }))}
                                className="w-full border-b border-slate-400 px-1 font-semibold text-slate-900 outline-none bg-transparent"
                            />
                        </div>
                    </div>

                    {/* Reasons for Visit Grid */}
                    <div className="space-y-3 mb-6">
                        <span className="text-sm font-bold text-slate-800 block">Reason for visit:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-8 pl-1 text-sm">
                            <div onClick={() => toggleReason('chemoAdministration')} className="flex items-center gap-3 cursor-pointer select-none">
                                {formData.reason_for_visit.chemoAdministration ? <CheckSquare size={16} className="text-slate-900 fill-slate-100" /> : <Square size={16} className="text-slate-400" />}
                                <span className="font-medium text-slate-800">Chemotherapy Administration</span>
                            </div>
                            <div onClick={() => toggleReason('treatmentSideEffects')} className="flex items-center gap-3 cursor-pointer select-none">
                                {formData.reason_for_visit.treatmentSideEffects ? <CheckSquare size={16} className="text-slate-900 fill-slate-100" /> : <Square size={16} className="text-slate-400" />}
                                <span className="font-medium text-slate-800">Treatment of chemotherapy side effects</span>
                            </div>
                            <div onClick={() => toggleReason('routineFollowUp')} className="flex items-center gap-3 cursor-pointer select-none">
                                {formData.reason_for_visit.routineFollowUp ? <CheckSquare size={16} className="text-slate-900 fill-slate-100" /> : <Square size={16} className="text-slate-400" />}
                                <span className="font-medium text-slate-800">Routine follow-up</span>
                            </div>
                            <div onClick={() => toggleReason('psychosocialCounselling')} className="flex items-center gap-3 cursor-pointer select-none">
                                {formData.reason_for_visit.psychosocialCounselling ? <CheckSquare size={16} className="text-slate-900 fill-slate-100" /> : <Square size={16} className="text-slate-400" />}
                                <span className="font-medium text-slate-800">Psycho-social counselling</span>
                            </div>
                        </div>
                    </div>

                    {/* Side Effects Input */}
                    <div className="space-y-2 mb-6">
                        <label className="text-sm font-bold text-slate-800 block">Chemotherapy Side effects present at Discharge:</label>
                        <textarea 
                            rows={2}
                            value={formData.side_effects_present || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, side_effects_present: e.target.value }))}
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm font-medium outline-none focus:border-slate-500 print:border-0 print:p-0 print:resize-none"
                            placeholder="Type any symptoms present at discharge..."
                        />
                    </div>

                    {/* IMPLEMENTED REQUEST #2: Medications Received Matrix Layout with checkboxes */}
                    <div className="space-y-2 mb-6">
                        <label className="text-sm font-bold text-slate-800 block">Medications Received during Chemotherapy:</label>
                        <div className="border border-slate-400 rounded-lg overflow-hidden bg-white print:rounded-none">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-400 text-left text-xs uppercase font-bold text-slate-700 print:bg-transparent">
                                        <th className="py-2 px-4 border-r border-slate-400 w-1/2">Medication Regimen & Schedule (A)</th>
                                        <th className="py-2 px-4 w-1/2">Medication Regimen & Schedule (B)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-300 font-mono text-xs">
                                    {formData.chemo_meds_matrix?.map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="p-1 border-r border-slate-400 bg-transparent">
                                                <div className="flex items-center gap-2 px-2">
                                                    <div 
                                                        onClick={() => updateChemoMatrixRow(idx, 'checked_left', !row.checked_left)} 
                                                        className="cursor-pointer select-none flex-shrink-0 text-slate-700"
                                                    >
                                                        {row.checked_left ? <CheckSquare size={15} className="text-slate-900 fill-slate-100" /> : <Square size={15} className="text-slate-400" />}
                                                    </div>
                                                    <input 
                                                        type="text"
                                                        value={row.text_left || ''}
                                                        onChange={(e) => updateChemoMatrixRow(idx, 'text_left', e.target.value)}
                                                        className="w-full py-1 bg-transparent border-0 outline-none font-medium text-slate-900"
                                                        placeholder="Enter chemo medication..."
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-1">
                                                <div className="flex items-center gap-2 px-2">
                                                    <div 
                                                        onClick={() => updateChemoMatrixRow(idx, 'checked_right', !row.checked_right)} 
                                                        className="cursor-pointer select-none flex-shrink-0 text-slate-700"
                                                    >
                                                        {row.checked_right ? <CheckSquare size={15} className="text-slate-900 fill-slate-100" /> : <Square size={15} className="text-slate-400" />}
                                                    </div>
                                                    <input 
                                                        type="text"
                                                        value={row.text_right || ''}
                                                        onChange={(e) => updateChemoMatrixRow(idx, 'text_right', e.target.value)}
                                                        className="w-full py-1 bg-transparent border-0 outline-none font-medium text-slate-900"
                                                        placeholder="Enter chemo medication..."
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Service Dispositions Checkboxes */}
                    <div className="space-y-3 mb-6 border-t border-slate-200/60 pt-4">
                        <span className="text-sm font-bold text-slate-800 block">Service Disposition:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 pl-1 text-sm">
                            <div onClick={() => toggleDisposition('completedCourse')} className="flex items-center gap-3 cursor-pointer select-none">
                                {formData.service_disposition.completedCourse ? <CheckSquare size={16} className="text-slate-900 fill-slate-100" /> : <Square size={16} className="text-slate-400" />}
                                <span className="font-medium text-slate-800">Completed course of treatment</span>
                            </div>
                            <div onClick={() => toggleDisposition('transferredHigherLevel')} className="flex items-center gap-3 cursor-pointer select-none">
                                {formData.service_disposition.transferredHigherLevel ? <CheckSquare size={16} className="text-slate-900 fill-slate-100" /> : <Square size={16} className="text-slate-400" />}
                                <span className="font-medium text-slate-800">Transferred to a higher level of care</span>
                            </div>
                            <div onClick={() => toggleDisposition('patientTerminated')} className="flex items-center gap-3 cursor-pointer select-none">
                                {formData.service_disposition.patientTerminated ? <CheckSquare size={16} className="text-slate-900 fill-slate-100" /> : <Square size={16} className="text-slate-400" />}
                                <span className="font-medium text-slate-800">Patient terminated treatment</span>
                            </div>
                            <div onClick={() => toggleDisposition('continuingChemo')} className="flex items-center gap-3 cursor-pointer select-none">
                                {formData.service_disposition.continuingChemo ? <CheckSquare size={16} className="text-slate-900 fill-slate-100" /> : <Square size={16} className="text-slate-400" />}
                                <span className="font-medium text-slate-800">Continuing chemotherapy</span>
                            </div>
                            <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                                <div onClick={() => toggleDisposition('transferredFacility')} className="flex items-center gap-3 cursor-pointer select-none">
                                    {formData.service_disposition.transferredFacility ? <CheckSquare size={16} className="text-slate-900 fill-slate-100" /> : <Square size={16} className="text-slate-400" />}
                                    <span className="font-medium text-slate-800">Transferred to another practitioner/facility:</span>
                                </div>
                                <input 
                                    type="text"
                                    disabled={!formData.service_disposition.transferredFacility}
                                    value={formData.service_disposition.transferredFacilityDetails || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, service_disposition: { ...prev.service_disposition, transferredFacilityDetails: e.target.value } }))}
                                    className="flex-1 min-w-[200px] border-b border-slate-400 outline-none font-medium text-sm disabled:border-slate-200 bg-transparent print:border-b-0"
                                    placeholder="Specify details..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Double Column Discharge Meds Grid */}
                    <div className="space-y-2 mb-6">
                        <span className="text-sm font-bold text-slate-800 block">Discharge Medication:</span>
                        <div className="border border-slate-400 rounded-lg overflow-hidden bg-white print:rounded-none">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-400 text-left text-xs uppercase font-bold text-slate-700 print:bg-transparent">
                                        <th className="py-2 px-4 border-r border-slate-400 w-1/2">Medication Regimen & Schedule (A)</th>
                                        <th className="py-2 px-4 w-1/2">Medication Regimen & Schedule (B)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-300 font-mono text-xs">
                                    {formData.discharge_meds_matrix.map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="p-1 border-r border-slate-400">
                                                <input 
                                                    type="text"
                                                    value={row.text_left || ''}
                                                    onChange={(e) => updateMedMatrixRow(idx, 'text_left', e.target.value)}
                                                    className="w-full px-2 py-1 bg-transparent border-0 outline-none font-medium"
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input 
                                                    type="text"
                                                    value={row.text_right || ''}
                                                    onChange={(e) => updateMedMatrixRow(idx, 'text_right', e.target.value)}
                                                    className="w-full px-2 py-1 bg-transparent border-0 outline-none font-medium"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer Authority Blocks */}
                    <div className="space-y-4 pt-4 border-t border-dashed border-slate-300 text-sm">
                        {/* IMPLEMENTED REQUEST #3: Calendar date picker using type="date" to enforce YYYY-MM-DD */}
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">Date of Next Visit:</span>
                            <input 
                                type="date"
                                value={formData.date_of_next_visit || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, date_of_next_visit: e.target.value }))}
                                className="w-48 px-2 py-1 border border-slate-300 rounded-md font-bold text-slate-900 bg-slate-50 outline-none focus:border-slate-500 print:border-0 print:bg-transparent print:p-0"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-6">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-slate-700 whitespace-nowrap">Name of Oncologist:</span>
                                    <input 
                                        type="text"
                                        value={formData.oncologist_name || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, oncologist_name: e.target.value }))}
                                        className="w-full border-b border-slate-400 outline-none font-bold uppercase bg-transparent print:border-b-0"
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 font-medium">
                                    <span className="border-t border-slate-300 w-40 pt-1">Signature</span>
                                    <span className="border-t border-slate-300 w-28 pt-1">Date</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-slate-700 whitespace-nowrap">Name of Nurse:</span>
                                    <input 
                                        type="text"
                                        value={formData.nurse_name || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, nurse_name: e.target.value }))}
                                        className="w-full border-b border-slate-400 outline-none font-bold uppercase bg-transparent print:border-b-0"
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 font-medium">
                                    <span className="border-t border-slate-300 w-40 pt-1">Signature</span>
                                    <span className="border-t border-slate-300 w-28 pt-1">Date</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* HIGH SPECIFICITY PRINT STYLING INLINE BLOCK OVERRIDE */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-window-target, .print-window-target * {
                        visibility: visible;
                    }
                    .print-window-target {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                }
            `}} />
        </div>
    );
};

export default DischargeSummaryTab;