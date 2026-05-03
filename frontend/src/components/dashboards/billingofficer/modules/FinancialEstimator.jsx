import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  FileSpreadsheet, 
  Download, 
  Info,
  Calendar,
  ShieldAlert
} from 'lucide-react';

const FinancialEstimator = () => {
  const [estimationData, setEstimationData] = useState({
    patientName: "John Doe",
    regimen: "CHOP-R (6 Cycles)",
    baseCycleCost: 145000,
    numberOfCycles: 6,
    insuranceLimit: 500000 // e.g., NHIF Oncology Package cap
  });

  const totalProjected = estimationData.baseCycleCost * estimationData.numberOfCycles;
  const outOfPocket = Math.max(0, totalProjected - estimationData.insuranceLimit);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Estimates</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Pro-forma Invoice Generator</p>
        </div>
        <button className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/20">
          <Download size={18} /> Export PDF Estimate
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
            <Calculator size={16} className="text-teal-600" /> Estimate Parameters
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Treatment Regimen</label>
              <select className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-teal-500/20 font-bold text-slate-700">
                <option>CHOP-R (Non-Hodgkin)</option>
                <option>AC-T (Breast Cancer)</option>
                <option>FOLFOX (Colorectal)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cycles Planned</label>
              <input type="number" defaultValue={6} className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-teal-500/20 font-bold" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Est. Cost Per Cycle (KES)</label>
              <input type="text" defaultValue="145,000" className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-teal-500/20 font-bold" />
            </div>
          </div>
        </div>

        {/* Projection Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Projected Cost</p>
              <p className="text-3xl font-black text-teal-400">KES {totalProjected.toLocaleString()}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <TrendingUp size={14} /> <span>Incl. pharmacy & lab estimates</span>
              </div>
            </div>

            <div className="bg-white border-2 border-red-100 rounded-[2rem] p-6 shadow-sm">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Est. Out-of-Pocket</p>
              <p className="text-3xl font-black text-red-600">KES {outOfPocket.toLocaleString()}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-red-400 font-bold uppercase tracking-tighter">
                <ShieldAlert size={14} /> <span>Exceeds NHIF/SHA Cap</span>
              </div>
            </div>
          </div>

          {/* Timeline View */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-6">Payment Timeline Projection</h3>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((cycle) => (
                <div key={cycle} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-xl transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-black text-xs">
                      C{cycle}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Cycle {cycle} Disbursement</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Target: Month {cycle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-sm font-mono">KES {estimationData.baseCycleCost.toLocaleString()}</p>
                    <span className="text-[9px] font-black uppercase text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                      {cycle <= 3 ? 'Covered' : 'Cash Required'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialEstimator;