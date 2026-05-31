import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Pill, Search, User, ChevronRight, 
  Loader2, AlertCircle, Shield, History, ArrowUpRight, HeartPulse, Check
} from 'lucide-react';

const OverviewTab = ({ 
  onNavigateToTab, 
  setActiveTab, 
  setSelectedPatient, // High-priority hook to save active patient globally
  activePatientContext = null // Receives existing patient context if locked elsewhere
}) => {
  // Directly seed the local state using the active global context if available so it persists across tab clicks
  const [recordId, setRecordId] = useState(() => {
    return activePatientContext ? (activePatientContext.health_record_number || activePatientContext.id_number || '') : '';
  });
  const [patientData, setPatientData] = useState(activePatientContext);
  const [isConfirmed, setIsConfirmed] = useState(!!activePatientContext);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const debounceTimeoutRef = useRef(null);

  // Unlocked: Clickable regardless of whether a patient has been loaded or selected yet
  const handleInternalTabJump = (targetTabId) => {
    if (typeof onNavigateToTab === 'function') {
      onNavigateToTab(targetTabId);
    } else if (typeof setActiveTab === 'function') {
      setActiveTab(targetTabId);
    } else {
      console.warn(`Salama Portal Engine: Navigation hook failed for target tab ID: [${targetTabId}]`);
    }
  };

  // Sync state if a patient context is already globally active or changes
  useEffect(() => {
    if (activePatientContext) {
      setPatientData(activePatientContext);
      setIsConfirmed(true);
      setRecordId(activePatientContext.health_record_number || activePatientContext.id_number || '');
    }
  }, [activePatientContext]);

  // Database Lookup 
  const fetchPatientFromDatabase = async (searchValue) => {
    if (!searchValue.trim()) {
      setPatientData(null);
      setIsConfirmed(false);
      if (setSelectedPatient) setSelectedPatient(null); 
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setIsConfirmed(false); // Reset confirmation flag on fresh lookups

    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('token'); 

      const response = await fetch(`/api/patients/lookup/?search=${encodeURIComponent(searchValue)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Session expired or unauthorized. Please re-login.');
        }
        if (response.status === 404) {
          throw new Error('No matching active health record found.');
        }
        throw new Error('Database server connection error.');
      }

      const data = await response.json();
      setPatientData(data);

    } catch (err) {
      setPatientData(null);
      if (setSelectedPatient) setSelectedPatient(null);
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdChange = (e) => {
    const value = e.target.value;
    setRecordId(value);

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    if (value.trim() === '') {
      setPatientData(null);
      setIsConfirmed(false);
      if (setSelectedPatient) setSelectedPatient(null); 
      setErrorMessage('');
      return;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchPatientFromDatabase(value);
    }, 600);
  };

  const handleExplicitSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    fetchPatientFromDatabase(recordId);
  };

  // Explicit confirmation handler to bind patient profile to cross-tab context
  const handleConfirmPatient = () => {
    if (patientData) {
      setIsConfirmed(true);
      if (setSelectedPatient) {
        setSelectedPatient(patientData);
        console.log(`Salama Portal Engine: Global Context locked onto Patient HRN: ${patientData.health_record_number}`);
      }
    }
  };

  // Clear workspace context
  const handleClearSelection = () => {
    setIsConfirmed(false);
    setPatientData(null);
    setRecordId('');
    if (setSelectedPatient) setSelectedPatient(null);
  };

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col max-w-none px-4 pb-6 text-left animate-in fade-in duration-300 antialiased font-sans">
      
      {/* 1. SEARCH & INPUT PANEL */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-xs shrink-0">
        <form onSubmit={handleExplicitSearchSubmit} className="flex flex-col lg:flex-row lg:items-center gap-5">
          
          <div className="flex-1 max-w-md">
            <label htmlFor="record-id" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Health Record Number / ID Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                {isLoading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Search size={16} />}
              </span>
              <input
                id="record-id"
                type="text"
                placeholder="Enter ID No. or HRN (e.g., SCC-001/26)"
                value={recordId}
                onChange={handleIdChange}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Real-time search feedback bar */}
          <div className="flex-1 flex items-center min-h-[54px] bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-2">
            {patientData && !isConfirmed ? (
              <div className="w-full flex items-center justify-between gap-4 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-blue-500 shrink-0" />
                  <p className="text-xs font-bold text-slate-700 truncate">
                    Match Found: {patientData.full_name || `${patientData.first_name} ${patientData.last_name}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmPatient}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
                >
                  <span>Select Patient</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            ) : errorMessage ? (
              <div className="flex items-center gap-2 text-rose-600 animate-in shake duration-150">
                <AlertCircle size={14} />
                <p className="text-xs font-bold">{errorMessage}</p>
              </div>
            ) : isLoading ? (
              <p className="text-xs font-medium text-slate-400 animate-pulse">
                Syncing context data with remote database...
              </p>
            ) : (
              <p className="text-xs font-medium text-slate-400">
                {isConfirmed ? "Patient profile locked in workspace below." : "Type an ID or Health Record Number to find records instantly."}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* 2. PERMANENT WORKSPACE CONTEXT TILE */}
      <div className={`w-full border rounded-xl p-4 mb-5 flex items-center justify-between shadow-2xs transition-all duration-200 ${
        isConfirmed && patientData 
          ? 'bg-emerald-50/70 border-emerald-200' 
          : 'bg-slate-50 border-slate-200 border-dashed'
      }`}>
        {isConfirmed && patientData ? (
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm">
                <Check size={16} className="stroke-[3]" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 block uppercase tracking-wider mb-0.5">
                  Active Patient Workspace Context
                </span>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {patientData.full_name || `${patientData.first_name} ${patientData.last_name}`}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Health Record Number: <span className="font-mono text-slate-800 font-bold">{patientData.health_record_number || 'N/A'}</span>
                </p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={handleClearSelection}
              className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors px-2 py-1 rounded-lg shrink-0"
            >
              Clear Selection
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-200 text-slate-500 rounded-lg">
              <User size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">
                Active Workspace Context
              </span>
              <p className="text-sm font-bold text-slate-500">
                Select Patient to open a dynamic active workspace
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. VISUAL NAVIGATION TILES REGION (Always interactive and clickable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full flex-1 min-h-0">
        
        {/* TILE 1: PATIENT PROFILE */}
        <div 
          onClick={() => handleInternalTabJump('profile')}
          className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:border-indigo-500 hover:bg-slate-50/50 hover:shadow-sm cursor-pointer transition-all group min-h-[150px]"
        >
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-2xs">
              <User size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Patient Profile</h4>
              <p className="text-[13px] text-slate-600 leading-normal mt-1.5">View demographic fields, identities, and next of kin setups.</p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
            <span>Manage Profile</span>
            <ArrowUpRight size={14} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* TILE 2: APPOINTMENTS HUB */}
        <div 
          onClick={() => handleInternalTabJump('appointments')}
          className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:border-emerald-500 hover:bg-slate-50/50 hover:shadow-sm cursor-pointer transition-all group min-h-[150px]"
        >
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-2xs">
              <Calendar size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Appointments Hub</h4>
              <p className="text-[13px] text-slate-600 leading-normal mt-1.5">Schedule, track, or modify pending clinical sessions and checkups.</p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
            <span>View Appointments</span>
            <ArrowUpRight size={14} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* TILE 3: HEALTH RECORDS */}
        <div 
          onClick={() => handleInternalTabJump('records')}
          className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:border-blue-500 hover:bg-slate-50/50 hover:shadow-sm cursor-pointer transition-all group min-h-[150px]"
        >
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-2xs">
              <History size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Health Records</h4>
              <p className="text-[13px] text-slate-600 leading-normal mt-1.5">Access chronological visit logs, notes, diagnoses, and timelines.</p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
            <span>Explore Records</span>
            <ArrowUpRight size={14} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* TILE 4: MY PRESCRIPTIONS */}
        <div 
          onClick={() => handleInternalTabJump('prescriptions')}
          className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:border-amber-500 hover:bg-slate-50/50 hover:shadow-sm cursor-pointer transition-all group min-h-[150px]"
        >
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-2xs">
              <Pill size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">My Prescriptions</h4>
              <p className="text-[13px] text-slate-600 leading-normal mt-1.5">Review active pharmaceutical regimens, dosages, and pharmacy refills.</p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:text-amber-700">
            <span>Check Prescriptions</span>
            <ArrowUpRight size={14} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* TILE 5: INSURANCE COVER */}
        <div 
          onClick={() => handleInternalTabJump('insurance')}
          className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:border-violet-500 hover:bg-slate-50/50 hover:shadow-sm cursor-pointer transition-all group min-h-[150px]"
        >
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-2xs">
              <Shield size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 group-hover:text-violet-600 transition-colors">Insurance Cover</h4>
              <p className="text-[13px] text-slate-600 leading-normal mt-1.5">Manage linked medical policies, copay rules, and corporate structures.</p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-xs font-bold text-violet-600 group-hover:text-violet-700">
            <span>Review Coverage</span>
            <ArrowUpRight size={14} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* TILE 6: VITALS */}
        <div 
          onClick={() => handleInternalTabJump('vitals')}
          className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:border-rose-500 hover:bg-slate-50/50 hover:shadow-sm cursor-pointer transition-all group min-h-[150px]"
        >
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 shadow-2xs">
              <HeartPulse size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors">Vitals</h4>
              <p className="text-[13px] text-slate-600 leading-normal mt-1.5">Monitor critical bio-metrics, body temperature, blood pressure, and triage data history.</p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-xs font-bold text-rose-600 group-hover:text-rose-700">
            <span>Check Health Stats</span>
            <ArrowUpRight size={14} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default OverviewTab;