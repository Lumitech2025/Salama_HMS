import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  History, FileText, Search, User, Calendar, Download, Share2,
  ChevronRight, MessageSquare, Loader2, RefreshCcw, Stethoscope, Beaker,
  Pill, Activity, Clipboard
} from 'lucide-react';

const PatientHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all clinical touchpoints in parallel
      const [labRes, notesRes, prescriptionRes] = await Promise.all([
        API.get('/lab-results/', { params: { status: 'COMPLETED' } }),
        API.get('/clinical-notes/'),
        API.get('/prescriptions/')
      ]);

      const labData = labRes.data.results || labRes.data || [];
      const notesData = notesRes.data.results || notesRes.data || [];
      const prescriptionData = prescriptionRes.data.results || prescriptionRes.data || [];

      // 2. MASTER GROUPING LOGIC: Combine Labs, Notes, and Prescriptions by Patient + Visit
      const masterRegistry = {};

      const getGroupKey = (item) => `${item.patient}-${item.visit || item.appointment || 'walk-in'}`;

      // Process Lab Results
      labData.forEach(item => {
        const key = getGroupKey(item);
        if (!masterRegistry[key]) masterRegistry[key] = { patient_name: item.patient_name, date: item.test_date || item.created_at, labs: [], notes: [], prescriptions: [] };
        
        if (item.parameters) {
          Object.entries(item.parameters).forEach(([k, v]) => {
            masterRegistry[key].labs.push({ name: `${item.test_label || item.test_name}: ${k.replace('_', ' ')}`, value: v });
          });
        }
        if (item.technician_notes) masterRegistry[key].notes.push({ author: "Lab Tech", content: item.technician_notes, role: 'LAB' });
      });

      // Process Clinical Notes
      notesData.forEach(item => {
        const key = getGroupKey(item);
        if (!masterRegistry[key]) masterRegistry[key] = { patient_name: item.patient_name, date: item.created_at, labs: [], notes: [], prescriptions: [] };
        masterRegistry[key].notes.push({ 
          author: item.author_name || "Doctor", 
          content: item.content, 
          role: item.note_type || 'CLINICAL' 
        });
      });

      // Process Prescriptions
      prescriptionData.forEach(item => {
        const key = getGroupKey(item);
        if (!masterRegistry[key]) masterRegistry[key] = { patient_name: item.patient_name, date: item.created_at, labs: [], notes: [], prescriptions: [] };
        
        const meds = item.items?.map(m => `${m.drug_name} (${m.dosage})`) || [];
        masterRegistry[key].prescriptions.push({ 
          id: item.id, 
          status: item.status, 
          summary: meds.join(", ") 
        });
      });

      const sortedHistory = Object.values(masterRegistry).sort((a, b) => new Date(b.date) - new Date(a.date));
      setHistory(sortedHistory);
    } catch (err) {
      console.error("Master History sync error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-KE', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const filteredHistory = history.filter(h => h.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
      
      {/* HEADER */}
      <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><History size={28} /></div>
            Clinical <span className="text-blue-600">History Registry</span>
          </h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Comprehensive Patient Audit Trail</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search patient records..." 
              className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] py-4 pl-16 pr-6 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchHistory} className="p-4 bg-white hover:bg-slate-50 border border-slate-100 rounded-[1.5rem] transition-all group">
            <RefreshCcw size={22} className={`text-blue-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-100 rounded-[4rem] overflow-hidden shadow-2xl mx-1">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                <th className="py-8 px-12 italic">Patient Identity</th>
                <th className="py-8 px-12 text-center italic">Clinical Events</th>
                <th className="py-8 px-12 text-center italic">Most Recent Visit</th>
                <th className="py-8 px-12 text-right italic">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="4" className="py-40 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic">Syncing Central EMR...</td></tr>
              ) : filteredHistory.map((record, index) => (
                <tr key={index} className="group hover:bg-slate-50 transition-all">
                  <td className="py-10 px-12 font-black text-slate-900 text-lg uppercase tracking-tight italic">{record.patient_name}</td>
                  <td className="py-10 px-12 text-center">
                    <div className="flex justify-center gap-2">
                        {record.labs.length > 0 && <span className="bg-teal-50 text-teal-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-teal-100">Labs</span>}
                        {record.notes.length > 0 && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">Notes</span>}
                        {record.prescriptions.length > 0 && <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-100">Meds</span>}
                    </div>
                  </td>
                  <td className="py-10 px-12 text-center font-bold text-slate-400 text-xs uppercase italic">{formatDate(record.date)}</td>
                  <td className="py-10 px-12 text-right">
                    <button onClick={() => setSelectedReport(record)} className="bg-[#020617] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg">View Profile</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REPORT */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in max-h-[90vh] flex flex-col">
            <div className="bg-[#020617] p-10 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Salama <span className="text-blue-400">Clinical Summary</span></h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">{selectedReport.patient_name}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"><X size={24} className="rotate-90" /></button>
            </div>
            
            <div className="p-12 space-y-10 overflow-y-auto">
              {/* Lab Section */}
              {selectedReport.labs.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-teal-600 font-black uppercase text-[10px] tracking-widest"><Beaker size={16} /> Diagnostic Data</div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedReport.labs.map((t, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-2xl flex justify-between border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase italic">{t.name}</span>
                        <span className="text-xs font-black text-slate-900">{t.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {selectedReport.notes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest"><MessageSquare size={16} /> Clinical Narratives</div>
                  <div className="space-y-3">
                    {selectedReport.notes.map((n, i) => (
                      <div key={i} className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100/50">
                        <p className="text-[9px] font-black text-blue-400 uppercase mb-2">Observation by {n.author}</p>
                        <p className="text-sm text-slate-700 italic font-bold leading-relaxed">"{n.content}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prescription Section */}
              {selectedReport.prescriptions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-rose-600 font-black uppercase text-[10px] tracking-widest"><Pill size={16} /> Active Medication</div>
                  <div className="space-y-2">
                    {selectedReport.prescriptions.map((p, i) => (
                      <div key={i} className="bg-rose-50/30 p-5 rounded-2xl border border-rose-100/50 flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-700">{p.summary}</p>
                        <span className="text-[8px] font-black bg-rose-500 text-white px-2 py-1 rounded-md uppercase">{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-10 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-4 shrink-0">
                <button className="bg-white border border-slate-200 text-slate-900 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3"><Download size={18} /> Export EMR</button>
                <button className="bg-blue-600 text-white py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-200"><Share2 size={18} /> Share Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const X = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} height={size} 
    viewBox="0 0 24 24" fill="none" 
    stroke="currentColor" strokeWidth="3" 
    strokeLinecap="round" strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export default PatientHistory;