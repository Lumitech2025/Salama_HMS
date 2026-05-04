import React from 'react';
import { FileText, Share2, Download, Mail, CheckCircle, Globe } from 'lucide-react';

const ReportingEngine = () => {
  const readyReports = [
    { id: 'REP-101', patient: 'Jane Doe', test: 'CBC & Biopsy', date: '2026-05-04', status: 'Authorized' },
    { id: 'REP-102', patient: 'John Smith', test: 'Liver Function', date: '2026-05-04', status: 'Authorized' },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Reporting & Sharing Hub</h3>
          <p className="text-slate-400 text-sm">Distribute finalized results to clinical teams and patients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {readyReports.map((report) => (
          <div key={report.id} className="p-6 bg-slate-900/50 border border-white/5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-teal-500/30 transition-all">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-teal-500/10 text-teal-500 rounded-2xl">
                <FileText size={24} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">{report.patient}</h4>
                <p className="text-sm text-slate-400">{report.test} • {report.id}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/5">
                <Download size={16} className="text-teal-400" />
                <span>Download PDF</span>
              </button>
              
              <button className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-teal-900/20">
                <Share2 size={16} />
                <span>Share with Doctor</span>
              </button>

              <button className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all">
                <Globe size={16} />
                <span>Sync to Portal</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Summary of Sharing Status */}
      <div className="mt-8 p-6 bg-teal-500/5 border border-teal-500/10 rounded-3xl">
        <div className="flex items-center space-x-3 text-teal-400 mb-2">
          <CheckCircle size={18} />
          <span className="font-bold text-sm uppercase tracking-widest">System Status</span>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          All shared reports are encrypted and timestamped. Notifications are automatically sent to the referring Oncologist upon sharing.
        </p>
      </div>
    </div>
  );
};

export default ReportingEngine;