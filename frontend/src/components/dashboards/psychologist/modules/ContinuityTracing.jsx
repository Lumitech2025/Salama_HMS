import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { AlertTriangle, Phone, CheckCircle, RefreshCw, Layers } from 'lucide-react';

const ContinuityTracing = () => {
  const [ltfuCases, setLtfuCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLtfuCases();
  }, []);

  const fetchLtfuCases = async () => {
    setLoading(true);
    try {
      // Connects directly to our custom Django viewset endpoint action matrix
      const res = await API.get('/psychology-enrollments/lost-to-follow-up/');
      setLtfuCases(res.data.results || res.data);
    } catch (err) {
      console.error("Error retrieving tracking cases:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (caseId, newStatus) => {
    setActionLoading(true);
    try {
      // Modifies the case status directly inside the DB instance configuration records
      await API.patch(`/psychology-enrollments/${caseId}/`, { status: newStatus });
      fetchLtfuCases(); // Refresh list immediately
    } catch (err) {
      alert("Error executing tracing status modification updating.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-10 font-['Inter'] text-left animate-in fade-in">
      
      {/* 1. LOST TO FOLLOW UP WORKSPACE CARD */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <AlertTriangle className="text-rose-500" size={20}/> Lost to Follow-Up Tracing Desk
            </h3>
            <p className="text-xs text-slate-400 mt-1">Trace, contact, and reconnect missing oncology patients into active care lifecycles</p>
          </div>
          <button onClick={fetchLtfuCases} className="p-2.5 bg-slate-50 border hover:bg-slate-100 rounded-xl transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin text-teal-500' : 'text-slate-500'} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="p-4 px-6 font-semibold">Patient Case Identity</th>
                <th className="p-4 font-semibold">Oncology Diagnosis</th>
                <th className="p-4 font-semibold text-center">Last Location Dept</th>
                <th className="p-4 font-semibold text-center">Psychological Stage</th>
                <th className="p-4 text-right px-6 font-semibold">Action Tracker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center text-slate-400 animate-pulse font-medium">Scanning institutional databases...</td></tr>
              ) : ltfuCases.length > 0 ? ltfuCases.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="p-4 px-6">
                    <p className="font-semibold text-slate-900">{item.patient_name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{item.medical_record_no}</p>
                  </td>
                  <td className="p-4 font-medium text-slate-700 italic">"{item.diagnosis}"</td>
                  <td className="p-4 text-center">
                    <span className="text-xs font-semibold bg-slate-100 border text-slate-600 px-2.5 py-1 rounded-md">{item.department_display}</span>
                  </td>
                  <td className="p-4 text-center font-medium text-slate-800">{item.stage_display}</td>
                  <td className="p-4 text-right px-6">
                    <div className="flex justify-end gap-2">
                      <button 
                        disabled={actionLoading}
                        onClick={() => alert(`Initiating phone trace tracking outreach logs for ${item.patient_name}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-teal-400 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Phone size={12}/> Log Call
                      </button>
                      <button 
                        disabled={actionLoading}
                        onClick={() => handleStatusUpdate(item.id, 'IN_THERAPY')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 hover:bg-teal-100 text-teal-600 rounded-lg text-xs font-semibold transition-all"
                      >
                        <CheckCircle size={12}/> Reconnected
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="p-20 text-center text-slate-300 font-medium">
                    <Layers size={32} className="mx-auto text-slate-200 mb-3"/>
                    No patients are currently flagged as lost to follow-up. Excellent care compliance!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContinuityTracing;