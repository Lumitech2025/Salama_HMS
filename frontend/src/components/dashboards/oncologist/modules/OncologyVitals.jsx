import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '@/api/api';
import { 
    Calculator, Activity, Thermometer, Heart, 
    Wind, Scale, ChevronDown, User, AlertCircle, 
    CheckCircle2, Loader2, RefreshCcw, FlaskConical, MessageSquare, Save, Pill, ClipboardCheck,
    Stethoscope, X, Image as ImageIcon, Syringe
} from 'lucide-react';

import ICD10DiagnosisSearch from "@/components/ICD10DiagnosisSearch";

// Kept SKUs intact for backend billing downstream processing, removed from UI display
const AVAILABLE_LAB_TESTS = [
    { id: 'CBC', sku: 'LAB-CBC', label: 'Full Blood Count (CBC)' },
    { id: 'PSA', sku: 'LAB-PSA', label: 'Prostate Specific Antigen (PSA)' },
    { id: 'UE', sku: 'LAB-UE', label: 'Urea, Electrolytes & Creatinine (U&E)' },
    { id: 'LFT', sku: 'LAB-LFT', label: 'Liver Function Test (LFT)' },
    { id: 'URINALYSIS', sku: 'LAB-URINE', label: 'Urinalysis (Routine)' },
    { id: 'BG_CROSS', sku: 'LAB-BG_CROSS', label: 'Blood Group & Cross Match' },
    { id: 'MALARIA_BS', sku: 'LAB-BS_MP', label: 'Blood Slide for Malaria' },
];

// Radiology / Ultrasound Test Definitions mapping 1:1 with your signal triggers
const AVAILABLE_IMAGING_TESTS = [
    { id: 'US_CAROTID', sku: 'RAD-US_CAROTID', label: 'Ultrasound Carotid Study' },
    { id: 'US_DUPLEX_LOW_EXT', sku: 'RAD-US_DUPLEX_LOW_EXT', label: 'Ultrasound Duplex Lower Extremity' },
    { id: 'US_VENOUS_EXT', sku: 'RAD-US_VENOUS_EXT', label: 'Ultrasound Venous Extremity' },
    { id: 'US_VENOUS_UNILA', sku: 'RAD-US_VENOUS_UNILA', label: 'Ultrasound Venous Unilateral' },
    { id: 'US_DOPPLER_ABD_PEL', sku: 'RAD-US_DOPPLER_ABD_PEL', label: 'Ultrasound Doppler Abdomen & Pelvis' },
    { id: 'US_LIMITED_DUPLEX', sku: 'RAD-US_LIMITED_DUPLEX', label: 'Ultrasound Limited Duplex' },
    { id: 'US_HEMODIALYSIS', sku: 'RAD-US_HEMODIALYSIS', label: 'Ultrasound Hemodialysis Access Study' },
];

// ✨ NEW: Nurse Station Service Definitions matching backend signals exactly
const AVAILABLE_NURSE_SERVICES = [
    { id: 'WOUND_DRESSING', sku: 'NUR-WOUND', flag: 'has_wound_dressing', label: 'Wound Dressing Procedure' },
    { id: 'CATHETER_CHANGE', sku: 'NUR-CATH', flag: 'has_catheter_change', label: 'Catheter Change' },
    { id: 'PELVIC_SCREENING', sku: 'NUR-PELVIC', flag: 'has_pelvic_screening', label: 'Pelvic Screening' },
];

const INITIAL_LAB_STATE = {
    CBC: false, PSA: false, URINALYSIS: false, BG_CROSS: false,
    UE: false, LFT: false, MALARIA_BS: false
};

// Imaging checklist state holder
const INITIAL_IMAGING_STATE = {
    US_CAROTID: false, US_DUPLEX_LOW_EXT: false, US_VENOUS_EXT: false,
    US_VENOUS_UNILA: false, US_DOPPLER_ABD_PEL: false, US_LIMITED_DUPLEX: false,
    US_HEMODIALYSIS: false
};

