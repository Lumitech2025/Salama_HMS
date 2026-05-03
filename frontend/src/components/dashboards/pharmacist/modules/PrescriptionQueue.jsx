import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

const PrescriptionQueue = () => {
  // Logic: Fetch orders where status != 'DISPENSED'
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">Active Prescriptions</h3>
        <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold">12 Pending</span>
      </div>
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          <tr>
            <th className="px-6 py-4">Patient</th>
            <th className="px-6 py-4">Medication</th>
            <th className="px-6 py-4">Prescriber</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {/* Map through prescription data here */}
          <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer">
            <td className="px-6 py-4 font-bold text-slate-700 text-sm">Patient 001</td>
            <td className="px-6 py-4 text-sm">Doxorubicin 50mg/m²</td>
            <td className="px-6 py-4 text-sm text-slate-500">Dr. Kimathi</td>
            <td className="px-6 py-4">
              <span className="inline-flex items-center space-x-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-bold">
                <Clock size={12} /> <span>Preparing</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PrescriptionQueue;