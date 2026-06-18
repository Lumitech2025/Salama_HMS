import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Clock, CheckCircle, User, ShieldCheck, Search, 
  Loader2, Play
} from 'lucide-react';
import API from '@/api/api';

const BillingHome = ({ onRouteToPayment }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  
  // Patient-centric operational metrics
  const [stats, setStats] = useState({
    patientsOnQueue: 0,
    patientsAttended: 0,
    patientsPayingViaCash: 0,
    patientsPayingViaInsurance: 0
  });

  // Comprehensive synchronization with the Salama HMS data stream targeting the BILLING station
  const fetchBillingDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch live queue allocations restricted to the BILLING service station boundary
      const resQueue = await API.get('/queue?current_station=BILLING').catch(() => ({ data: [] }));
      const rawQueue = resQueue.data?.results || resQueue.data || [];
      
      // Filter out completed records to focus strictly on those waiting or actively being handled at this station
      const activeQueue = rawQueue.filter(item => item.status === 'WAITING' || item.status === 'TRIAGED' || !item.status);
      setQueue(activeQueue);

      // 2. Fetch global master registry containing all RegistrationRecords in the system
      const resRegistrations = await API.get('/registrations/').catch(() => ({ data: [] }));
      
      // Extract array safely dealing with DRF paginated wrappers (.results) vs plain lists
      const rawRegistrations = resRegistrations.data?.results || (Array.isArray(resRegistrations.data) ? resRegistrations.data : []);

      // 3. Directly calculate counts by scanning all RegistrationRecords saved in the database
      const globalCashCount = rawRegistrations.filter(record => {
        const mode = record.payment_mode || '';
        return mode.toUpperCase() === 'CASH';
      }).length;

      const globalInsuranceCount = rawRegistrations.filter(record => {
        const mode = record.payment_mode || '';
        return mode.toUpperCase() === 'INSURANCE';
      }).length;

      // Update the component states directly using the global registrations array
      setStats({
        patientsOnQueue: activeQueue.length,
        patientsAttended: rawQueue.filter(p => p.status === 'COMPLETED').length,
        patientsPayingViaCash: globalCashCount,
        patientsPayingViaInsurance: globalInsuranceCount
      });

    } catch (err) {
      console.error("Critical error sync failure inside Billing Desk ledger:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingDashboardData();
    const liveHeartbeat = setInterval(fetchBillingDashboardData, 15000); // 15s clinical sync cycle
    return () => clearInterval(liveHeartbeat);
  }, [fetchBillingDashboardData]);

  // Client-side text filter implementations matching DoctorHome logic fields
  const filteredQueue = useMemo(() => {
    return queue.filter(p => {
      const name = p.patient_name || p.full_name || "";
      const idNo = p.patient_id_no || p.phone || "";
      const token = p.token_id || p.queue_id || "";
      const recordNum = p.health_record_number || "";
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             idNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
             token.toLowerCase().includes(searchQuery.toLowerCase()) ||
             recordNum.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [queue, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] antialiased">
      
      {/* HEADER SECTION (Verbatim to DoctorHome.jsx styling) */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 font-mono">
          SALAMA HMS / BILLING HUB
        </span>
        <h1 className="text-3xl font-serif text-slate-900 font-black tracking-tight">
          Command Center
        </h1>
      </div>

      {/* 4-CARD PATIENT KPI TIER - Sized and designed matching DoctorHome exactly */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          label="Patients on Queue" 
          value={stats.patientsOnQueue} 
          icon={<Clock className="text-blue-600"/>} 
        />
        <KPICard 
          label="Patients Attended" 
          value={stats.patientsAttended} 
          icon={<CheckCircle className="text-green-600"/>} 
        />
        <KPICard 
          label="Patients paying via Cash" 
          value={stats.patientsPayingViaCash} 
          icon={<User className="text-amber-600"/>} 
        />
        <KPICard 
          label="Patients paying via Insurance" 
          value={stats.patientsPayingViaInsurance} 
          icon={<ShieldCheck className="text-purple-600"/>} 
        />
      </div>

      {/* CONTROL BAR WITH INTEGRATED SEARCH DESK BLOCK */}
      <div className="w-full flex items-center justify-between pt-2">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 font-mono flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Active Station Queue Registry
        </h3>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active billing queue..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm text-sm font-medium" 
          />
        </div>
      </div>

      {/* DATATABLE LIVE QUEUE SHELF CONTAINER */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[450px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-10">Incoming Patient</th>
                <th className="p-10">Record Number</th>
                <th className="p-10 text-center">Token ID</th>
                <th className="p-10 text-center">Payment Classification</th>
                <th className="p-10 text-right pr-16">Workflow Desk Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400 font-black uppercase tracking-widest text-xs">
                      <Loader2 className="animate-spin text-blue-500" size={24} />
                      Syncing Billing Station Records...
                    </div>
                  </td>
                </tr>
              ) : filteredQueue.length > 0 ? filteredQueue.map((pat) => {
                const isCash = (pat.payment_mode || pat.payment_method || '').toUpperCase() === 'CASH';
                const displayName = pat.patient_name || pat.full_name || "UNREGISTERED ENCOUNTER";
                
                return (
                  <tr key={pat.id} className="hover:bg-blue-50/20 transition-all group">
                    {/* Patient Demographics */}
                    <td className="px-10 py-8">
                      <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{displayName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic font-mono mt-0.5">
                        {pat.patient_id_no || pat.phone || 'NO PHONE LINKED'}
                      </p>
                    </td>
                    
                    {/* Medical Record Code Tag */}
                    <td className="px-10 py-8">
                      <span className="text-sm font-bold font-mono text-blue-600 bg-blue-50/50 border border-blue-100/70 px-3 py-1.5 rounded-lg">
                        {pat.health_record_number || `HRN-${String(pat.id).padStart(4, '0')}`}
                      </span>
                    </td>
                    
                    {/* Active Token Value */}
                    <td className="px-10 py-8 text-center">
                      <span className="bg-slate-900 text-white px-4 py-2 rounded-xl font-mono font-bold shadow-lg group-hover:bg-blue-600 transition-colors">
                        {pat.token_id || pat.queue_id || `T-${pat.id}`}
                      </span>
                    </td>
                    
                    {/* Payment Mode Badges */}
                    <td className="px-10 py-8 text-center">
                      <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border italic ${
                        isCash 
                          ? 'bg-amber-50 text-amber-700 border-amber-100' 
                          : 'bg-purple-50 text-purple-700 border-purple-100'
                      }`}>
                        {pat.payment_mode || pat.payment_method || 'CASH'}
                      </span>
                    </td>
                    
                    {/* Universal Redirect Action directly routing to the PaymentPortal layout tab */}
                    <td className="px-10 py-8 text-right pr-16">
                      <button 
                        type="button"
                        onClick={() => onRouteToPayment(pat)} 
                        className="bg-blue-50 text-slate-900 border border-blue-100 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ml-auto hover:bg-blue-600 hover:text-white transition-all shadow-xl"
                      >
                        Make Payment<Play size={14} fill="currentColor"/>
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="5" className="py-40 text-center text-slate-300 italic font-black uppercase tracking-widest text-xs">
                    {searchQuery ? "No patients match your search filter" : "No pending patients in active billing queue"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Reusable KPI Architecture matching DoctorHome Exactly
const KPICard = ({ label, value, icon, sub, color }) => {
  const borderColors = {
    blue: 'hover:border-blue-500',
    green: 'hover:border-green-500',
    amber: 'hover:border-amber-500',
    purple: 'hover:border-purple-500'
  };

  const textColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600'
  };

  const pulseColors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group transition-all ${borderColors[color] || 'hover:border-slate-500'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      <h4 className="text-4xl font-black text-slate-950 tracking-tighter italic">
        {value}
      </h4>
      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">
        {label}
      </p>
      <p className={`text-[9px] font-black uppercase mt-3 flex items-center gap-2 ${textColors[color] || 'text-slate-600'}`}>
        <span className={`w-1 h-1 rounded-full animate-pulse ${pulseColors[color] || 'bg-slate-500'}`} /> 
        {sub}
      </p>
    </div>
  );
};

export default BillingHome;