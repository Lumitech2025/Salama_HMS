import React from 'react';
import { Pill, ShieldCheck, Calendar, User, Clock, ShieldAlert } from 'lucide-react';

const PrescriptionsTab = ({ prescriptions = [] }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left animate-in fade-in duration-300 font-sans w-full max-w-none antialiased">
      
      {/* Header Segment */}
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Pill size={22} className="text-rose-500" /> Active Prescriptions & Pharmacy Care Orders
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Authorized pharmacological lines, administration routes, and dosage frequencies compiled from your treatment plan.
        </p>
      </div>

      {/* Main Table Ledger */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm text-slate-600 border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
              <th className="p-4 text-left font-bold">Date Prescribed</th>
              <th className="p-4 text-left font-bold">Medication & Strength</th>
              <th className="p-4 text-center font-bold">Dosage & Frequency</th>
              <th className="p-4 text-center font-bold">Duration / Route</th>
              <th className="p-4 text-left font-bold">Prescribed By</th>
              <th className="p-4 text-right px-6 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {prescriptions.length > 0 ? prescriptions.map((item, idx) => {
              const isDiscontinued = item.status?.toLowerCase() === 'discontinued' || item.status?.toLowerCase() === 'stopped';
              
              return (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors text-slate-700">
                  {/* 1. Date Prescribed */}
                  <td className="p-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      {item.prescribed_date || item.created_at?.slice(0, 10) || '—'}
                    </span>
                  </td>

                  {/* 2. Drug Name & Strength */}
                  <td className="p-4 text-left max-w-[240px]">
                    <p className="font-black text-slate-900 text-base uppercase tracking-tight truncate">
                      {item.drug_name || item.medication_name || 'Invoiced Formula Item'}
                    </p>
                    {item.strength && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Strength: {item.strength}</p>
                    )}
                  </td>

                  {/* 3. Dosage Frequency */}
                  <td className="p-4 text-center bg-slate-50/30">
                    <span className="inline-block font-mono font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg text-sm shadow-2xs">
                      {item.dosage || item.dosage_instruction || 'As Directed'}
                    </span>
                  </td>

                  {/* 4. Duration & Route */}
                  <td className="p-4 text-center font-medium">
                    <p className="text-slate-900 font-semibold">{item.duration || '—'}</p>
                    <p className="text-xs text-slate-400 font-mono tracking-wide uppercase mt-0.5">{item.route || 'Oral'}</p>
                  </td>

                  {/* 5. Prescribing Doctor */}
                  <td className="p-4 text-left whitespace-nowrap">
                    <span className="flex items-center gap-1.5 font-medium text-slate-800">
                      <User size={14} className="text-slate-400" />
                      {item.prescribed_by || item.doctor_name || 'Medical Specialist'}
                    </span>
                  </td>

                  {/* 6. Fulfillment Status Badging */}
                  <td className="p-4 text-right px-6 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                      isDiscontinued 
                        ? 'bg-rose-50 text-rose-600 border-rose-200' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {isDiscontinued ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                      {item.status || 'Active'}
                    </span>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="6" className="p-16 text-center text-slate-400 font-mono text-sm">
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