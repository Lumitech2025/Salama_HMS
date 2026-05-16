import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { HeartHandshake, AlertTriangle, Calendar, UserPlus, HeartCrack, RefreshCw } from 'lucide-react';

// Functional Sub-Module Workspace Imports
import PsychologistSidebar from "./PsychologistSidebar";
import PsychosocialDesk from "./modules/PsychosocialDesk";
import ContinuityTracing from "./modules/ContinuityTracing";
import HroCmeHub from "./modules/HroCmeHub";

const PsychologistDashboard = ({ onLogout }) => {
  const [psychologistTab, setPsychologistTab] = useState('overview');
  const [activeCases, setActiveCases] = useState([]);
  const [bereavementCases, setBereavementCases] = useState([]);
  const [ltfuCount, setLtfuCount] = useState(0);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (psychologistTab === 'overview') {
      fetchDashboardMetrics();
    }
  }, [psychologistTab]);

  const fetchDashboardMetrics = async () => {
    setLoading(true);
    try {
      // 1. Fetch live oncology support enrollments from Django REST layer
      const enrollRes = await API.get('/psychology-enrollments/');
      const enrollmentData = enrollRes.data.results || enrollRes.data;
      setActiveCases(enrollmentData);

      // FIX: Changed python comment '#' to standard JavaScript '//' comment format here
      // Calculate lost-to-follow-up alerts from the dataset dynamically
      const ltfuFilter = enrollmentData.filter(item => item.status === 'LOST_TO_FOLLOW_UP');
      setLtfuCount(ltfuFilter.length);

      // 2. Fetch live bereavement and family palliative tracking logs
      const bereavementRes = await API.get('/bereavement-logs/');
      setBereavementCases(bereavementRes.data.results || bereavementRes.data);

      // 3. Fetch count of unsynced logs for the HRO widget
      const hroRes = await API.get('/session-logs/unsynced-hro/');
      const hroData = hroRes.data.results || hroRes.data;
      setUnsyncedCount(hroData.length);

    } catch (err) {
      console.error("Error populating psychologist core engine metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderHomeOverview = () => (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* 1. CLINICAL KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Therapy Cases', val: `${activeCases.length} Enrolled`, icon: HeartHandshake, color: 'text-teal-600', trend: 'Ongoing Interventions' },
          { label: 'Lost To Follow-Up', val: `${ltfuCount} Flagged`, icon: AlertTriangle, color: 'text-rose-600', trend: 'Needs Active Tracing' },
          { label: 'Grief & Bereavement', val: `${bereavementCases.length} Families`, icon: HeartCrack, color: 'text-blue-600', trend: 'Caregiver Support Logs' },
          { label: 'Daily HRO Registry', val: `${unsyncedCount} Pending`, icon: Calendar, color: 'text-amber-600', trend: 'Awaiting Records Sync' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden text-left">
             <div className={`p-3 rounded-xl w-fit mb-5 bg-slate-50 ${card.color}`}><card.icon size={22} /></div>
             <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
             <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{card.val}</h3>
             <p className="mt-3 text-[10px] text-slate-400 font-medium">{card.trend}</p>
          </div>
        ))}
      </div>

      {/* 2. REGISTRY WORKSPACE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left">
        
        {/* Left Side Table: Active Support Registry */}
        <div className="xl:col-span-8 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
            <div>
              <h4 className="text-xl font-bold text-slate-900 tracking-tight">Psychology Support Registry</h4>
              <p className="text-xs text-slate-400 mt-1">Active oncology patients enrolled in counselling services</p>
            </div>
            <div className="flex gap-2 self-start">
              <button onClick={fetchDashboardMetrics} className="p-3 bg-slate-50 border hover:bg-slate-100 rounded-xl transition-all" title="Synchronize Data">
                <RefreshCw size={12} className={loading ? 'animate-spin text-teal-500' : 'text-slate-500'} />
              </button>
              <button 
                onClick={() => setPsychologistTab('psychosocial')}
                className="bg-slate-900 hover:bg-slate-800 text-teal-400 px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
              >
                <UserPlus size={14} /> Enroll Patient
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[650px] text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-4 px-6 font-semibold text-left">Patient & Location</th>
                  <th className="p-4 font-semibold text-left">Case ID</th>
                  <th className="p-4 text-center font-semibold">Psychological Stage</th>
                  <th className="p-4 text-right px-6 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="4" className="p-12 text-center text-slate-400 animate-pulse font-medium">Loading live clinical charts...</td></tr>
                ) : activeCases.length > 0 ? activeCases.map((pt, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-5 px-6 text-left">
                      <p className="font-semibold text-slate-900">{pt.patient_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{pt.diagnosis}</p>
                    </td>
                    <td className="p-5 text-left">
                      {/* FIX: Changed backticks to regular string formatting to prevent empty token compilation bugs */}
                      <span className="bg-slate-100 text-slate-700 font-mono text-[11px] px-2.5 py-1 rounded-md border border-slate-200/60">PSY-2026-{pt.id}</span>
                      <p className="text-[10px] text-slate-400 mt-1.5">Loc: {pt.department_display || pt.location_department}</p>
                    </td>
                    <td className="p-5 text-center text-slate-700 font-medium">
                      {pt.stage_display || pt.current_stage}
                    </td>
                    <td className="p-5 text-right px-6">
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium border ${
                        pt.status === 'LOST_TO_FOLLOW_UP' 
                          ? 'bg-rose-50 text-rose-600 border-rose-100' 
                          : pt.status === 'BAD_NEWS_DEBRIEF' 
                          ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : 'bg-teal-50 text-teal-600 border-teal-100'
                      }`}>
                        {pt.status_display || pt.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="p-16 text-center text-slate-300 font-medium">No oncology patients currently enrolled. Open the intake module to create a record.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Card: Caregivers & Bereavement Support */}
        <div className="xl:col-span-4 bg-[#020617] rounded-[2rem] p-8 text-white flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-bold text-white tracking-tight">Grief & Bereavement</h4>
              <p className="text-xs text-slate-400 mt-1">Caregiver & family tracking repository</p>
            </div>
            
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {bereavementCases.length > 0 ? bereavementCases.map((c, i) => (
                <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-2xl text-left">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">BRV-{c.id}</span>
                    <span className="text-[11px] font-medium text-teal-400">{c.support_status || c.status}</span>
                  </div>
                  <p className="font-semibold text-white text-sm">{c.primary_contact_name || c.primaryContact}</p>
                  <p className="text-xs text-slate-400 mt-1">Contact: {c.contact_phone}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-500 pt-8 text-center font-medium">No family grief support sessions currently active.</p>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => setPsychologistTab('psychosocial')}
            className="w-full mt-8 bg-teal-600 hover:bg-teal-500 text-white py-4 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-lg shadow-teal-600/10"
          >
            Open Evaluation Desk
          </button>
        </div>

      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (psychologistTab) {
      case 'overview': return renderHomeOverview();
      case 'psychosocial': return <PsychosocialDesk />;
      case 'tracing': return <ContinuityTracing />;
      case 'hro_cme': return <HroCmeHub />;
      default: return renderHomeOverview();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 w-full">
      <PsychologistSidebar 
        activeTab={psychologistTab} 
        setActiveTab={setPsychologistTab} 
        onLogout={onLogout}
        stats={{ activeCases: activeCases.length, ltfuAlerts: ltfuCount }}
      />
      <main className="flex-1 ml-80 p-10 transition-all duration-500">
        <div className="max-w-[1600px] mx-auto">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default PsychologistDashboard;