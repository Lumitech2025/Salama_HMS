import React from 'react';
import { Microscope, Download, ExternalLink, FileText, Calendar, User } from 'lucide-react';

const ImagingScans = () => {
  // Mock data representing the results of a Radiologist's work
  const scans = [
    {
      id: "IMG-2026-001",
      type: "CT Scan - Abdomen & Pelvis",
      date: "April 20, 2026",
      radiologist: "Dr. L. Amani",
      status: "Finalized",
      findings: "No significant abnormalities detected in the visualized organs. Normal bowel gas pattern.",
      hasImages: true
    },
    {
      id: "IMG-2026-004",
      type: "Chest X-Ray (PA View)",
      date: "March 12, 2026",
      radiologist: "Dr. L. Amani",
      status: "Finalized",
      findings: "Lungs are clear. Heart size is within normal limits. No pleural effusion.",
      hasImages: true
    }
  ];

  return (
    <div className="p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Imaging & Scans</h1>
        <p className="text-slate-500 font-medium text-sm">Access your radiology reports and diagnostic images.</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {scans.map((scan) => (
          <div key={scan.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row hover:border-blue-200 transition-all group">
            {/* Left Accents */}
            <div className="md:w-64 bg-slate-50 p-8 flex flex-col items-center justify-center border-r border-slate-100 text-center">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <Microscope size={32} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{scan.id}</p>
              <div className="flex items-center gap-1 text-emerald-600 mt-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">{scan.status}</span>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{scan.type}</h3>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-sm text-slate-500 font-bold">
                      <Calendar size={16} className="text-blue-500" /> {scan.date}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-slate-500 font-bold">
                      <User size={16} className="text-blue-500" /> {scan.radiologist}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all">
                    <Download size={16} /> Report PDF
                  </button>
                  {scan.hasImages && (
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all">
                      <ExternalLink size={16} /> View Images
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold text-sm uppercase tracking-tight">
                  <FileText size={16} className="text-blue-500" />
                  Clinical Findings
                </div>
                <p className="text-slate-600 text-sm leading-relaxed italic">
                  "{scan.findings}"
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImagingScans;