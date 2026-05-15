import React, { useState } from 'react';
import { X, UploadCloud, Save, Landmark, FileText, CheckCircle } from 'lucide-react';

const RemittanceUploadModal = ({ isOpen, onClose, payers }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
            Upload <span className="text-teal-600">Remittance</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
        </div>

        {success ? (
          <div className="p-20 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h4 className="text-xl font-black text-slate-900 uppercase italic">Reconciliation Successful</h4>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Batch KES 4.2M processed into patient accounts.</p>
            <button onClick={onClose} className="mt-8 bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">Back to Hub</button>
          </div>
        ) : (
          <form className="p-12 space-y-6 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Insurance Partner</label>
              <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-teal-500">
                <option>Select Payer...</option>
                {payers.map(p => <option key={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Paid (KES)</label>
                <input type="number" placeholder="0.00" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Reference</label>
                <input type="text" placeholder="EFT-99201" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left">Remittance Advice (PDF/Excel)</label>
              <div className="border-2 border-dashed border-slate-100 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-teal-50 transition-all group cursor-pointer">
                 <UploadCloud className="text-slate-300 group-hover:text-teal-600 mb-2" size={32} />
                 <p className="text-[10px] font-black text-slate-400 group-hover:text-teal-600 uppercase tracking-widest">Drop file here to sync claims</p>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => { setLoading(true); setTimeout(() => {setLoading(false); setSuccess(true);}, 2000); }}
              className="w-full bg-[#020617] text-teal-400 py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all"
            >
              {loading ? "Reconciling Database..." : <><Save size={18}/> Commit Payment Batch</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RemittanceUploadModal;