// ✨ NEW: Nurse procedures default checkbox state holder
const INITIAL_NURSE_STATE = {
    WOUND_DRESSING: false,
    CATHETER_CHANGE: false,
    PELVIC_SCREENING: false
};

const PRIMARY_SITE_CHOICES = [
    { id: "BREAST", name: "BREAST" },
    { id: "HEAD & NECK", name: "HEAD & NECK" },
    { id: "BONE & SOFT TISSUE", name: "BONE & SOFT TISSUE" },
    { id: "BRAIN TUMOURS", name: "BRAIN TUMOURS" },
    { id: "GASTROINTESTINAL", name: "GASTROINTESTINAL" },
    { id: "LUNG", name: "LUNG" },
    { id: "UROLOGICAL", name: "UROLOGICAL" },
    { id: "KAPOSI SARCOMA", name: "KAPOSI SARCOMA" },
    { id: "GYNAECOLOGICAL", name: "GYNAECOLOGICAL" },
    { id: "LEUKEMIA", name: "LEUKEMIA" }
];

const VitalCard = ({ icon, label, value, unit }) => (
    <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200/60 group hover:border-blue-500 hover:bg-white transition-all duration-200 shadow-sm">
        <div className="flex items-center gap-1.5 mb-2 text-slate-400 group-hover:text-blue-600 transition-colors">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 group-hover:text-blue-600 tracking-tight transition-colors">{value}</span>
            <span className="text-[10px] font-semibold text-slate-400 lowercase">{unit}</span>
        </div>
    </div>
);

