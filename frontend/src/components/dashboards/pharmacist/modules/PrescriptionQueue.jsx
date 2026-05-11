import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  User, ClipboardList, Pill, Info, ChevronDown, 
  Search, CheckCircle2, AlertCircle, Loader2, Eye
} from 'lucide-react';

const PrescriptionQueue = () => {
  const [queue, setQueue] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(true);

  // Fetch the live pharmacy queue
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await API.get('/queue/?current_station=PHARMACY');
        setQueue(res.data.results || res.data);
      } catch (err) {
        console.error("Queue fetch error", err);
      } finally {
        setLoadingQueue(false);
      }
    };
    fetchQueue();
  }, []);

  // Fetch the specific prescription written by the doctor
  const handleViewPrescription = async (patient) => {
    setLoading(true);
    setSelectedPatient(patient);
    try {
      // Assuming endpoint to get medications for the active appointment
      const res = await API.get(`/treatments/?patient=${patient.patient}&status=PENDING`);
      setPrescriptionData(res.data.results || res.data);
    } catch (err) {
      console.error("Prescription fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (treatmentId) => {
    try {
      await API.patch(`/treatments/${treatmentId}/`, { status: 'DISPENSED' });
      alert("Medication marked as Dispensed");
      handleViewPrescription(selectedPatient); // Refresh list
    } catch (err) {
      alert("Error updating status");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* TIER 1: PATIENT SELECTION DROPDOWN (DARK CONTRAST) */}
      <div className="bg-[#020617] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative z-30">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4 flex-1 w-full">
            <div className="p-4 bg-teal-500/10 rounded-2xl text-teal-500">
              <User size={24} />
            </div>
            <div className="flex-1 relative">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Active Patient Selection</p>
              <select 
                className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm appearance-none outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                onChange={(e) => {
                  const p = queue.find(item => item.id === parseInt(e.target.value));
                  if(p) handleViewPrescription(p);
                }}
                value={selectedPatient?.id || ''}
              >
                <option value="" disabled>Select patient from queue...</option>
                {queue.map(p => (
                  <option key={p.id} value={p.id}>{p.patient_name} — {p.token_id}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 bottom-4 text-slate-500 pointer-events-none" size={18} />
            </div>
          </div>

          {selectedPatient && (
            <div className="animate-in zoom-in text-right hidden md:block">
              <p className="text-teal-500 font-black text-xl italic tracking-tighter">{selectedPatient.token_id}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Current Session</p>
            </div>
          )}
        </div>
      </div>

      {/* TIER 2: DOCTOR'S ORDERS DISPLAY */}
      {selectedPatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-500">
          
          {/* LEFT: DOCTOR'S NOTES */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                <ClipboardList className="text-teal-600" size={20} />
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Prescriber's Instructions</h4>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-sm text-slate-600 leading-relaxed italic font-medium">
                  {selectedPatient.doctor_notes || "Patient referred for standard oncology cycle medications. Monitor for nausea."}
                </p>
              </div>
              <div className="mt-8 flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <CheckCircle2 size={18} />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Verified Prescriber</p>
                    <p className="text-xs font-black text-slate-900 uppercase">{selectedPatient.doctor_name || "Dr. Kimathi"}</p>
                 </div>
              </div>
            </div>
          </aside>

          {/* RIGHT: MEDICATION LIST */}
          <main className="lg:col-span-8 bg-white border border-slate-100 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <Pill className="text-teal-500" size={32} />
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter text-shadow-sm">Pending Dispensing</h3>
                </div>
                <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {prescriptionData?.length || 0} Medications
                </span>
            </div>

            {loading ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin text-teal-500 mx-auto" size={40} /></div>
            ) : (
                <div className="space-y-4">
                   {prescriptionData?.length > 0 ? prescriptionData.map((item, idx) => (
                       <div key={idx} className="group flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-transparent hover:border-teal-200 transition-all">
                           <div className="flex items-center gap-6">
                              <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:rotate-6 transition-transform">
                                <Pill size={20} className="text-indigo-600" />
                              </div>
                              <div>
                                 <h5 className="font-black text-slate-900 uppercase text-lg">{item.drug_name || 'Doxorubicin'}</h5>
                                 <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mt-1">Dosage: {item.dosage || '50mg/m²'} — {item.frequency || 'Once'}</p>
                              </div>
                           </div>

                           <button 
                            onClick={() => handleDispense(item.id)}
                            className="bg-[#020617] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 transition-all shadow-lg active:scale-95"
                           >
                             Dispense Item
                           </button>
                       </div>
                   )) : (
                    <div className="py-20 text-center text-slate-400 font-medium italic">No pending medications found for this visit.</div>
                   )}
                </div>
            )}
            
            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end">
               <button 
                onClick={() => {
                   alert("Pharmacy cycle complete. Patient returned to Nurse/Billing.");
                   setSelectedPatient(null);
                }}
                className="bg-teal-500 text-white px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-200 hover:bg-teal-400 transition-all"
               >
                  Complete Pharmacy Cycle
               </button>
            </div>
          </main>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-[3rem] p-24 text-center shadow-sm">
            <Eye size={64} className="mx-auto text-slate-200 mb-6" />
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Awaiting Selection</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">Select a patient to load clinical data</p>
        </div>
      )}
    </div>
  );
};

export default PrescriptionQueue;