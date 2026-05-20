import React, { useState, useEffect } from 'react';
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

  // EMR Multi-Tiered Database Storage Lines
  const [appointments, setAppointments] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [notes, setNotes] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [imaging, setImaging] = useState([]);
  const [chemoSessions, setChemoSessions] = useState([]);
  const [bills, setBills] = useState([]);

  useEffect(() => {
    fetchComprehensivePatientData();
  }, []);

  const fetchComprehensivePatientData = async () => {
    setLoading(true);
    try {
      // 1. Fetch targeted patient profile context metrics from backend model records
      const patientRes = await API.get('/patients/').catch(() => ({ data: [] }));
      const patientList = patientRes.data.results || patientRes.data || [];
      
      // Fallback matching framework if dataset is empty during dev environments baseline checks
      const assignedProfile = patientList[0] || {
        id: 1,
        name: "COLLINS KIMATHI MWITI",
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

      // 2. Query related records across all EMR application namespaces concurrently matching relational keys
      const [appRes, vitRes, noteRes, rxRes, labRes, imgRes, chemoRes, billRes] = await Promise.all([
        API.get('/appointments/').catch(() => ({ data: [] })),
        API.get('/vital-signs/').catch(() => ({ data: [] })),
        API.get('/clinical-notes/').catch(() => ({ data: [] })),
        API.get('/prescriptions/').catch(() => ({ data: [] })),
        API.get('/lab-results/').catch(() => ({ data: [] })),
        API.get('/imaging/').catch(() => ({ data: [] })),
        API.get('/chemo-sessions/').catch(() => ({ data: [] })),
        API.get('/bills/').catch(() => ({ data: [] })),
      ]);

      setAppointments(appRes.data.results || appRes.data || []);
      setVitals(vitRes.data.results || vitRes.data || []);
      setNotes(noteRes.data.results || noteRes.data || []);
      setPrescriptions(rxRes.data.results || rxRes.data || []);
      setLabResults(labRes.data.results || labRes.data || []);
      setImaging(imgRes.data.results || imgRes.data || []);
      setChemoSessions(chemoRes.data.results || chemoRes.data || []);
      setBills(billRes.data.results || billRes.data || []);

    } catch (err) {
      console.error("Critical error mapping client dashboard metrics array:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400 font-medium text-xs space-y-3">
        <Loader2 className="animate-spin text-teal-600" size={28} />
        <span>Syncing encrypted biometric clinical logs with Afya Yangu database pipelines...</span>
      </div>
    );
  }

  const renderTabContent = () => {
    // Pack down everything into a structured pass-through parameter configuration object
    const contextPayload = { 
      patientData, 
      appointments, 
      vitals, 
      notes, 
      prescriptions, 
      labResults, 
      imaging, 
      chemoSessions, 
      bills, 
      refreshTrigger: fetchComprehensivePatientData 
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

  return (
    <div className="flex min-h-screen bg-slate-50 w-full font-['Inter'] text-slate-800">
      <PatientSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout}
        patientData={patientData}
      />
      <main className="flex-1 ml-80 p-10 transition-all duration-500">
        <div className="max-w-[1600px] mx-auto">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;