const OncologyVitals = ({ selectedPatientFromParent, onTabSwitch }) => {
    const [queue, setQueue] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(selectedPatientFromParent || null);
    const [loading, setLoading] = useState(false);
    const [vitals, setVitals] = useState(null);
    const [hasLabResults, setHasLabResults] = useState(false);
    const [doctorNote, setDoctorNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingImaging, setIsSavingImaging] = useState(false); 
    const [isSavingNurse, setIsSavingNurse] = useState(false); // ✨ NEW: Dedicated loader state for nurse submissions
    const [labRequests, setLabRequests] = useState(INITIAL_LAB_STATE);
    const [imagingRequests, setImagingRequests] = useState(INITIAL_IMAGING_STATE); 
    const [nurseRequests, setNurseRequests] = useState(INITIAL_NURSE_STATE); // ✨ NEW: Nurse procedures selection state tracker

    const [servicePrices, setServicePrices] = useState({});
    const [loadingPrices, setLoadingPrices] = useState(true);

    const [selectedSite, setSelectedSite] = useState(null);
    const [selectedDiagnoses, setSelectedDiagnoses] = useState([]); 
    const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);

    // Fetch live service catalog configurations for Lab, Radiology, AND Nursing departments
    const fetchServicePrices = useCallback(async () => {
        try {
            setLoadingPrices(true);
            const [labRes, radRes, nurRes] = await Promise.all([
                API.get('/services/', { params: { dept: 'LAB', active: True } }),
                API.get('/services/', { params: { dept: 'RAD', active: True } }),
                API.get('/services/', { params: { dept: 'NUR', active: True } }) // ✨ NEW: Pull nurse pricing structures
            ]);

            const labData = labRes.data.results || labRes.data;
            const radData = radRes.data.results || radRes.data;
            const nurData = nurRes.data.results || nurRes.data;
            
            const priceMap = {};
            if (Array.isArray(labData)) {
                labData.forEach(service => { priceMap[service.sku] = parseFloat(service.price); });
            }
            if (Array.isArray(radData)) {
                radData.forEach(service => { priceMap[service.sku] = parseFloat(service.price); });
            }
            if (Array.isArray(nurData)) {
                nurData.forEach(service => { priceMap[service.sku] = parseFloat(service.price); });
            }
            setServicePrices(priceMap);
        } catch (err) {
            console.error("Failed to load catalog metrics for background calculation:", err);
        } finally {
            setLoadingPrices(false);
        }
    }, []);

    const fetchQueue = useCallback(async () => {
        try {
            const res = await API.get('/queue', {
                params: { current_station: 'DOCTOR', status: 'WAITING' }
            });
            const data = res.data.results || res.data;
            setQueue(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Queue fetch error", err);
        }
    }, []);

    const fetchPatientData = useCallback(async (queueItem) => {
        if (!queueItem) return;
        setLoading(true);
        try {
            const visitId = queueItem.visit_id || queueItem.visit;
            
            const [vitalsRes, labRes] = await Promise.all([
                API.get(`/vitals?visit=${visitId}`), 
                API.get(`/lab-results?visit=${visitId}`)
            ]);

            const vData = vitalsRes.data.results || vitalsRes.data;
            const latestVitals = Array.isArray(vData) ? vData[0] : vData;
            setVitals(latestVitals || null);

            const lData = labRes.data.results || labRes.data;
            setHasLabResults(lData && lData.some(r => r.status === 'COMPLETED'));
        } catch (err) {
            console.error("Clinical fetch error", err);
            setVitals(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { 
        fetchQueue(); 
        fetchServicePrices();
    }, [fetchQueue, fetchServicePrices]);

    useEffect(() => {
        if (selectedPatientFromParent) {
            setSelectedPatient(selectedPatientFromParent);
            fetchPatientData(selectedPatientFromParent);
        }
    }, [selectedPatientFromParent, fetchPatientData]);

    const handlePatientChange = (queueEntryId) => {
        const item = queue.find(p => p.id === parseInt(queueEntryId));
        if (item) {
            setSelectedPatient(item);
            fetchPatientData(item);
            setLabRequests(INITIAL_LAB_STATE);
            setImagingRequests(INITIAL_IMAGING_STATE); 
            setNurseRequests(INITIAL_NURSE_STATE); // Reset nursing selection state upon switching patients
            setDoctorNote("");
            setSelectedSite(null);
            setSelectedDiagnoses([]);
        }
    };

    const toggleLabTest = (test) => {
        setLabRequests(prev => ({ ...prev, [test]: !prev[test] }));
    };

    const toggleImagingTest = (testId) => {
        setImagingRequests(prev => ({ ...prev, [testId]: !prev[testId] }));
    };

    // ✨ NEW: Toggle tracking handler for Nurse Procedures panel
    const toggleNurseService = (serviceId) => {
        setNurseRequests(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
    };

    const totalRequisitionCost = useMemo(() => {
        return AVAILABLE_LAB_TESTS.reduce((sum, test) => {
            if (labRequests[test.id]) {
                const price = servicePrices[test.sku] || 0;
                return sum + price;
            }
            return sum;
        }, 0);
    }, [labRequests, servicePrices]);

    const totalImagingRequisitionCost = useMemo(() => {
        return AVAILABLE_IMAGING_TESTS.reduce((sum, scan) => {
            if (imagingRequests[scan.id]) {
                const price = servicePrices[scan.sku] || 0;
                return sum + price;
            }
            return sum;
        }, 0);
    }, [imagingRequests, servicePrices]);

    // ✨ NEW: Live pricing calculator for selected Nursing actions
    const totalNurseRequisitionCost = useMemo(() => {
        return AVAILABLE_NURSE_SERVICES.reduce((sum, service) => {
            if (nurseRequests[service.id]) {
                const price = servicePrices[service.sku] || 0;
                return sum + price;
            }
            return sum;
        }, 0);
    }, [nurseRequests, servicePrices]);

    const handleToggleDiagnosis = (diagnosisItem) => {
        setSelectedDiagnoses(prev => {
            const exists = prev.some(d => d.id === diagnosisItem.id);
            if (exists) {
                return prev.filter(d => d.id !== diagnosisItem.id);
            } else {
                return [...prev, diagnosisItem];
            }
        });
    };

    const handleSaveNotes = async () => {
        if (!doctorNote || !selectedPatient) return;
        setIsSaving(true);
        try {
            const visitId = selectedPatient.visit_id || selectedPatient.visit;
            await API.post(`/clinical-notes/`, {
                patient: selectedPatient.patient,
                visit: visitId,
                note_type: 'ONCOLOGY',
                content: doctorNote
            });
            alert("✅ Consultation notes saved.");
        } catch (err) {
            alert("Failed to save notes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDiagnosis = async () => {
        if (!selectedPatient || !selectedSite || selectedDiagnoses.length === 0) {
            alert("Please verify that a target site and at least one code choice are configured.");
            return;
        }
        
        setIsSavingDiagnosis(true);
        try {
            const visitId = selectedPatient.visit_id || selectedPatient.visit;
            
            await Promise.all(selectedDiagnoses.map(diag => 
                API.post('/patient-diagnoses/', {
                    patient: selectedPatient.patient,
                    visit: visitId,
                    primary_site: selectedSite.id, 
                    icd10_code: diag.code,
                    icd10_description: diag.short_description || diag.description,
                    long_description: diag.long_description || diag.description
                })
            ));

            alert(`✅ Recorded ${selectedDiagnoses.length} ICD-10 Diagnosis items successfully.`);
            setSelectedDiagnoses([]); 
        } catch (err) {
            console.error("Failed to post diagnosis logs:", err);
            alert(`Failed to record diagnostic entries.`);
        } finally {
            setIsSavingDiagnosis(false);
        }
    };

    const handleReferToLab = async () => {
        const activeOrderedTests = AVAILABLE_LAB_TESTS.filter(test => labRequests[test.id]);

        if (activeOrderedTests.length === 0) {
            alert("Select at least one investigation.");
            return;
        }

        setIsSaving(true);
        try {
            const visitId = selectedPatient.visit_id || selectedPatient.visit;
            
            await API.post('/lab-orders/', {
                patient: selectedPatient.patient,
                visit: visitId,
                requested_tests: activeOrderedTests.map(t => t.label),
                test_skus: activeOrderedTests.map(t => t.sku),
                total_estimated_charge: totalRequisitionCost, 
                status: 'PENDING',
                doctor_notes: doctorNote || "" 
            });
            
            await API.post(`/queue/${selectedPatient.id}/move_next/`, { target_station: 'LAB' });
            
            alert(`Success: Patient investigations routed to Laboratory pipeline.`);
            setLabRequests(INITIAL_LAB_STATE);
            onTabSwitch('home'); 
        } catch (err) {
            console.error("Lab referral failure:", err);
            if (err.response && err.response.data) {
                alert(`Backend Validation Failed: ${JSON.stringify(err.response.data)}`);
            } else {
                alert("Referral process halted. Please verify station connectivity.");
            }
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleReferToRadiology = async () => {
        const activeOrderedScans = AVAILABLE_IMAGING_TESTS.filter(scan => imagingRequests[scan.id]);

        if (activeOrderedScans.length === 0) {
            alert("Select at least one imaging study procedure.");
            return;
        }

        setIsSavingImaging(true);
        try {
            const visitId = selectedPatient.visit_id || selectedPatient.visit;
            
            const imagingPayload = {
                patient: selectedPatient.patient,
                visit: visitId,
                status: 'PENDING',
                doctor_notes: doctorNote || "",
                imaging_skus: activeOrderedScans.map(s => s.sku),
                total_estimated_charge: totalImagingRequisitionCost
            };

            activeOrderedScans.forEach(scan => {
                const flagName = `has_us_${scan.id.toLowerCase()}`;
                imagingPayload[flagName] = true;
            });

            await API.post('/imaging-orders/', imagingPayload);
            await API.post(`/queue/${selectedPatient.id}/move_next/`, { target_station: 'RADIOLOGY' });
            
            alert(`Success: Requisition submitted. Patient token advanced to Radiology workflow queue.`);
            setImagingRequests(INITIAL_IMAGING_STATE);
            onTabSwitch('home');
        } catch (err) {
            console.error("Radiology route initialization error:", err);
            if (err.response && err.response.data) {
                alert(`Backend Validation Failed: ${JSON.stringify(err.response.data)}`);
            } else {
                alert("Referral process halted. Please verify station connectivity.");
            }
        } finally {
            setIsSavingImaging(false);
        }
    };

    // ✨ NEW: Nurse Orders Submission & Re-routing Pipeline
    const handleReferToNurse = async () => {
        const activeOrderedServices = AVAILABLE_NURSE_SERVICES.filter(service => nurseRequests[service.id]);

        if (activeOrderedServices.length === 0) {
            alert("Select at least one nursing procedure.");
            return;
        }

        setIsSavingNurse(true);
        try {
            const visitId = selectedPatient.visit_id || selectedPatient.visit;
            
            const nursePayload = {
                patient: selectedPatient.patient,
                visit: visitId,
                status: 'PENDING',
                doctor_notes: doctorNote || "",
                total_estimated_charge: totalNurseRequisitionCost
            };

            // Inject the explicit boolean keys expected by models.py and signals.py
            activeOrderedServices.forEach(srv => {
                nursePayload[srv.flag] = true;
            });

            // 1. Posts the order -> automatically posts invoice line charges on backend via trigger_completed_nurse_charges signal
            await API.post('/nurse-orders/', nursePayload);
            
            // 2. Re-routes tracking token context directly into the physical Nurse's workstation panel
            await API.post(`/queue/${selectedPatient.id}/move_next/`, { target_station: 'NURSE' });
            
            alert(`Success: Nursing requisition submitted. Patient advanced to Nurse desk queue.`);
            setNurseRequests(INITIAL_NURSE_STATE);
            onTabSwitch('home');
        } catch (err) {
            console.error("Nursing route initialization error:", err);
            if (err.response && err.response.data) {
                alert(`Backend Validation Failed: ${JSON.stringify(err.response.data)}`);
            } else {
                alert("Referral process halted. Please verify workstation queue configurations.");
            }
        } finally {
            setIsSavingNurse(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700 font-['Inter'] pb-20 max-w-[1600px] mx-auto px-4">
            
            {/* PATIENT BANNER */}
            {selectedPatient && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-[2rem] p-6 shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg">
                            {selectedPatient.patient_name?.charAt(0) || <User size={24} />}
                        </div>
                        <div>
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 font-black px-2.5 py-1 rounded-md uppercase tracking-wider">Active Consultation</span>
                            <h2 className="text-2xl font-black tracking-tight text-white mt-1">{selectedPatient.patient_name}</h2>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">Token ID: <span className="text-slate-200">#{selectedPatient.token_id}</span></p>
                        </div>
                    </div>
                    {vitals?.bmi && (
                        <div className="bg-blue-600/10 border border-blue-500/20 px-6 py-3 rounded-2xl text-right">
                            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Calculated BMI</p>
                            <p className="text-2xl font-black text-white tracking-tight mt-0.5">{vitals.bmi}</p>
                        </div>
                    )}
                </div>
            )}

            {/* QUEUE CONTROLLER */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex items-center gap-4 flex-1 w-full">
                        <div className="p-3.5 bg-slate-100 rounded-xl text-slate-700"><User size={20} /></div>
                        <div className="flex-1 relative">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">Switch Patient Queue Entry</p>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 font-semibold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer appearance-none transition-all"
                                onChange={(e) => handlePatientChange(e.target.value)}
                                value={selectedPatient?.id || ''}
                            >
                                <option value="" disabled>Select patient from doctor queue...</option>
                                {queue.map(p => (
                                    <option key={p.id} value={p.id}>{p.patient_name} — #{p.token_id}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-9 text-slate-400 pointer-events-none" size={16} />
                        </div>
                        <button onClick={fetchQueue} className="p-3.5 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 rounded-xl transition-all self-end shadow-sm">
                            <RefreshCcw size={18} className="text-slate-600" />
                        </button>
                    </div>
                </div>
            </div>

            {selectedPatient ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-6 duration-500">
                    
                    <main className="lg:col-span-8 space-y-6">
                        {/* VITALS */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-md relative overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-600 p-2.5 rounded-xl text-white"><Activity size={20} /></div>
                                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Vitals</h3>
                                </div>
                                <span className="bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black tracking-wide border border-emerald-500/20">
                                    BMI: {vitals?.bmi || '--'}
                                </span>
                            </div>

                            {loading ? (
                                <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" size={32} /></div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <VitalCard icon={<Heart size={18} className="text-rose-500"/>} label="Blood Pressure" value={vitals ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : '--/--'} unit="mmHg" />
                                    <VitalCard icon={<Activity size={18} className="text-blue-500"/>} label="Pulse Rate" value={vitals?.heart_rate || '--'} unit="bpm" />
                                    <VitalCard icon={<Thermometer size={18} className="text-orange-500"/>} label="Temperature" value={vitals?.temperature || '--'} unit="°C" />
                                    <VitalCard icon={<Wind size={18} className="text-teal-500"/>} label="SpO2 Saturation" value={vitals?.oxygen_saturation_percentage || '--'} unit="%" />
                                    <VitalCard icon={<Scale size={18} className="text-indigo-500"/>} label="Weight Metric" value={vitals?.weight || '--'} unit="kg" />
                                    <VitalCard icon={<Activity size={18} className="text-slate-500"/>} label="Patient Height" value={vitals?.height || '--'} unit="cm" />
                                </div>
                            )}
                        </div>

                        {/* DIAGNOSIS */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-md relative">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-blue-600 p-2.5 rounded-xl text-white"><Stethoscope size={18} /></div>
                                <h3 className="text-xl font-bold tracking-tight text-slate-900">Diagnosis</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                <div className="relative">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">Primary Disease Location Site</p>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 font-semibold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer appearance-none transition-all"
                                        value={selectedSite ? selectedSite.id : ""}
                                        onChange={(e) => {
                                            const matchedObj = PRIMARY_SITE_CHOICES.find(site => site.id === e.target.value);
                                            setSelectedSite(matchedObj || null); 
                                            setSelectedDiagnoses([]); 
                                        }}
                                    >
                                        <option value="">Select target anatomy structure...</option>
                                        {PRIMARY_SITE_CHOICES.map(site => (
                                            <option key={site.id} value={site.id}>{site.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-9 text-slate-400 pointer-events-none" size={16} />
                                </div>

                                <div className="flex flex-col justify-end">
                                    <ICD10DiagnosisSearch 
                                        selectedSite={selectedSite} 
                                        selectedDiagnoses={selectedDiagnoses}
                                        onToggleDiagnosis={handleToggleDiagnosis}
                                    />
                                </div>
                            </div>

                            

                            {selectedDiagnoses.length > 0 && (
                                <div className="mt-6 border-t border-slate-100 pt-5 space-y-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staged Diagnosis Bag ({selectedDiagnoses.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedDiagnoses.map(diag => (
                                            <div key={diag.id || diag.code} className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-white rounded-xl pl-3 pr-2 py-1.5">
                                                <span className="font-mono font-black text-xs text-blue-400">[{diag.code}]</span>
                                                <span className="text-xs font-medium max-w-[200px] truncate">{diag.short_description || diag.description}</span>
                                                <button onClick={() => handleToggleDiagnosis(diag)} className="p-0.5 text-slate-400 hover:text-rose-400 transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleSaveDiagnosis} disabled={isSavingDiagnosis} className="mt-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isSavingDiagnosis ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Commit Diagnosis Selections
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* CLINICAL NOTES */}
                            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-md">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-900 p-2.5 rounded-xl text-white"><MessageSquare size={18} /></div>
                                        <h4 className="text-md font-bold text-slate-900">Notes</h4>
                                    </div> {/* Reclosed the inner layout wrapper properly */}
                                    <button onClick={handleSaveNotes} disabled={isSaving || !doctorNote} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50">
                                        {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save Notes
                                    </button>
                                </div>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-800 font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                    rows="4"
                                    placeholder="Enter clinical assessment findings and diagnostics summary..."
                                    value={doctorNote}
                                    onChange={(e) => setDoctorNote(e.target.value)}
                                />
                            </div>

                        {/* LAB REQUESTS PANEL */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-md">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-600 p-2.5 rounded-xl text-white"><FlaskConical size={18} /></div>
                                    <h3 className="text-md font-bold text-slate-900">Lab Investigations Requisition</h3>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {AVAILABLE_LAB_TESTS.map((test) => {
                                    return (
                                        <div 
                                            key={test.id} 
                                            onClick={() => toggleLabTest(test.id)}
                                            className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all cursor-pointer ${labRequests[test.id] ? 'bg-indigo-50/60 border-indigo-500 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className={`text-xs font-bold ${labRequests[test.id] ? 'text-indigo-900' : 'text-slate-600'}`}>{test.label}</span>
                                            </div>
                                            {labRequests[test.id] ? <CheckCircle2 size={18} className="text-indigo-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                                        </div>
                                    );
                                })}
                            </div>

                            <button 
                                onClick={handleReferToLab}
                                disabled={isSaving}
                                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />} 
                                Submit Requisition to Lab ({AVAILABLE_LAB_TESTS.filter(t => labRequests[t.id]).length} Checked)
                            </button>
                        </div>

                        {/* RADIOLOGY / IMAGING REQUESTS PANEL */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-md">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-600 p-2.5 rounded-xl text-white"><ImageIcon size={18} /></div>
                                    <h3 className="text-md font-bold text-slate-900">Radiology & Imaging Requisition</h3>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {AVAILABLE_IMAGING_TESTS.map((scan) => {
                                    return (
                                        <div 
                                            key={scan.id} 
                                            onClick={() => toggleImagingTest(scan.id)}
                                            className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all cursor-pointer ${imagingRequests[scan.id] ? 'bg-purple-50/60 border-purple-500 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className={`text-xs font-bold ${imagingRequests[scan.id] ? 'text-purple-900' : 'text-slate-600'}`}>{scan.label}</span>
                                            </div>
                                            {imagingRequests[scan.id] ? <CheckCircle2 size={18} className="text-purple-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                                        </div>
                                    );
                                })}
                            </div>

                            <button 
                                onClick={handleReferToRadiology}
                                disabled={isSavingImaging}
                                className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg"
                            >
                                {isSavingImaging ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />} 
                                Submit Requisition to Radiology ({AVAILABLE_IMAGING_TESTS.filter(s => imagingRequests[s.id]).length} Checked)
                            </button>
                        </div>

                        {/* ✨ NEW: NURSING STATION PROCEDURES PANEL */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-md">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-600 p-2.5 rounded-xl text-white"><Syringe size={18} /></div>
                                    <h3 className="text-md font-bold text-slate-900">Nursing Procedures Requisition</h3>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {AVAILABLE_NURSE_SERVICES.map((service) => {
                                    return (
                                        <div 
                                            key={service.id} 
                                            onClick={() => toggleNurseService(service.id)}
                                            className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all cursor-pointer ${nurseRequests[service.id] ? 'bg-emerald-50/60 border-emerald-500 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className={`text-xs font-bold ${nurseRequests[service.id] ? 'text-emerald-900' : 'text-slate-600'}`}>{service.label}</span>
                                            </div>
                                            {nurseRequests[service.id] ? <CheckCircle2 size={18} className="text-emerald-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                                        </div>
                                    );
                                })}
                            </div>

                            <button 
                                onClick={handleReferToNurse}
                                disabled={isSavingNurse}
                                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg"
                            >
                                {isSavingNurse ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />} 
                                Submit Order to Nursing Desk ({AVAILABLE_NURSE_SERVICES.filter(n => nurseRequests[n.id]).length} Checked)
                            </button>
                        </div>

                    </main>
                </div>
            ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 py-24 rounded-[2.5rem] text-center max-w-xl mx-auto">
                    <User className="mx-auto text-slate-300 mb-4" size={40} />
                    <h3 className="text-lg font-bold text-slate-800">No Patient Session Active</h3>
                    <p className="text-xs font-medium text-slate-400 mt-1 px-6">Select an waiting record token using the drop-down queue controller above to view vitals metrics and assign diagnostics trackers.</p>
                </div>
            )}
        </div>
    );
};

export default OncologyVitals;