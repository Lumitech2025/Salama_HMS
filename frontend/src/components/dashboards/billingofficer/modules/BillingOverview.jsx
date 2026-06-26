import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Search, 
  Receipt, 
  CreditCard, 
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
      
      const response = await API.get('queue/', { headers });
      
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
    const patientName = item.patient_name?.toLowerCase() || '';
    const tokenId = item.token_id?.toLowerCase() || '';
    const hrn = item.health_record_number?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return patientName.includes(query) || tokenId.includes(query) || hrn.includes(query);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-400 font-medium text-sm">Loading live billing registry queues...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans antialiased text-slate-800">
      
      {/* ─── PORTAL HEADER ZONE ─────────────────────────────────────── */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            SALAMA HMS / BILLING
          </p>
          <h3 className="text-3xl font-serif font-semibold text-slate-900 mt-1">
            Billing Desk Overview
          </h3>
        </div>
        
        <button
          onClick={() => fetchBillingQueue(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Syncing...' : 'Refresh Hub'}
        </button>
      </div>

      {/* ─── METRIC OVERVIEW GRID ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Active Queue</p>
            <h4 className="text-4xl font-serif font-bold text-slate-900">{metrics.totalToday}</h4>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Awaiting Billing</p>
            <h4 className="text-4xl font-serif font-bold text-slate-900">{metrics.waiting}</h4>
          </div>
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoicing Process</p>
            <h4 className="text-4xl font-serif font-bold text-slate-900">{metrics.processing}</h4>
          </div>
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
            <Receipt size={20} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Discharged Files</p>
            <h4 className="text-4xl font-serif font-bold text-slate-900">{metrics.completed}</h4>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

      </div>

      {/* ─── PATIENTS REGISTRY TABLE ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Billing Queue</h2>
          </div>
          
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-4 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search via Patient Name or Token ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-1">
              <p className="text-sm font-semibold text-slate-700">No Patients in Billing Station</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">There are currently no matching patient files queued for invoice clearance procedures.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-4.5 px-6">Queue ID</th>
                  <th className="py-4.5 px-6">Patient Name</th>
                  <th className="py-4.5 px-6">Health Record Number</th>
                  <th className="py-4.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {filteredPatients.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors group">
                    
                    {/* Queue ID */}
                    <td className="py-5 px-6 whitespace-nowrap">
                      <span className="bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-md tracking-wide shadow-2xs">
                        {item.token_id}
                      </span>
                    </td>

                    {/* Patient Name - Matches the elegant bold layout from your oncology dashboard */}
                    <td className="py-5 px-6 whitespace-nowrap">
                      <span className="font-serif font-bold text-slate-900 tracking-tight text-base">
                        {item.patient_name || 'Unknown Patient'}
                      </span>
                    </td>

                    {/* Health Record Number */}
                    <td className="py-5 px-6 whitespace-nowrap">
                      <span className="bg-blue-50 text-blue-600 border border-blue-100 text-sm font-mono font-semibold px-3 py-1.5 rounded-md">
                        {item.health_record_number || 'N/A'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-5 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => onAction && onAction(item)}
                        className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200/60 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-2xs"
                      >
                        <CreditCard size={14} />
                        Make Payment
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