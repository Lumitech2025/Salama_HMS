import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Search, 
  Receipt, 
  ArrowRight, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';

const BillingOverview = ({ onAction }) => {
  // ─── STATE MANAGEMENT ─────────────────────────────────────────────
  const [queueData, setQueueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── DATA HYDRATION FROM BACKEND QUEUE ENGINE ──────────────────────
  const fetchBillingQueue = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Fetch data streams directly matching your core system Queue model choices
      const response = await API.get('queue/', { headers });
      
      // Filter constraints: Lock strictly to the BILLING station entries
      const rawQueue = Array.isArray(response.data) ? response.data : response.data.results || [];
      const billingStationQueue = rawQueue.filter(item => item.current_station === 'BILLING');
      
      setQueueData(billingStationQueue);
    } catch (err) {
      console.error("[Salama Billing Hub] Exception loading active queue streams:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingQueue();
    // Establish a standard clinical background polling interval (every 30 seconds)
    const autoRefreshInterval = setInterval(() => fetchBillingQueue(true), 30000);
    return () => clearInterval(autoRefreshInterval);
  }, [fetchBillingQueue]);

  // ─── METRIC MATRICES DERIVATIONS ──────────────────────────────────
  const metrics = React.useMemo(() => {
    const waiting = queueData.filter(p => p.status === 'WAITING').length;
    const processing = queueData.filter(p => p.status === 'UNDER_CONSULTATION' || p.status === 'AWAITING_MEDICATION').length;
    const completed = queueData.filter(p => p.status === 'COMPLETED').length;
    const totalToday = queueData.length;

    return { waiting, processing, completed, totalToday };
  }, [queueData]);

  // ─── SEARCH / FILTER PIPELINES ────────────────────────────────────
  const filteredPatients = queueData.filter(item => {
    const patientName = item.patient?.name?.toLowerCase() || '';
    const tokenId = item.token_id?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return patientName.includes(query) || tokenId.includes(query);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
        <p className="text-slate-400 font-medium text-sm animate-pulse">Hydrating live billing registry queues...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 font-sans antialiased">
      
      {/* ─── HEADER ACTIONS ZONE ────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">
            Billing <span className="text-teal-600 font-light not-italic">Desk Overview</span>
          </h3>
          <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-1">
            Real-time Patient Ledger Verification & Invoicing Hub
          </p>
        </div>
        
        <button
          onClick={() => fetchBillingQueue(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Syncing...' : 'Refresh Hub'}
        </button>
      </div>

      {/* ─── METRIC OVERVIEW GRID (EXCLUDING APPOINTMENTS) ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Total Active Ledger Queue */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Active Queue</p>
            <h4 className="text-4xl font-black text-slate-900 tracking-tighter italic">{metrics.totalToday}</h4>
          </div>
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
        </div>

        {/* Card 2: Awaiting Billing Clearances */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Awaiting Billing</p>
            <h4 className="text-4xl font-black text-orange-600 tracking-tighter italic">{metrics.waiting}</h4>
          </div>
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
        </div>

        {/* Card 3: Currently Processing */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Invoicing Process</p>
            <h4 className="text-4xl font-black text-teal-600 tracking-tighter italic">{metrics.processing}</h4>
          </div>
          <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
            <Receipt size={24} />
          </div>
        </div>

        {/* Card 4: Complete Discharges */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Discharged Files</p>
            <h4 className="text-4xl font-black text-emerald-600 tracking-tighter italic">{metrics.completed}</h4>
          </div>
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
        </div>

      </div>

      {/* ─── LIVE PATIENTS WORKFLOW REGISTRY TABLE ─────────────────── */}
      <div className="bg-white rounded-[3rem] border border-slate-150 shadow-sm overflow-hidden">
        
        {/* Table Search & Utility Sub-Header */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-50/50">
          <div>
            <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">Billing Queue Entries</h4>
            <p className="text-xs text-slate-400 font-bold tracking-wide mt-0.5">Select a tracking token payload sequence below to compile dynamic claims</p>
          </div>
          
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-3.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search via Patient Name or Token ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Dynamic Patient Grid Render Tree */}
        <div className="overflow-x-auto">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-20 px-4 space-y-2">
              <p className="text-base font-bold text-slate-700">No Patients in Billing Station</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">There are currently no matching patient files queued for invoice clearance procedures.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                  <th className="py-5 px-8">Token Identity</th>
                  <th className="py-5 px-6">Patient Demographic Info</th>
                  <th className="py-5 px-6">Priority Level</th>
                  <th className="py-5 px-6">Arrival Timeline</th>
                  <th className="py-5 px-6">Current Status</th>
                  <th className="py-5 px-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {filteredPatients.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    
                    {/* Token Key Identity Code */}
                    <td className="py-5 px-8 whitespace-nowrap">
                      <span className="bg-slate-900 text-white font-mono font-black text-xs px-3 py-1.5 rounded-lg tracking-wider shadow-xs">
                        {item.token_id}
                      </span>
                    </td>

                    {/* Patient Name Data Block */}
                    <td className="py-5 px-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 tracking-tight text-base group-hover:text-teal-600 transition-colors">
                          {item.patient?.name || 'Unknown Patient'}
                        </span>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wide mt-0.5">
                          File ID: #{item.patient?.id || 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Priority Levels Map Badge */}
                    <td className="py-5 px-6 whitespace-nowrap">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                        item.priority === 'EMERGENCY' 
                          ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' 
                          : item.priority === 'HIGH' 
                          ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.priority}
                      </span>
                    </td>

                    {/* Check-In Dynamic Arrival Time Tracking */}
                    <td className="py-5 px-6 whitespace-nowrap text-slate-500 font-medium">
                      <div className="flex flex-col">
                        <span>{new Date(item.entered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">{item.wait_time} mins ago</span>
                      </div>
                    </td>

                    {/* Workflow Ticket Execution Badge Status */}
                    <td className="py-5 px-6 butch-badge whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : item.status === 'WAITING'
                          ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                          : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'COMPLETED' ? 'bg-emerald-500' : item.status === 'WAITING' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        {item.status === 'WAITING' ? 'Awaiting Clearance' : item.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Primary Claim Trigger Routing Action */}
                    <td className="py-5 px-8 text-right whitespace-nowrap">
                      <button
                        onClick={() => onAction && onAction(item)}
                        className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-xs hover:shadow-md hover:shadow-teal-600/10 cursor-pointer"
                      >
                        Process Claims
                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
};

export default BillingOverview;