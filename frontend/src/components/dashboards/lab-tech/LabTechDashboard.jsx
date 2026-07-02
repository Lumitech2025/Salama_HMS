import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  FlaskConical, Clock, Beaker, Users, ArrowRight, Search, 
  RefreshCcw, Loader2, Microscope, Activity, LayoutGrid, Layers, ClipboardList
} from 'lucide-react';

import LabSidebar from './LabSidebar';
import DiagnosticWorklist from './modules/DiagnosticWorklist';
import PatientHistory from './modules/PatientHistory';
import LabReference from './modules/LabReference';
import LabInventory from './modules/LabInventory';
import LabRequisitionsTab from './modules/LabRequisitionsTab';
import LaboratoryResults from "../oncologist/modules/LaboratoryResults";

const getShortForm = (label) => {
  const targetString = label || '';
  const match = targetString.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  const fallbackMap = {
    'full blood count': 'CBC',
    'urea, electrolytes & creatinine': 'U&E',
    'liver function test': 'LFT',
    'prostate specific antigen': 'PSA',
    'urinalysis (routine)': 'URINE',
    'urinalysis': 'URINE',
    'blood group & cross match': 'BG/XM',
    'blood slide (malaria parasite)': 'BS/MP',
    'blood slide for malaria': 'BS/MP'
  };

  const cleanString = targetString.toLowerCase().trim();
  return fallbackMap[cleanString] || targetString.toUpperCase();
};


const LabTechDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0, 
    todays_tests: 0, 
    total_lifetime_tests: 0
  });

  const fetchLabData = useCallback(async () => {
    setLoading(true);
    try {

        const [resQueue, resAnalytics] = await Promise.all([
            API.get('/queue', { params: { current_station: 'LAB', status: 'WAITING' } }),
            API.get('/queue/analytics', { params: { station: 'LAB' } })
        ]);
        
        const queueData = resQueue.data.results || resQueue.data || [];

        const enrichedQueue = await Promise.all(queueData.map(async (order) => {
            let rawTests = order.requested_tests || [];
            
            if (!order.requested_tests || order.requested_tests.length === 0) {
                try {
                    const visitId = order.visit || order.visit_id;
                    if (visitId) {
                        const resOrders = await API.get('/lab-orders/', { params: { visit: visitId } });
                        const ordersList = resOrders.data.results || resOrders.data || [];
                        
                        const activeOrder = ordersList.find(o => 
                            o.status === 'PENDING' || o.status === 'PROCESSING' || o.status === 'WAITING'
                        );
                        
                        if (activeOrder && activeOrder.requested_tests) {
                            rawTests = activeOrder.requested_tests;
                        }
                    }
                } catch (orderErr) {
                    console.error(`Failed resolving lab orders for patient assignment #${order.id}`, orderErr);
                }
            }
            const longFormTests = rawTests.map(test => {
                if (!test) return '';
                if (typeof test === 'object') {
                    return test.test_name || test.name || test.label || '';
                }
                return String(test);
            }).filter(Boolean);
            
            return {
                ...order,
                requested_tests: longFormTests.map(testName => getShortForm(testName)),
                test_count: longFormTests.length
            };
        }));

        setQueue(enrichedQueue);
        
        setStats({
            pending: enrichedQueue.length,
            todays_tests: resAnalytics.data.today_total || 0,
            total_lifetime_tests: resAnalytics.data.total_registrations || 0 
        });
    } catch (err) {
        console.error("Lab Sync Error", err);
    } finally {
        setLoading(false);
    }
}, []);

  useEffect(() => {
    fetchLabData();
    const interval = setInterval(fetchLabData, 30000);
    return () => clearInterval(interval);
  }, [fetchLabData]);

  const renderModule = () => {
    switch (activeTab) {
      case 'diagnostics': return <DiagnosticWorklist />;
      case 'history': return <LaboratoryResults />;
      case 'reference': return <LabReference />;
      case 'inventory': return <LabInventory />;
      case 'requisitions': return <LabRequisitionsTab />;
      default: return (
        <div className="space-y-10 animate-in fade-in duration-700">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard icon={Clock} label="Waitlist Queue" value={stats.pending} color="blue" />
            <StatCard icon={Beaker} label="Today's Lab Tests" value={stats.todays_tests} color="teal" />
            <StatCard icon={Layers} label="Total Tests Logged" value={stats.total_lifetime_tests} color="indigo" />
          </div>

          <div className="flex items-center justify-between bg-[#020617] p-5 rounded-[2.5rem] shadow-2xl">
              <div className="relative w-full md:w-[450px] ml-2">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Find patient sample..." 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-14 pr-6 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>
              <button onClick={fetchLabData} className="mr-4 p-4 hover:bg-white/10 rounded-2xl transition-all group">
                <RefreshCcw size={20} className={`text-teal-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
          </div>

          <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex items-center gap-4 bg-white">
                <div className="p-4 bg-teal-50 rounded-2xl text-teal-600 shadow-sm">
                    <Microscope size={24} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Diagnostic Worklist</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Active samples requiring verification</p>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-50 bg-slate-50/50">
                    <th className="px-12 py-6">Patient Identity</th>
                    <th className="px-12 py-6">Health Record No.</th>
                    <th className="px-12 py-6">Token</th>
                    <th className="px-12 py-6">Requested tests</th>
                    <th className="px-12 py-6 text-right">No. of Tests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-32 text-center font-black text-slate-400 uppercase text-[10px] tracking-widest italic">
                        <Loader2 className="animate-spin mx-auto mb-4 text-teal-500" size={32} />
                        Syncing Diagnostic Pipeline...
                      </td>
                    </tr>
                  ) : queue.length > 0 ? (
                    queue.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => setActiveTab('diagnostics')}>
                        <td className="px-12 py-8">
                          <p className="font-black text-slate-900 text-base uppercase tracking-tight">{p.patient_name}</p>
                        </td>
                        <td className="px-12 py-8">
                          <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{p.health_record_number || 'N/A'}</p>
                        </td>
                        <td className="px-12 py-8">
                          <span className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-teal-600 shadow-sm italic">
                            #{p.token_id}
                          </span>
                        </td>
                        <td className="px-12 py-8">
                            <div className="flex flex-wrap gap-2">
                                {p.requested_tests?.map((test, idx) => (
                                    <span key={idx} className="bg-slate-950 text-teal-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-800 shadow-sm">
                                        {test}
                                    </span>
                                ))}
                                {(!p.requested_tests || p.requested_tests.length === 0) && (
                                  <span className="text-slate-400 italic text-[10px]">Processing Order...</span>
                                )}
                            </div>
                        </td>
                        <td className="px-12 py-8 text-right font-black text-slate-900 text-lg italic">
                            {p.test_count || 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-32 text-center text-slate-300 font-bold uppercase tracking-[0.4em] text-xs">
                        Worklist Clear / No Pending Samples
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen overflow-hidden font-['Inter']">
      <LabSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto max-h-screen p-10 lg:p-16">
        <div className="max-w-[1400px] mx-auto">
          {renderModule()}
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const themes = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100"
  };
  return (
    <div className={`${themes[color]} p-8 rounded-[3rem] border-2 shadow-sm relative overflow-hidden group transition-all duration-500`}>
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className="p-3 bg-white rounded-2xl shadow-md group-hover:rotate-6 transition-transform">
            <Icon size={20} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{label}</p>
      </div>
      <p className="text-5xl font-black tracking-tighter relative z-10 italic leading-none">{value}</p>
      <Activity size={100} className="absolute -right-6 -bottom-6 opacity-[0.04] rotate-12" />
    </div>
  );
};

export default LabTechDashboard;