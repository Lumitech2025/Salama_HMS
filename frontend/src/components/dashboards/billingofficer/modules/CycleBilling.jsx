import React, { useState } from 'react';
import { 
  RefreshCcw, 
  Layers, 
  Plus, 
  ChevronRight, 
  Activity, 
  Printer,
  CalendarDays
} from 'lucide-react';

const CycleBilling = () => {
  // Logic: In an Oncology center, we group bills by Treatment Cycles
  const [activeCycle] = useState({
    patientName: "John Doe",
    protocol: "CHOP Regimen (Non-Hodgkin Lymphoma)",
    currentCycle: 2,
    totalCycles: 6,
    status: "In Progress",
    startDate: "2026-04-15"
  });

  const [cycleItems] = useState([
    { date: '2026-05-01', service: 'Cyclophosphamide 1000mg', category: 'Chemotherapy', amount: 85000, status: 'Billed' },
    { date: '2026-05-01', service: 'Doxorubicin 50mg', category: 'Chemotherapy', amount: 42000, status: 'Billed' },
    { date: '2026-05-01', service: 'Nursing Administration Fee', category: 'Services', amount: 5000, status: 'Pending' },
    { date: '2026-05-03', service: 'Pre-Medications (Ondansetron)', category: 'Pharmacy', amount: 2500, status: 'Pending' },
  ]);

  const totalCycleCost = cycleItems.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cycle Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-slate-200">
        <div className="flex items-center gap-6">
          <div className="bg-teal-500 p-4 rounded-3xl shadow-lg shadow-teal-500/20">
            <RefreshCcw size={32} className="text-white animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{activeCycle.protocol}</h2>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-widest">
                <Layers size={14} /> Cycle {activeCycle.currentCycle} of {activeCycle.totalCycles}
              </span>
              <span className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest border-l border-slate-700 pl-4">
                <CalendarDays size={14} /> Started: {activeCycle.startDate}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Cycle Estimated Total</p>
          <p className="text-4xl font-black text-teal-400 tracking-tighter">KES {totalCycleCost.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Billing Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Line Item Breakdown</h3>
            <button className="text-teal-600 font-bold text-xs flex items-center gap-1 hover:underline">
              <Plus size={14} /> Add Manual Charge
            </button>
          </div>
          
          <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
            {cycleItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className={`p-3 rounded-2xl ${item.category === 'Chemotherapy' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{item.service}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.category} • {item.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">KES {item.amount.toLocaleString()}</p>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${item.status === 'Billed' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-600'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-6">Cycle Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Billed to Insurance</span>
                <span className="text-slate-900 font-black tracking-tight text-right">KES 127,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Patient Co-pay</span>
                <span className="text-slate-900 font-black tracking-tight text-right">KES 7,500</span>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Due</span>
                <span className="text-xl font-black text-slate-900 tracking-tighter">KES 134,500</span>
              </div>
            </div>
            <button className="w-full mt-8 bg-teal-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-teal-900/20 hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
              <Printer size={18} /> Generate Invoice
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6">
            <h4 className="text-amber-800 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Cycle Alert</h4>
            <p className="text-amber-700 text-xs leading-relaxed font-medium">
              Patient is approaching the **NHIF Oncology Package** limit for Cycle 2. Verify pre-auth before next session on Day 8.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CycleBilling;