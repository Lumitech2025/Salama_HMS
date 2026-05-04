import React from 'react';
import { History, TrendingUp, TrendingDown, FileText, Search } from 'lucide-react';

const PatientHistory = () => {
  // Mock data showing historical trends for an Oncology patient
  const historyData = [
    { date: '2026-04-15', test: 'White Blood Cell Count', result: '4.2', range: '4.5-11.0', status: 'Low' },
    { date: '2026-03-10', test: 'White Blood Cell Count', result: '3.8', range: '4.5-11.0', status: 'Critical' },
    { date: '2026-02-05', test: 'Hemoglobin', result: '13.2', range: '13.5-17.5', status: 'Normal' },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Patient 360° History</h3>
          <p className="text-slate-400 text-sm">Longitudinal diagnostic trends for Jane Doe</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search past records..." 
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        {historyData.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-6 bg-slate-900/50 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">
            <div className="flex items-center space-x-6">
              <div className="p-3 bg-white/5 rounded-xl text-slate-400">
                <History size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.date}</p>
                <h4 className="text-lg font-bold text-white">{item.test}</h4>
              </div>
            </div>

            <div className="flex items-center space-x-12">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Result</p>
                <p className={`text-xl font-black ${item.status === 'Critical' ? 'text-red-500' : 'text-teal-400'}`}>
                  {item.result}
                </p>
              </div>
              <div className="hidden md:block">
                <p className="text-xs text-slate-500 mb-1">Ref. Range</p>
                <p className="text-sm text-slate-300 font-medium">{item.range}</p>
              </div>
              <button className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
                <FileText size={14} />
                <span>View Full Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientHistory;