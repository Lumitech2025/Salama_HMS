import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Send, Loader2, ClipboardList, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const MarketingRequisitions = () => {
  const [requisitions, setRequisitions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'POSTERS_PRINTING',
    campaign: '',
    requested_amount: '',
    justification_notes: ''
  });

  // Multiclass fallback token key resolver
  const getAuthHeaders = () => {
    const token = 
      localStorage.getItem('access_token') || 
      localStorage.getItem('access') || 
      localStorage.getItem('salama_access_token') || 
      localStorage.getItem('token') || 
      localStorage.getItem('accessToken');

    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchRequisitionData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      // Direct core endpoints matching base router schemas
      const [reqRes, campRes] = await Promise.all([
        fetch('/api/requisitions/', { headers: getAuthHeaders() }),
        fetch('/api/outreach-campaigns/', { headers: getAuthHeaders() })
      ]);

      if (!reqRes.ok || !campRes.ok) {
        throw new Error(`Sync error flags: Req ${reqRes.status} / Camp ${campRes.status}`);
      }

      const reqData = await reqRes.json();
      const campData = await campRes.json();

      // Normalize array vectors out of backend pagination structures if present
      const rawRequisitions = reqData.results || reqData || [];
      const extractedCampaigns = campData.results || campData || [];

      // Isolate allocations belonging explicitly to the marketing perimeter matrix
      const marketingOnlyReqs = rawRequisitions.filter(
        req => req.dept === 'MARKETING' || req.department === 'MARKETING'
      );

      setRequisitions(marketingOnlyReqs);
      setCampaigns(extractedCampaigns);
    } catch (err) {
      console.error("Salama Core Marketing Linkage Exception:", err);
      setApiError("Could not update ledgers directly from backend engines. Showing offline fallback registry.");
      
      // Standby failover recovery matrix
      const fallbackLocal = localStorage.getItem('salama_marketing_req_cache');
      if (fallbackLocal) setRequisitions(JSON.parse(fallbackLocal));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitionData();
  }, []);

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
    setApiError(null);

    // Dynamic campaign label mapping for rendering fallbacks locally
    const targetCampaign = campaigns.find(c => String(c.id) === String(formData.campaign));
    const campaignTitle = targetCampaign ? targetCampaign.title : 'Outreach Program Linked';

    // Construct request layout satisfying backend RequisitionItemSerializer parameters
    const requestPayload = {
      dept: 'MARKETING',
      reason: `${formData.title} - ${formData.justification_notes}`.substring(0, 255),
      items: [
        {
          non_inventory_title: `[${formData.category}] ${formData.title}`,
          quantity: 1,
          unit_price: parseFloat(formData.requested_amount || 0).toFixed(2)
        }
      ]
    };

    try {
      const response = await fetch('/api/requisitions/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server validation failure: ${response.status}`);
      }

      alert("Budget allocation requisition successfully submitted to the Finance Center ledger.");
      
      setFormData({
        title: '',
        category: 'POSTERS_PRINTING',
        campaign: '',
        requested_amount: '',
        justification_notes: ''
      });
      
      await fetchRequisitionData();
    } catch (err) {
      console.error("Router Submission Blocked:", err);
      alert(`Submission Failed: ${err.message}`);
      
      // Emergency cache fallback generation for high-availability disconnected sessions
      const disasterRecord = {
        id: Math.floor(8000 + Math.random() * 1000),
        title: formData.title,
        category: formData.category,
        campaign_title: campaignTitle,
        requested_amount: formData.requested_amount,
        status: 'PENDING (OFFLINE)',
        date: new Date().toISOString().split('T')[0]
      };

      const updatedLocalCache = [disasterRecord, ...requisitions];
      setRequisitions(updatedLocalCache);
      localStorage.setItem('salama_marketing_req_cache', JSON.stringify(updatedLocalCache));
      
      setFormData({
        title: '',
        category: 'POSTERS_PRINTING',
        campaign: '',
        requested_amount: '',
        justification_notes: ''
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left font-['Inter']">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="text-teal-600" size={24} /> Budget Allocation Requisitions
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            File operational fund demands for poster assets, Facebook ad financing, or county screening logistics directly to the Finance Office.
          </p>
        </div>
        {apiError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-amber-800 text-xs font-medium max-w-sm">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}
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
              disabled={submitting}
              placeholder="e.g., Meru Outreach Posters Printing (2000 copies)"
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Expense Classification</label>
            <select 
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              disabled={submitting}
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-3 py-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
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
                disabled={submitting}
                className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-2 py-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
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
                min="1"
                value={formData.requested_amount}
                onChange={handleInputChange}
                required
                disabled={submitting}
                placeholder="e.g., 45000"
                className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
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
              disabled={submitting}
              rows="4"
              placeholder="Detail out exact pricing per unit or breakdown metrics to support swift finance verification approvals..."
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-slate-900 text-teal-400 font-semibold py-3.5 rounded-xl text-xs tracking-wider hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:bg-slate-700 disabled:text-slate-400"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Dispatching Payload...
              </>
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
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ClipboardList size={16} className="text-teal-600" /> Procurement & Requisitions Status Log
              </h4>
              {loading && <Loader2 size={14} className="animate-spin text-teal-600" />}
            </div>
            
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
                  {loading && requisitions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-400 animate-pulse font-medium">
                        Syncing currency ledger states...
                      </td>
                    </tr>
                  ) : requisitions.length > 0 ? (
                    requisitions.map((req) => {
                      // Adapt to both direct model metrics and raw fallback parameters safely
                      const displayTitle = req.title || (req.items && req.items[0]?.non_inventory_title) || 'Direct Allocation';
                      const displayCategory = req.category_display || req.category || 'MARKETING_OPEX';
                      const contextCampaign = req.campaign_title || req.reason || 'Salama General Outreach';
                      const financialValue = req.requested_amount || req.total_cost || req.total || 0;

                      return (
                        <tr key={req.id || Math.random()} className="hover:bg-slate-50/30 transition-colors animate-in fade-in duration-150">
                          <td className="p-4 px-4 text-left">
                            <p className="font-semibold text-slate-800 line-clamp-1">{displayTitle}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-tight">
                              {displayCategory.replace('_', ' ')}
                            </p>
                          </td>
                          <td className="p-4 text-left text-slate-600 font-medium">
                            <span className="truncate max-w-[150px] inline-block">{contextCampaign}</span>
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-slate-800">
                            KES {parseFloat(financialValue).toLocaleString()}
                          </td>
                          <td className="p-4 text-right px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border ${
                              req.status === 'APPROVED' 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                : req.status === 'REJECTED' 
                                ? 'bg-rose-50 text-rose-600 border-rose-100'
                                : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {req.status === 'APPROVED' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                              {req.status || 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
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
          
          <p className="text-[10px] text-slate-400 text-left px-2 border-t border-slate-50 pt-3 mt-4">
            * Once disbursed or declined, these instances turn completely historical and populate under the respective operational cost analytics models.
          </p>
        </div>

      </div>
    </div>
  );
};

export default MarketingRequisitions;