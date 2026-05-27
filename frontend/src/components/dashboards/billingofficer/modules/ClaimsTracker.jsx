import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Coins,
  Layers
} from 'lucide-react';

// Note: If you break InsuranceClaimsHub into sub-components later, 
// you can import them here directly from:
// ../../Finance/modules/InsuranceClaimsHub/

const ClaimsTracker = () => {
  // Tabs to map directly to the Insurance Hub architecture
  const [activeTab, setActiveTab] = useState('registry');

  // Live state placeholders matching the Revenue Cycle Management system
  const [claims] = useState([
    { id: 'CLM-7701', patient: 'John Doe', scheme: 'NHIF/SHA Oncology', amount: 150000, status: 'Pending Pre-Auth', date: '2026-05-01' },
    { id: 'CLM-7688', patient: 'Jane Wambui', scheme: 'APA Insurance', amount: 45000, status: 'Approved', date: '2026-04-28' },
    { id: 'CLM-7650', patient: 'Musa Hassan', scheme: 'Self-Pay/Co-Pay', amount: 12000, status: 'Settled', date: '2026-04-25' },
    { id: 'CLM-7642', patient: 'Esther Njeri', scheme: 'NHIF/SHA Oncology', amount: 280000, status: 'Query Raised', date: '2026-04-20' },
  ]);

  const [batches] = useState([
    { id: 'BAT-2026-004', insurer: 'NHIF/SHA', claimsCount: 42, totalAmount: 5400000, status: 'Partially Settled', date: '2026-05-10' },
    { id: 'BAT-2026-003', insurer: 'APA Insurance', claimsCount: 12, totalAmount: 890000, status: 'Fully Settled', date: '2026-04-30' },
  ]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Approved': case 'Fully Settled': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pending Pre-Auth': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Query Raised': case 'Partially Settled': return 'bg-red-100 text-red-700 border-red-200';
      case 'Settled': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Claims & Pre-Authorizations</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Oncology Revenue Cycle Management</p>
        </div>
        
        {activeTab === 'registry' && (
          <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-teal-600 transition-all shadow-lg shadow-slate-200">
            <FileText size={18} /> New Authorization Request
          </button>
        )}
        {activeTab === 'batches' && (
          <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-teal-600 transition-all shadow-lg shadow-slate-200">
            <Coins size={18} /> Process New Remittance
          </button>
        )}
      </div>

      {/* RCM KPI Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Pre-Auth', count: 14, icon: Clock, color: 'text-amber-600' },
          { label: 'Approved Today', count: 8, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Queried/Denied', count: 3, icon: AlertCircle, color: 'text-red-600' },
          { label: 'Active Schemes', count: 12, icon: ShieldCheck, color: 'text-blue-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm">
            <stat.icon className={`${stat.color} mb-3`} size={24} />
            <p className="text-2xl font-black text-slate-900">{stat.count}</p>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Unified Insurance Navigation Hub Controller */}
      <div className="flex bg-slate-100/70 p-1.5 rounded-2xl w-fit border border-slate-200/40">
        <button 
          onClick={() => setActiveTab('registry')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'registry' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <FileText size={14} /> Claims Registry
        </button>
        <button 
          onClick={() => setActiveTab('batches')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'batches' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Coins size={14} /> Remittance Batches
        </button>
        <button 
          onClick={() => setActiveTab('payers')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'payers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Layers size={14} /> Insurers/Payers
        </button>
      </div>

      {/* Dynamic Render Section based on Selection */}
      {activeTab === 'registry' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/30">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Claim ID or Patient Name..." 
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none font-medium"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all">
              <Filter size={16} /> Filter by Payer
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Claim Details</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payer / Scheme</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Amount</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {claims.map((claim) => (
                  <tr key={claim.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-800">{claim.patient}</p>
                      <span className="text-[10px] font-mono text-slate-400">{claim.id} • {claim.date}</span>
                    </td>
                    <td className="px-8 py-6 font-semibold text-slate-600 text-sm">{claim.scheme}</td>
                    <td className="px-8 py-6 font-black text-slate-900">KES {claim.amount.toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(claim.status)}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
                        <ArrowUpRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch ID</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurer Body</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Claims</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Value Amount</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reconciliation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-800">{batch.id}</p>
                      <span className="text-[10px] font-mono text-slate-400">Created: {batch.date}</span>
                    </td>
                    <td className="px-8 py-6 text-sm font-semibold text-slate-600">{batch.insurer}</td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-700">{batch.claimsCount} Claims</td>
                    <td className="px-8 py-6 font-black text-slate-900">KES {batch.totalAmount.toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(batch.status)}`}>
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payers' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 text-center text-slate-400 font-medium text-sm">
          <ShieldCheck className="mx-auto mb-3 text-slate-300" size={32} />
          Insurer configurations & gateway routing are mirrored from the main Finance Portal module.
        </div>
      )}

    </div>
  );
};

export default ClaimsTracker;