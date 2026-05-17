import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { Megaphone, Plus, Calendar, MapPin, Users, DollarSign, Loader2 } from 'lucide-react';

const OutreachManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State Layout Properties Map
  const [formData, setFormData] = useState({
    title: '',
    campaign_type: 'SCREENING_CAMP',
    target_region_location: '',
    start_date: '',
    end_date: '',
    allocated_budget: '',
    estimated_attendance: '',
    notes_summary: ''
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await API.get('/outreach-campaigns/');
      setCampaigns(res.data.results || res.data || []);
    } catch (err) {
      console.error("Error connecting with outreach database lines:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/outreach-campaigns/', formData);
      alert("Outreach campaign successfully registered and logged under Planning state.");
      
      // Form Variables Reset Ingestion Hook
      setFormData({
        title: '',
        campaign_type: 'SCREENING_CAMP',
        target_region_location: '',
        start_date: '',
        end_date: '',
        allocated_budget: '',
        estimated_attendance: '',
        notes_summary: ''
      });
      fetchCampaigns(); // Refresh dynamic list records
    } catch (err) {
      alert("Error transmitting operational data to the registry backend.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left font-['Inter']">
      
      {/* HEADER META ROW */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Megaphone className="text-teal-600" size={24} /> Outreach & Screening Manager
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Coordinate community cancer screening camps, track county logistics, and measure direct patient hospital conversions.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: REGISTRATION INTAKE FORM CONTAINER (5 Columns) */}
        <form onSubmit={handleSubmit} className="xl:col-span-5 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-2 flex items-center gap-2">
            <Plus size={16} className="text-teal-500" /> Log Upcoming Public Health Drive
          </h4>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Campaign Title</label>
            <input 
              type="text" 
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="e.g., Meru County Breast & Cervical Screening Camp"
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Operation Strategy</label>
              <select 
                name="campaign_type"
                value={formData.campaign_type}
                onChange={handleInputChange}
                className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-3 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
              >
                <option value="SCREENING_CAMP">Screening Camp</option>
                <option value="COMMUNITY_BARAZA">Community Baraza</option>
                <option value="MEDIA_DRIVE">Media Awareness</option>
                <option value="DIGITAL_OUTREACH">Digital Strategy</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Target Hub Location</label>
              <div className="relative">
                <MapPin size={12} className="absolute left-3.5 top-4 text-slate-400" />
                <input 
                  type="text" 
                  name="target_region_location"
                  value={formData.target_region_location}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Meru Town Square"
                  className="w-full bg-slate-50/70 border border-slate-100 rounded-xl pl-9 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Start Date</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-3.5 top-4 text-slate-400" />
                <input 
                  type="date" 
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-50/70 border border-slate-100 rounded-xl pl-9 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">End Date</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-3.5 top-4 text-slate-400" />
                <input 
                  type="date" 
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-50/70 border border-slate-100 rounded-xl pl-9 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Allocated Budget (KES)</label>
              <div className="relative">
                <DollarSign size={12} className="absolute left-3.5 top-4 text-slate-400" />
                <input 
                  type="number" 
                  name="allocated_budget"
                  value={formData.allocated_budget}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 150000"
                  className="w-full bg-slate-50/70 border border-slate-100 rounded-xl pl-9 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Target Attendance</label>
              <div className="relative">
                <Users size={12} className="absolute left-3.5 top-4 text-slate-400" />
                <input 
                  type="number" 
                  name="estimated_attendance"
                  value={formData.estimated_attendance}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 500"
                  className="w-full bg-slate-50/70 border border-slate-100 rounded-xl pl-9 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Logistics & Strategy Notes</label>
            <textarea 
              name="notes_summary"
              value={formData.notes_summary}
              onChange={handleInputChange}
              rows="3"
              placeholder="Outline specific transport, lab kits, or target media partners..."
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-slate-900 text-teal-400 font-semibold py-3.5 rounded-xl text-xs tracking-wider hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> REGISTERING OPERATION...
              </>
            ) : "COMMIT CAMPAIGN REGISTRY"}
          </button>
        </form>

        {/* RIGHT COLUMN: LIVE RECOGNIZED DRIVES MONITORING TABLE (7 Columns) */}
        <div className="xl:col-span-7 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm min-h-[520px] flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-4">Outreach Register Logs</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    <th className="p-3 px-4 font-semibold text-left">Campaign Program</th>
                    <th className="p-3 font-semibold text-left">Location</th>
                    <th className="p-3 text-center font-semibold">Impact Ratios</th>
                    <th className="p-3 text-right px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="4" className="p-12 text-center text-slate-400 animate-pulse font-medium">Querying active operational lines...</td></tr>
                  ) : campaigns.length > 0 ? campaigns.map((camp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors animate-in fade-in duration-200">
                      <td className="p-4 px-4 text-left">
                        <p className="font-semibold text-slate-800">{camp.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Budget: KES {parseFloat(camp.allocated_budget || 0).toLocaleString()}</p>
                      </td>
                      <td className="p-4 text-left">
                        <span className="font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100/70">{camp.target_region_location}</span>
                      </td>
                      <td className="p-4 text-center">
                        <p className="font-semibold text-slate-800 font-mono">{camp.actual_turnout || 0} / {camp.estimated_attendance}</p>
                        <p className="text-[9px] text-teal-600 font-medium mt-0.5">+{camp.patients_referred_to_salama || 0} Admits</p>
                      </td>
                      <td className="p-4 text-right px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border ${
                          camp.status === 'ACTIVE' 
                            ? 'bg-teal-50 text-teal-600 border-teal-100' 
                            : camp.status === 'COMPLETED' 
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {camp.status_display || camp.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-400 font-medium">
                        No campaign logs discovered in database records. Use the onboarding intake form to deploy tracking loops.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-left px-2 border-t border-slate-50 pt-3">
            * Turnout counters and hospital conversions are verified dynamically as patients trigger medical registration matching tracking codes.
          </p>
        </div>

      </div>

    </div>
  );
};

export default OutreachManager;