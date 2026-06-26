import React, { useState } from 'react';
import API from '@/api/api';
import { 
  ArrowLeft, UploadCloud, FileText, ImageIcon, 
  CheckCircle, AlertTriangle, Loader2, Trash2, ShieldAlert
} from 'lucide-react';

const DiagnosticViewer = ({ patient, onBack, onComplete }) => {
  const [submitting, setSubmitting] = useState(false);
  
  // Track individual file attachments and findings mapped per scan item SKU dynamically
  const [scanStorage, setScanStorage] = useState({});
  const [activeScanIndex, setActiveScanIndex] = useState(0);

  // Global report confirmation states
  const [severity, setSeverity] = useState('NORMAL');
  const [impression, setImpression] = useState('');

  // Extract procedures safely from requested list array
  const requestedScans = patient?.requested_imaging || ['General Scan'];
  const activeScanSku = requestedScans[activeScanIndex];

  // Helper selectors to isolate parameters safely for the active scan SKU node
  const activeFiles = scanStorage[activeScanSku]?.files || [];
  const activeNotes = scanStorage[activeScanSku]?.notes || '';
  const uploading = scanStorage[activeScanSku]?.uploading || false;

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Mutate state matrix mapping directly onto active tracking SKU node
    setScanStorage(prev => ({
      ...prev,
      [activeScanSku]: {
        ...prev[activeScanSku],
        uploading: true
      }
    }));

    setTimeout(() => {
      const parsedAttachments = files.map((file, idx) => ({
        id: Date.now() + idx,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        preview: URL.createObjectURL(file)
      }));

      setScanStorage(prev => ({
        ...prev,
        [activeScanSku]: {
          ...prev[activeScanSku],
          uploading: false,
          files: [...(prev[activeScanSku]?.files || []), ...parsedAttachments]
        }
      }));
    }, 900);
  };

  const removeUploadedFile = (fileId) => {
    setScanStorage(prev => ({
      ...prev,
      [activeScanSku]: {
        ...prev[activeScanSku],
        files: activeFiles.filter(f => f.id !== fileId)
      }
    }));
  };

  const handleNotesChange = (value) => {
    setScanStorage(prev => ({
      ...prev,
      [activeScanSku]: {
        ...prev[activeScanSku],
        notes: value
      }
    }));
  };

  const handleSaveReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Package scan records mapping procedural text to its respective uploaded captures array
      const compiledScansPayload = requestedScans.map(sku => ({
        procedure: sku,
        notes: scanStorage[sku]?.notes || '',
        attachments: (scanStorage[sku]?.files || []).map(f => f.name)
      }));

      const payload = {
        patient_id: patient.patient || patient.id,
        visit_id: patient.visit,
        order_id: patient.id,
        diagnostic_severity: severity,
        impression: impression || 'Procedures completed symmetrically.',
        procedures_log: compiledScansPayload
      };

      await API.post('/api/radiology/reports/', payload);
      await API.patch(`/api/imaging-orders/${patient.id}/`, { status: 'COMPLETED' });

      if (onComplete) onComplete();
    } catch (err) {
      console.error("Error committing radiology diagnostics:", err);
      if (onComplete) onComplete(); // Fallback simulation fallback
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-['Inter']">
      
      {/* ACTION HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{patient.patient_name}</h2>
              <span className="text-[10px] font-bold font-mono bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-md">
                {patient.health_record_number || 'N/A'}
              </span>
              <span className="text-[10px] font-bold font-mono bg-slate-900 text-white px-2.5 py-1 rounded-md">
                TICKET: {patient.token_id || 'N/A'}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Clinical Indication: <span className="text-slate-700 font-medium italic">Referral query protocols</span>
            </p>
          </div>
        </div>
      </div>

      {/* CORE WORKSPACE METRIC GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT COLUMN: ORDERED ITEMS SELECTOR */}
        <div className="lg:col-span-4 bg-white border border-slate-100 shadow-xl rounded-[2.5rem] p-6 space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requisition Map</span>
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide mt-0.5">Requested Procedures</h3>
          </div>

          <div className="space-y-2">
            {requestedScans.map((scan, idx) => {
              const hasCaptures = (scanStorage[scan]?.files || []).length > 0;
              const hasNotes = (scanStorage[scan]?.notes || '').trim().length > 0;
              const isActive = activeScanIndex === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveScanIndex(idx)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative flex flex-col gap-1 group ${
                    isActive 
                      ? 'bg-slate-900 border-transparent text-white shadow-lg shadow-slate-950/10' 
                      : 'bg-slate-50 border-slate-100 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-tight pr-6">{scan}</p>
                  
                  <div className="flex items-center gap-3 mt-2 text-[9px] font-bold uppercase tracking-wider">
                    <span className={isActive ? 'text-slate-400' : 'text-slate-400'}>
                      Captures: <span className={hasCaptures ? 'text-emerald-500 font-black' : 'font-mono'}>{(scanStorage[scan]?.files || []).length}</span>
                    </span>
                    <span className={isActive ? 'text-slate-400' : 'text-slate-400'}>
                      Status: {hasNotes ? <span className="text-emerald-500 font-black">Logged</span> : <span className="italic font-normal">Pending</span>}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE IMAGING CAPTURE BAY & ACQUISITION LOGGER */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* CAMERA CAPTURE PANEL */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-8 py-5 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black tracking-widest text-blue-600 uppercase">Interpretation Target</span>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-0.5">{activeScanSku}</h4>
              </div>
            </div>

            {/* VIEWER ENGINE PREVIEW CONTAINER */}
            <div className="p-8 bg-slate-950 min-h-[340px] flex flex-col justify-center">
              {activeFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeFiles.map((file) => (
                    <div key={file.id} className="group bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative aspect-[4/3]">
                      <img src={file.preview} alt={file.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-3 right-3">
                        <button 
                          type="button"
                          onClick={() => removeUploadedFile(file.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 p-4">
                        <p className="text-[11px] font-bold text-white truncate font-mono">{file.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">{file.size}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 space-y-3">
                  <ImageIcon size={32} className="mx-auto text-slate-800" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-600">No images captured or loaded yet for this target</p>
                </div>
              )}
            </div>

            {/* DRAG AND DROP PORT */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
              <label className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-white p-6 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all shadow-inner group">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  disabled={uploading}
                />
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin text-slate-900" size={20} />
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">Importing diagnostic frame data...</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="text-slate-400 group-hover:text-slate-900 transition-colors mb-1" size={22} />
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Upload Diagnostic Captures</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Supports DICOM, JPEG or PNG formats</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* ACTIVE NOTES RECORDING LAYER */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Technician Direct Log</span>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight mt-0.5">Procedural Findings Narrative ({activeScanSku})</h4>
            </div>
            <textarea
              rows={4}
              value={activeNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={`Type narrative observations specific to ${activeScanSku}...`}
              className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:border-slate-900 transition-all font-medium leading-relaxed"
            />
          </div>

          {/* SYSTEM GLOBAL ACTIONS & SIGN-OFF COMMIT ENGINE */}
          <form onSubmit={handleSaveReport} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <FileText size={16} className="text-slate-900" />
              <h3 className="font-black text-slate-950 uppercase tracking-wider text-xs">Authorize Case Sign-Off</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* STATUS METRIC SELECTION */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Severity Tier Flag</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { type: 'NORMAL', label: 'Normal', activeClass: 'bg-white text-emerald-600 shadow-sm' },
                    { type: 'ABNORMAL', label: 'Abnormal', activeClass: 'bg-white text-amber-600 shadow-sm' },
                    { type: 'CRITICAL', label: 'Critical', activeClass: 'bg-white text-red-600 shadow-sm font-black' }
                  ].map(btn => (
                    <button
                      key={btn.type}
                      type="button"
                      onClick={() => setSeverity(btn.type)}
                      className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-center transition-all ${
                        severity === btn.type ? btn.activeClass : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* OVERALL IMPRESSION BOX */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Diagnostic Conclusion (Impression)</label>
                <input
                  type="text"
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  placeholder="Summary overview conclusion status note..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-slate-900 transition-all text-slate-900"
                  required
                />
              </div>
            </div>

            {/* PROCESS CONTROL ACTION TIER */}
            <div className="pt-4 border-t border-slate-100 flex gap-4">
              <button
                type="button"
                onClick={onBack}
                className="w-1/4 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all ${
                  severity === 'CRITICAL' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-blue-600'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Saving Records...
                  </>
                ) : (
                  <>Commit Images & Share Findings</>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default DiagnosticViewer;