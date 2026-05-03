import React from 'react';
import { 
  Pill, 
  History, 
  Download, 
  Info, 
  User, 
  Calendar, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

const PrescriptionManager = () => {
  // Mock data representing pharmacy history and active orders
  const prescriptions = [
    { 
      id: "RX-2026-9901", 
      medication: "Ondansetron 8mg", 
      dosage: "1 tablet every 8 hours", 
      frequency: "As needed for nausea",
      doctor: "Dr. Mwiti", 
      status: "Active", 
      refills: 2,
      date: "May 02, 2026"
    },
    { 
      id: "RX-2026-8742", 
      medication: "Dexamethasone 4mg", 
      dosage: "2 tablets once daily", 
      frequency: "Take in the morning after food",
      doctor: "Dr. Mwiti", 
      status: "Completed", 
      refills: 0,
      date: "April 10, 2026"
    }
  ];

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Prescription Manager</h1>
        <p className="text-slate-500 font-medium text-sm">Monitor your current medications and view your pharmacy history.</p>
      </header>

      {/* Safety Alert for Oncology Patients */}
      <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 flex gap-4 items-start">
        <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Medication Safety</h4>
          <p className="text-sm text-amber-800/80 font-medium leading-relaxed mt-1">
            Always follow the dosage instructions provided by your oncologist. If you experience unexpected side effects, 
            contact the Salama clinic immediately or visit the emergency department.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {prescriptions.map((rx) => (
          <div key={rx.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden group hover:border-blue-200 transition-all">
            <div className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex gap-5">
                  <div className={`p-4 rounded-2xl shrink-0 ${rx.status === 'Active' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                    <Pill size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{rx.medication}</h3>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        rx.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {rx.status}
                      </span>
                    </div>
                    <p className="text-blue-600 font-bold text-sm mb-4">{rx.dosage}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <Info size={16} className="text-slate-400" />
                        <span>{rx.frequency}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <User size={16} className="text-slate-400" />
                        <span>Prescribed by {rx.doctor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <Calendar size={16} className="text-slate-400" />
                        <span>Date: {rx.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <History size={16} className="text-slate-400" />
                        <span>{rx.refills} Refills Remaining</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 w-full md:w-auto">
                  <button className="flex-1 md:w-32 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all">
                    <Download size={16} /> Slip
                  </button>
                  <button className="flex-1 md:w-32 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-xl text-xs font-bold hover:bg-white transition-all">
                    Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrescriptionManager;