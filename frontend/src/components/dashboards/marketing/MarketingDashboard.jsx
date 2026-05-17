import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { Megaphone, Users, Radio, BarChart3, RefreshCw, PlusCircle, CheckCircle2, Loader2 } from 'lucide-react';

// Sub-Module Workflow Panels Imports
import MarketingSidebar from "./MarketingSidebar";
import OutreachManager from "./modules/OutreachManager";
import ReferralNetwork from "./modules/ReferralNetwork";
import CommunicationsHub from "./modules/CommunicationsHub";
import CampaignAnalytics from "./modules/CampaignAnalytics";
import MarketingRequisitions from "./modules/MarketingRequisitions";

const MarketingDashboard = ({ onLogout }) => {
  const [marketingTab, setMarketingTab] = useState('overview');
  const [campaigns, setCampaigns] = useState([]);
  const [partners, setPartners] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (marketingTab === 'overview') {
      fetchMarketingMetrics();
    }
  }, [marketingTab]);

  const fetchMarketingMetrics = async () => {
    setLoading(true);
    try {
      // 1. Fetch live outreach campaigns dataset from Django REST framework backend
      const campRes = await API.get('/outreach-campaigns/').catch(() => ({ data: [] }));
      setCampaigns(campRes.data.results || campRes.data || []);

      // 2. Fetch live referring hospital providers CRM data map
      const partnerRes = await API.get('/referral-partners/').catch(() => ({ data: [] }));
      setPartners(partnerRes.data.results || partnerRes.data || []);

      // 3. Fetch live digital communications log records
      const postRes = await API.get('/social-media-posts/').catch(() => ({ data: [] }));
      const allPosts = postRes.data.results || postRes.data || [];
      
      // Filter out posts that are genuinely waiting for verification sign-off
      const filteringPending = allPosts.filter(p => p.status === 'AWAITING_APPROVAL' || p.status === 'DRAFT');
      setPendingPosts(filteringPending);
      setPendingApprovalsCount(filteringPending.length);

    } catch (err) {
      console.error("Error connecting with public relations metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalTurnout = () => {
    return campaigns.reduce((acc, curr) => acc + (parseInt(curr.actual_turnout) || 0), 0);
  };

  const calculateTotalConversions = () => {
    return campaigns.reduce((acc, curr) => acc + (parseInt(curr.patients_referred_to_salama) || 0), 0);
  };

  const renderHomeOverview = () => (
    <div className="space-y-10 animate-in fade-in duration-500 text-left font-['Inter']">
      
      {/* 1. MARKETING KPI BALANCE SCORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Screening Operations', val: `${campaigns.length} Registered`, icon: Megaphone, color: 'text-teal-600', sub: 'County Outreach Camps' },
          { label: 'Total Screening Turnout', val: calculateTotalTurnout() > 0 ? `${calculateTotalTurnout().toLocaleString()} Individuals` : '0 Individuals', icon: CheckCircle2, color: 'text-blue-600', sub: 'Aggregated Registries' },
          { label: 'Referral Providers', val: `${partners.length} Practitioners`, icon: Users, color: 'text-amber-600', sub: 'Active Network CRM' },
          { label: 'Hospital Conversions', val: `${calculateTotalConversions()} Admissions`, icon: PlusCircle, color: 'text-emerald-600', sub: 'Direct Pipeline Admissions' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
             <div className={`p-3 rounded-xl w-fit mb-5 bg-slate-50 ${card.color}`}><card.icon size={22} /></div>
             <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
             <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{card.val}</h3>
             <p className="mt-3 text-[11px] text-slate-400 font-medium">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* 2. OPERATIONAL QUICK VIEWS REGISTRY */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Side Container: Active Outreach Operational Status */}
        <div className="xl:col-span-8 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-xl font-bold text-slate-900 tracking-tight">Active Outreach Campaigns</h4>
              <p className="text-xs text-slate-400 mt-1">Status logs for clinical cancer screening projects across target regions</p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchMarketingMetrics} className="p-3 bg-slate-50 border hover:bg-slate-100 rounded-xl transition-all" title="Synchronize Operations Data">
                <RefreshCw size={12} className={loading ? 'animate-spin text-teal-500' : 'text-slate-500'} />
              </button>
              <button 
                onClick={() => setMarketingTab('outreach')}
                className="bg-slate-900 hover:bg-slate-800 text-teal-400 px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
              >
                Launch New Drive
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[650px] text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-4 px-6 font-semibold text-left">Campaign Program Details</th>
                  <th className="p-4 font-semibold text-left">Target Hub Location</th>
                  <th className="p-4 text-center font-semibold">Attendance Log</th>
                  <th className="p-4 text-right px-6 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="4" className="p-12 text-center text-slate-400 animate-pulse font-medium">Querying outreach pipeline vectors...</td></tr>
                ) : campaigns.length > 0 ? campaigns.slice(0, 4).map((camp, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-5 px-6 text-left">
                      <p className="font-semibold text-slate-900">{camp.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{camp.campaign_type_display || camp.campaign_type}</p>
                    </td>
                    <td className="p-5 text-left">
                      <span className="bg-slate-50 text-slate-700 text-[12px] px-2.5 py-1 rounded-md border border-slate-100">{camp.target_region_location}</span>
                    </td>
                    <td className="p-5 text-center text-slate-800 font-medium font-mono text-xs">
                      {camp.actual_turnout || 0} / {camp.estimated_attendance || 0}
                    </td>
                    <td className="p-5 text-right px-6">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                        camp.status === 'ACTIVE' 
                          ? 'bg-teal-50 text-teal-600 border-teal-100' 
                          : camp.status === 'COMPLETED' 
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        {camp.status_display || camp.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="p-12 text-center text-slate-400 font-medium">
                      No outreach drive logs stored in backend registers. Click "Launch New Drive" to log operational field work.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Card Container: Broadcast & Social Media Queue Summary */}
        <div className="xl:col-span-4 bg-[#020617] rounded-[2rem] p-8 text-white flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-bold text-white tracking-tight">Communications Desk</h4>
              <p className="text-xs text-slate-400 mt-1">Pending approval media content queues</p>
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {pendingPosts.length > 0 ? pendingPosts.slice(0, 2).map((post, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 p-5 rounded-2xl text-left text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {post.target_platform}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{post.status_display || post.status}</span>
                  </div>
                  <p className="text-slate-200 font-medium line-clamp-2 leading-relaxed">{post.content}</p>
                  <p className="text-[9px] text-slate-500 pt-1">
                    Scheduled: {post.schedule_date || 'Immediate'}
                  </p>
                </div>
              )) : (
                <div className="p-8 border border-dashed border-white/5 text-center text-slate-500 rounded-2xl text-xs">
                  All generated media outputs are fully cleared and published live.
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => setMarketingTab('communications')}
            className="w-full mt-8 bg-teal-600 hover:bg-teal-500 text-white py-4 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-lg shadow-teal-600/10"
          >
            Open Media Composer
          </button>
        </div>

      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (marketingTab) {
      case 'overview': return renderHomeOverview();
      case 'outreach': return <OutreachManager />;
      case 'referrals': return <ReferralNetwork />;
      case 'communications': return <CommunicationsHub />;
      case 'analytics': return <CampaignAnalytics />;
      case 'requisitions': return <MarketingRequisitions />;
      default: return renderHomeOverview();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 w-full">
      <MarketingSidebar 
        activeTab={marketingTab} 
        setActiveTab={setMarketingTab} 
        onLogout={onLogout}
        stats={{ activeCamps: campaigns.length, pendingApprovals: pendingApprovalsCount }}
      />
      <main className="flex-1 ml-80 p-10 transition-all duration-500">
        <div className="max-w-[1600px] mx-auto">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default MarketingDashboard;