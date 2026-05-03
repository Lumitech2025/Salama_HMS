import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Maximize2, 
  Zap,
  Info
} from 'lucide-react';

const DiagnosticViewer = ({ patient, onBack }) => {
  const [findings, setFindings] = useState('');
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success

  const handleFinalize = () => {
    // Logic to push findings to your backend
    console.log("Finalizing Study for:", patient.id);
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={onBack} 
          className="flex items-center text-slate-500 hover:text-slate-900 font-bold text-sm transition-all group"
        >
          <ChevronLeft className="mr-1 group-hover:-translate-x-1 transition-transform" /> 
          Back to Worklist
        </button>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
            <Zap size={14} fill="currentColor" />
            <span className="text-[10px] font-black uppercase tracking-widest">Urgent Review</span>
          </div>
          <button 
            onClick={handleFinalize}
            className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-teal-900/20 flex items-center space-x-2"
          >
            <CheckCircle2 size={18} />
            <span>Finalize Diagnostic Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Panel: Imaging Canvas (7/12) */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="bg-slate-950 rounded-[3rem] aspect-video border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center group">
            {/* Dark room viewer aesthetic */}
            <div className="absolute top-6 left-8 flex items-center space-x-3">
               <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
               <span className="text-slate-500 text-[10px] font-mono tracking-widest uppercase">Live Viewport // {patient?.type}</span>
            </div>
            
            <button className="absolute top-6 right-8 text-slate-500 hover:text-white transition-colors">
              <Maximize2 size={20} />
            </button>

            {/* Upload/Placeholder Logic */}
            <div className="text-center px-12">
              <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/10 group-hover:border-teal-500/50 transition-all cursor-pointer">
                <Upload className="text-slate-500 group-hover:text-teal-400 transition-colors" size={32} />
              </div>
              <h3 className="text-white font-bold text-lg tracking-tight">Load Imaging Data</h3>
              <p className="text-slate-500 text-sm mt-2 max-w-xs">Drag DICOM sequences or clinical images here for analysis.</p>
            </div>
          </div>

          {/* Quick Patient Context Card */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-6">
              <div className="h-16 w-16 bg-slate-900 rounded-3xl flex items-center justify-center text-teal-400 text-xl font-black">
                {patient?.name?.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{patient?.name}</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">{patient?.id} • Adult Male</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referencing Dept</p>
              <p className="text-sm font-bold text-slate-800 uppercase italic">Oncology Wing</p>
            </div>
          </div>
        </div>

        {/* Right Panel: Observations & Details (5/12) */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm flex flex-col h-full">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <FileText size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Clinical Observations</h3>
            </div>

            <textarea 
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              className="flex-1 w-full min-h-[400px] bg-slate-50 border border-slate-100 rounded-3xl p-8 focus:ring-4 focus:ring-teal-500/5 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium leading-relaxed resize-none"
              placeholder="Start typing diagnostic findings... e.g., 'Evidence of 2cm mass in the upper left quadrant...'"
            />

            <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start space-x-4">
              <Info className="text-blue-500 mt-1" size={18} />
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Radiology Note</p>
                <p className="text-[11px] text-blue-700 font-medium mt-1 leading-relaxed">
                  Finalizing this report will immediately notify the referring Oncologist. Ensure all measurements are verified.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DiagnosticViewer;