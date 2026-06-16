import React, { useState, useEffect, useCallback, useRef } from 'react';
import API from '@/api/api';
import { Plus, Trash2, Send, Printer, User, ChevronDown, Loader2, RefreshCcw, Activity } from 'lucide-react';
import SalamaLogo from "@/assets/Salama Cancer Centre logo.png";

const OncologyPrescription = ({ selectedPatientFromParent, onTabSwitch }) => {
  const [labReadyQueue, setLabReadyQueue] = useState([]);
  const [drugsMasterList, setDrugsMasterList] = useState([]); 
  const [protocolsList, setProtocolsList] = useState([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingClinicalData, setIsLoadingClinicalData] = useState(false);
  const reportPrintRef = useRef(null);
  
  const [patientMeta, setPatientMeta] = useState({
    age: '', sex: '', date: new Date().toISOString().split('T')[0],
    diagnosis: '', protocol: '', cycleNo: '1', totalCycles: '', allergies: ''
  });

  const [activeVitals, setActiveVitals] = useState(null);
  const [activeLabs, setActiveLabs] = useState([]); 
  const [patientDiagnoses, setPatientDiagnoses] = useState([]); 

  const [preChemoOrders, setPreChemoOrders] = useState([
    { id: 'pc1', name: 'IV Metoclopramide 10mg STAT', checked: true },
    { id: 'pc2', name: 'IV Chlorpheniramine 10mg STAT', checked: true },
    { id: 'pc3', name: 'IV Ondansetron 8mg STAT', checked: true },
    { id: 'pc4', name: 'IV Dexamethasone 8mg STAT', checked: true }
  ]);
  const [postChemoOrders, setPostChemoOrders] = useState([
    { id: 'po1', name: 'PO FeSO4/FA 200mg/1 tab OD × 5/7', checked: true },
    { id: 'po2', name: 'PO Ondansetron 8mg 1 tab BD × 5/7', checked: true },
    { id: 'po3', name: 'PO Metoclopramide 10mg 1 tab TDS × 5/7', checked: true },
    { id: 'po4', name: 'PO Dexamethasone 4mg 1 tab BD × 5/7', checked: true }
  ]);
  
  const [chemoRows, setChemoRows] = useState([
    { id: Date.now(), drug_id: '', name: '', calc_factor: 'Mg/m2', factor_value: '', calculated_dose: '', route: 'I.V', diluent: 'NS', volume: '500', duration: '3 hrs' }
  ]);
  const [doseAdjustmentNotes, setDoseAdjustmentNotes] = useState('');

  const calculationFactors = ["Mg/m2", "Mg/kg", "AUC", "IU/KG", "Flat Rate", "mcg"];
  const commonRoutes = ["I.V", "P.O", "S.C", "I.M", "IV Infusion"];
  const diluents = ["NS", "D5W", "RL", "None"];

  const getVitalVal = useCallback((key) => {
  // 1. Establish a prioritized lookup object path
    const snapshot = activeVitals || selectedPatient?.vitals_snapshot || selectedPatient?.vitals;
    if (!snapshot) return "";

    // 2. Map incoming formula parameter keys to their actual structural snapshot properties
    let rawValue = "";
    if (key === 'bsa') {
      rawValue = snapshot.bsa;
    } else if (key === 'weight') {
      rawValue = snapshot.weight_kg || snapshot.weight;
    } else if (key === 'height') {
      rawValue = snapshot.height_cm || snapshot.height;
    } else {
      rawValue = snapshot[key];
    }

    // 3. Return an empty string if null/undefined so parseFloat handles it cleanly
    return rawValue !== undefined && rawValue !== null ? String(rawValue) : "";
  }, [activeVitals, selectedPatient]);

  const getLabParameterVal = useCallback((keyName) => {
    if (!activeLabs || !Array.isArray(activeLabs) || activeLabs.length === 0) return '---';
    for (const testObj of activeLabs) {
      if (testObj && testObj[keyName] !== undefined && testObj[keyName] !== null) {
        return testObj[keyName];
      }
    }
    return '---';
  }, [activeLabs]);

  const calculatedBMI = isLoadingClinicalData ? '---' : (getVitalVal('bmi') || '---');

  const calculateRowDose = useCallback((factor, value) => {
    if (!value) return '';
    const val = parseFloat(value);
    if (isNaN(val)) return '';

    const normalizedFactor = factor.trim().toUpperCase();
    let bsa = parseFloat(getVitalVal('bsa'));
    const weight = parseFloat(getVitalVal('weight'));
    const height = parseFloat(getVitalVal('height'));
    const age = parseFloat(patientMeta?.age);
    const isFemale = /female/i.test(patientMeta?.sex || '');

    // Calculate BSA on the fly using Mosteller formula if metrics allow
    if ((isNaN(bsa) || bsa <= 0) && !isNaN(weight) && !isNaN(height)) {
      bsa = Math.sqrt((height * weight) / 3600);
    }

    switch (normalizedFactor) {
      case 'MG/M2':
        if (isNaN(bsa) || bsa <= 0) return '0 mg (Missing BSA)'; // Provide an explicit zero prefix for parsing safety
        return `${Math.round(val * bsa)} mg`;

      case 'MG/KG':
        if (isNaN(weight) || weight <= 0) return '0 mg (Missing Weight)';
        return `${Math.round(val * weight)} mg`;

      case 'AUC':
        let scr = parseFloat(getLabParameterVal('ue_creatinine'));
        if (isNaN(scr) || scr <= 0) return '0 mg (Missing Serum Cr)';
        if (isNaN(weight) || weight <= 0) return '0 mg (Missing Weight)';
        if (isNaN(age) || age <= 0) return '0 mg (Missing Age)';

        let clcr = ((140 - age) * weight) / (72 * scr);
        if (isFemale) clcr *= 0.85;

        const adjustedGfr = Math.min(clcr, 125);
        return `${Math.round(val * (adjustedGfr + 25))} mg`;
        
      case 'IU/KG':
        if (isNaN(weight) || weight <= 0) return '0 IU (Missing Weight)';
        return `${Math.round(val * weight)} IU`;

      case 'MCG':
        return `${val} mcg`;

      case 'FLAT RATE':
      default:
        return `${val} mg`;
    }
  }, [getVitalVal, getLabParameterVal, patientMeta]);

  const handleProtocolTemplateSelected = useCallback((protocolId) => {
    if (!protocolId) return;
    const protocolTemplate = protocolsList.find(p => p.id === parseInt(protocolId));
    if (!protocolTemplate) return;

    setSelectedProtocolId(protocolId);
    setPatientMeta(prev => ({
      ...prev,
      protocol: protocolTemplate.name,
      totalCycles: protocolTemplate.total_cycles || prev.totalCycles
    }));

    if (protocolTemplate.components && protocolTemplate.components.length > 0) {
      const compiledRows = protocolTemplate.components.map((comp, index) => {
        let matchedStockId = comp.pharmacy_drug_id || '';
        if (!matchedStockId && drugsMasterList.length > 0) {
          const match = drugsMasterList.find(d => d.name.toLowerCase().includes(comp.medication_name.toLowerCase()));
          if (match) matchedStockId = String(match.id);
        }

        let parsedFactor = "Mg/m2";
        if (/mcg/i.test(comp.dosage_unit)) parsedFactor = "mcg";
        else if (/kg/i.test(comp.dosage_unit)) parsedFactor = "Mg/kg";
        else if (/auc/i.test(comp.dosage_unit)) parsedFactor = "AUC";
        else if (/flat/i.test(comp.dosage_unit)) parsedFactor = "Flat Rate";

        return {
          id: Date.now() + index,
          drug_id: matchedStockId,
          name: comp.medication_name,
          calc_factor: parsedFactor,
          factor_value: comp.base_dosage,
          calculated_dose: calculateRowDose(parsedFactor, comp.base_dosage),
          route: comp.route_of_administration || 'I.V',
          diluent: 'NS',
          volume: '500',
          duration: '3 hrs'
        };
      });

      setChemoRows(compiledRows);
    }
  }, [protocolsList, drugsMasterList, calculateRowDose]);

  const handlePatientSelectionContext = useCallback(async (queueNode) => {
    if (!queueNode) return;
    setIsLoadingClinicalData(true);
    
    setActiveVitals(null);
    setActiveLabs([]);
    setPatientDiagnoses([]);
    setSelectedProtocolId('');
    setPatientMeta({
      age: '---', sex: '---', date: new Date().toISOString().split('T')[0],
      diagnosis: '', protocol: '', cycleNo: '1', totalCycles: '', allergies: ''
    });
    setChemoRows([{ id: Date.now(), drug_id: '', name: '', calc_factor: 'Mg/m2', factor_value: '', calculated_dose: '', route: 'I.V', diluent: 'NS', volume: '500', duration: '3 hrs' }]);

    try {
      const visitId = queueNode.visit_id || queueNode.visit?.id || queueNode.visit || queueNode.id;
      
      const [vitalsRes, labsRes, rxSnapshotRes] = await Promise.all([
        API.get(`/vital-signs/?visit=${visitId}`).catch(() => null),
        API.get(`/lab-results/?visit=${visitId}`).catch(() => null),
        API.get(`/prescriptions/?visit=${visitId}`).catch(() => null)
      ]);

      if (vitalsRes?.data) {
        const data = vitalsRes.data.results || vitalsRes.data;
        setActiveVitals(Array.isArray(data) ? data[0] : data);
      }

      if (labsRes?.data) {
        const data = labsRes.data.results || labsRes.data;
        setActiveLabs(Array.isArray(data) ? data : [data]);
      }

      let dxArray = [];
      if (rxSnapshotRes?.data) {
          const results = rxSnapshotRes.data.results || rxSnapshotRes.data;
          if (results && results.length > 0) {
            if (results[0].diagnosis_snapshot && results[0].diagnosis_snapshot.length > 0) {
              dxArray = results[0].diagnosis_snapshot;
            } else if (results[0].diagnosis_detail) {
              dxArray = [results[0].diagnosis_detail];
            }
          }
        } 
    

    if (dxArray.length === 0) {
      const targetSource = queueNode.diagnosis_snapshot || queueNode.diagnosis_detail;
      if (targetSource) {
        dxArray = Array.isArray(targetSource) ? targetSource : [targetSource];
      }
    }

    setPatientDiagnoses(dxArray);

      let resolvedGender = "—";
      const rawGender = queueNode.patient_gender || queueNode.patient?.gender || queueNode.visit?.gender || "—";
      if (/^M/i.test(rawGender)) resolvedGender = 'Male';
      if (/^F/i.test(rawGender)) resolvedGender = 'Female';
      
      const resolvedAge = queueNode.patient_age || queueNode.patient?.age || queueNode.visit?.age || "—";
      
      let computedDiagnosisStr = '';
    if (dxArray.length > 0 && dxArray[0]) {
      // ✨ CHANGE HERE: Safe fallback rendering properties matching your API definition layout
      const desc = dxArray[0].description || dxArray[0].icd10_description || '';
      const code = dxArray[0].icd10_code || dxArray[0].code || '';
      computedDiagnosisStr = `${code} - ${desc}`.trim();
    }

      setPatientMeta(prev => ({
        ...prev,
        age: resolvedAge,
        sex: resolvedGender,
        diagnosis: computedDiagnosisStr || queueNode.diagnosis || prev.diagnosis,
        protocol: queueNode.protocol || '',
        allergies: queueNode.allergies || ''
      }));

    } catch (err) {
      console.error("Fault parsing historical clinical contexts:", err);
    } finally {
      setIsLoadingClinicalData(false);
    }
  }, []);

  useEffect(() => {
  if (selectedPatientFromParent) {
    setSelectedPatient(selectedPatientFromParent);
    
    // Clear old data first to prevent clinical data bleeding between patients
    setActiveVitals(null);
    setActiveLabs([]);
    setPatientDiagnoses([]);

    // 1. Map demographic metadata safely
    setPatientMeta({
      age: selectedPatientFromParent.patient_age || selectedPatientFromParent.visit_age || '',
      sex: selectedPatientFromParent.patient_gender || selectedPatientFromParent.patient_sex || '',
      date: new Date().toISOString().split('T')[0],
      diagnosis: selectedPatientFromParent.diagnosis || '',
      protocol: selectedPatientFromParent.protocol || '',
      cycleNo: String(selectedPatientFromParent.cycle_no || '1'),
      totalCycles: String(selectedPatientFromParent.total_cycles || ''),
      allergies: selectedPatientFromParent.allergies || ''
    });

    // 2. Fetch clinical snapshot logs (Vitals, Labs, Historical Prescriptions)
    setIsLoadingClinicalData(true);
    
    // Check if we are loading an active queue node item directly
    const targetPatientId = selectedPatientFromParent.patient;
    const targetVisitId = selectedPatientFromParent.visit;

    if (targetPatientId) {
      API.get(`/api/prescriptions/?patient=${targetPatientId}&visit=${targetVisitId || ''}`)
        .then(res => {
          const results = res.data?.results || res.data;
          
          if (results && results.length > 0) {
            const activeRx = results[0];
            
            // If an existing prescription history profile is found, load snapshots
            if (activeRx.vitals_snapshot) setActiveVitals(activeRx.vitals_snapshot);
            if (activeRx.lab_results_snapshot) {
              const parsedLabs = Object.entries(activeRx.lab_results_snapshot).map(([name, data]) => ({
                test_name_display: name,
                ...data
              }));
              setActiveLabs(parsedLabs);
            }
            
            // 🌟 STEP A: Fallback chain parsing existing saved diagnoses snapshots
            if (activeRx.diagnosis_snapshot && activeRx.diagnosis_snapshot.length > 0) {
              setPatientDiagnoses(activeRx.diagnosis_snapshot);
            } else if (activeRx.diagnosis_detail) {
              setPatientDiagnoses([activeRx.diagnosis_detail]);
            }
          } else {
            // 🌟 STEP B: Fallback chain parsing brand new patients coming straight from the Consultation Queue 
            if (selectedPatientFromParent.diagnosis_snapshot && selectedPatientFromParent.diagnosis_snapshot.length > 0) {
              setPatientDiagnoses(selectedPatientFromParent.diagnosis_snapshot);
            } else if (selectedPatientFromParent.diagnosis_detail) {
              setPatientDiagnoses([selectedPatientFromParent.diagnosis_detail]);
            }
          }
        })
        .catch(err => console.error("Error running clinical history sync:", err))
        .finally(() => setIsLoadingClinicalData(false));
    } else {
      setIsLoadingClinicalData(false);
    }
  }
}, [selectedPatientFromParent]);

  useEffect(() => {
    if (selectedPatient) handlePatientSelectionContext(selectedPatient);
  }, [selectedPatient, handlePatientSelectionContext]);

  useEffect(() => {
    setChemoRows(prev => prev.map(row => ({
      ...row,
      calculated_dose: calculateRowDose(row.calc_factor, row.factor_value)
    })));
  }, [activeVitals, activeLabs, calculateRowDose]);

  const fetchOncologyData = useCallback(async () => {
    try {
      const [drugsRes, queueRes, protocolsRes] = await Promise.all([
        API.get('/drugs/'), 
        API.get('/queue?current_station=DOCTOR'),
        API.get('/protocols/')
      ]);

      setDrugsMasterList(drugsRes.data.results || drugsRes.data || []);
      setLabReadyQueue(queueRes.data.results || queueRes.data || []);
      setProtocolsList(protocolsRes.data.results || protocolsRes.data || []);
    } catch (err) {
      console.error("Initialization fault on lookup parameters", err);
    }
  }, [API, setDrugsMasterList, setLabReadyQueue, setProtocolsList]);

  useEffect(() => { 
    fetchOncologyData(); 
  }, [fetchOncologyData]);

  const handleChemoRowChange = (id, field, value) => {
    setChemoRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        if (field === 'drug_id') {
          if (!value || value === "") {
            updatedRow.name = '';
            updatedRow.calculated_dose = '';
          } else {
            const matchedDrug = drugsMasterList.find(d => d.id === parseInt(value, 10));
            updatedRow.name = matchedDrug ? matchedDrug.name : '';
          }
        }
        
        if (field === 'calc_factor' || field === 'factor_value' || field === 'drug_id') {
          if (!updatedRow.drug_id || updatedRow.drug_id === "") {
            updatedRow.calculated_dose = '';
          } else {
            updatedRow.calculated_dose = calculateRowDose(updatedRow.calc_factor, updatedRow.factor_value);
          }
        }

        // 🔍 DETAILED STATE LOGGER: Watch the row modify itself live
        console.log(`[Pharma State Sync] Row #${id} updated field [${field}] to:`, value, "Resulting Row Object:", updatedRow);

        return updatedRow;
      }
      return row;
    }));
  };

  const addChemoRow = () => {
    setChemoRows(prev => [...prev, { id: Date.now(), drug_id: '', name: '', calc_factor: 'Mg/m2', factor_value: '', calculated_dose: '', route: 'I.V', diluent: 'NS', volume: '500', duration: '3 hrs' }]);
  };

  const removeChemoRow = (id) => {
    if (chemoRows.length > 1) setChemoRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSubmitPrescription = async () => {
    if (!selectedPatient) return alert("Select patient workspace first.");

    console.log("DEBUG - raw chemoRows array:", chemoRows);
    console.log("DEBUG - single item sample structure:", chemoRows[0]);

    setIsSubmitting(true);

    
    
    try {
      // 1. Rigorous payload construction for items across treatment stages
      const itemsPayload = [
        ...preChemoOrders.filter(o => o.checked).map(o => ({
          stage: 'PRE_CHEMO', 
          drug: null, 
          medication_name: o.name, 
          dosage: 'STAT',
          calc_factor: 'Flat Rate', 
          factor_value: '0', 
          route: 'I.V', 
          diluent: 'None', 
          volume: '0', 
          duration: 'STAT'
        })),
        
        ...chemoRows
          .filter(r => {
            // 🌟 Normalize keys so it works whether the property is named drug_id or drug
            const activeDrugId = r.drug_id || r.drug;
            const activeName = r.name || r.medication_name;
            const activeCalculatedDose = r.calculated_dose || '';

            // Check if a drug was actually selected
            const hasValidDrug = activeDrugId && String(activeDrugId).trim() !== "";
            
            // Check if the calculation failed due to missing vitals
            const calculationFailed = String(activeCalculatedDose).includes('Missing');

            // ⚡ ONLY keep rows that have a selected drug AND didn't fail calculation
            return hasValidDrug && activeName && !calculationFailed;
          })
          .map(r => {
            const activeDrugId = r.drug_id || r.drug;
            const activeName = r.name || r.medication_name;
            const cleanDrugForeignKey = parseInt(activeDrugId, 10);
            
            return {
              stage: 'CHEMO', 
              drug: isNaN(cleanDrugForeignKey) ? null : cleanDrugForeignKey, 
              medication_name: activeName, 
              // Fall back gracefully to factor_value if calculated_dose isn't built yet
              dosage: r.calculated_dose || `${r.factor_value} mg`,
              calc_factor: r.calc_factor || 'Flat Rate', 
              factor_value: String(r.factor_value || '0'), 
              route: r.route || 'I.V', 
              diluent: r.diluent || 'Normal Saline', 
              volume: String(r.volume || '250'), 
              duration: r.duration || '30 mins'
            };
          }),
        // ----------------------------------------

        ...postChemoOrders.filter(o => o.checked).map(o => ({
          stage: 'POST_CHEMO', 
          drug: null, 
          medication_name: o.name, 
          dosage: 'Take Home',
          calc_factor: 'Flat Rate', 
          factor_value: '0', 
          route: 'P.O', 
          diluent: 'None', 
          volume: '0', 
          duration: 'As Tracked'
        }))
      ];

      // 2. Safely extract core lookups across heterogeneous queue payload contexts
      const resolvedPatientId = parseInt(selectedPatient.patient_id || selectedPatient.patient || selectedPatient.id);
      
      // Maintain explicit prioritization for historical visits before referencing queue line rows
      const resolvedVisitId = parseInt(selectedPatient.visit_id || selectedPatient.visit || selectedPatient.queue_id || selectedPatient.id);

      // Pull diagnosis key, ensuring it defaults out safely to satisfy database structure blocks
      const resolvedDiagnosisId = patientDiagnoses.length > 0 && patientDiagnoses[0].id 
        ? parseInt(patientDiagnoses[0].id) 
        : null;

      const payload = {
        patient: resolvedPatientId,
        visit: resolvedVisitId, 
        diagnosis: patientDiagnoses.length > 0 ? (patientDiagnoses[0].id || selectedPatient?.diagnosis) : null,
        treatment_date: patientMeta.date || new Date().toISOString().split('T')[0],
        pharmacy_status: 'PENDING', 
        dose_adjustment_notes: doseAdjustmentNotes || '',
        protocol: patientMeta.protocol || '', 
        cycle_no: String(patientMeta.cycleNo || '1'), // match your backend model's CharField layout
        total_cycles: patientMeta.totalCycles ? String(patientMeta.totalCycles) : '', // pass empty string instead of null
        allergies: patientMeta.allergies || '',
        items: itemsPayload
      };

      // 3. Commit records to systemic state engine
      await API.post('/prescriptions/', payload);

      // Update workflow tracking station inside queue manager components
      const queueTrackerId = selectedPatient.id || resolvedVisitId;
      await API.patch(`/queue/${queueTrackerId}/`, {
        current_station: 'PHARMACY',
        status: 'AWAITING_MEDICATION'
      });

      alert("Chemotherapy regimen sent and tracked patient successfully advanced to Pharmacy Station.");
      if (onTabSwitch) onTabSwitch('home');
    } catch (err) {
      console.error("Transmission Error Context:", err.response?.data || err);
      
      // Surface descriptive validation errors directly from Django REST Framework if present
      const backendMessage = err.response?.data ? JSON.stringify(err.response.data) : "";
      alert(`Error submitting oncology records chart registry. ${backendMessage}`);
    } finally { 
      setIsSubmitting(false); 
    }
};

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html, #root, .app-layout, main, .oncology-prescription-root {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          aside, nav, .no-print, header, .bg-white.p-4.flex.justify-between {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}} />

      <div className="space-y-6 max-w-[1650px] mx-auto p-6 text-slate-800 text-sm tracking-wide oncology-prescription-root">
        
        <div className="bg-white p-4 flex justify-between items-center gap-4 no-print border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              {isLoadingClinicalData ? <Loader2 className="animate-spin text-blue-600" size={18} /> : <User size={18} />}
            </div>
            <div className="w-[400px] relative">
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 text-sm outline-none appearance-none cursor-pointer"
                onChange={(e) => {
                  const targetId = parseInt(e.target.value);
                  const p = labReadyQueue.find(item => parseInt(item.id) === targetId);
                  if (p) setSelectedPatient(p); 
                }}
                value={selectedPatient?.id || ''}
              >
                <option value="" disabled>-- Select Verified Patient Consultation Queue --</option>
                {labReadyQueue.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.patient_name || `Record Reference ID: ${p.id}`} ({p.health_record_number || `Token: ${p.queue_token}`})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={14} />
            </div>
            <button onClick={fetchOncologyData} className="p-2.5 hover:bg-slate-100 rounded-lg transition-all">
              <RefreshCcw size={15} className="text-slate-400" />
            </button>
          </div>
          {selectedPatient && (
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()} 
                className="bg-slate-100 text-slate-700 font-semibold text-sm uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200 shadow-sm"
              >
                <Printer size={15} /> Download / Print Chart Sheet
              </button>
              <button 
                onClick={handleSubmitPrescription} 
                disabled={isSubmitting} 
                className="bg-blue-600 text-white font-semibold text-sm uppercase tracking-wide px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={15}/> : <Send size={15}/>} Transmit to Pharmacy
              </button>
            </div>
          )}
        </div>

        {selectedPatient && (
          <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-4 no-print">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-500 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" /> Patient Vitals Metrics
              </h3>
              {calculatedBMI !== '---' && <span className="bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full text-xs border border-emerald-100">BMI: {calculatedBMI}</span>}
            </div>
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Blood Pressure</span>
                <span className="text-xl font-bold text-slate-800">{isLoadingClinicalData ? '---' : `${getVitalVal('systolic_bp')}/${getVitalVal('diastolic_bp')}`}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pulse Rate</span>
                <span className="text-xl font-bold text-slate-800">{isLoadingClinicalData ? '---' : getVitalVal('heart_rate')} <span className="text-xs text-slate-400 font-normal">bpm</span></span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">BSA</span>
                <span className="text-xl font-bold text-blue-700">{isLoadingClinicalData ? '---' : getVitalVal('bsa')} <span className="text-xs font-normal text-slate-400">m²</span></span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">SpO2</span>
                <span className="text-xl font-bold text-slate-800">{isLoadingClinicalData ? '---' : getVitalVal('spo2')} <span className="text-xs text-slate-400 font-normal">%</span></span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Weight</span>
                <span className="text-xl font-bold text-slate-800">{isLoadingClinicalData ? '---' : getVitalVal('weight') || '—'} <span className="text-xs text-slate-400 font-normal">kg</span></span>
              </div>
            </div>
          </div>
        )}

        {selectedPatient && (
          <div ref={reportPrintRef} className="bg-white p-6 space-y-8 print-container text-slate-900 text-sm rounded-xl shadow-sm border border-slate-200">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <img src={SalamaLogo} alt="Salama Cancer Centre" className="h-14 object-contain" />
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">SALAMA CANCER CENTRE</h1>
                </div>
              </div>
              <div className="text-right text-sm text-slate-400 font-medium">
                <span>Date: {new Date(patientMeta.date).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-x-6 gap-y-4 text-sm">
              <div className="flex items-center gap-2 col-span-2">
                <span className="font-semibold text-slate-500 min-w-[70px]">Patient:</span>
                <div className="w-full border-b border-slate-200 font-semibold text-slate-900 pb-1 flex justify-between items-center">
                  <span>{selectedPatient.patient_name || 'N/A'}</span>
                  <span className="font-mono bg-slate-100 text-slate-600 font-semibold text-xs px-2.5 py-1 rounded border border-slate-200">
                    HRN: {selectedPatient.health_record_number || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Age:</span>
                <span className="w-full border-b border-slate-200 font-semibold text-slate-900 pb-1">{patientMeta.age} Yrs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Sex:</span>
                <span className="w-full border-b border-slate-200 font-semibold text-slate-900 pb-1">{patientMeta.sex}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 block">Lab Parameters Validation Index</span>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-center divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                    <tr className="divide-x divide-slate-200">
                      <th className="px-2 py-2 bg-slate-100/60" colSpan={4}>Complete Blood Count</th>
                      <th className="px-2 py-2" colSpan={4}>Urea & Electrolytes</th>
                      <th className="px-2 py-2 bg-slate-100/60" colSpan={4}>Liver Function Tests</th>
                    </tr>
                    <tr className="divide-x divide-slate-200 border-t border-slate-200 text-[11px]">
                      <th className="px-1 py-1.5 text-blue-800 bg-blue-50/20">Hb</th>
                      <th className="px-1 py-1.5">WBC</th>
                      <th className="px-1 py-1.5">Neut</th>
                      <th className="px-1 py-1.5">Plt</th>
                      <th className="px-1 py-1.5 text-amber-800">Cr</th>
                      <th className="px-1 py-1.5">Na</th>
                      <th className="px-1 py-1.5">Urea</th>
                      <th className="px-1 py-1.5">K</th>
                      <th className="px-1 py-1.5 text-emerald-800 bg-emerald-50/20">AST</th>
                      <th className="px-1 py-1.5">ALT</th>
                      <th className="px-1 py-1.5">TBil</th>
                      <th className="px-1 py-1.5">Alb</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    <tr className="divide-x divide-slate-200 font-semibold text-slate-900 text-sm">
                      <td className="px-1 py-2 text-blue-800 bg-blue-50/5">{isLoadingClinicalData ? '---' : getLabParameterVal('cbc_hb')}</td>
                      <td className="px-1 py-2">{isLoadingClinicalData ? '---' : getLabParameterVal('cbc_wbc')}</td>
                      <td className="px-1 py-2">{isLoadingClinicalData ? '---' : getLabParameterVal('cbc_neut')}</td>
                      <td className="px-1 py-2">{isLoadingClinicalData ? '---' : getLabParameterVal('cbc_plt')}</td>
                      <td className="px-1 py-2 text-amber-800 bg-amber-50/5">{isLoadingClinicalData ? '---' : getLabParameterVal('ue_creatinine')}</td>
                      <td className="px-1 py-2">{isLoadingClinicalData ? '---' : getLabParameterVal('ue_na')}</td>
                      <td className="px-1 py-2">{isLoadingClinicalData ? '---' : getLabParameterVal('ue_urea')}</td>
                      <td className="px-1 py-2">{isLoadingClinicalData ? '---' : getLabParameterVal('ue_k')}</td>
                      <td className="px-1 py-2 text-emerald-800 bg-emerald-50/5">{isLoadingClinicalData ? '---' : getLabParameterVal('lft_ast')}</td>
                      <td className="px-1 py-2">{isLoadingClinicalData ? '---' : getLabParameterVal('lft_alt')}</td>
                      <td className="px-1 py-2">{isLoadingClinicalData ? '---' : getLabParameterVal('lft_tbil')}</td>
                      <td className="px-1 py-2">{isLoadingClinicalData ? '---' : getLabParameterVal('lft_albumin')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <hr className="border-slate-200" />

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-5 no-print">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 block">Patient Diagnosis</label>
                <div className="flex flex-wrap gap-2">
                  {!patientDiagnoses || patientDiagnoses.length === 0 ? (
                    <div className="text-sm text-slate-400 italic bg-white border border-dashed rounded-lg p-4 w-full">
                      No active ICD10 diagnoses snapshots mapped on this encounter queue item.
                    </div>
                  ) : (
                    patientDiagnoses.map((dx, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-1 shadow-sm w-full">
                        <div className="flex items-center gap-2">
                          
                          
                          <span className="font-semibold text-slate-800 text-sm">{dx?.description || dx?.icd10_description || 'No Description Provided'}</span>
                        </div>
                        
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-blue-600 block">Select Protocol</label>
                <div className="relative">
                  <select
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg p-2.5 font-semibold text-sm uppercase tracking-wide outline-none appearance-none cursor-pointer shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={selectedProtocolId}
                    onChange={(e) => handleProtocolTemplateSelected(e.target.value)}
                  >
                    <option value=""></option>
                    {protocolsList.map(proto => (
                      <option key={proto.id} value={proto.id}>{proto.name} ({proto.cycle_duration_days} Days Cycle)</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" size={13} />
                </div>
              </div>

              {selectedProtocolId && (
                <div className="grid grid-cols-4 gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-inner animate-fade-in text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 uppercase text-xs">Assigned:</span>
                    <span className="font-semibold text-blue-700 uppercase">{patientMeta.protocol}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 uppercase text-xs">Cycle No:</span>
                    <input type="number" className="w-16 border rounded p-1 font-semibold text-center outline-none bg-slate-50 text-sm" value={patientMeta.cycleNo} onChange={(e) => setPatientMeta({...patientMeta, cycleNo: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 uppercase text-xs">Total Cycles:</span>
                    <input type="number" className="w-16 border rounded p-1 font-semibold text-center outline-none bg-slate-50 text-sm" value={patientMeta.totalCycles} onChange={(e) => setPatientMeta({...patientMeta, totalCycles: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 uppercase text-xs">Allergies:</span>
                    <input type="text" className="w-full border rounded p-1 text-slate-800 font-semibold outline-none placeholder:font-normal bg-slate-50 text-sm" value={patientMeta.allergies} onChange={(e) => setPatientMeta({...patientMeta, allergies: e.target.value})} placeholder="None noted" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <h2 className="text-base font-bold uppercase tracking-tight text-slate-700 border-b border-slate-200 pb-1 flex items-center gap-2">
                <span>1. Pre-Chemotherapy Medications & Hydration Orders</span>
              </h2>
              <div className="grid grid-cols-4 gap-4 py-1">
                {preChemoOrders.map(item => (
                  <label key={item.id} className="flex items-center gap-3 py-1 select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 no-print"
                      checked={item.checked}
                      onChange={(e) => setPreChemoOrders(prev => prev.map(o => o.id === item.id ? { ...o, checked: e.target.checked } : o))}
                    />
                    <span className="font-semibold text-slate-700">{item.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <h2 className="text-base font-bold uppercase tracking-tight text-slate-700">
                  2. Chemotherapy Orders
                </h2>
                <button 
                  onClick={addChemoRow}
                  className="no-print bg-slate-900 text-white font-semibold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded hover:bg-slate-800 transition-all flex items-center gap-1.5"
                >
                  <Plus size={12} /> Add Medication
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-semibold uppercase text-slate-500 text-[11px]">
                    <tr className="divide-x divide-slate-200 text-center">
                      <th className="px-3 py-2 text-left w-[240px]">Medication</th>
                      <th className="px-2 py-2 w-[120px]">Calculation Factor</th>
                      <th className="px-2 py-2 w-[100px]">Base Dosage Value</th>
                      <th className="px-3 py-2 bg-blue-50 text-blue-800 w-[140px]">Total Dose</th>
                      <th className="px-2 py-2 w-[110px]">Route</th>
                      <th className="px-2 py-2 w-[100px]">Diluent</th>
                      <th className="px-2 py-2 w-[100px]">Volume (ml)</th>
                      <th className="px-2 py-2 w-[100px]">Duration</th>
                      <th className="px-1 py-2 no-print w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 font-medium">
                    {chemoRows.map(row => (
                      <tr key={row.id} className="divide-x divide-slate-200">
                        <td className="p-1">
                          <select
                            className="w-full bg-slate-50 p-1.5 font-semibold text-slate-800 outline-none rounded text-sm"
                            value={row.drug_id}
                            onChange={(e) => handleChemoRowChange(row.id, 'drug_id', e.target.value)}
                          >
                            <option value="">-- Select Active Drug --</option>
                            {drugsMasterList.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1">
                          <select
                            className="w-full bg-white p-1.5 font-semibold text-slate-700 outline-none rounded border border-slate-100 text-sm"
                            value={row.calc_factor}
                            onChange={(e) => handleChemoRowChange(row.id, 'calc_factor', e.target.value)}
                          >
                            {calculationFactors.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            className="w-full p-1.5 font-mono text-center font-semibold text-slate-800 outline-none border border-slate-100 rounded bg-slate-50/40 text-sm"
                            value={row.factor_value}
                            onChange={(e) => handleChemoRowChange(row.id, 'factor_value', e.target.value)}
                            placeholder="0.0"
                          />
                        </td>
                        <td className="p-1.5 bg-blue-50/40 text-center font-bold text-blue-900 text-sm">
                          {row.calculated_dose || '---'}
                        </td>
                        <td className="p-1">
                          <select
                            className="w-full bg-white p-1.5 font-semibold outline-none rounded border border-slate-100 text-sm"
                            value={row.route}
                            onChange={(e) => handleChemoRowChange(row.id, 'route', e.target.value)}
                          >
                            {commonRoutes.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="p-1">
                          <select
                            className="w-full bg-white p-1.5 font-semibold outline-none rounded border border-slate-100 text-sm"
                            value={row.diluent}
                            onChange={(e) => handleChemoRowChange(row.id, 'diluent', e.target.value)}
                          >
                            {diluents.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            className="w-full p-1.5 text-center font-semibold outline-none border border-slate-100 rounded text-sm"
                            value={row.volume}
                            onChange={(e) => handleChemoRowChange(row.id, 'volume', e.target.value)}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            className="w-full p-1.5 text-center font-semibold outline-none border border-slate-100 rounded text-sm"
                            value={row.duration}
                            onChange={(e) => handleChemoRowChange(row.id, 'duration', e.target.value)}
                          />
                        </td>
                        <td className="p-1 text-center no-print">
                          <button 
                            onClick={() => removeChemoRow(row.id)}
                            disabled={chemoRows.length === 1}
                            className="text-slate-300 hover:text-rose-600 transition-colors disabled:opacity-30"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 block">Dose Adjustments / Clinical Toxicity Modification Justifications</span>
              <textarea
                className="w-full border border-slate-200 rounded-lg p-3 outline-none font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-300 text-sm min-h-[80px] bg-slate-50/30"
                value={doseAdjustmentNotes}
                onChange={(e) => setDoseAdjustmentNotes(e.target.value)}
                placeholder="Specify rationale metrics if dose holds, modifications, or calculations deviate from standardized templates..."
              />
            </div>

            <div className="space-y-3 text-sm">
              <h2 className="text-base font-bold uppercase tracking-tight text-slate-700 border-b border-slate-200 pb-1 flex items-center gap-2">
                <span>3. Post-Chemotherapy Medications</span>
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 py-1">
                {postChemoOrders.map(item => (
                  <label key={item.id} className="flex items-center gap-3 py-1 select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 no-print"
                      checked={item.checked}
                      onChange={(e) => setPostChemoOrders(prev => prev.map(o => o.id === item.id ? { ...o, checked: e.target.checked } : o))}
                    />
                    <span className="font-semibold text-slate-700">{item.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-16 text-xs text-slate-400 font-semibold">
              <div className="space-y-4">
                <div className="border-b border-slate-300 h-6 w-full"></div>
                <span>Prescribing Consultant Oncologist Signature / Timestamp</span>
              </div>
              <div className="space-y-4">
                <div className="border-b border-slate-300 h-6 w-full"></div>
                <span>Oncology Nurse Reviewer Verification Signature</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OncologyPrescription;