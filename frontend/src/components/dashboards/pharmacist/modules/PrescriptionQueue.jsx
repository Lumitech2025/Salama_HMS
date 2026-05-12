import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  User, Pill, ChevronDown, CheckCircle2, 
  AlertCircle, Loader2, Eye, Send, Clock 
} from 'lucide-react';

const PrescriptionQueue = ({ onTabSwitch }) => {
  const [queue, setQueue] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [isDispensing, setIsDispensing] = useState(false);

  // 1. Fetch live pharmacy queue
  const fetchQueue = useCallback(async () => {
    try {
      const res = await API.get('/queue/?current_station=PHARMACY&status=AWAITING_MEDICATION');
      setQueue(res.data.results || res.data || []);
    } catch (err) {
      console.error("Queue fetch error", err);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000); 
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // 2. Fetch Prescription details for specific clinical selection
  const handleViewPrescription = async (patientQueueItem) => {
    setLoading(true);
    setSelectedPatient(patientQueueItem);
    try {
      const patientId = patientQueueItem.patient;
      const res = await API.get(`/prescriptions/?patient=${patientId}&status=PENDING`);
      const results = res.data.results || res.data;
      setPrescriptionData(results.length > 0 ? results[0] : null);
    } catch (err) {
      console.error("Prescription fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Finalize workflow and push to Billing
  const handleCompleteDispense = async () => {
    if (!prescriptionData) return;
    setIsDispensing(true);

    try {
      // Mark prescription as dispensed in clinical records
      await API.patch(`/prescriptions/${prescriptionData.id}/`, { status: 'DISPENSED' });
      
      // Advance patient in the hospital queue
      await API.patch(`/queue/${selectedPatient.id}/`, { 
        status: 'WAITING',
        current_station: 'BILLING' 
      });

      alert("Clinical Cycle Complete: Patient forwarded to Billing for settlement.");
      
      // Switch tab to billing module
      onTabSwitch('billing', {
          patientId: selectedPatient.patient,
          billNo: `INV-${prescriptionData.id}`
      });

      setSelectedPatient(null);
      setPrescriptionData(null);
      fetchQueue();
    } catch (err) {
      alert("Workflow Error: Could not finalize dispense cycle.");
    } finally {
      setIsDispensing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
      
      {/* SELECTION HUB */}
      <div className="bg-[#020617] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative z-30">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4 flex-1 w-full">
            <div className="p-4 bg-teal-500/10 rounded-2xl text-teal-500">
              <User size={24} />
            </div>
            <div className="flex-1 relative">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Live Dispensary Queue</p>
              <select 
                className="w-full bg-slate-900 border-none rounded-2xl p-4 font-black text-white text-sm appearance-none outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                onChange={(e) => {
                  const p = queue.find(item => item.id === parseInt(e.target.value));
                  if(p) handleViewPrescription(p);
                }}
                value={selectedPatient?.id || ''}
              >
                <option value="" disabled>Select patient from live queue...</option>
                {queue.map(p => (
                  <option key={p.id} value={p.id}>{p.patient_name} — {p.token_id}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 bottom-4 text-slate-500 pointer-events-none" size={18} />
            </div>
          </div>

          {selectedPatient && (
            <div className="animate-in zoom-in text-right hidden md:block border-l border-white/10 pl-8">
              <p className="text-teal-500 font-black text-xl italic tracking-tighter">{selectedPatient.token_id}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Token Session</p>
            </div>
          )}
        </div>
      </div>

      {/* REGIMEN VERIFICATION (Clinical Only) */}
      {selectedPatient ? (
        <main className="bg-white border border-slate-100 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-5">
                <div className="p-4 bg-teal-50 rounded-3xl">
                    <Pill className="text-teal-500" size={32} />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Regimen Verification</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ordered: {new Date(prescriptionData?.created_at).toLocaleString()}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">MD: {prescriptionData?.doctor_name || "Oncology Unit"}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end">
                <span className="bg-slate-100 text-slate-500 px-6 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest">
                {prescriptionData?.items?.length || 0} Medications Listed
                </span>
            </div>
          </div>

          {loading ? (
            <div className="py-32 text-center">
                <Loader2 className="animate-spin text-teal-500 mx-auto" size={48} />
                <p className="text-[11px] font-black text-slate-400 uppercase mt-4 tracking-[0.2em]">Accessing Prescription Data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptionData?.items?.length > 0 ? prescriptionData.items.map((item, idx) => (
                <div key={idx} className="group flex items-center justify-between p-8 bg-slate-50/50 rounded-[2.5rem] border border-transparent hover:border-teal-200 hover:bg-white hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300">
                  <div className="flex items-center gap-8">
                    <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:bg-teal-500 group-hover:text-white transition-all duration-500">
                      <Pill size={24} className="text-indigo-600 group-hover:text-white" />
                    </div>
                    <div>
                      <h5 className="font-black text-slate-900 uppercase text-xl tracking-tight mb-1">{item.medication_name}</h5>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg border border-teal-100 uppercase">{item.dosage}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{item.route} • {item.frequency} • {item.duration}</span>
                      </div>
                      {item.instructions && (
                        <div className="mt-4 flex items-start gap-2 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 w-fit">
                            <span className="text-[10px] font-black text-amber-600 uppercase">Note:</span>
                            <p className="text-[11px] text-amber-800 italic font-medium">{item.instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pr-4">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Verified</span>
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
                  </div>
                </div>
              )) : (
                <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[3.5rem] bg-slate-50/30">
                    <AlertCircle className="mx-auto text-slate-200 mb-4" size={64} />
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">No pending medications found.</p>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-16 pt-10 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-400">
                <Clock size={16} className="text-teal-500"/>
                <span className="text-[11px] font-bold uppercase tracking-widest">Process cycle: Standard Verification Protocol</span>
            </div>
            <button 
                onClick={handleCompleteDispense}
                disabled={isDispensing || !prescriptionData}
                className="bg-teal-500 text-white px-16 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-teal-200 hover:bg-[#020617] transition-all duration-500 flex items-center gap-4 disabled:opacity-50 group"
            >
                {isDispensing ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                Complete Cycle & Push to Billing
            </button>
          </div>
        </main>
      ) : (
        <div className="bg-white border border-dashed border-slate-200 rounded-[4rem] p-40 text-center shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <Eye size={48} className="text-slate-200 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Awaiting Clinical Selection</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] mt-4 max-w-xs mx-auto leading-relaxed">
                Select a patient from the queue to verify physician orders and complete the pharmacy cycle.
            </p>
        </div>
      )}
    </div>
  );
};

export default PrescriptionQueue;