import React from 'react';
import { FlaskConical, ShieldCheck } from 'lucide-react';

const PrescriptionsTab = ({ prescriptions }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm text-left animate-in fade-in duration-300 font-['Inter']">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FlaskConical size={20} className="text-teal-500" /> Active Pharmacy Care Orders
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Pharmaceutical item lines and medication frequencies filled by your oncologist.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-slate-600">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
              <th className="p-3 px-4 text-left font-semibold">Prescribed Oncology Compound / Medicine</th>
              <th className="p-3 text-center font-semibold">Dosage Frequency Specifications</th>
              <th className="p-3 text-right px-4 font-semibold">Fulfillment Phase</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {prescriptions.length > 0 ? prescriptions.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                <td className="p-4 px-4 text-left font-bold text-slate-800">{item.drug_name || 'Invoiced Formula Item'}</td>
                <td className="p-4 text-center font-mono font-medium text-slate-600 bg-slate-50/40">{item.dosage || 'Take as indicated in primary script'}</td>
                <td className="p-4 text-right px-4">
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 w-fit ml-auto">
                    <ShieldCheck size={11} /> {item.status || 'Fulfilled'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="3" className="p-12 text-center text-slate-400 font-medium">
                  No active pharmaceutical care scripts currently logged under this portfolio context.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrescriptionsTab;