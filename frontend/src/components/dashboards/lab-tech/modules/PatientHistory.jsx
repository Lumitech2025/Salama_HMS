import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  History, FileText, Search, User, Calendar, Download, Share2,
  ChevronRight, MessageSquare, Loader2, RefreshCcw, Stethoscope
} from 'lucide-react';
import html2canvas from 'html2canvas';

const PatientHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API.get('/lab-results/');
      const data = response.data.results || response.data;
      
      // GROUPING LOGIC: Aggregating all tests and notes for a single session
      const grouped = data.reduce((acc, current) => {
        const sessionKey = current.appointment || current.test_date?.split('T')[0] || current.id;
        const groupKey = `${current.patient}-${sessionKey}`;

        if (!acc[groupKey]) {
          acc[groupKey] = {
            patient_name: current.patient_name,
            technician: current.recorded_by_name || "Andrew", 
            date: current.test_date || current.created_at,
            notes: [],
            tests: []
          };
        }
        
        acc[groupKey].tests.push({
          name: current.test_name,
          value: current.result_value,
          unit: getCommonUnit(current.test_name) 
        });

        // 🚨 FIX: Capture notes even if they are only on one test line
        if (current.notes && current.notes.trim() !== "" && !acc[groupKey].notes.includes(current.notes)) {
          acc[groupKey].notes.push(current.notes);
        }

        return acc;
      }, {});

      setHistory(Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error("History sync error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCommonUnit = (name) => {
    const n = name.toUpperCase();
    if (n.includes('PSA')) return 'ng/mL';
    if (n.includes('BLOOD RESULT') || n.includes('CBC')) return 'x10⁹/L';
    if (n.includes('UREA') || n.includes('ELECTROLYTE')) return 'mmol/L';
    if (n.includes('LIVER') || n.includes('LFT')) return 'U/L';
    if (n.includes('URINALYSIS')) return 'pH/Sp.Gr';
    if (n.includes('MALARIA')) return 'pos/neg';
    return '';
  };

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-KE', { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  // 🛠️ FUNCTIONAL BUTTONS
  const handleDownload = () => {
    window.print(); // Browser print dialog serves as "Save as PDF"
  };

  const handleShare = async () => {
    const shareData = {
      title: `Salama Lab Report - ${selectedReport.patient_name}`,
      text: `Diagnostic results for ${selectedReport.patient_name} dated ${formatDate(selectedReport.date)}. Notes: ${selectedReport.notes.join(' ')}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        alert("Sharing not supported on this browser. Copying to clipboard instead.");
        navigator.clipboard.writeText(shareData.text);
      }
    } catch (err) { console.log(err); }
  };

  const filteredHistory = history.filter(h => 
    h.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* ... Header remains the same ... */}
      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
            <History className="text-teal-500" /> Patient <span className="text-teal-500">History Archive</span>
          </h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Search and view verified diagnostic reports</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by Patient Name..." 
              className="w-full bg-slate-950 border-none rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchHistory} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all">
            <RefreshCcw size={20} className={`text-teal-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-white/5 bg-white/[0.02]">
                <th className="py-6 px-10">Patient Identity</th>
                <th className="py-6 px-10">Assigned Technician</th>
                <th className="py-6 px-10">Diagnostic Date</th>
                <th className="py-6 px-10 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!loading && filteredHistory.map((record, index) => (
                <tr key={index} className="group hover:bg-white/[0.02] transition-all">
                  <td className="py-8 px-10"><p className="font-black text-white text-base uppercase">{record.patient_name}</p></td>
                  <td className="py-8 px-10 text-slate-300 font-bold text-xs uppercase"><Stethoscope size={14} className="inline mr-2 text-teal-600" /> {record.technician}</td>
                  <td className="py-8 px-10 text-slate-400 font-bold text-xs uppercase"><Calendar size={14} className="inline mr-2 text-slate-600" /> {formatDate(record.date)}</td>
                  <td className="py-8 px-10 text-right">
                    <button onClick={() => setSelectedReport(record)} className="bg-teal-500/10 hover:bg-teal-500 text-teal-500 hover:text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all">
                      <FileText size={14} className="inline mr-2" /> View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#020617] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 print:shadow-none print:border-none">
            <div className="bg-teal-500 p-8 text-white flex justify-between items-center print:bg-white print:text-black print:border-b">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Verified Lab Report</h2>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{selectedReport.patient_name}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all print:hidden"><ChevronRight size={24} className="rotate-90" /></button>
            </div>
            
            <div className="p-10 space-y-8 print:p-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase">Analysis Date</p><p className="text-white print:text-black font-black text-sm">{formatDate(selectedReport.date)}</p></div>
                <div className="space-y-1 text-right"><p className="text-[9px] font-black text-slate-500 uppercase">Recorded By</p><p className="text-white print:text-black font-black text-sm uppercase">{selectedReport.technician}</p></div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-teal-500 uppercase border-b border-white/5 pb-2">Results Breakdown</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedReport.tests.map((t, i) => (
                    <div key={i} className="bg-white/5 print:bg-white print:border p-5 rounded-2xl border border-white/5 flex justify-between items-baseline">
                      <span className="text-xs font-bold text-slate-400 uppercase">{t.name}</span>
                      <div className="text-right">
                        <span className="text-lg font-black text-white print:text-black">{t.value}</span>
                        <span className="text-[10px] font-bold text-teal-600 ml-1 uppercase">{t.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-teal-500"><MessageSquare size={16} /><p className="text-[10px] font-black uppercase tracking-widest">Interpretative Notes</p></div>
                <div className="bg-slate-900/80 print:bg-white print:border p-6 rounded-[2rem] border border-white/5">
                  <p className="text-sm text-slate-300 print:text-black italic font-medium leading-relaxed">
                    {selectedReport.notes.length > 0 ? `"${selectedReport.notes.join(' | ')}"` : "No interpretative notes provided."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 print:hidden">
                <button onClick={handleDownload} className="bg-white text-slate-900 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-teal-400 transition-all">
                    <Download size={18} /> Download History
                </button>
                <button onClick={handleShare} className="bg-teal-600 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-teal-500 transition-all">
                    <Share2 size={18} /> Share History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientHistory;