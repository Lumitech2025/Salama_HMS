import React, { useState } from 'react';
import { ShieldCheck, Search, AlertCircle, CheckCircle, CreditCard, Activity } from 'lucide-react';

const InsuranceVerification = () => {
  const [patientId, setPatientId] = useState('');
  const [status, setStatus] = useState(null); // 'loading', 'active', 'inactive', 'not-found'
  const [insuranceData, setInsuranceData] = useState(null);

  const handleVerify = (e) => {
    e.preventDefault();
    setStatus('loading');
    
    // Simulate API call to your Django backend
    // In production, this hits your SHA/NHIF integration endpoint
    setTimeout(() => {
      if (patientId === "12345678") {
        setInsuranceData({
          name: "John Doe",
          provider: "SHA (Social Health Authority)",
          scheme: "Outpatient Standard",
          status: "Active",
          validUntil: "2026-12-31",
          balance: "Ksh 12,500"
        });
        setStatus('active');
      } else {
        setStatus('not-found');
      }
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Insurance Gateway</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Real-time SHA / NHIF Verification</p>
        </div>
        <div className="flex space-x-2">
          <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 flex items-center space-x-2">
            <Activity size={14} className="text-teal-600" />
            <span className="text-[10px] font-black text-slate-600 uppercase">System Status: Online</span>
          </div>
        </div>
      </div>

      {/* Verification Input */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
        <form onSubmit={handleVerify} className="relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-4">
            National ID or Policy Number
          </label>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter ID for status lookup..." 
                className="w-full bg-slate-50 border-none rounded-3xl py-5 pl-16 pr-8 text-lg font-bold focus:ring-4 focus:ring-teal-500/10 transition-all outline-none"
              />
            </div>
            <button 
              type="submit"
              className="bg-slate-900 text-white px-10 rounded-3xl font-bold text-xs uppercase tracking-widest hover:bg-teal-600 transition-all shadow-xl"
            >
              Verify Status
            </button>
          </div>
        </form>
      </div>

      {/* Results Display */}
      {status === 'loading' && (
        <div className="text-center py-20 animate-pulse">
          <ShieldCheck size={48} className="mx-auto text-teal-200 mb-4 animate-bounce" />
          <p className="text-slate-400 font-bold uppercase tracking-tighter italic text-sm">Querying Insurance Servers...</p>
        </div>
      )}

      {status === 'active' && insuranceData && (
        <div className="bg-teal-50 border-2 border-teal-200 rounded-[3rem] p-10 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center space-x-4">
              <div className="bg-teal-600 text-white p-4 rounded-3xl shadow-lg shadow-teal-900/20">
                <CheckCircle size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-teal-900 tracking-tight">Active Coverage</h3>
                <p className="text-teal-700/70 text-xs font-bold uppercase tracking-widest leading-none mt-1">Verification Successful</p>
              </div>
            </div>
            <button className="bg-white text-teal-700 border border-teal-200 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all">
              Print Slip
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-teal-200/50 pt-8">
            <div>
              <p className="text-[10px] font-black text-teal-700/50 uppercase tracking-widest mb-1">Beneficiary</p>
              <p className="text-lg font-bold text-teal-900">{insuranceData.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-teal-700/50 uppercase tracking-widest mb-1">Provider</p>
              <p className="text-lg font-bold text-teal-900">{insuranceData.provider}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-teal-700/50 uppercase tracking-widest mb-1">Scheme</p>
              <p className="text-lg font-bold text-teal-900">{insuranceData.scheme}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-teal-700/50 uppercase tracking-widest mb-1">Valid Until</p>
              <p className="text-lg font-bold text-teal-900">{insuranceData.validUntil}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-teal-700/50 uppercase tracking-widest mb-1">Current Limit</p>
              <p className="text-lg font-bold text-teal-900 italic underline">{insuranceData.balance}</p>
            </div>
          </div>
        </div>
      )}

      {status === 'not-found' && (
        <div className="bg-red-50 border border-red-100 rounded-[2.5rem] p-10 flex items-center space-x-6 animate-in slide-in-from-top-4">
          <div className="bg-red-100 text-red-600 p-4 rounded-2xl">
            <AlertCircle size={28} />
          </div>
          <div>
            <h4 className="text-red-900 font-black tracking-tight">Verification Failed</h4>
            <p className="text-red-700/70 text-sm font-medium">The ID provided is not found or has expired. Please advise the patient to renew or pay as a cash patient.</p>
          </div>
          <button className="bg-red-600 text-white px-6 py-3 rounded-2xl text-xs font-bold ml-auto hover:bg-red-700 transition-all">
            Process as Cash
          </button>
        </div>
      )}
    </div>
  );
};

export default InsuranceVerification;