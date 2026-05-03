import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Download, 
  ExternalLink, 
  FileCheck,
  Calendar,
  Filter,
  MoreVertical
} from 'lucide-react';

const InvoiceHistory = () => {
  // Logic: Comprehensive historical log of all financial documents
  const [history] = useState([
    { id: 'INV-2026-001', patient: 'John Doe', date: '2026-05-01', amount: 145000, type: 'Cycle Invoice', method: 'Insurance', status: 'Paid' },
    { id: 'INV-2026-002', patient: 'Jane Wambui', date: '2026-04-28', amount: 5000, type: 'Consultation', method: 'M-Pesa', status: 'Paid' },
    { id: 'CN-2026-001', patient: 'Musa Hassan', date: '2026-04-25', amount: 12000, type: 'Credit Note', method: 'Refund', status: 'Processed' },
    { id: 'INV-2026-003', patient: 'Esther Njeri', date: '2026-04-20', amount: 280000, type: 'Cycle Invoice', method: 'Insurance', status: 'Pending' },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Archives</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Audit Trail & Transaction History</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Invoice # or Patient..." 
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <button className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Document ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient & Type</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                        <FileCheck size={16} />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-900">{item.id}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{item.date}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-800 text-sm">{item.patient}</p>
                    <span className="text-[10px] font-black text-teal-600 uppercase tracking-tighter">{item.type}</span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-sm">KES {item.amount.toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                      <span className="text-xs font-bold text-slate-600">{item.method}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                      item.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      item.status === 'Processed' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all">
                        <Download size={16} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Placeholder */}
        <div className="p-6 bg-slate-50/30 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing 4 of 1,240 entries</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-[10px] font-black uppercase border border-slate-200 rounded-xl disabled:opacity-50" disabled>Previous</button>
            <button className="px-4 py-2 text-[10px] font-black uppercase bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHistory;