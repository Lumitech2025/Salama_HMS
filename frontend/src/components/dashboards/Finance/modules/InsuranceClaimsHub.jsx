import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  ShieldCheck, CreditCard, AlertCircle, FileText, Plus, 
  Search, CheckCircle2, XCircle, Clock, Filter, ChevronRight,
  TrendingUp, Building2, UploadCloud, X, Save, Globe, Landmark
} from 'lucide-react';

// --- SUB-COMPONENT: REMITTANCE UPLOAD MODAL ---
const RemittanceModal = ({ isOpen, onClose, payers }) => {
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Upload <span className="text-teal-600">Remittance</span></h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
        </div>
        <div className="p-10 space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Insurance Payer</label>
            <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-teal-500">
              <option>Select Payer...</option>
              {payers.map(p => <option key={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Amount (KES)</label>
              <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Reference</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" placeholder="EFT/Cheque No" />
            </div>
          </div>
          <div className="border-2 border-dashed border-slate-100 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-teal-50 transition-all cursor-pointer group">
            <UploadCloud size={32} className="text-slate-300 group-hover:text-teal-600 mb-2" />
            <p className="text-[10px] font-black text-slate-400 group-hover:text-teal-700 uppercase tracking-widest text-center">Drop Remittance Advice (PDF/Excel)</p>
          </div>
          <button className="w-full bg-[#020617] text-teal-400 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:scale-[1.02] transition-all">
            Commit & Reconcile Batch
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const InsuranceClaimsHub = () => {
  const [activeSubTab, setActiveSubTab] = useState('queue');
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [payers, setPayers] = useState([]);

  // Fetch payers for the selection dropdowns
  useEffect(() => {
    const fetchPayers = async () => {
      try {
        const res = await API.get('/insurance-companies/');
        setPayers(res.data.results || res.data);
      } catch (err) { console.error(err); }
    };
    fetchPayers();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] text-left">
      
      {/* 1. ANALYTICS (Revenue at Risk) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <div className="p-4 rounded-2xl w-fit mb-6 bg-blue-50 text-blue-600"><TrendingUp size={28} /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outstanding Claims</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">KES 24.5M</h3>
          <p className="text-[10px] font-bold text-slate-500 mt-2 italic">Awaiting Insurer Response</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <div className="p-4 rounded-2xl w-fit mb-6 bg-rose-50 text-rose-600"><XCircle size={28} /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disputed / Rejected</p>
          <h3 className="text-3xl font-black text-rose-600 tracking-tighter italic uppercase leading-none">KES 1.8M</h3>
          <p className="text-[10px] font-bold text-rose-400 mt-2 italic">Needs immediate attention</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <div className="p-4 rounded-2xl w-fit mb-6 bg-teal-50 text-teal-600"><CheckCircle2 size={28} /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Remittance</p>
          <h3 className="text-3xl font-black text-teal-600 tracking-tighter italic uppercase leading-none text-teal-600">KES 12.1M</h3>
          <p className="text-[10px] font-bold text-teal-600 mt-2 italic">Paid this month</p>
        </div>
      </div>

      {/* 2. SUB-TAB TOGGLE & ACTION BUTTONS */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-50">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
          {[
            { id: 'queue', label: 'Claims Queue', icon: FileText },
            { id: 'remittance', label: 'Remittance Hub', icon: CreditCard },
            { id: 'payers', label: 'Insurers/Payers', icon: Building2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={() => activeSubTab === 'payers' ? setShowPayerModal(true) : setShowRemitModal(true)}
          className="bg-[#020617] text-teal-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl active:scale-95"
        >
          <Plus size={18} /> {activeSubTab === 'payers' ? 'Add Insurance Co' : 'New Batch Remittance'}
        </button>
      </div>

      {/* 3. DYNAMIC CONTENT AREA */}
      <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl min-h-[500px] overflow-hidden">
        {activeSubTab === 'queue' && (
          <div className="animate-in slide-in-from-bottom-4">
             <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" placeholder="Filter by Patient, Claim ID or Pre-Auth..." className="w-full bg-slate-50 rounded-2xl py-4 pl-16 pr-6 text-xs font-bold outline-none border border-slate-100 focus:border-blue-500 transition-all" />
                </div>
            </div>

            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="p-8">Patient & Treatment</th>
                  <th className="p-8">Insurer & Auth</th>
                  <th className="p-8">Claim Value</th>
                  <th className="p-8">Age</th>
                  <th className="p-8">Status</th>
                  <th className="p-8 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr className="hover:bg-slate-50/50 transition-all group">
                  <td className="p-8">
                    <p className="font-black text-slate-900 uppercase italic leading-none">John Doe Kamau</p>
                    <p className="text-[9px] text-blue-600 font-bold uppercase mt-2 tracking-tighter">Chemotherapy: Cycle 4</p>
                  </td>
                  <td className="p-8">
                    <p className="text-xs font-bold text-slate-700 uppercase leading-none mb-1">Jubilee Insurance</p>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Auth: #9902XJ</span>
                  </td>
                  <td className="p-8">
                    <p className="font-black text-slate-900 italic text-sm">KES 124,500</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">15% Copay Collected</p>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-amber-500" />
                        <span className="text-xs font-bold text-slate-600 uppercase italic">14 Days</span>
                    </div>
                  </td>
                  <td className="p-8 text-left">
                    <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-100">Submitted</span>
                  </td>
                  <td className="p-8 text-right"><ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-all"/></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'remittance' && (
           <div className="p-24 text-center animate-in fade-in flex flex-col items-center">
              <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-teal-500/10">
                 <UploadCloud size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic">Remittance Hub</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-sm leading-relaxed text-center">
                 Sync payments from insurance providers with existing patient claims.
              </p>
              <button 
                onClick={() => setShowRemitModal(true)}
                className="mt-8 bg-slate-900 text-teal-400 px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
              >
                Upload Payment Batch
              </button>
           </div>
        )}

        {activeSubTab === 'payers' && (
           <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
              <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 group hover:bg-white transition-all text-left">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-white p-4 rounded-2xl text-blue-600 shadow-sm"><ShieldCheck size={24}/></div>
                    <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg uppercase border border-blue-100 italic tracking-widest">Public Payer</span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 italic uppercase leading-none">NHIF (SHIF)</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Government Health Fund</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Aging Debt</p>
                          <p className="text-lg font-black text-slate-900 italic">KES 8,450,200</p>
                      </div>
                      <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Success Rate</p>
                          <p className="text-lg font-black text-teal-600 italic">95.8%</p>
                      </div>
                  </div>
                  <button className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">Portal Integration</button>
              </div>
           </div>
        )}
      </div>

      {/* MODAL: ADD INSURANCE COMPANY */}
      {showPayerModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowPayerModal(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden text-left">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Onboard <span className="text-blue-600">Payer</span></h3>
              <button onClick={() => setShowPayerModal(false)} className="text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
            </div>
            <form className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                <input type="text" placeholder="e.g. AAR Insurance" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
                  <input type="email" placeholder="claims@payer.com" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Claims Portal Link</label>
                  <input type="url" placeholder="https://portal.payer.com" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none" />
                </div>
              </div>
              <button className="w-full bg-[#020617] text-blue-400 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                <Save size={18}/> Register Insurance Provider
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REMITTANCE UPLOAD */}
      <RemittanceModal 
        isOpen={showRemitModal} 
        onClose={() => setShowRemitModal(false)} 
        payers={payers} 
      />
    </div>
  );
};

export default InsuranceClaimsHub;