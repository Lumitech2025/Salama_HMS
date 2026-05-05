import React, { useState } from 'react';
import { 
  ShieldCheck, Search, AlertCircle, CheckCircle, 
  Activity, Printer, History, FileCheck 
} from 'lucide-react';

const InsuranceVerification = ({ initialId = '' }) => {
  const [patientId, setPatientId] = useState(initialId);
  const [status, setStatus] = useState(null); 
  const [insuranceData, setInsuranceData] = useState(null);
  
  // Mock history - in production, fetch this from Django
  const [verifHistory] = useState([
    { id: '1', date: '2026-05-04 09:12', status: 'Active', provider: 'SHA' },
  ]);

  const handleVerify = (e) => {
    if (e) e.preventDefault();
    setStatus('loading');
    
    // Logic: In production, this calls your Django endpoint which proxies to SHA/NHIF
    setTimeout(() => {
      if (patientId === "12345678") {
        setInsuranceData({
          name: "John Doe",
          provider: "SHA (Social Health Authority)",
          scheme: "Outpatient Standard",
          status: "Active",
          validUntil: "2026-12-31",
          balance: "Ksh 12,500",
          requiresPreAuth: true
        });
        setStatus('active');
      } else {
        setStatus('not-found');
      }
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header with System Status */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">
            Insurance <span className="text-teal-600">Gateway</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
            Real-Time SHA / NHIF API Integration
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">SHA Server: Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Search & Result Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={22} />
                <input 
                  type="text" 
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="Enter National ID or Member Number" 
                  className="w-full bg-slate-50 border-2 border-transparent rounded-[2rem] py-6 pl-16 pr-8 text-xl font-black tracking-tight focus:border-teal-500/20 focus:bg-white transition-all outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-teal-600 transition-all shadow-xl"
              >
                Verify Beneficiary Status
              </button>
            </form>
          </div>

          {/* Result Card */}
          {status === 'active' && insuranceData && (
            <div className="bg-teal-600 rounded-[2.5rem] p-1 shadow-2xl">
              <div className="bg-white rounded-[2.4rem] p-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center space-x-5">
                    <div className="bg-teal-100 text-teal-600 p-5 rounded-[1.5rem]">
                      <CheckCircle size={32} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">{insuranceData.name}</h3>
                      <p className="text-teal-600 text-xs font-black uppercase tracking-widest">{insuranceData.provider} • ACTIVE</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-8 border-t border-slate-50">
                  <DataPoint label="Scheme Type" value={insuranceData.scheme} />
                  <DataPoint label="Valid Until" value={insuranceData.validUntil} />
                  <DataPoint label="Benefit Balance" value={insuranceData.balance} isHighlight />
                </div>

                <div className="mt-10 flex gap-4">
                  <button className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border border-slate-200 hover:bg-white transition-all">
                    <Printer size={16} /> Print E-Slip
                  </button>
                  <button className="flex-1 bg-teal-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20 hover:bg-teal-500 transition-all">
                    <FileCheck size={16} /> Request Pre-Auth
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: History & Quick Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-slate-400">
              <History size={18} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Verification Log</h3>
            </div>
            <div className="space-y-4">
              {verifHistory.map((log, i) => (
                <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-4 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{log.provider} ID: {log.id}</p>
                    <p className="text-[9px] text-slate-400 font-medium uppercase">{log.date}</p>
                  </div>
                  <span className="text-[9px] font-black bg-teal-50 text-teal-600 px-2 py-1 rounded-md uppercase">
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for clean UI
const DataPoint = ({ label, value, isHighlight }) => (
  <div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-lg font-bold ${isHighlight ? 'text-teal-600 underline decoration-teal-200' : 'text-slate-900'}`}>{value}</p>
  </div>
);

export default InsuranceVerification;