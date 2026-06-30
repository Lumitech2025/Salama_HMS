import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { Loader2, AlertCircle } from 'lucide-react';

// Unified Layout Navigation Track Sidebar
import PatientSidebar from "./PatientSidebar";

// SHA Clean Interface Sub-Module Alignments
import OverviewTab from "./modules/OverviewTab";
import ProfileTab from "./modules/ProfileTab";
import VitalsTab from "./modules/VitalsTab";
import AppointmentsTab from "./modules/AppointmentsTab";
import RecordsTab from "./modules/RecordsTab";
import PrescriptionsTab from "./modules/PrescriptionsTab";
import InsuranceTab from "./modules/InsuranceTab";

const PatientDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🎯 Persistent Global Workspace Focus state for Active Selection
  const [selectedPatientContext, setSelectedPatientContext] = useState(null);

  // EMR Multi-Tiered Database Storage Lines
  const [appointments, setAppointments] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [notes, setNotes] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [imaging, setImaging] = useState([]);
  const [chemoSessions, setChemoSessions] = useState([]);
  const [bills, setBills] = useState([]);

  // Resolve the active patient object dynamically based on current workflow scope
  const currentPatient = selectedPatientContext || patientData;

  // Manual explicit header generator matrix
  const getRequestConfig = useCallback(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, []);

  // Fetch contextual sub-records strictly tailored to the targeted patient
  const fetchPatientSubRecords = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      const config = getRequestConfig();
      console.log(`📡 Fetching sub-records from backend for Patient ID: ${patientId}`);

      const [appRes, vitRes, noteRes, rxRes, labRes, imgRes, chemoRes, billRes] = await Promise.all([
        API.get(`/appointments/?patient=${patientId}`, config).catch(() => ({ data: [] })),
        API.get(`/vitals/?patient=${patientId}`, config).catch(() => ({ data: [] })),
        API.get(`/clinical-notes/?patient=${patientId}`, config).catch(() => ({ data: [] })),
        API.get(`/prescriptions/?patient=${patientId}`, config).catch(() => ({ data: [] })),
        API.get(`/lab-results/?patient=${patientId}`, config).catch(() => ({ data: [] })),
        API.get(`/imaging/?patient=${patientId}`, config).catch(() => ({ data: [] })),
        API.get(`/chemo-sessions/?patient=${patientId}`, config).catch(() => ({ data: [] })),
        API.get(`/bills/?patient=${patientId}`, config).catch(() => ({ data: [] })),
      ]);

      setAppointments(appRes.data.results || appRes.data || []);
      setVitals(vitRes.data.results || vitRes.data || []);
      setNotes(noteRes.data.results || noteRes.data || []);
      setPrescriptions(rxRes.data.results || rxRes.data || []);
      setLabResults(labRes.data.results || labRes.data || []);
      setImaging(imgRes.data.results || imgRes.data || []);
      setChemoSessions(chemoRes.data.results || chemoRes.data || []);
      setBills(billRes.data.results || billRes.data || []);
    } catch (error) {
      console.error("Error retrieving contextual medical files:", error);
    }
  }, [getRequestConfig]);

  // Initial dashboard load to find the baseline logged-in user profile
  const fetchComprehensivePatientData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const config = getRequestConfig();
      const patientRes = await API.get('/patients/', config);
      const patientList = patientRes.data.results || patientRes.data || [];
      
      if (patientList.length === 0) {
        console.log("No personal patient row. Initializing overview selection context instead.");
        
        // Fetch any existing records to give an initial workflow context
        const generalLookUp = await API.get('/patients/?all=true', config).catch(() => ({ data: [] }));
        const list = generalLookUp.data.results || generalLookUp.data || [];
        
        if (list.length > 0) {
          // Set the state baseline context. The single tracking useEffect below will manage the initial data fetch.
          setSelectedPatientContext(list[0]);
          setLoading(false);
          return;
        } else {
          throw new Error("No historical patient registry information exists in the database.");
        }
      }
      
      // Standard path for real patients
      const assignedProfile = patientList[0];
      setPatientData(assignedProfile);

    } catch (err) {
      console.error("Critical error mapping client dashboard metrics array:", err);
      setError(err.message || "Failed to load core workspace context.");
    } finally {
      setLoading(false);
    }
  }, [getRequestConfig]);

  // Handle baseline initialization once on mount
  useEffect(() => {
    fetchComprehensivePatientData();
  }, [fetchComprehensivePatientData]);

  // 🎯 UNIFIED SINGLE SOURCE OF TRUTH FOR DATA SYNC: 
  // Runs whenever currentPatient swaps, ensuring sub-records are fetched for the active context.
  useEffect(() => {
    const realPatientId = currentPatient?.patient?.id || currentPatient?.id;
    
    if (realPatientId) {
      fetchPatientSubRecords(realPatientId);
    }
  }, [currentPatient, fetchPatientSubRecords]);

  const renderTabContent = () => {
    const contextPayload = { 
      patientData: currentPatient, 
      appointments, 
      vitals, 
      notes, 
      prescriptions, 
      labResults, 
      imaging, 
      chemoSessions, 
      bills,
      setActiveTab,
      onNavigateToTab: setActiveTab, 
      refreshTrigger: fetchComprehensivePatientData,
      setSelectedPatient: setSelectedPatientContext,
      activePatientContext: selectedPatientContext
    };

    switch (activeTab) {
      case 'overview': return <OverviewTab {...contextPayload} />;
      case 'profile': return <ProfileTab {...contextPayload} />;
      case 'vitals': return <VitalsTab {...contextPayload} />;
      case 'appointments': return <AppointmentsTab {...contextPayload} />;
      case 'records': return <RecordsTab {...contextPayload} />;
      case 'prescriptions': return <PrescriptionsTab {...contextPayload} />;
      case 'insurance': return <InsuranceTab {...contextPayload} />;
      default: return <OverviewTab {...contextPayload} />;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">Initializing Workspace Environment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-6">
        <div className="bg-white border border-red-200 p-6 rounded-2xl max-w-md w-full shadow-sm text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Workspace Error</h3>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <button 
            onClick={fetchComprehensivePatientData}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 w-full font-['Inter'] text-slate-800 antialiased overflow-x-hidden">
      <PatientSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout}
        patientData={currentPatient}
      />
      <main className="flex-1 min-w-0 p-6 md:p-10 lg:p-12 overflow-y-auto max-h-screen">
        <div className="w-full h-full max-w-none">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;