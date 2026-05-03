import React, { useState } from 'react';
import { Search, Download, Filter, FlaskConical, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const LabResults = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - This will eventually be replaced by your Django API call
  const results = [
    { id: 1, test: "Full Blood Count (FBC)", date: "May 01, 2026", status: "Normal", doctor: "Dr. Mwiti", category: "Hematology" },
    { id: 2, test: "Liver Function Test", date: "April 28, 2026", status: "Critical", doctor: "Dr. Mwiti", category: "Biochemistry" },
    { id: 3, test: "Renal Profile", date: "April 15, 2026", status: "Normal", doctor: "Dr. Mwiti", category: "Biochemistry" },
  ];

  return (
    <div className="p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Lab Reports</h1>
          <p className="text-slate-500 font-medium text-sm">View and download your official diagnostic results.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search tests..."
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </header>

      {/* Main Table Container */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-bottom border-slate-100">
              <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Test Description</th>
              <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date Reported</th>
              <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-5 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {results.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${item.status === 'Critical' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                      <FlaskConical size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">{item.test}</p>
                      <p className="text-xs text-slate-500 font-medium">Ordered by {item.doctor}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-sm font-bold text-slate-600">{item.category}</span>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-slate-500">
                  {item.date}
                </td>
                <td className="px-6 py-5">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    item.status === 'Normal' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {item.status === 'Normal' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {item.status}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Download PDF">
                      <Download size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insight Box */}
      <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100 flex gap-4 items-start">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shrink-0">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900 uppercase tracking-tight">Understanding your results</h4>
          <p className="text-sm text-blue-700/80 font-medium leading-relaxed mt-1">
            Standard reference ranges are provided for general information. Always consult with Dr. Mwiti to discuss your specific clinical context and treatment plan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LabResults;