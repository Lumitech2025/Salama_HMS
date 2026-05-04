import React from 'react';
import { Search, Filter, AlertCircle, Clock } from 'lucide-react';

const DiagnosticWorklist = () => {
  const samples = [
    { id: 'LAB-901', patient: 'Jane Doe', test: 'Full Blood Count', status: 'Pending', urgency: 'High', time: '10 mins ago' },
    { id: 'LAB-902', patient: 'John Smith', test: 'Biopsy Analysis', status: 'In-Progress', urgency: 'Normal', time: '1 hour ago' },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Diagnostic Worklist</h3>
          <p className="text-slate-400 text-sm">Manage and track incoming diagnostic requests</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
          <input type="text" placeholder="Search samples..." className="bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-500 text-xs uppercase tracking-widest border-b border-white/5">
              <th className="pb-4 px-4 font-bold">Sample ID</th>
              <th className="pb-4 px-4 font-bold">Patient</th>
              <th className="pb-4 px-4 font-bold">Test Type</th>
              <th className="pb-4 px-4 font-bold">Urgency</th>
              <th className="pb-4 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {samples.map((sample) => (
              <tr key={sample.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-5 px-4 font-medium text-teal-400">{sample.id}</td>
                <td className="py-5 px-4 font-bold text-white">{sample.patient}</td>
                <td className="py-5 px-4">{sample.test}</td>
                <td className="py-5 px-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    sample.urgency === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-teal-500/10 text-teal-500'
                  }`}>
                    {sample.urgency}
                  </span>
                </td>
                <td className="py-5 px-4 text-right">
                  <button className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-teal-900/20">
                    Process
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DiagnosticWorklist;