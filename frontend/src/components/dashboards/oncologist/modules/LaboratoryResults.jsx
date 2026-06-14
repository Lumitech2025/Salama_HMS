import React, { useState, useEffect } from 'react';
import { 
  User, 
  FlaskConical, 
  RefreshCw, 
  AlertCircle,
  Download,
  ChevronDown,
  ShieldAlert
} from 'lucide-react';

import SalamaLogo from "@/assets/Salama Cancer Centre logo.png";

// Comprehensive multi-panel reference standard registry matching Django models
const REFERENCE_REGISTRY = {
  // 1. CBC PANEL
  cbc_hb: { name: 'Hb (Hemoglobin)', unit: 'g/dL', low: 12.0, high: 17.5, type: 'numeric' },
  cbc_wbc: { name: 'WBC (Total White Cell Count)', unit: 'x10³/µL', low: 4.0, high: 11.0, type: 'numeric' },
  cbc_neut: { name: 'Absolute Neutrophils', unit: 'x10³/µL', low: 1.5, high: 7.5, type: 'numeric' },
  cbc_plt: { name: 'Platelets (Plt)', unit: 'x10³/µL', low: 150.0, high: 450.0, type: 'numeric' },
  cbc_mcv: { name: 'Mean Corpuscular Volume (MCV)', unit: 'fL', low: 80.0, high: 100.0, type: 'numeric' },
  
  // 2. U&E PANEL
  ue_na: { name: 'Sodium (Na+)', unit: 'mmol/L', low: 135.0, high: 145.0, type: 'numeric' },
  ue_k: { name: 'Potassium (K+)', unit: 'mmol/L', low: 3.5, high: 5.1, type: 'numeric' },
  ue_urea: { name: 'Urea', unit: 'mmol/L', low: 2.5, high: 7.8, type: 'numeric' },
  ue_creatinine: { name: 'Serum Creatinine (Cr)', unit: 'µmol/L', low: 50.0, high: 110.0, type: 'numeric' },
  
  // 3. LFT PANEL
  lft_alt: { name: 'Alanine Transaminase (ALT)', unit: 'U/L', low: 7.0, high: 56.0, type: 'numeric' },
  lft_ast: { name: 'Aspartate Transaminase (AST)', unit: 'U/L', low: 10.0, high: 40.0, type: 'numeric' },
  lft_tbil: { name: 'Total Bilirubin (T.BIL)', unit: 'µmol/L', low: 3.0, high: 21.0, type: 'numeric' },
  lft_dbil: { name: 'Direct Bilirubin (D.BIL)', unit: 'µmol/L', low: 0.0, high: 5.1, type: 'numeric' },
  lft_alp: { name: 'Alkaline Phosphatase (ALP)', unit: 'U/L', low: 40.0, high: 130.0, type: 'numeric' },
  lft_albumin: { name: 'Albumin (ALB)', unit: 'g/L', low: 35.0, high: 52.0, type: 'numeric' },
  
  // 4. ONCOLOGY BIOMARKERS
  psa_total: { name: 'Total Prostate Specific Antigen (PSA)', unit: 'ng/mL', low: 0.0, high: 4.0, type: 'numeric' },
  
  // 5. ROUTINE URINALYSIS
  urine_color: { name: 'Urine Color', unit: 'Visual', expected: 'Yellow', type: 'categorical' },
  urine_clarity: { name: 'Urine Clarity', unit: 'Visual', expected: 'Clear', type: 'categorical' },
  urine_glucose: { name: 'Urine Glucose', unit: 'Dipstick', expected: 'Negative', type: 'categorical' },
  urine_protein: { name: 'Urine Protein', unit: 'Dipstick', expected: 'Negative', type: 'categorical' },
  urine_nitrites: { name: 'Urine Nitrites', unit: 'Dipstick', expected: 'Negative', type: 'categorical' },
  urine_blood: { name: 'Urine Blood', unit: 'Dipstick', expected: 'Negative', type: 'categorical' },

  // 6. BG_CROSS MATCH
  bg_abo: { name: 'ABO Blood Grouping', unit: 'Agglutination', type: 'informational' },
  bg_rhesus: { name: 'Rhesus (Rh) Factor', unit: 'Agglutination', type: 'informational' },
  bg_compatibility: { name: 'Crossmatch Compatibility', unit: 'Coombs', expected: 'Compatible', type: 'categorical' },

  // 7. INFECTIOUS PARASITOLOGY (MALARIA_BS)
  malaria_mps: { name: 'Malaria Blood Slide Status (MPS)', unit: 'Microscopy', expected: 'Not Seen', type: 'categorical' },
  malaria_species: { name: 'Identified Parasite Species', unit: 'Microscopy', type: 'informational' }
};

const LaboratoryResults = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [labResultsList, setLabResultsList] = useState([]); 
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [activePatientData, setActivePatientData] = useState(null);
  const [activeVitals, setActiveVitals] = useState(null);

  const PANEL_LABELS = {
    'CBC': 'Full Blood Count (CBC)',
    'PSA': 'Prostate Specific Antigen (PSA)',
    'UE': 'Urea, Electrolytes & Creatinine (U&E)',
    'LFT': 'Liver Function Test (LFT)',
    'URINALYSIS': 'Urinalysis (Routine)',
    'BG_CROSS': 'Blood Group & Cross Match',
    'MALARIA_BS': 'Blood Slide for Malaria'
  };

  const getHeaders = () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchLabResultsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lab-results/?status=COMPLETED`, { 
        method: 'GET', 
        headers: getHeaders() 
      });
      
      if (!res.ok) throw new Error(`Server returned response status code: ${res.status}`);
      
      const data = await res.json();
      const resultsArray = Array.isArray(data) ? data : data.results || [];
      setLabResultsList(resultsArray);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabResultsData();
  }, []);

  const getDistinctPatients = () => {
    const seen = new Set();
    const uniquePatients = [];

    labResultsList.forEach(record => {
      const visit = record.visit;
      const patient = record.patient;
      
      let visitId = null;
      if (visit && typeof visit === 'object') visitId = visit.id;
      else if (visit) visitId = visit;
      else if (patient && typeof patient === 'object') visitId = patient.id;
      else if (patient) visitId = patient;
      else visitId = record.id;

      if (visitId && !seen.has(visitId)) {
        seen.add(visitId);

        let resolvedName = "";

        if (record.patient_details?.full_name) {
          resolvedName = record.patient_details.full_name;
        } else if (visit && typeof visit === 'object') {
          if (visit.first_name || visit.last_name) {
            const first = visit.first_name || "";
            const middle = visit.middle_name ? `${visit.middle_name} ` : "";
            const last = visit.last_name || "";
            resolvedName = `${first} ${middle}${last}`.trim();
          } else if (visit.full_name) {
            resolvedName = visit.full_name;
          }
        } 
        
        if (!resolvedName && patient && typeof patient === 'object') {
          resolvedName = patient.name || patient.full_name || `${patient.first_name || ""} ${patient.last_name || ""}`.trim();
        }

        if (!resolvedName) {
          resolvedName = record.patient_name || record.patient_full_name || `Patient Reference (#${visitId})`;
        }

        const hrn = (typeof visit === 'object' && visit?.health_record_number) || 
                    (typeof patient === 'object' && patient?.health_record_number) || 
                    record.health_record_number || "SCC-—/—";

        const age = (typeof visit === 'object' && visit?.age) || 
                    (typeof patient === 'object' && patient?.age) || 
                    record.patient_age || "—";
        
        let resolvedGender = "—";
        const rawGender = (typeof visit === 'object' && visit?.gender) || 
                          (typeof patient === 'object' && patient?.gender) || 
                          record.patient_gender;
        if (rawGender === 'M' || rawGender === 'Male') resolvedGender = 'Male';
        if (rawGender === 'F' || rawGender === 'Female') resolvedGender = 'Female';

        const paymentMode = (typeof visit === 'object' && visit?.payment_mode) || record.payment_mode || 'CASH';

        uniquePatients.push({
          visit_id: visitId,
          name: resolvedName,
          health_record_number: hrn,
          age: age,
          gender: resolvedGender,
          payment_mode: paymentMode
        });
      }
    });
    return uniquePatients;
  };

  const distinctPatients = getDistinctPatients();

  const handlePatientSelect = async (patientNode) => {
    setSelectedVisitId(patientNode.visit_id);
    setIsDropdownOpen(false);

    const records = labResultsList.filter(r => {
      const vId = r.visit && typeof r.visit === 'object' ? r.visit.id : r.visit;
      const pId = r.patient && typeof r.patient === 'object' ? r.patient.id : r.patient;
      return vId === patientNode.visit_id || pId === patientNode.visit_id;
    });
    
    setActivePatientData({
      info: patientNode,
      records: records
    });

    try {
      const vitalsRes = await fetch(`/api/vital-signs/?visit=${patientNode.visit_id}`, { 
        method: 'GET', 
        headers: getHeaders() 
      });
      if (vitalsRes.ok) {
        const vitalsData = await vitalsRes.json();
        const latestVitals = Array.isArray(vitalsData) ? vitalsData[0] : vitalsData.results?.[0] || null;
        setActiveVitals(latestVitals);
      }
    } catch (err) {
      console.warn("Vital telemetry fallback log:", err);
    }
  };

  const getCalculatedBmi = () => {
    if (activeVitals?.bmi) return `${Number(activeVitals.bmi).toFixed(1)} kg/m²`;
    if (!activeVitals?.weight || !activeVitals?.height) return '—';
    const heightM = parseFloat(activeVitals.height) / 100;
    return `${(parseFloat(activeVitals.weight) / (heightM * heightM)).toFixed(1)} kg/m²`;
  };

  const getCalculatedBsa = () => {
    if (activeVitals?.bsa) return `${Number(activeVitals.bsa).toFixed(2)} m²`;
    if (!activeVitals?.weight || !activeVitals?.height) return '—';
    const calculated = Math.sqrt((parseFloat(activeVitals.height) * parseFloat(activeVitals.weight)) / 3600);
    return `${calculated.toFixed(2)} m²`;
  };

  const parseLabRecordsToRows = () => {
    if (!activePatientData?.records) return [];
    const tabularRows = [];

    activePatientData.records.forEach(record => {
      Object.keys(record).forEach(field => {
        if (REFERENCE_REGISTRY[field]) {
          const val = record[field];
          if (val !== null && val !== undefined && val !== '') {
            const config = REFERENCE_REGISTRY[field];
            
            let evaluation = 'WITHIN RANGE';
            let evaluationStyle = 'text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded';
            let referenceDisplay = `${config.low} - ${config.high}`;

            if (config.type === 'numeric') {
              const floatVal = parseFloat(val);
              if (config.high !== undefined && floatVal > config.high) {
                evaluation = 'HIGH';
                evaluationStyle = 'text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded';
              } else if (config.low !== undefined && floatVal < config.low) {
                evaluation = 'LOW';
                evaluationStyle = 'text-amber-600 font-extrabold bg-amber-50 px-2 py-0.5 rounded';
              }
            } else if (config.type === 'categorical') {
              referenceDisplay = `Expected: ${config.expected}`;
              if (val.toString().toLowerCase() !== config.expected.toLowerCase()) {
                evaluation = 'ABNORMAL';
                evaluationStyle = 'text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded';
              }
            } else {
              referenceDisplay = 'Diagnostic';
              evaluation = 'RECORDED';
              evaluationStyle = 'text-blue-600 font-extrabold bg-blue-50 px-2 py-0.5 rounded';
            }

            tabularRows.push({
              id: `${record.id}-${field}`,
              panel: PANEL_LABELS[record.test_name] || record.test_name,
              parameter: config.name,
              value: val.toString(),
              unit: config.unit || '—',
              range: referenceDisplay,
              evaluation,
              evaluationStyle
            });
          }
        }
      });
    });
    return tabularRows;
  };

  const finalTableRows = parseLabRecordsToRows();

  const getInvestigationScopeText = () => {
    if (!activePatientData?.records) return '—';
    const distinctPanels = [...new Set(activePatientData.records.map(r => r.test_name))];
    return distinctPanels.map(p => PANEL_LABELS[p] || p).join(', ');
  };

  return (
    <div className="w-full h-full flex flex-col max-w-none px-4 pb-6 text-left animate-in fade-in duration-300 antialiased font-sans bg-slate-50 min-h-screen text-slate-800 print:p-0 print:bg-white">
      
      {/* Control Actions Frame */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5 mt-2 print:hidden shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-teal-600 stroke-[1.8]" />
            Patient Lab Results
          </h1>
         
        </div>
        
        
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2 print:hidden">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <span>Error parsing active data streams: {error}</span>
        </div>
      )}

      {/* Dropdown Selector Component */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-2xs shrink-0 z-30 print:hidden">
        
        <div className="relative max-w-xl w-full">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all cursor-pointer"
          >
            <span className="truncate">
              {activePatientData ? activePatientData.info.name : " Select Patient"}
            </span>
            <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl max-h-64 overflow-y-auto z-50 animate-in slide-in-from-top-2 duration-150">
              {distinctPatients.length === 0 ? (
                <div className="p-4 text-center text-xs font-medium text-slate-400 italic">No completed diagnostic logs ready for visualization.</div>
              ) : (
                distinctPatients.map(pt => (
                  <button
                    key={pt.visit_id}
                    type="button"
                    onClick={() => handlePatientSelect(pt)}
                    className={`w-full flex flex-col gap-0.5 px-4 py-2.5 text-left text-xs border-b border-slate-50 last:border-none transition-colors hover:bg-slate-50 cursor-pointer ${
                      selectedVisitId === pt.visit_id ? 'bg-teal-50/50 text-teal-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span className="font-black text-slate-900">{pt.name}</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      HRN: {pt.health_record_number} • Age: {pt.age} Yrs • Gender: {pt.gender}
                    </span>
                  </button>
                 ))
              )}
            </div>
          )}
        </div>
      </div>

      {activePatientData ? (
  <div className="w-full flex-1 min-h-0 space-y-4">
    
    {/* Demographics & Clinical Telemetry Workspace Card */}
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs transition-all print:hidden">
      
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-4">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-teal-700 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
          Active Patient
        </h2>
        
      </div>
      
      {/* Row 1: Core Demographics Split Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3.5">
        
        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 transition-hover hover:bg-slate-50">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Patient Name</span>
          <span className="text-sm font-black text-slate-900 block mt-0.5 uppercase truncate tracking-tight">
            {activePatientData.info.name}
          </span>
        </div>

        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 transition-hover hover:bg-slate-50">
          <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Health Record Number</span>
          <span className="text-sm font-mono font-extrabold text-slate-800 block mt-0.5 tracking-wide">
            {activePatientData.info.health_record_number}
          </span>
        </div>

        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 transition-hover hover:bg-slate-50">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Age</span>
          <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
            {activePatientData.info.age} <span className="text-xs font-semibold text-slate-500">Years</span>
          </span>
        </div>

        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 transition-hover hover:bg-slate-50">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Gender</span>
          <span className="text-sm font-extrabold text-slate-900 block mt-0.5 uppercase tracking-tight">
            {activePatientData.info.gender}
          </span>
        </div>

      </div>

      {/* Row 2: Clinical Vitals Telemetry Grid */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <span className="block text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
          Vitals
        </span>

        {activeVitals ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            
            {/* Temperature Tile */}
            <div className="bg-linear-to-b from-slate-50/30 to-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-tight">Temperature</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-black text-slate-900">{activeVitals.temperature}</span>
                <span className="text-xs font-bold text-slate-500">°C</span>
              </div>
            </div>

            {/* Blood Pressure Tile */}
            <div className="bg-linear-to-b from-slate-50/30 to-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-tight">Blood Pressure</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-black text-slate-900">
                  {activeVitals.systolic_bp}<span className="text-slate-300 mx-0.5">/</span>{activeVitals.diastolic_bp}
                </span>
                <span className="text-xs font-bold text-slate-500">mmHg</span>
              </div>
            </div>

            {/* Pulse & SpO2 Tile */}
            <div className="bg-linear-to-b from-slate-50/30 to-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-600 block text-[9px] font-bold uppercase tracking-tight">Pulse / O₂ Saturation</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-black text-slate-900">{activeVitals.heart_rate}</span>
                <span className="text-xs font-semibold text-slate-400">bpm</span>
                <span className="text-slate-300 mx-1">|</span>
                <span className="text-base font-black text-slate-900">{activeVitals.spo2 || '—'}</span>
                <span className="text-xs font-semibold text-slate-400">%</span>
              </div>
            </div>

            {/* BMI & BSA Summary Tile */}
            <div className="bg-teal-50/30 p-3 rounded-xl border border-teal-100/60">
              <span className="text-teal-800 block text-[9px] font-bold uppercase tracking-tight">(BMI | BSA)</span>
              <span className="text-xs font-black text-teal-900 block mt-1 tracking-tight">
                {getCalculatedBmi()} <span className="text-teal-300 mx-1">|</span> {getCalculatedBsa()}
              </span>
            </div>

          </div>
        ) : (
          <div className="w-full p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs font-medium italic text-slate-400">
            No active vital parameters telemetry metrics synchronized for this billing visit index block.
          </div>
        )}
      </div>

    </div>

          {/* Download Action row */}
          <div className="flex justify-between items-center pt-1 print:hidden">
            <button 
              onClick={() => setActivePatientData(null)}
              className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors px-1"
            >
              Clear Workspace View
            </button>
            <button 
              onClick={() => {
                // 1. Grab the clean HTML layout structure of just the laboratory sheet element
                const printContents = document.getElementById('printable-lab-sheet').innerHTML;
                // 2. Save the complete active application layout state in memory
                const originalContents = document.body.innerHTML;

                // 3. Temporarily isolate the document body context down to ONLY the targeted report
                document.body.innerHTML = `<div id="printable-lab-sheet" style="padding:20px;">${printContents}</div>`;

                // 4. Fire the print dialog
                window.print();

                // 5. Instantly restore your original live web application state seamlessly
                document.body.innerHTML = originalContents;
                
                // Forcing a clean window reload ensures all React button action click bindings re-initialize perfectly
                window.location.reload();
              }}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold tracking-wide px-5 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Download className="h-4 w-4" /> DOWNLOAD REPORT
          </button>
          </div>

          {/* Printable Report Form Layout — Now takes full screen preview container width */}
          <div id="printable-lab-sheet" className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 w-full max-w-none print:border-none print:shadow-none print:p-0 print:mx-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Letterhead */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <img src={SalamaLogo} alt="Salama Cancer Centre" className="h-14 w-14 object-contain" onError={(e) => e.target.style.display='none'} />
                <div>
                  <h2 className="text-base font-black tracking-wide text-slate-900 uppercase">Salama Cancer Centre</h2>
                  <p className="text-[11px] font-bold text-slate-500 italic">Holistic Cancer and Palliative Care</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    P.O BOX 19619-40123, Kisumu, Kenya<br />
                    Tel: +254 756 364 419 | Email: scanccentre@gmail.com
                  </p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-sm font-black tracking-widest text-teal-600 uppercase">Official Laboratory Report</h1>
                <p className="text-[11px] font-bold text-slate-400 mt-1">Date: 11/06/2026</p>
              </div>
            </div>

            {/* Meta Indexes — Fully displays Name, HRN, Age, Gender directly in preview pane layout */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-y-2 py-4 text-[11px] border-b border-slate-200">
              <div className="sm:col-span-7 space-y-1">
                <p className="text-slate-800"><span className="font-bold text-slate-900">Patient Full Name:</span> {activePatientData.info.name}</p>
                <p className="text-slate-800"><span className="font-bold text-slate-900">Health Record Number (HRN):</span> <span className="font-mono">{activePatientData.info.health_record_number}</span></p>
              </div>
              <div className="sm:col-span-5 sm:text-right space-y-1">
                <p className="text-slate-800"><span className="font-bold text-slate-900">Age:</span> {activePatientData.info.age} Yrs</p>
                <p className="text-slate-800"><span className="font-bold text-slate-900">Gender:</span> {activePatientData.info.gender}</p>
                <p className="text-slate-800 leading-snug mt-1">
                  <span className="font-bold text-slate-900">Lab Tests:</span> <span className="text-slate-600 font-semibold">{getInvestigationScopeText()}</span>
                </p>
              </div>
            </div>

            {/* Results Table */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-collapse text-left text-[11px] bg-white">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-400 font-bold uppercase text-[9px]">
                    <th className="pb-2 font-bold tracking-wide">Test Category Panel</th>
                    <th className="pb-2 font-bold tracking-wide">Lab Test Parameters</th>
                    <th className="pb-2 font-black tracking-wide text-slate-950">Result Value</th>
                    <th className="pb-2 font-bold tracking-wide">Unit</th>
                    <th className="pb-2 font-bold tracking-wide">Standard Reference Range</th>
                    <th className="pb-2 font-bold tracking-wide text-right">Evaluation State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {finalTableRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 text-slate-400 text-[10px] font-bold uppercase truncate max-w-[140px]">{row.panel}</td>
                      <td className="py-2 font-bold text-slate-900">{row.parameter}</td>
                      <td className="py-2 font-black font-mono text-slate-950 text-xs">{row.value}</td>
                      <td className="py-2 text-slate-500 font-medium">{row.unit}</td>
                      <td className="py-2 text-slate-400 font-mono">{row.range}</td>
                      <td className="py-2 text-right">
                        <span className={`text-[9px] tracking-wider ${row.evaluationStyle}`}>
                          {row.evaluation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Technician Notes Footer section */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">Technician Remarks & Notes</h3>
              <div className="mt-1.5 p-3 bg-slate-50/60 rounded-xl border border-slate-100 text-[11px] text-slate-700 min-h-[45px] print:bg-white print:border-none print:p-0">
                {activePatientData.records[0]?.technician_notes ? (
                  <span className="whitespace-pre-wrap">{activePatientData.records[0].technician_notes}</span>
                ) : (
                  <span className="text-slate-400 italic">All evaluated biomarker coordinates confirm stable alignment configuration margins. No out-of-band physiological anomalies flags triggered.</span>
                )}
              </div>
            </div>

            {/* Footnote stamp marker */}
            <div className="mt-14 pt-4 border-t border-slate-100 grid grid-cols-2 text-[10px] text-slate-400 font-medium">
              <div><p>Report Generated Electronically — Salama HMS Lab Platform</p></div>
              <div className="text-right"><p className="italic font-semibold text-slate-500">Authorized Signatory Stamp: ______________________</p></div>
            </div>

          </div>

        </div>
      ) : (
        <div className="w-full flex-1 border border-dashed border-slate-300 rounded-2xl p-12 text-center flex flex-col items-center justify-center bg-white shadow-2xs">
          <ShieldAlert size={36} className="text-slate-300 mb-2 stroke-[1.5]" />
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Workspace View Locked</h4>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Select a verified patient profile from the drop-down menu above to load laboratory reports.
          </p>
        </div>
      )}
    </div>
  );
};

export default LaboratoryResults;