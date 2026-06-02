import React, { useState, useEffect } from 'react';
import { Wallet, Activity, Receipt, Clock, Loader2 } from 'lucide-react';

const FinanceDashboard = ({ setActiveTab }) => {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  
  // Monthly tracking buckets [Jan - Dec]
  const [monthlyExpenses, setMonthlyExpenses] = useState(Array(12).fill(0));
  const [monthlyRevenue, setMonthlyRevenue] = useState(Array(12).fill(0));

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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

  useEffect(() => {
    const fetchFinancialMetrics = async () => {
      setLoading(true);
      try {
        // 1. Fetch requisitions (handles standard lists and paginated responses)
        const reqResponse = await fetch('/api/requisitions/', { headers: getAuthHeaders() });
        if (reqResponse.ok) {
          const reqData = await reqResponse.json();
          const rawList = reqData.results || reqData;
          const cleanReqList = Array.isArray(rawList) ? rawList : [];
          setRequisitions(cleanReqList.slice(0, 3));
        }

        // 2. Fetch payment vouchers (Fixed to parse DRF pagination data arrays perfectly)
        const paymentsResponse = await fetch('/api/payment-vouchers/', { headers: getAuthHeaders() });
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json();
          
          let paymentsList = [];
          if (paymentsData && paymentsData.results && Array.isArray(paymentsData.results)) {
            paymentsList = paymentsData.results;
          } else if (Array.isArray(paymentsData)) {
            paymentsList = paymentsData;
          }

          let aggregateExpenses = 0;
          const expensesByMonth = Array(12).fill(0);

          paymentsList.forEach(payment => {
            const amount = parseFloat(payment.amount_paid || 0);
            aggregateExpenses += amount;

            const paymentDateStr = payment.date_issued;
            
            if (paymentDateStr && typeof paymentDateStr === 'string') {
              const parts = paymentDateStr.split('-');
              if (parts.length >= 2) {
                const parsedMonth = parseInt(parts[1], 10);
                if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
                  const monthIndex = parsedMonth - 1;
                  expensesByMonth[monthIndex] += amount;
                }
              }
            }
          });

          setTotalExpenses(aggregateExpenses);
          setMonthlyExpenses(expensesByMonth);
        }

      } catch (err) {
        console.error("Dashboard synchronization state log pipeline broken:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialMetrics();
  }, []);

  const handleNavigationToHub = () => {
    if (typeof setActiveTab === 'function') {
      setActiveTab('requisitions'); 
    }
  };

  const getMaxBarValue = () => {
    const maxExp = Math.max(...monthlyExpenses, 0);
    const maxRev = Math.max(...monthlyRevenue, 0);
    // Determine dynamic ceiling rounding up cleanly to nice intervals
    const absoluteMax = Math.max(maxExp, maxRev, 5000);
    return Math.ceil(absoluteMax / 5000) * 5000;
  };

  const maxValue = getMaxBarValue();
  
  // Format long axis scale figures into compact clean text labels (e.g. 75K)
  const formatAxisLabel = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value;
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 font-['Inter'] text-slate-800 text-left">
      
      {/* 1. KPI CARD ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {[
          { label: 'Total Revenue', val: 'KES 0', color: 'text-teal-600' },
          { label: 'Current Expenses', val: `KES ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, color: 'text-rose-600' },
          { label: 'Insurance Claims', val: 'KES 0', color: 'text-blue-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200/80 shadow-md flex flex-col justify-between min-h-[130px]">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-2">{card.label}</p>
            <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none">{card.val}</h3>
          </div>
        ))}
      </div>

      {/* 2. ANALYTICS BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
        
        {/* WIDE-SPANNING CHART PANELS */}
        <div className="lg:col-span-9 bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl flex flex-col min-h-[480px]">
          <div className="flex justify-between items-center mb-6 flex-shrink-0">
            <div>
              <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Annual Financial <span className="text-teal-600">Trajectory</span></h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Revenue vs Expenses Performance</p>
            </div>
            <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-2 text-teal-500"><div className="w-2 h-2 bg-teal-500 rounded-full"/> Revenue</span>
              <span className="flex items-center gap-2 text-rose-500"><div className="w-2 h-2 bg-rose-500 rounded-full"/> Expenses</span>
            </div>
          </div>
          
          {/* Main Chart Presentation Stage with Y-Axis column split */}
          <div className="flex-1 flex gap-4 min-h-[320px] relative mt-4">
            
            {/* NEW: Clean Absolute Background Gridlines Panel */}
            <div className="absolute inset-0 left-12 right-0 bottom-8 flex flex-col justify-between pointer-events-none z-0">
              {[1, 0.75, 0.5, 0.25, 0].map((ratio, index) => (
                <div key={index} className="w-full border-t border-slate-100 relative">
                  <span className="absolute -top-2.5 left-0 -ml-12 text-[10px] font-extrabold text-slate-400/90 w-9 text-right tracking-tighter">
                    {formatAxisLabel(maxValue * ratio)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bars Column Container Canvas Area */}
            <div className="flex-1 ml-12 h-full flex items-end justify-between gap-3 px-2 pb-8 z-10">
               {months.map((month, i) => {
                  const expHeight = (monthlyExpenses[i] / maxValue) * 100;
                  const revHeight = (monthlyRevenue[i] / maxValue) * 100;
                  const hasData = monthlyExpenses[i] > 0 || monthlyRevenue[i] > 0;

                  return (
                    <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-3 group relative">
                        {/* Interactive column track */}
                        <div className={`w-full ${hasData ? 'bg-slate-50/40' : 'bg-transparent'} hover:bg-slate-50/80 rounded-2xl p-1.5 h-full flex items-end justify-center gap-1.5 relative transition-all duration-200`}>
                            
                            {/* Revenue Pill Bar */}
                            <div 
                              title={`Revenue: KES ${monthlyRevenue[i].toLocaleString()}`}
                              className="w-1/2 bg-teal-500/10 group-hover:bg-teal-500 hover:scale-105 transition-all duration-300 cursor-pointer rounded-full shadow-sm" 
                              style={{ height: `${Math.max(revHeight, revHeight > 0 ? 3 : 0)}%` }} 
                            />
                            
                            {/* Expenses Pill Bar */}
                            <div 
                              title={`Expenses: KES ${monthlyExpenses[i].toLocaleString()}`}
                              className="w-1/2 bg-rose-500/20 bg-gradient-to-t group-hover:from-rose-500 group-hover:to-rose-400 hover:scale-105 transition-all duration-300 cursor-pointer rounded-full shadow-sm" 
                              style={{ height: `${Math.max(expHeight, expHeight > 0 ? 3 : 0)}%` }} 
                            />
                            
                        </div>
                        {/* Month Label positioning alignment */}
                        <span className="absolute -bottom-1 text-[9px] font-black text-slate-400 uppercase italic tracking-tighter transition-colors group-hover:text-slate-800">
                          {month}
                        </span>
                    </div>
                  );
               })}
            </div>
          </div>
        </div>

        {/* REQUISITIONS ACCORDION FEED */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl flex flex-col justify-between min-h-[480px]">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600"><Clock size={18}/></div>
                <h4 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 leading-none">Recent <span className="text-teal-600">Requests</span></h4>
              </div>
              {loading && <Loader2 size={14} className="animate-spin text-teal-600" />}
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-1">
              {!loading && requisitions.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs font-medium text-slate-400">
                  No records found.
                </div>
              ) : (
                requisitions.map((req, i) => {
                  const displayId = req.id ? `RQ-${req.id}` : `RQ-00${i + 1}`;
                  const rawTitle = req.title || (req.items && req.items[0]?.non_inventory_title) || 'Direct Allocation';
                  const displayItem = rawTitle.replace(/\[.*?\]\s*/g, '');
                  const departmentLabel = req.dept || req.department || 'GENERAL';
                  const numericCost = req.requested_amount || req.total_cost || req.total || 0;
                  const currentStatus = req.status || 'PENDING';

                  return (
                    <div key={req.id || i} className="bg-slate-50/60 border border-slate-100 p-4 rounded-2xl group hover:bg-slate-100/80 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black text-teal-600 uppercase tracking-wider">{displayId}</span>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                          {currentStatus}
                        </span>
                      </div>
                      <p className="font-black text-xs uppercase italic tracking-tight text-slate-800 line-clamp-1 mb-2">
                        {displayItem}
                      </p>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                        <span className="text-[8px] font-black text-slate-400 uppercase">{departmentLabel}</span>
                        <span className="text-xs font-black italic text-slate-900">
                          KES {parseFloat(numericCost).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <button 
              onClick={handleNavigationToHub}
              className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-teal-400 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-md active:scale-95 flex-shrink-0"
            >
              Open Hub
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinanceDashboard;