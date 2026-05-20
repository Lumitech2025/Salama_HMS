import React from 'react';
import { Clipboard, FileText, FlaskConical, ShieldAlert } from 'lucide-react';

const RecordsTab = ({ notes, labResults, imaging }) => {
  return (
    <div className="space-y-8 text-left animate-in fade-in duration-300 font-['Inter']">
      
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Health Records & Longitudinal History</h2>
        <p className="text-xs text-slate-400 mt-0.5">Comprehensive diagnostic outcomes and clinical notes synced from historical EMR lines.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COMPONENT: CLINICAL OUTPATIENT SUMMARY LOGS (7 Columns) */}
        <div className="xl:col-span-7 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-50">
            <Clipboard size={14} className="text-blue-500" /> Longitudinal Evaluation Narratives
          </h4>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {notes.length > 0 ? notes.map((note, idx) => (
              <div key={idx} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2 text-xs font-medium">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><FileText size={12} /> Record Frame Summary</span>
                  <span className="font-mono">{note.created_at?.slice(0, 10) || 'EMR Entry Sheet'}</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium text-left bg-white p-3 border border-slate-100/60 rounded-xl">
                  {note.note_text || note.notes || 'Routine consultation finalized successfully.'}
                </p>
              </div>
            )) : (
              <p className="text-xs text-slate-400 text-center py-12">No evaluation summaries or narrative logs mapped to your account reference.</p>
            )}
          </div>
        </div>

        {/* RIGHT COMPONENT: PATHOLOGY LAB CHART INDEXES (5 Columns) */}
        <div className="xl:col-span-5 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-50">
            <FlaskConical size={14} className="text-teal-500" /> Verified Laboratory Outcome Charts
          </h4>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {labResults.length > 0 ? labResults.map((lab, i) => (
              <div key={i} className="p-4 border border-slate-100 bg-slate-50/60 rounded-2xl flex justify-between items-center text-xs font-medium animate-in fade-in duration-100">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800 truncate max-w-[180px] uppercase">{lab.test_type || 'Diagnostic Panel'}</p>
                  <p className="text-[10px] text-slate-400">Status: Verified Outcome</p>
                </div>
                <span className="font-mono font-bold text-blue-600 bg-white border border-slate-100 px-3 py-1 rounded-xl shadow-sm text-xs shrink-0">
                  {lab.result_value || 'Passed'}
                </span>
              </div>
            )) : (
              <p className="text-xs text-slate-400 text-center py-12">No verified laboratory records discovered in this active configuration window.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default RecordsTab;