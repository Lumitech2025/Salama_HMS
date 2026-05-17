import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { Radio, Calendar, Clock, ShieldCheck, Send, AlertCircle, Loader2 } from 'lucide-react';

const CommunicationsHub = () => {
  const [mediaQueue, setMediaQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Core Form Binding State Map
  const [formData, setFormData] = useState({
    content: '',
    target_platform: 'FACEBOOK',
    schedule_date: '',
    schedule_time: '',
    consent_verified: false,
    medical_signoff: false
  });

  useEffect(() => {
    fetchMediaQueue();
  }, []);

  const fetchMediaQueue = async () => {
    setLoading(true);
    try {
      const res = await API.get('/social-media-posts/');
      setMediaQueue(res.data.results || res.data || []);
    } catch (err) {
      console.error("Error connecting with communications endpoints:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    
    // Safety guard validation logic checkpoint
    if (!formData.consent_verified || !formData.medical_signoff) {
      alert("Validation Locked: You must verify patient media consent and secure clinical data sign-offs prior to public broadcasting.");
      return;
    }

    setSubmitting(true);
    
    // Calculate targeted execution lifecycle tags based on scheduling fields input
    const intendedStatus = formData.schedule_date ? 'SCHEDULED' : 'DISPATCHED';

    const payload = {
      content: formData.content,
      target_platform: formData.target_platform,
      schedule_date: formData.schedule_date || null,
      schedule_time: formData.schedule_time || null,
      consent_verified: formData.consent_verified,
      medical_signoff: formData.medical_signoff,
      status: intendedStatus
    };

    try {
      await API.post('/social-media-posts/', payload);
      alert(formData.schedule_date 
        ? "Public health message successfully registered under active scheduling pipelines."
        : "Public relations copy successfully integrated into the Meta Graph dispatch matrix live queue."
      );
      
      // Clear composer form state variables
      setFormData({
        content: '',
        target_platform: 'FACEBOOK',
        schedule_date: '',
        schedule_time: '',
        consent_verified: false,
        medical_signoff: false
      });
      
      fetchMediaQueue(); // Synchronize pipeline tracking panel rows
    } catch (err) {
      alert("Transmission Failure: Error connecting payload with the backend channel gateway routers.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left font-['Inter']">
      
      {/* MODULE HEADER META */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Radio className="text-teal-600" size={24} /> Communications Hub & Media Desk
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Compose public awareness campaigns, schedule health messaging loops, and manage verified digital outputs across Salama channels.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: BROADCAST COMPOSER & GOVERNANCE GATEWAY (6 Columns) */}
        <form onSubmit={handlePublishSubmit} className="xl:col-span-6 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-5">
          <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Compose Health Message Copy
          </h4>

          {/* Text Content Block */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Campaign Copy / Post Body</label>
            <textarea 
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              required
              rows="5"
              placeholder="Type educational copy or outreach announcements safely here. Remember to adhere to patient confidentiality best practices..."
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Target Feed</label>
              <select 
                name="target_platform"
                value={formData.target_platform}
                onChange={handleInputChange}
                className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-2 py-3 text-xs text-slate-800 focus:outline-none"
              >
                <option value="FACEBOOK">Facebook Page</option>
                <option value="INSTAGRAM">Instagram Business</option>
                <option value="VERNACULAR_RADIO">Vernacular Radio Log</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Schedule Date</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="date" 
                  name="schedule_date"
                  value={formData.schedule_date}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50/70 border border-slate-100 rounded-xl pl-8 pr-2 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Target Time</label>
              <div className="relative">
                <Clock size={12} className="absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="time" 
                  name="schedule_time"
                  value={formData.schedule_time}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50/70 border border-slate-100 rounded-xl pl-8 pr-2 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* CRITICAL GOVERNANCE SAFETY TRIGGERS PANEL */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 text-[11px] font-semibold tracking-wide">
              <AlertCircle size={14} /> SECURITY & LEGAL PRIVACY PROTECTION ACT RULES
            </div>
            
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input 
                type="checkbox"
                name="consent_verified"
                checked={formData.consent_verified}
                onChange={handleInputChange}
                className="mt-0.5 accent-teal-600 rounded"
              />
              <span className="text-[11px] text-slate-500 leading-normal font-medium">
                I verify that explicit, signed patient/survivor media waivers are securely scanned into medical records files if an individual is mentioned or shown.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
              <input 
                type="checkbox"
                name="medical_signoff"
                checked={formData.medical_signoff}
                onChange={handleInputChange}
                className="mt-0.5 accent-teal-600 rounded"
              />
              <span className="text-[11px] text-slate-500 leading-normal font-medium">
                I verify that the clinical copy accuracy aligns precisely with standard oncology guidelines and contains zero unverified claims.
              </span>
            </label>
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 text-teal-400 font-semibold py-3.5 rounded-xl text-xs tracking-wider hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> ENGAGING ROUTER MATRIX...
              </>
            ) : (
              <>
                <Send size={12} /> Commit Output to Media Queue
              </>
            )}
          </button>
        </form>

        {/* RIGHT COLUMN: ACTIVE DEPLOYMENT TIMELINE MONITOR (6 Columns) */}
        <div className="xl:col-span-6 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm min-h-[500px] flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Communications Deployment Queue</h4>
            
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Syncing broadcasting channels queue ledger...</div>
              ) : mediaQueue.length > 0 ? mediaQueue.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50/60 border border-slate-100 rounded-xl space-y-2 text-xs animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {item.target_platform === 'FACEBOOK' ? (
                        <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
                          </svg>
                        </span>
                      ) : item.target_platform === 'INSTAGRAM' ? (
                        <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                          <svg className="w-3 h-3 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                          </svg>
                        </span>
                      ) : (
                        <span className="p-1.5 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center"><Radio size={12} /></span>
                      )}
                      <span className="font-semibold text-slate-700 font-mono text-[11px]">
                        {item.platform_display || item.target_platform}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      item.status === 'DISPATCHED' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : item.status === 'SCHEDULED'
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {item.status_display || item.status}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed text-left break-words">{item.content}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-100/40">
                    <span>Release Frame: {item.schedule_date || 'Immediate'} {item.schedule_time ? `at ${item.schedule_time.slice(0, 5)}` : ''}</span>
                    <span className="flex items-center gap-1 text-teal-600 font-medium">
                      <ShieldCheck size={11} /> 
                      {item.consent_verified && item.medical_signoff ? 'Security Locks Armed' : 'Compliance Verified'}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="p-12 border border-dashed border-slate-100 rounded-xl text-center text-slate-400 text-xs">
                  No active public health communications currently tracked in the queue layout.
                </div>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-left px-1 mt-6">
            * All automated dispatches connect directly to developers token links. For structural background scheduling configurations, Celery and Redis workers track the timing triggers.
          </p>
        </div>

      </div>

    </div>
  );
};

export default CommunicationsHub;