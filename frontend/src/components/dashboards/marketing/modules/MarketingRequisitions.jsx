import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { DollarSign, Plus, Send, Loader2, ClipboardList } from 'lucide-react';

const MarketingRequisitions = () => {
  const [requisitions, setRequisitions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'POSTERS_PRINTING',
    campaign: '',
    requested_amount: '',
    justification_notes: ''
  });

  useEffect(() => {
    fetchRequisitionData();
  }, []);

  const fetchRequisitionData = async () => {
    setLoading(true);
    try {
      const reqRes = await API.get('/marketing-requisitions/').catch(() => ({ data: [] }));
      const campRes = await API.get('/outreach-campaigns/').catch(() => ({ data: [] }));
      
      setRequisitions(reqRes.data.results || reqRes.data || []);
      setCampaigns(campRes.data.results || campRes.data || []);
    } catch (err) {
      console.error("Error reading requisition matrices:", err);
    } finally {
      setLoading(false);
    }
  };

  // CORRECTION: Re-introducing the missing input handler change method
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.campaign) {
      alert("Please assign this request to a specific outreach program line.");
      return;
    }
    setSubmitting(true);
    try {
      await API.post('/marketing-requisitions/', formData);
      alert("Budget allocation requisition successfully submitted to the Finance Center ledger.");
      
      setFormData({
        title: '',
        category: 'POSTERS_PRINTING',
        campaign: '',
        requested_amount: '',
        justification_notes: ''
      });
      fetchRequisitionData();
    } catch (err) {
      alert("Failed to deliver requisition payload to the finance system routers.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left font-['Inter']">
      <div>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <DollarSign className="text-teal-600" size={24} /> Budget Allocation Requisitions
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          File operational fund demands for poster assets, Facebook ad financing, or county screening logistics directly to the Finance Office.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* REQUEST FORM */}
        <form onSubmit={handleSubmit} className="xl:col-span-5 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-2 flex items-center gap-2">
            <Plus size={16} className="text-teal-500" /> Create Expense Request
          </h4>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Item/Service Title</label>
            <input 
              type="text" 
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="e.g., Meru Outreach Posters Printing (2000 copies)"
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Expense Classification</label>
            <select 
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-3 py-3 text-xs text-slate-800 focus:outline-none"
            >
              <option value="POSTERS_PRINTING">Posters & Printing Materials</option>
              <option value="SOCIAL_ADS">Social Media Advertising (Meta/Google)</option>
              <option value="LOGISTICS_TRAVEL">Field Transport & Fuel Logistics</option>
              <option value="MEDIA_AIRTIME">Radio Airtime & PR Sponsorships</option>
              <option value="MISC_SUPPLIES">Miscellaneous Camp Supplies</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Target Campaign Association</label>
              <select 
                name="campaign"
                value={formData.campaign}
                onChange={handleInputChange}
                required
                className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-2 py-3 text-xs text-slate-800 focus:outline-none"
              >
                <option value="">-- Choose Campaign --</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Required Funds (KES)</label>
              <input 
                type="number" 
                name="requested_amount"
                value={formData.requested_amount}
                onChange={handleInputChange}
                required
                placeholder="e.g., 45000"
                className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Justification / Itemization Breakdown</label>
            <textarea 
              name="justification_notes"
              value={formData.justification_notes}
              onChange={handleInputChange}
              required
              rows="4"
              placeholder="Detail out exact pricing per unit or breakdown metrics to support swift finance verification approvals..."
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-slate-900 text-teal-400 font-semibold py-3.5 rounded-xl text-xs tracking-wider hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
          >
            {submitting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <>
                <Send size={12} /> Dispatch Funding Demand
              </>
            )}
          </button>
        </form>

        {/* LEDGER TRACKING PANEL */}
        <div className="xl:col-span-7 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm min-h-[520px] flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
              <ClipboardList size={16} className="text-teal-600" /> Procurement & Requisitions Status Log
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    <th className="p-3 px-4 font-semibold text-left">Requested Asset Allocation</th>
                    <th className="p-3 font-semibold text-left">Linked Campaign Context</th>
                    <th className="p-3 text-center font-semibold">Value</th>
                    <th className="p-3 text-right px-4 font-semibold">Finance Step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="4" className="p-12 text-center text-slate-400 animate-pulse font-medium">Syncing currency ledger states...</td></tr>
                  ) : requisitions.length > 0 ? requisitions.map((req, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors animate-in fade-in duration-150">
                      <td className="p-4 px-4 text-left">
                        <p className="font-semibold text-slate-800">{req.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{req.category_display || req.category.replace('_', ' ')}</p>
                      </td>
                      <td className="p-4 text-left text-slate-600 font-medium">
                        <span className="truncate max-w-[150px] inline-block">{req.campaign_title || 'Outreach Program Linked'}</span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-800">
                        KES {parseFloat(req.requested_amount).toLocaleString()}
                      </td>
                      <td className="p-4 text-right px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border ${
                          req.status === 'APPROVED' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : req.status === 'REJECTED' 
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-400 font-medium">
                        No active funding pipelines logged. Use the composer configuration tool to generate line-item demands.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-400 text-left px-2 border-t border-slate-50 pt-3">
            * Once disbursed or declined, these instances turn completely historical and populate under the respective operational cost analytics models.
          </p>
        </div>

      </div>
    </div>
  );
};

export default MarketingRequisitions;