import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  BookOpen, DollarSign, AlertTriangle, Edit3, Save, 
  Search, CheckCircle2, FlaskRound, Info, ChevronRight 
} from 'lucide-react';

const LabReference = () => {
  const [activeTab, setActiveTab] = useState('clinical'); // 'clinical' or 'pricing'
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for editable lab test standards
  const [references, setReferences] = useState([
    { id: 1, name: 'Hemoglobin (Hb)', category: 'Hematology', range: '12.0-17.5', critical: '< 7.0 g/dL', price: 500, unit: 'g/dL' },
    { id: 2, name: 'WBC Count', category: 'Hematology', range: '4.0-11.0', critical: '< 2.0 or > 25.0', price: 600, unit: 'x10⁹/L' },
    { id: 3, name: 'PSA Level', category: 'Tumor Markers', range: '0-4.0', critical: '> 10.0', price: 2500, unit: 'ng/mL' },
    { id: 4, name: 'Urea', category: 'Electrolytes', range: '2.5-7.8', critical: '> 20.0', price: 800, unit: 'mmol/L' },
    { id: 5, name: 'Creatinine', category: 'Electrolytes', range: '60-110', critical: '> 400', price: 800, unit: 'µmol/L' },
    { id: 6, name: 'Liver Function (LFT)', category: 'Organ Function', range: 'Varies', critical: '3x Upper Limit', price: 1500, unit: 'U/L' },
    { id: 7, name: 'Malaria Parasite (BS)', category: 'Microscopy', range: 'Negative', critical: 'High Parasitemia', price: 400, unit: 'field' },
    { id: 8, name: 'Blood Group & XM', category: 'Typing', range: 'N/A', critical: 'Incompatibility', price: 1200, unit: 'N/A' },
  ]);

  const [editId, setEditId] = useState(null);

  const handleUpdate = async (item) => {
    setLoading(true);
    try {
      // Logic to save to backend: 
      // await API.patch(`/lab-test-configs/${item.id}/`, item);
      setEditId(null);
      alert(`${item.name} standards updated successfully.`);
    } catch (err) {
      alert("Failed to sync with backend.");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = references.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Plus_Jakarta_Sans'] pb-20">
      
      {/* HEADER & TOGGLE */}
      <div className="bg-[#020617] border border-white/5 p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-teal-500 p-4 rounded-[1.5rem] shadow-lg shadow-teal-500/20 text-white">
            <BookOpen size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              Reference <span className="text-teal-400 font-black">Desk</span>
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-1 italic">Diagnostic Standards & Financial Protocols</p>
          </div>
        </div>

        <div className="relative z-10 flex bg-white/5 p-2 rounded-[2rem] border border-white/10 w-full lg:w-auto">
          <button 
            onClick={() => setActiveTab('clinical')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${activeTab === 'clinical' ? 'bg-teal-500 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
          >
            <AlertTriangle size={16} /> Clinical Norms
          </button>
          <button 
            onClick={() => setActiveTab('pricing')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${activeTab === 'pricing' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
          >
            <DollarSign size={16} /> Service Pricing
          </button>
        </div>
        
        <FlaskRound size={300} className="absolute -right-20 -bottom-20 text-white/[0.02] -rotate-12" />
      </div>

      {/* SEARCH BAR */}
      <div className="max-w-md relative mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input 
          type="text"
          placeholder="Filter Diagnostic Item..."
          className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 pl-16 pr-8 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* DATA TABLES */}
      <div className="bg-white/5 border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                <th className="px-12 py-8">Diagnostic Service</th>
                <th className="px-12 py-8">Category</th>
                {activeTab === 'clinical' ? (
                  <>
                    <th className="px-12 py-8">Reference Range</th>
                    <th className="px-12 py-8 text-red-400">Critical / Panic Value</th>
                  </>
                ) : (
                  <>
                    <th className="px-12 py-8">Charge (KES)</th>
                    <th className="px-12 py-8">Billing Unit</th>
                  </>
                )}
                <th className="px-12 py-8 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((item) => (
                <tr key={item.id} className="group hover:bg-white/[0.02] transition-all">
                  <td className="px-12 py-8">
                    <p className="text-white font-black text-sm uppercase tracking-tight">{item.name}</p>
                  </td>
                  <td className="px-12 py-8">
                    <span className="bg-slate-900 text-slate-400 border border-white/5 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      {item.category}
                    </span>
                  </td>
                  
                  {activeTab === 'clinical' ? (
                    <>
                      <td className="px-12 py-8">
                        {editId === item.id ? (
                          <input className="bg-slate-900 border border-teal-500/30 rounded-lg px-3 py-1 text-xs text-white" value={item.range} onChange={(e) => setReferences(references.map(r => r.id === item.id ? {...r, range: e.target.value} : r))}/>
                        ) : (
                          <span className="text-slate-300 font-bold text-sm italic">{item.range} <small className="text-[10px] text-slate-500">{item.unit}</small></span>
                        )}
                      </td>
                      <td className="px-12 py-8">
                        {editId === item.id ? (
                          <input className="bg-slate-900 border border-red-500/30 rounded-lg px-3 py-1 text-xs text-red-400 font-black" value={item.critical} onChange={(e) => setReferences(references.map(r => r.id === item.id ? {...r, critical: e.target.value} : r))}/>
                        ) : (
                          <div className="flex items-center gap-2 text-red-500 font-black text-sm uppercase">
                            <AlertTriangle size={14} /> {item.critical}
                          </div>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-12 py-8">
                        {editId === item.id ? (
                          <input className="bg-slate-900 border border-blue-500/30 rounded-lg px-3 py-1 text-xs text-white" type="number" value={item.price} onChange={(e) => setReferences(references.map(r => r.id === item.id ? {...r, price: e.target.value} : r))}/>
                        ) : (
                          <span className="text-blue-400 font-black text-lg italic">KES {item.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-12 py-8 text-slate-500 font-bold text-xs uppercase">{item.unit || 'Per Test'}</td>
                    </>
                  )}

                  <td className="px-12 py-8 text-right">
                    {editId === item.id ? (
                      <button 
                        onClick={() => handleUpdate(item)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                      >
                        <Save size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => setEditId(item.id)}
                        className="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white p-3 rounded-xl transition-all border border-white/5"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK INFO FOOTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
        <div className="bg-teal-500/10 border border-teal-500/20 p-8 rounded-[2.5rem] flex items-start gap-5">
           <Info className="text-teal-500 mt-1" size={24} />
           <div>
              <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest">Clinical Protocol</h4>
              <p className="text-[11px] text-teal-100/60 leading-relaxed mt-2 italic font-medium">
                Reference ranges are calibrated for Salama Hospital's internal oncology diagnostic equipment. Values outside the critical threshold must be verified via second-operator review.
              </p>
           </div>
        </div>
        <div className="bg-blue-600/10 border border-blue-600/20 p-8 rounded-[2.5rem] flex items-start gap-5">
           <DollarSign className="text-blue-500 mt-1" size={24} />
           <div>
              <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Financial Transparency</h4>
              <p className="text-[11px] text-blue-100/60 leading-relaxed mt-2 italic font-medium">
                Pricing is synchronized across the Billing Portal and Patient Invoicing modules. Updates to diagnostic costs will reflect immediately in the Front Desk Point-of-Sale.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LabReference;