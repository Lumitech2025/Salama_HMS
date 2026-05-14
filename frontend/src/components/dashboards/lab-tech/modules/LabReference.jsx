import React, { useState } from 'react';
import { 
  BookOpen, DollarSign, AlertTriangle, Edit3, Save, 
  Search, Activity, X
} from 'lucide-react';

const LabReference = () => {
  const [activeTab, setActiveTab] = useState('clinical'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editId, setEditId] = useState(null);
  
  const [references, setReferences] = useState([
    { id: 1, name: 'Hemoglobin (Hb)', category: 'Hematology', range: '12.0-17.5', critical: '< 7.0 g/dL', price: 500, unit: 'g/dL' },
    { id: 2, name: 'WBC Count', category: 'Hematology', range: '4.0-11.0', critical: '< 2.0 or > 25.0', price: 600, unit: 'x10⁹/L' },
    { id: 3, name: 'PSA Level', category: 'Tumor Markers', range: '0-4.0', critical: '> 10.0', price: 2500, unit: 'ng/mL' },
    { id: 4, name: 'Urea', category: 'Electrolytes', range: '2.5-7.8', critical: '> 20.0', price: 800, unit: 'mmol/L' },
    { id: 5, name: 'Creatinine', category: 'Electrolytes', range: '60-110', critical: '> 400', price: 800, unit: 'µmol/L' },
  ]);

  const handleUpdate = (item) => {
    // Here you would typically perform an API.patch
    setEditId(null);
    alert(`${item.name} updated successfully.`);
  };

  const handleInputChange = (id, field, value) => {
    setReferences(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const filteredData = references.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
      
      {/* HEADER & TOGGLE */}
      <div className="bg-[#020617] p-10 rounded-[3rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-teal-500 p-4 rounded-[1.5rem] shadow-lg text-white">
            <BookOpen size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
              Reference <span className="text-teal-400">Desk</span>
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3 italic">Standards & Protocols</p>
          </div>
        </div>

        <div className="relative z-10 flex bg-white/5 p-2 rounded-[2rem] border border-white/10 w-full lg:w-auto backdrop-blur-sm">
          <button 
            onClick={() => { setActiveTab('clinical'); setEditId(null); }}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'clinical' ? 'bg-teal-500 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
          >
            <Activity size={16} /> Clinical Norms
          </button>
          <button 
            onClick={() => { setActiveTab('pricing'); setEditId(null); }}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pricing' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
          >
            <DollarSign size={16} /> Pricing
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="max-w-xl relative mx-auto group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Filter Diagnostic Item..."
          className="w-full bg-white border border-slate-200 rounded-[2rem] py-5 pl-16 pr-8 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-teal-500/5 transition-all shadow-sm"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* DATA TABLES */}
      <div className="bg-white border border-slate-100 rounded-[3.5rem] overflow-hidden shadow-xl mx-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                <th className="px-12 py-8">Diagnostic Service</th>
                <th className="px-12 py-8 text-center">Category</th>
                {activeTab === 'clinical' ? (
                  <>
                    <th className="px-12 py-8">Reference Range</th>
                    <th className="px-12 py-8 text-rose-500">Critical Threshold</th>
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
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item) => (
                <tr key={item.id} className={`group transition-all ${editId === item.id ? 'bg-teal-50/30' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-12 py-8">
                    <p className="font-black text-slate-900 text-sm uppercase italic tracking-tighter">{item.name}</p>
                  </td>
                  <td className="px-12 py-8 text-center">
                    <span className="bg-slate-900 text-teal-400 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      {item.category}
                    </span>
                  </td>
                  
                  {activeTab === 'clinical' ? (
                    <>
                      <td className="px-12 py-8">
                        {editId === item.id ? (
                          <input 
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-500 w-full"
                            value={item.range}
                            onChange={(e) => handleInputChange(item.id, 'range', e.target.value)}
                          />
                        ) : (
                          <span className="font-bold text-slate-600 text-sm italic">{item.range} <small className="text-[10px] text-slate-400 uppercase not-italic">{item.unit}</small></span>
                        )}
                      </td>
                      <td className="px-12 py-8">
                        {editId === item.id ? (
                          <input 
                            className="bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 outline-none focus:border-rose-500 w-full"
                            value={item.critical}
                            onChange={(e) => handleInputChange(item.id, 'critical', e.target.value)}
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-rose-600 font-black text-xs uppercase tracking-widest">
                            <AlertTriangle size={14} /> {item.critical}
                          </div>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-12 py-8">
                        {editId === item.id ? (
                          <input 
                            type="number"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 w-full"
                            value={item.price}
                            onChange={(e) => handleInputChange(item.id, 'price', e.target.value)}
                          />
                        ) : (
                          <span className="font-black text-blue-600 text-lg tracking-tighter italic">KES {item.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-12 py-8">
                        {editId === item.id ? (
                          <input 
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 w-full"
                            value={item.unit}
                            onChange={(e) => handleInputChange(item.id, 'unit', e.target.value)}
                          />
                        ) : (
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{item.unit || 'Per Test'}</span>
                        )}
                      </td>
                    </>
                  )}

                  <td className="px-12 py-8 text-right">
                    <div className="flex justify-end gap-2">
                      {editId === item.id ? (
                        <>
                          <button 
                            onClick={() => handleUpdate(item)}
                            className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all shadow-md"
                          >
                            <Save size={18} />
                          </button>
                          <button 
                            onClick={() => setEditId(null)}
                            className="p-3 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setEditId(item.id)}
                          className="p-4 bg-slate-50 hover:bg-[#020617] text-slate-400 hover:text-white rounded-2xl transition-all shadow-sm"
                        >
                          <Edit3 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LabReference;