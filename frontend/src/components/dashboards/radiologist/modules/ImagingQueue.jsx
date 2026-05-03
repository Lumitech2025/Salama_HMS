import React from 'react';
import { Clock, AlertCircle, PlayCircle } from 'lucide-react';

const ImagingQueue = ({ onSelectPatient }) => {
  // Sample data - eventually this comes from your Django API
  const pendingScans = [
    { id: 'RAD-001', name: 'John Doe', type: 'CT Scan (Thorax)', status: 'Urgent', time: '10 mins ago' },
    { id: 'RAD-002', name: 'Jane Smith', type: 'MRI (Brain)', status: 'Standard', time: '25 mins ago' },
  ];

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Imaging Queue</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Patients awaiting diagnostics</p>
        </div>
        <div className="bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-xs font-black">
          {pendingScans.length} ACTIVE ORDERS
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-black border-b border-slate-100">
              <th className="px-8 py-5">Patient & ID</th>
              <th className="px-6 py-5">Procedure</th>
              <th className="px-6 py-5">Urgency</th>
              <th className="px-6 py-5">Wait Time</th>
              <th className="px-8 py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pendingScans.map((scan) => (
              <tr key={scan.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-8 py-6">
                  <p className="font-bold text-slate-900">{scan.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{scan.id}</p>
                </td>
                <td className="px-6 py-6">
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-tighter">
                    {scan.type}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <div className={`flex items-center space-x-2 ${scan.status === 'Urgent' ? 'text-red-500' : 'text-teal-600'}`}>
                    <AlertCircle size={14} />
                    <span className="text-xs font-black uppercase">{scan.status}</span>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
                    <Clock size={14} />
                    <span>{scan.time}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button 
                    onClick={() => onSelectPatient(scan)}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-600 transition-all flex items-center space-x-2 ml-auto shadow-md"
                  >
                    <PlayCircle size={16} />
                    <span>Start Exam</span>
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

export default ImagingQueue;