import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { Loader2 } from 'lucide-react';

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

  // Resolve the active patient object accurately based on current workflow scope
  const currentPatient = selectedPatientContext || patientData;

  const fetchPatientSubRecords = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      // Query records filtering on the focused client model context
      const [appRes, vitRes, noteRes, rxRes, labRes, imgRes, chemoRes, billRes] = await Promise.all([
        API.get(`/appointments/?patient=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/vital-signs/?patient=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/clinical-notes/?patient=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/prescriptions/?patient=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/lab-results/?patient=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/imaging/?patient=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/chemo-sessions/?patient=${patientId}`).catch(() => ({ data: [] })),
        API.get(`/bills/?patient=${patientId}`).catch(() => ({ data: [] })),
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
  }, []);

  const fetchComprehensivePatientData = async () => {
    setLoading(true);
    try {
      const patientRes = await API.get('/patients/').catch(() => ({ data: [] }));
      const patientList = patientRes.data.results || patientRes.data || [];
      
      const assignedProfile = patientList[0] || {
        id: 1,
        name: "COLLINS KIMATHI MWITI",
        health_record_number: "SCC-001/26",
        national_id: "29482024",
        gender: "MALE",
        phone: "254712346105",
        email: "collin****ti@gmail.com",
        cancer_type: "Colorectal Carcinoma (Stage III)",
        address: "Nyeri, Central Region",
        next_of_kin_name: "Mary Mwiti",
        next_of_kin_phone: "+254 711 222333"
      };
      
      setPatientData(assignedProfile);
      
      // Target the active selection context ID over baseline if set
      const activeId = selectedPatientContext?.id || assignedProfile.id;
      await fetchPatientSubRecords(activeId);

    } catch (err) {
      console.error("Critical error mapping client dashboard metrics array:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComprehensivePatientData();
  }, []);

  // Proactively re-trigger query dependency arrays when active context scope updates
  useEffect(() => {
    if (currentPatient?.id) {
      fetchPatientSubRecords(currentPatient.id);
    }
  }, [currentPatient?.id, fetchPatientSubRecords]);

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
          <p className="text-sm font-medium text-slate-500">Initializing Core Workspace Layout...</p>
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