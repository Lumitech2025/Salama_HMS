import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { BarChart3, TrendingUp, DollarSign, Target, Globe, ArrowUpRight, Loader2, Edit2, X, Check } from 'lucide-react';

const CampaignAnalytics = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal tracking states
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    actual_spent: '',
    actual_turnout: '',
    patients_referred_to_salama: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchAnalyticalData();
  }, []);

  const fetchAnalyticalData = async () => {
    setLoading(true);
    try {
      const campRes = await API.get('/outreach-campaigns/').catch(() => ({ data: [] }));
      const partnerRes = await API.get('/referral-partners/').catch(() => ({ data: [] }));
      
      setCampaigns(campRes.data.results || campRes.data || []);
      setPartners(partnerRes.data.results || partnerRes.data || []);
    } catch (err) {
      console.error("Error reading operational vectors for analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open update modal with prefilled data values
  const openUpdateModal = (campaign) => {
    setSelectedCampaign(campaign);
    setUpdateForm({
      actual_spent: campaign.actual_spent || '',
      actual_turnout: campaign.actual_turnout || '',
      patients_referred_to_salama: campaign.patients_referred_to_salama || '',
      status: campaign.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleModalInputChange = (e) => {
    const { name, value } = e.target;
    setUpdateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // Send partial updates to the targeting campaign instance ID
      await API.patch(`/outreach-campaigns/${selectedCampaign.id}/`, updateForm);
      alert(`Operational statistics for "${selectedCampaign.title}" successfully synced.`);
      setIsModalOpen(false);
      fetchAnalyticalData(); // Refresh overview metrics cards dynamically
    } catch (err) {
      console.error("Error patching metrics execution ledger:", err);
      alert("Failed to sync operational counters to database registry.");
    } finally {
      setUpdating(false);
    }
  };

  // --- DYNAMIC FINANCIAL & IMPACT MATH CALCULATIONS ---
  const totalSpent = campaigns.reduce((acc, curr) => acc + parseFloat(curr.actual_spent || 0), 0);
  const totalAdmits = campaigns.reduce((acc, curr) => acc + parseInt(curr.patients_referred_to_salama || 0), 0);
  const totalLeads = campaigns.reduce((acc, curr) => acc + parseInt(curr.actual_turnout || 0), 0);
  const avgCpa = totalAdmits > 0 ? Math.round(totalSpent / totalAdmits) : 0;

  // Compile Dynamic Regional Yield Matrix based on registered campaign target regions
  const getRegionalBreakdown = () => {
    const regionMap = {};
    campaigns.forEach(c => {
      const loc = c.target_region_location || 'Unassigned Region';
      const admits = parseInt(c.patients_referred_to_salama || 0);
      if (!regionMap[loc]) {
        regionMap[loc] = 0;
      }
      regionMap[loc] += admits;
    });

    const totalCalculatedAdmits = Object.values(regionMap).reduce((a, b) => a + b, 0) || 1;

    return Object.keys(regionMap).map(key => ({
      zone: key,
      admissions: regionMap[key],
      share: `${Math.round((regionMap[key] / totalCalculatedAdmits) * 100)}%`
    })).sort((a, b) => b.admissions - a.admissions);
  };

  const dynamicRegions = getRegionalBreakdown();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-medium text-xs space-y-2">
        <Loader2 className="animate-spin text-teal-600" size={24} />
        <span>Aggregating financial ledger metrics and regional conversion data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left font-['Inter'] relative">
      
      {/* HEADER SECTION */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="text-teal-600" size={24} /> Campaign Evaluation & ROI Hub
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Review clinical acquisition margins, track outreach investment trends, and optimize regional oncology referral loops.
        </p>
      </div>

      {/* 1. DYNAMIC SUMMARY KPI METRIC BLOCKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Aggregated Outlays', 
            val: totalSpent > 0 ? `KES ${totalSpent.toLocaleString()}` : 'KES 0', 
            icon: DollarSign, 
            color: 'text-slate-700', 
            trend: 'Live Operational Costs' 
          },
          { 
            label: 'Conversion Volume', 
            val: `${totalAdmits} Admissions`, 
            icon: Target, 
            color: 'text-teal-600', 
            trend: 'Direct Pipeline Conversions' 
          },
          { 
            label: 'Mean Cost Per Patient', 
            val: avgCpa > 0 ? `KES ${avgCpa.toLocaleString()}` : 'KES 0', 
            icon: TrendingUp, 
            color: 'text-blue-600', 
            trend: 'Acquisition Unit Floor' 
          },
          { 
            label: 'Active CRM Partners', 
            val: `${partners.length} Channels`, 
            icon: Globe, 
            color: 'text-emerald-600', 
            trend: 'Integrated Provider Links' 
          },
        ].map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-left">
             <div className={`p-2.5 rounded-xl w-fit mb-4 bg-slate-50 ${card.color}`}><card.icon size={18} /></div>
             <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{card.label}</p>
             <h3 className="text-xl font-bold text-slate-900 tracking-tight">{card.val}</h3>
             <p className="mt-2 text-[10px] text-slate-400 font-medium">{card.trend}</p>
          </div>
        ))}
      </div>

      {/* 2. DUAL METRIC PANELS GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COMPONENT: LIVE DISBURSEMENT PERFORMANCE LEDGER (8 Columns) */}
        <div className="xl:col-span-8 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-4">Campaign Efficiency Parameters</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    <th className="p-3 px-4 font-semibold text-left">Outreach Operation Line</th>
                    <th className="p-3 font-semibold text-center">Net Funds Spent</th>
                    <th className="p-3 font-semibold text-center">Screened Outturn</th>
                    <th className="p-3 font-semibold text-center">Admitted</th>
                    <th className="p-3 text-center font-semibold">CPA Unit Cost</th>
                    <th className="p-3 text-right px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {campaigns.length > 0 ? campaigns.map((row, idx) => {
                    const spentAmount = parseFloat(row.actual_spent || 0);
                    const admitsCount = parseInt(row.patients_referred_to_salama || 0);
                    const unitCpa = admitsCount > 0 ? Math.round(spentAmount / admitsCount) : 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 px-4 text-left">
                          <p className="font-semibold text-slate-800">{row.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Status: <span className="lowercase first-letter:uppercase">{row.status}</span></p>
                        </td>
                        <td className="p-4 text-center font-medium text-slate-700">
                          KES {spentAmount.toLocaleString()}
                        </td>
                        <td className="p-4 text-center font-mono text-slate-500 font-medium">
                          {row.actual_turnout || 0}
                        </td>
                        <td className="p-4 text-center font-mono font-semibold text-teal-600">
                          {admitsCount}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-800">
                          {unitCpa > 0 ? `KES ${unitCpa.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-4 text-right px-4">
                          <button 
                            onClick={() => openUpdateModal(row)}
                            className="p-2 hover:bg-slate-100 rounded-xl text-teal-600 transition-all active:scale-95 border border-transparent hover:border-slate-100"
                            title="Update Operational Statistics Data"
                          >
                            <Edit2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                        No campaign operational registries detected. Onboard outreach campaigns to generate analytics.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="border-t border-slate-50 pt-3 text-[10px] text-slate-400 mt-4 flex justify-between items-center px-1">
            <span>* CPA = Actual Funds Utilized divided by valid Histopathology Biopsy admission registers.</span>
            <span className="text-teal-600 font-medium flex items-center gap-0.5 cursor-pointer hover:underline">Export CSV Ledger <ArrowUpRight size={12} /></span>
          </div>
        </div>

        {/* RIGHT COMPONENT: DYNAMIC GEOGRAPHIC YIELD FEED (4 Columns) */}
        <div className="xl:col-span-4 bg-[#020617] text-white rounded-[2rem] p-6 shadow-sm min-h-[420px] flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-bold tracking-tight">Geographic Conversion Yields</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Patient population allocation matrices by county</p>
            </div>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {dynamicRegions.length > 0 ? dynamicRegions.map((zone, idx) => (
                <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-1 text-left">
                    <p className="font-semibold text-slate-200 truncate max-w-[180px]">{zone.zone}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{zone.share} of aggregate conversion map</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-mono font-bold text-teal-400 text-sm">{zone.admissions}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-medium">Cases</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-slate-500 text-left py-4">Awaiting location yield footprints...</p>
              )}
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-left text-[11px] text-slate-400 leading-normal mt-4">
            Regional yields scale automatically in real-time as admissions sync directly with external field camp registrations.
          </div>
        </div>

      </div>

      {/* --- FLOATING LIGHTWEIGHT METRICS UPDATE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#020617]/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 max-w-md w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="text-left">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">Sync Field Operational Metrics</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-[280px] truncate">{selectedCampaign?.title}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Campaign Stage / Status</label>
                <select 
                  name="status"
                  value={updateForm.status}
                  onChange={handleModalInputChange}
                  className="w-full bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/20"
                >
                  <option value="PLANNING">Planning Phase</option>
                  <option value="ACTIVE">Active (Live in Field)</option>
                  <option value="COMPLETED">Completed (Data Finalized)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actual Funds Expended (KES)</label>
                <input 
                  type="number"
                  name="actual_spent"
                  value={updateForm.actual_spent}
                  onChange={handleModalInputChange}
                  required
                  placeholder="e.g., 142000"
                  className="w-full bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actual Screened Turnout</label>
                  <input 
                    type="number"
                    name="actual_turnout"
                    value={updateForm.actual_turnout}
                    onChange={handleModalInputChange}
                    required
                    placeholder="e.g., 340"
                    className="w-full bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Salama Hospital Admissions</label>
                  <input 
                    type="number"
                    name="patients_referred_to_salama"
                    value={updateForm.patients_referred_to_salama}
                    onChange={handleModalInputChange}
                    required
                    placeholder="e.g., 18"
                    className="w-full bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/20"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={updating}
                className="w-full bg-slate-900 hover:bg-slate-800 text-teal-400 text-xs font-semibold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              >
                {updating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <>
                    <Check size={12} /> Sync Operational Ledger
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignAnalytics;