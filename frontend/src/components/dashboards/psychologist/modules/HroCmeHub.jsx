import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { Database, Award, CheckCircle, RefreshCw } from 'lucide-react';

const HroCmeHub = () => {
  const [unsyncedLogs, setUnsyncedLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    fetchUnsyncedLogs();
  }, []);

  const fetchUnsyncedLogs = async () => {
    setLoading(true);
    try {
      // Pulls sessions where is_synced_with_hro === False
      const res = await API.get('/session-logs/unsynced-hro/');
      setUnsyncedLogs(res.data.results || res.data);
    } catch (err) {
      console.error("Error fetching unsynced record logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleHroSyncSubmit = async () => {
    if (unsyncedLogs.length === 0) return;
    setSyncLoading(true);
    try {
      // Loop through and patch the items as synced in the system database
      const syncPromises = unsyncedLogs.map(log => 
        API.patch(`/session-logs/${log.id}/`, { is_synced_with_hro: True })
      );
      await Promise.all(syncPromises);
      alert("Daily aggregates successfully filed and synced with Health Records Officers.");
      fetchUnsyncedLogs(); // Reload counter state
    } catch (err) {
      alert("Error updating database synchronization records.");
    } finally {
      setSyncLoading(false);
    }
  };

  const mockCmeTracks = [
    { topic: 'Psychosocial Distress Screening in Palliative Care', hours: '4 CME Hours', status: 'Credited' },
    { topic: 'Breaking Bad News: Clinical Oncological Frameworks', hours: '6 CME Hours', status: 'Credited' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left font-['Inter'] animate-in fade-in duration-500">
      
      {/* LEFT COMPONENT: HEALTH RECORDS DATA SYNC WORKSPACE */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between min-h-[420px]">
        <div>
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Database className="text-teal-600" size={20}/> HRO Daily Sync
              </h3>
              <p className="text-xs text-slate-400 mt-1">Submit completed aggregate counseling consultation counts to Health Records</p>
            </div>
            <button onClick={fetchUnsyncedLogs} className="p-2 bg-slate-50 border hover:bg-slate-100 rounded-lg transition-all" title="Refresh Sync State">
              <RefreshCw size={12} className={loading ? 'animate-spin text-teal-500' : 'text-slate-500'} />
            </button>
          </div>

          <div className="space-y-3 bg-slate-50/70 p-5 rounded-xl border border-slate-100 mt-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 text-xs">
              <span className="font-medium text-slate-500">Current Date Context</span>
              <span className="font-semibold text-slate-800">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex justify-between items-center pt-1 text-xs">
              <span className="font-medium text-slate-500">Pending Encounter Logs</span>
              {loading ? (
                <span className="text-slate-400 animate-pulse font-medium">Evaluating counts...</span>
              ) : (
                <span className={`font-semibold px-2 py-0.5 rounded ${unsyncedLogs.length > 0 ? 'text-amber-600 bg-amber-50 font-mono text-sm' : 'text-teal-600 bg-teal-50'}`}>
                  {unsyncedLogs.length} Sessions
                </span>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={handleHroSyncSubmit}
          disabled={syncLoading || unsyncedLogs.length === 0}
          className={`w-full mt-8 py-4 rounded-xl font-semibold text-xs tracking-wider transition-all active:scale-95 shadow-sm ${
            unsyncedLogs.length === 0 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-slate-900 text-teal-400 hover:bg-slate-800'
          }`}
        >
          {syncLoading ? "TRANSMITTING DATA..." : "Execute Daily Records Submission"}
        </button>
      </div>

      {/* RIGHT COMPONENT: CME TRAINING ATTENDANCE REGISTRY */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between min-h-[420px]">
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="text-amber-500" size={20}/> Continuous Medical Education
            </h3>
            <p className="text-xs text-slate-400 mt-1">Track certified training records and hospital-led compliance hours</p>
          </div>

          <div className="space-y-3 mt-6">
            {mockCmeTracks.map((cme, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-slate-50/60 border border-slate-100 rounded-xl text-xs">
                <div>
                  <p className="font-semibold text-slate-800">{cme.topic}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{cme.hours}</p>
                </div>
                <span className="bg-teal-50 text-teal-600 border border-teal-100 px-2.5 py-1 rounded-md font-medium shrink-0 ml-4">
                  {cme.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => alert("Launching external medical board license certificate upload modal.")}
          className="w-full mt-8 bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-semibold text-xs tracking-wider transition-all active:scale-95"
        >
          Register External CME Certificate
        </button>
      </div>

    </div>
  );
};

export default HroCmeHub;