import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  FlaskConical, 
  Scale, 
  Activity, 
  FileText, 
  Clock, 
  RefreshCw, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const LaboratoryResults = () => {
  // Core Component View States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Core Data Stores matching your DRF architecture patterns
  const [labOrdersList, setLabOrdersList] = useState([]);
  const [selectedPatientData, setSelectedPatientData] = useState(null);
  const [patientVitals, setPatientVitals] = useState(null);
  
  // Filtering and Searching Query State
  const [searchQuery, setSearchQuery] = useState('');

  const API_BASE = 'http://127.0.0.1:8000/api';

  // Secure Header Resolution Token Lookup Strategy
  const getHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Pull records from your verified successful "/api/lab-orders/" route
  const fetchLabOrdersData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/lab-orders/`, { 
        method: 'GET', 
        headers: getHeaders() 
      });
      
      if (!res.ok) throw new Error(`Server tracking returned status code: ${res.status}`);
      
      const data = await res.json();
      // Handle either direct array representations or paginated data payloads
      const ordersArray = Array.isArray(data) ? data : data.results || [];
      setLabOrdersList(ordersArray);

      // Hot reload the active patient mapping matrices if a refresh occurs while selected
      if (selectedPatientData?.patient) {
        const updatedOrders = ordersArray.filter(order => {
          const pt = order.patient_details || order.patient;
          const ptId = pt?.id || (typeof order.patient === 'number' ? order.patient : null);
          return ptId === selectedPatientData.patient.id;
        });
        setSelectedPatientData(prev => prev ? { ...prev, orders: updatedOrders } : null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabOrdersData();
  }, []);

  // WORKFLOW STEP 1: Process and group un-duplicated patients who have actual lab orders
  const getDistinctPatientsFromHistory = () => {
    const seenPatients = new Set();
    const uniquePatients = [];

    labOrdersList.forEach(order => {
      // Unpack nested serializer representation objects safely with fallback logic
      const pt = order.patient_details || order.patient;
      const ptId = pt?.id || (typeof order.patient === 'number' ? order.patient : null);

      if (ptId && !seenPatients.has(ptId)) {
        seenPatients.add(ptId);
        uniquePatients.push({
          id: ptId,
          name: pt?.name || pt?.full_name || order.patient_name || `Patient ID Reference: #${ptId}`,
          registry_no: pt?.health_record_number || pt?.registry_no || order.health_record_number || order.token_id || `HRN-${ptId}`,
          age: pt?.age || order.patient_age || order.age || '—',
          gender: pt?.gender || order.patient_gender || order.gender || '—'
        });
      }
    });

    return uniquePatients;
  };

  // WORKFLOW STEP 2 & 3: Gather patient metrics and cross-reference order history maps
  const handleSelectPatient = async (patient) => {
    setError(null);
    setPatientVitals(null); // Clear previous vitals to avoid calculations bleeding together

    // Find all lab records linked directly to this selected patient
    const associatedOrders = labOrdersList.filter(order => {
      const pt = order.patient_details || order.patient;
      const ptId = pt?.id || (typeof order.patient === 'number' ? order.patient : null);
      return ptId === patient.id;
    });

    setSelectedPatientData({
      patient: patient,
      orders: associatedOrders
    });

    // Query vital-signs endpoint for Height/Weight parameter tracking
    try {
      const vitalsRes = await fetch(`${API_BASE}/vital-signs/?patient=${patient.id}`, { 
        method: 'GET', 
        headers: getHeaders() 
      });
      if (vitalsRes.ok) {
        const vitalsData = await vitalsRes.json();
        const latestVitals = Array.isArray(vitalsData) ? vitalsData[0] : vitalsData.results?.[0] || null;
        setPatientVitals(latestVitals);
      } else {
        console.warn(`Vitals lookup failed with status code: ${vitalsRes.status}`);
      }
    } catch (err) {
      console.warn("Unable to sync vital-signs calculation vectors seamlessly:", err);
    }
  };

  // WORKFLOW STEP 2 FORMULAS: Robust telemetry extracts for BMI & BSA metrics
  const calculateBMI = () => {
    // 1. Direct model tracking payload fallbacks
    if (patientVitals?.bmi) return Number(patientVitals.bmi).toFixed(1);
    if (selectedPatientData?.patient?.bmi) return Number(selectedPatientData.patient.bmi).toFixed(1);

    // 2. Dynamic parameter resolution from active weights/heights
    const currentWeight = patientVitals?.weight || patientVitals?.weight_kg || selectedPatientData?.patient?.weight || null;
    const currentHeight = patientVitals?.height || patientVitals?.height_cm || selectedPatientData?.patient?.height || null;

    if (!currentWeight || !currentHeight) return '—';
    
    const heightInMeters = currentHeight / 100;
    const bmi = currentWeight / (heightInMeters * heightInMeters);
    return isNaN(bmi) || !isFinite(bmi) ? '—' : bmi.toFixed(1);
  };

  const calculateBSA = () => {
    // 1. Direct payload parameter checks
    if (patientVitals?.bsa) return `${Number(patientVitals.bsa).toFixed(2)} m²`;
    if (selectedPatientData?.patient?.bsa) return `${Number(selectedPatientData.patient.bsa).toFixed(2)} m²`;

    // 2. Dynamic resolution extraction using the Mosteller standard calculation matrix
    const currentWeight = patientVitals?.weight || patientVitals?.weight_kg || selectedPatientData?.patient?.weight || null;
    const currentHeight = patientVitals?.height || patientVitals?.height_cm || selectedPatientData?.patient?.height || null;

    if (!currentWeight || !currentHeight) return '—';
    
    const bsa = Math.sqrt((currentWeight * currentHeight) / 3600);
    return isNaN(bsa) || !isFinite(bsa) ? '—' : `${bsa.toFixed(2)} m²`;
  };

  // Search filter computations
  const distinctPatients = getDistinctPatientsFromHistory();
  const filteredPatients = distinctPatients.filter(p => {
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || p.registry_no.toString().toLowerCase().includes(query);
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 font-sans">
      
      {/* Top Controls Banner */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-950 flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-indigo-600" />
            Lab Results Portal
          </h1>
        </div>
        <button 
          onClick={fetchLabOrdersData}
          className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-xs font-semibold shadow-sm transition-all"
        >
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin text-indigo-600" : "h-3.5 w-3.5"} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span>Error parsing database payload: {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* WORKFLOW STEP 1: DISTINCT PATIENT EXPLORER AND FILTER COLUMN */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 xl:col-span-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-indigo-500" /> 1. Select Patient (Had Lab Tests)
          </h2>
          
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or HRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-full border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {loading && filteredPatients.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Scanning backend lab histories...</div>
            ) : filteredPatients.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-lg">No historical lab orders located in system dataset.</p>
            ) : (
              filteredPatients.map((pt) => {
                const isSelected = selectedPatientData?.patient?.id === pt.id;
                return (
                  <div
                    key={pt.id}
                    onClick={() => handleSelectPatient(pt)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="font-bold text-xs text-slate-900 truncate">{pt.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">HRN: {pt.registry_no}</div>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COMPONENT CONTENT CORE WORKSPACE VIEW */}
        <div className="xl:col-span-3 space-y-6">
          {selectedPatientData ? (
            <>
              {/* WORKFLOW STEP 2: PATIENT SUMMARY COMPONENT (NAME, HRN, AGE, GENDER, BMI, BSA) */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-indigo-500" /> 2. Selected Patient Demographics
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-2 sm:col-span-3 md:col-span-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient Full Name</span>
                    <span className="text-sm font-bold text-slate-900 truncate block mt-0.5 uppercase">{selectedPatientData.patient.name}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Health Rec No (HRN)</span>
                    <span className="text-sm font-mono font-bold text-indigo-700 block mt-0.5">{selectedPatientData.patient.registry_no}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Age</span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {selectedPatientData.patient.age !== '—' && selectedPatientData.patient.age !== 'N/A' ? `${selectedPatientData.patient.age} Yrs` : '—'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender</span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5 uppercase">
                      {selectedPatientData.patient.gender === 'M' || selectedPatientData.patient.gender === 'MALE' ? 'Male' : selectedPatientData.patient.gender === 'F' || selectedPatientData.patient.gender === 'FEMALE' ? 'Female' : selectedPatientData.patient.gender}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Calculated BMI</span>
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Scale className="h-3.5 w-3.5 text-slate-400" /> {calculateBMI()}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Surface Area (BSA)</span>
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Activity className="h-3.5 w-3.5 text-slate-400" /> {calculateBSA()}
                    </span>
                  </div>
                </div>
              </div>

              {/* WORKFLOW STEPS 3 & 4: LAB MATRIX */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-500" /> 3 & 4. Associated Diagnostic Test Results Sheet
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3 pl-5">Test / Parameter Name</th>
                        <th className="p-3">Observed Result</th>
                        <th className="p-3 text-red-700 bg-red-50/20">Critical High Range</th>
                        <th className="p-3 text-blue-700 bg-blue-50/20">Critical Low Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPatientData.orders.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-6 text-center text-slate-400 italic bg-slate-50/20">
                            No active laboratory assessments found logged for this client profile.
                          </td>
                        </tr>
                      ) : (
                        selectedPatientData.orders.map((order) => {
                          // Extract lab result sets across variations of nested DRF array properties
                          const investigationParameters = order.investigation_parameters || order.results_details || order.requested_tests || order.parameters || [];

                          // Normalized parameter mapping loop strategy
                          const processedParameters = investigationParameters.length > 0 ? investigationParameters : [{
                            parameter_name: order.test_name || order.investigation_name || 'Laboratory Assessment Panel',
                            observed_value: order.result_summary || order.result || order.observed_value || 'Pending Verification',
                            critical_high: order.critical_high || order.high_range || '—',
                            critical_low: order.critical_low || order.low_range || '—'
                          }];

                          return processedParameters.map((param, index) => {
                            const isStringOnly = typeof param === 'string';
                            
                            const testName = isStringOnly ? param : (param.parameter_name || param.name || param.investigation_name || 'Laboratory Parameter');
                            const displayResult = isStringOnly ? (order.result || 'Pending Verification') : (param.observed_value || param.measured_value || param.result || 'Pending Verification');
                            const criticalHigh = isStringOnly ? (order.critical_high || '—') : (param.critical_high || param.high_range || '—');
                            const criticalLow = isStringOnly ? (order.critical_low || '—') : (param.critical_low || param.low_range || '—');

                            const isPending = displayResult === 'Pending Verification' || displayResult === 'PENDING' || displayResult === 'Processing';

                            return (
                              <tr key={`${order.id}-${index}`} className="hover:bg-slate-50/40 transition-colors">
                                <td className="p-3 pl-5 font-semibold text-slate-700">
                                  <div className="uppercase tracking-tight">{testName}</div>
                                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">Order Ref Code: #{order.id}</div>
                                </td>
                                
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold border ${
                                    isPending
                                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                  }`}>
                                    {displayResult}
                                  </span>
                                </td>
                                
                                <td className="p-3 font-mono font-semibold text-red-600 bg-red-50/5">
                                  {criticalHigh}
                                </td>
                                
                                <td className="p-3 font-mono font-semibold text-blue-600 bg-blue-50/5">
                                  {criticalLow}
                                </td>
                              </tr>
                            );
                          });
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col justify-center items-center h-[350px] bg-white rounded-xl border border-dashed border-slate-200 text-center p-6 text-slate-400">
              <FlaskConical className="h-8 w-8 text-slate-300 stroke-[1.5] mb-2 animate-pulse" />
              <p className="text-xs font-semibold">No Patient Worksheet Loaded</p>
              <p className="text-[11px] max-w-xs mt-0.5">Please choose a patient layout from the diagnostic history list on the left side to compile active metrics structures.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LaboratoryResults;