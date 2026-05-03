import React, { useState } from 'react';
import { 
  PackageCheck, 
  AlertTriangle, 
  ArrowRightLeft, 
  CheckCircle, 
  Search,
  Filter,
  Info
} from 'lucide-react';

const PharmacyReconciliation = () => {
  // Logic: Comparing 'Dispensed' vs 'Billed'
  const [discrepancies] = useState([
    { 
      id: "REC-102", 
      patient: "John Doe", 
      medication: "Rituximab 500mg", 
      dispensedQty: 2, 
      billedQty: 1, 
      status: "Discrepancy",
      severity: "High" 
    },
    { 
      id: "REC-105", 
      patient: "Jane Wambui", 
      medication: "Ondansetron 8mg", 
      dispensedQty: 10, 
      billedQty: 10, 
      status: "Matched",
      severity: "None" 
    }
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header & Meta */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pharmacy Reconciliation</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Cross-referencing Inventory vs Revenue</p>
        </div>
        <div className="flex gap-2">
           <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
             <Filter size={14} /> Filter Unmatched
           </button>
           <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-teal-600 transition-all shadow-lg shadow-slate-200">
             <PackageCheck size={14} /> Run Full Audit
           </button>
        </div>
      </div>

      {/* Discrepancy Alert Banner */}
      <div className="bg-red-50 border border-red-100 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm shadow-red-100/50">
        <div className="bg-red-500 p-2 rounded-xl text-white">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h4 className="text-red-800 font-black text-sm tracking-tight">Critical Discrepancy Detected</h4>
          <p className="text-red-600 text-xs mt-1 font-medium max-w-2xl leading-relaxed">
            Case **REC-102** shows 2 vials of Rituximab dispensed but only 1 billed. Potential revenue loss: **KES 115,000**. Immediate reconciliation required.
          </p>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction / Medication</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispensed (Pharma)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Billed (Finance)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discrepancies.map((row) => (
                <tr key={row.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-800 tracking-tight">{row.medication}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] font-black text-teal-600 uppercase">Patient: {row.patient}</span>
                       <span className="text-slate-300">•</span>
                       <span className="text-[10px] font-mono text-slate-400">{row.id}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                         {row.dispensedQty}
                       </div>
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Units</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${row.dispensedQty !== row.billedQty ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                         {row.billedQty}
                       </div>
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Units</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    {row.status === "Matched" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase border border-emerald-100">
                        <CheckCircle size={12} /> {row.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase border border-red-100 animate-pulse">
                        <ArrowRightLeft size={12} /> {row.status}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="text-slate-400 hover:text-teal-600 p-2 rounded-lg transition-colors group-hover:bg-teal-50">
                      <Info size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PharmacyReconciliation;