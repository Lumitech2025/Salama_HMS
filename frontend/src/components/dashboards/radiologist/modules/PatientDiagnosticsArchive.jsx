import React, { useState } from 'react';
import { 
  FileText, Image as ImageIcon, ShieldAlert, 
  Search, Calendar, ChevronRight, ExternalLink 
} from 'lucide-react';

const PatientDiagnosticsArchive = () => {
  const [activeSubTab, setActiveSubTab] = useState('imaging-history');
  const [searchQuery, setSearchQuery] = useState('');

  // Mocked historical data for a comprehensive diagnostic profile
  const patientProfile = {
    name: "John Doe",
    id: "RAD-001",
    age: "45 Y/O",
    conditions: [
      { date: "12 Mar 2025", diagnosis: "Non-Small Cell Lung Carcinoma (Stage II)", status: "Active Treatment" },
      { date: "04 Jan 2024", diagnosis: "Chronic Obstructive Pulmonary Disease (COPD)", status: "Managed" }
    ],
    imagingHistory: [
      {
        id: "IMG-9042",
        date: "14 Feb 2026",
        procedure: "CT Thorax w/ Contrast",
        radiologist: "Dr. A. Vance",
        severity: "ABNORMAL",
        impression: "Slight dimensional increase in the left upper lobe pulmonary nodule measuring 1.4cm (previously 1.2cm)."
      },
      {
        id: "IMG-7821",
        date: "10 Oct 2025",
        procedure: "X-Ray Chest AP/Lat",
        radiologist: "Dr. C. Kimathi",
        severity: "NORMAL",
        impression: "Lungs are clear symmetrically. No pleural effusions or focal consolidations visualized."
      }
    ]
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-['Inter']">
      
      {/* SELECTION CORE PROFILE HEADER */}
      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-teal-400 font-mono">Master Diagnostic File</span>
          <h2 className="text-2xl font-black uppercase tracking-tight mt-1">{patientProfile.name}</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Patient ID: <span className="font-mono font-bold text-white">{patientProfile.id}</span> • {patientProfile.age} • Male
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text"
            placeholder="Search historic reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-xs outline-none focus:bg-white focus:text-slate-900 transition-all font-medium"
          />
        </div>
      </div>

      {/* SUB-TAB NAV SYSTEM (Leveraging design language from your 3rd image) */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-2xl w-fit gap-1">
        <button
          onClick={() => setActiveSubTab('imaging-history')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeSubTab === 'imaging-history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ImageIcon size={14} /> Imaging & Scans History
        </button>
        <button
          onClick={() => setActiveSubTab('clinical-conditions')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeSubTab === 'clinical-conditions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert size={14} /> Diagnosed Conditions
        </button>
      </div>

      {/* DYNAMIC VIEWPORT ENGINE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 min-h-[400px]">
        
        {activeSubTab === 'imaging-history' ? (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Historical Radiographic Logs</h3>
            
            {patientProfile.imagingHistory.map((report) => (
              <div key={report.id} className="border border-slate-100 bg-slate-50/50 hover:bg-slate-50 p-6 rounded-3xl transition-all flex flex-col md:flex-row justify-between items-start gap-4 group">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5">
                      <Calendar size={12} /> {report.date}
                    </span>
                    <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">{report.procedure}</h4>
                    <span className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md ${
                      report.severity === 'ABNORMAL' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {report.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <span className="font-black text-slate-900 block mb-1 uppercase text-[10px] tracking-wider text-slate-400">Impression Note:</span>
                    {report.impression}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    Signed By: <span className="text-slate-700 font-black">{report.radiologist}</span> • ID: {report.id}
                  </p>
                </div>

                <button className="self-end md:self-center px-4 py-3 bg-white hover:bg-slate-900 hover:text-teal-400 text-slate-700 rounded-xl border border-slate-200 shadow-sm text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all">
                  <ExternalLink size={12} /> View DICOM
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* CLINICAL CONDITIONS PORT */
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Core Clinical Registry</h3>
            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4 pl-6">Onset Date</th>
                    <th className="p-4">Clinical Diagnosis</th>
                    <th className="p-4 pr-6">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {patientProfile.conditions.map((cond, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 font-mono text-slate-500">{cond.date}</td>
                      <td className="p-4 font-black text-slate-900 uppercase tracking-tight">{cond.diagnosis}</td>
                      <td className="p-4 pr-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {cond.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PatientDiagnosticsArchive;