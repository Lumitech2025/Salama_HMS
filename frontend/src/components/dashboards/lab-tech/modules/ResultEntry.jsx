import React from 'react';
import { Save, Share2, Download } from 'lucide-react';

const ResultEntry = () => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Result Entry</h3>
          <p className="text-slate-400 text-sm italic">Patient: Jane Doe | Sample: LAB-901</p>
        </div>
        <div className="flex space-x-2">
          <button className="p-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"><Download size={18} /></button>
          <button className="p-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"><Share2 size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Biomarker Value</label>
          <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-teal-500 outline-none" placeholder="0.00" />
        </div>
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Reference Range</label>
          <div className="w-full bg-slate-800/50 border border-dashed border-white/10 rounded-2xl p-4 text-slate-400 text-sm">Standard: 13.5 — 17.5 g/dL</div>
        </div>
      </div>

      <button className="w-full bg-teal-600 hover:bg-teal-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-xl shadow-teal-900/40">
        <Save size={20} />
        <span>Authorize & Finalize Results</span>
      </button>
    </div>
  );
};

export default ResultEntry;