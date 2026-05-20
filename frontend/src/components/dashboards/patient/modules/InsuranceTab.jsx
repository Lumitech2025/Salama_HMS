import React from 'react';
import { Shield, CreditCard, Activity } from 'lucide-react';

const InsuranceTab = ({ bills }) => {
  const accumulatedBillsTotal = bills.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  return (
    <div className="space-y-6 text-left max-w-4xl animate-in fade-in duration-300 font-['Inter']">
      
      {/* INSURANCE METADATA BLOCK FRAME */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-[2rem] p-6 shadow-md border border-slate-800 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase text-teal-400 tracking-wider font-mono">Social Health Authority (SHA)</p>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><Shield size={20} className="text-teal-400" /> Chronic Disease Management Policy</h2>
          <p className="text-xs text-slate-400">Emergency critical illness cover rules initialized successfully across healthcare networks.</p>
        </div>
        <div className="text-right bg-white/5 border border-white/5 px-4 py-3 rounded-2xl shrink-0">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Package Ceiling Allowance</p>
          <p className="text-sm font-mono font-bold text-teal-400">KES 300,000 / Annum</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-medium text-slate-600">
        
        {/* Claims metrics tracker grid summary frame */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><CreditCard size={14} className="text-blue-500" /> Claims & Coverage Meters</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span>Aggregate Claims Invoiced to DHA</span>
              <span className="font-mono font-bold text-slate-800">KES {accumulatedBillsTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span>Patient Direct Cash Out-of-Pocket Liability</span>
              <span className="font-mono font-bold text-emerald-600">KES 0 (100% SHA Covered)</span>
            </div>
          </div>
        </div>

        {/* Informational statement act validation window */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Activity size={14} className="text-teal-500" /> Governance Safeguards</h3>
          <p className="text-slate-500 leading-relaxed font-medium pt-2">
            Oncology benefit packages utilize explicit diagnostic evaluation filters. All pre-authorization requests are routed through empaneled clinical reviewers prior to automated fund distribution.
          </p>
          <div className="text-[10px] text-slate-400 border-t border-slate-50 pt-2 mt-4 font-mono">
            Linked Verification State: SHIF-ACTIVE-2026
          </div>
        </div>

      </div>

    </div>
  );
};

export default InsuranceTab;
