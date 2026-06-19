import React, { useState, useEffect } from 'react';
import { 
  Wallet, Activity, Receipt, Clock, Loader2, 
  TrendingUp, TrendingDown, Briefcase, FileSpreadsheet, 
  Eye, Download, Percent, BarChart3, X, Printer, Calendar
} from 'lucide-react';

const logoImg = new URL('../../../assets/Salama Cancer Centre logo.png', import.meta.url).href;

const FinanceDashboard = ({ setActiveTab }) => {
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Chart Display Toggle state: 'all' | 'revenue' | 'expenses'
  const [chartView, setChartView] = useState('all');

  // Report Modal state: null | 'balance_sheet' | 'pnl' | 'cash_flow'
  const [activeReport, setActiveReport] = useState(null);

  // Global Timeline Filter states for statements
  const [reportTimelines, setReportTimelines] = useState({
    balance_sheet: { type: 'annual', startDate: '', endDate: '' },
    pnl: { type: 'annual', startDate: '', endDate: '' },
    cash_flow: { type: 'annual', startDate: '', endDate: '' }
  });
  
  // CORE METRICS STATE (Fully Dynamic - Zero Hardcoding)
  const [totalAssets, setTotalAssets] = useState(0); 
  const [totalLiabilities, setTotalLiabilities] = useState(0); 
  const [totalRevenue, setTotalRevenue] = useState(0); 
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Liability Formula Component Breakdowns for Granular Audit Tracking
  const [unpaidExpensesPart, setUnpaidExpensesPart] = useState(0);
  const [supplierPayablesPart, setSupplierPayablesPart] = useState(0);

  // Departmental Assets Breakdown for Balance Sheet Ledgers
  const [deptAssets, setDeptAssets] = useState({
    PHARMACY: 0,
    LAB: 0,
    NURSING: 0,
    RADIOLOGY: 0,
    ADMIN: 0
  });

const [monthlyExpenses, setMonthlyExpenses] = useState(Array(12).fill(0));
const [monthlyRevenue, setMonthlyRevenue] = useState(Array(12).fill(0));
const [monthlyGrowth, setMonthlyGrowth] = useState(Array(12).fill(0));

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('access');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  useEffect(() => {
    const fetchFinancialData = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders();
        const expensesByMonth = Array(12).fill(0);

        // 1. FETCH FIXED ASSETS
        const assetsResponse = await fetch('/api/fixed-assets/', { headers });
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json();
          let assetsList = assetsData.results || assetsData;
          if (!Array.isArray(assetsList)) assetsList = [];

          let aggregateAssetsValue = 0;
          const trackingDeptTotals = { PHARMACY: 0, LAB: 0, NURSING: 0, RADIOLOGY: 0, ADMIN: 0 };

          assetsList.forEach(asset => {
            const qty = parseInt(asset.quantity || 0, 10);
            const cost = parseFloat(asset.unit_cost || 0);
            const assetTotalCost = qty * cost;

            aggregateAssetsValue += assetTotalCost;

            if (trackingDeptTotals.hasOwnProperty(asset.department)) {
              trackingDeptTotals[asset.department] += assetTotalCost;
            } else {
              trackingDeptTotals['ADMIN'] += assetTotalCost;
            }
          });

          setTotalAssets(aggregateAssetsValue);
          setDeptAssets(trackingDeptTotals);
        }

        const revenueResponse = await fetch('/api/finance/revenue-analytics/', { headers });
        if (revenueResponse.ok) {
          const revData = await revenueResponse.json();
          setTotalRevenue(revData.total_revenue);
          setMonthlyRevenue(revData.monthly_revenue);
          setMonthlyGrowth(revData.monthly_growth);
        }

        // 2. PARALLEL ECOSYSTEM DISPATCH FOR LIABILITIES & EXPENDITURES
        const [expensesRes, purchaseInvoicesRes, paymentVouchersRes] = await Promise.all([
          fetch('/api/expenses/', { headers }),
          fetch('/api/purchase-invoices/', { headers }),
          fetch('/api/payment-vouchers/', { headers })
        ]);

        let rawExpenses = [];
        let rawInvoices = [];
        let rawVouchers = [];

        if (expensesRes.ok) {
          const d = await expensesRes.json();
          rawExpenses = d.results || d;
        }
        if (purchaseInvoicesRes.ok) {
          const d = await purchaseInvoicesRes.json();
          rawInvoices = d.results || d;
        }
        if (paymentVouchersRes.ok) {
          const d = await paymentVouchersRes.json();
          rawVouchers = d.results || d;
        }

        // --- CALCULATION LOOP A: EXPENSE TOTAL ANALYSIS (ACCRUAL EXPENSES & OPEX) ---
        let aggregateOpexGross = 0;
        let runningUnpaidExpenses = 0;

        if (Array.isArray(rawExpenses)) {
          rawExpenses.forEach(exp => {
            const totalAmount = parseFloat(exp.amount || 0);
            const settledAmount = parseFloat(exp.amount_paid || 0);
            
            // Focus shifted to Total Gross Expense instead of settled amount
            aggregateOpexGross += totalAmount; 
            
            const residualUnpaid = totalAmount - settledAmount;
            if (residualUnpaid > 0) {
              runningUnpaidExpenses += residualUnpaid;
            }

            // Map total gross expense points to calendar chart performance points safely
            if (exp.date && typeof exp.date === 'string') {
              const parts = exp.date.split('-');
              if (parts.length >= 2) {
                const monthIndex = parseInt(parts[1], 10) - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                  expensesByMonth[monthIndex] += totalAmount;
                }
              }
            }
          });
        }

        // --- CALCULATION LOOP B: SUPPLIER PROCUREMENT ANALYSIS ---
        let runningSupplierPayables = 0;
        let aggregateSupplierGrossInvoiced = 0;

        // Process total bills/invoices generated by suppliers to register overall costs
        if (Array.isArray(rawInvoices)) {
          rawInvoices.forEach(invoice => {
            const billedAmount = parseFloat(invoice.total_billed || 0);
            aggregateSupplierGrossInvoiced += billedAmount;

            // Compute calendar charts based on invoice entry month when applicable
            if (invoice.date_created && typeof invoice.date_created === 'string') {
              const parts = invoice.date_created.split('-');
              if (parts.length >= 2) {
                const monthIndex = parseInt(parts[1], 10) - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                  expensesByMonth[monthIndex] += billedAmount;
                }
              }
            }

            if (invoice.status === 'UNPAID' || invoice.status === 'PARTIAL') {
              // Sum any payment vouchers attached to this specific PurchaseInvoice ID
              const historicalVoucherOffsets = Array.isArray(rawVouchers)
                ? rawVouchers
                    .filter(v => v.purchase_invoice === invoice.id)
                    .reduce((sum, v) => sum + parseFloat(v.amount_paid || 0), 0)
                : 0;

              const unpaidInvoiceBalance = billedAmount - historicalVoucherOffsets;
              if (unpaidInvoiceBalance > 0) {
                runningSupplierPayables += unpaidInvoiceBalance;
              }
            }
          });
        }

        // --- SAVE DYNAMIC METRICS STATES ---
        // Total Expenses now represents total accrued obligations (Opex Gross + Supplier Invoiced)
        setTotalExpenses(aggregateOpexGross);
        setMonthlyExpenses(expensesByMonth);
        
        setUnpaidExpensesPart(runningUnpaidExpenses);
        setSupplierPayablesPart(runningSupplierPayables);
        
        // Finalized Formulation Rule: Unpaid Expenses + Amount Payable to Suppliers
        setTotalLiabilities(runningUnpaidExpenses + runningSupplierPayables);

      } catch (err) {
        console.error("Financial ecosystem calculation loop failure:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  const handleTimelineChange = (reportKey, field, value) => {
    setReportTimelines(prev => ({
      ...prev,
      [reportKey]: { ...prev[reportKey], [field]: value }
    }));
  };

  const getMaxBarValue = () => {
    const values = [];
    if (chartView === 'all' || chartView === 'expenses') values.push(...monthlyExpenses);
    if (chartView === 'all' || chartView === 'revenue') values.push(...monthlyRevenue);
    const absoluteMax = Math.max(...values, 5000);
    return Math.ceil(absoluteMax / 5000) * 5000;
  };

  const maxValue = getMaxBarValue();
  const maxGrowthValue = Math.max(...monthlyGrowth.map(Math.abs), 10);
  
  const formatAxisLabel = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value;
  };

  // Derivative Ledger Harmonization Rules
  const structuralEquity = totalAssets - totalLiabilities;

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 font-sans text-slate-800 text-left pb-12">
      
      {/* 1. TOP 4 KPI CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {/* Card 1: Assets */}
        <button 
          type="button"
          onClick={() => setActiveTab('assets')}
          className="bg-white p-6 text-left rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[145px] cursor-pointer hover:shadow-md hover:border-teal-400 transition-all group hover:-translate-y-1 duration-200"
        >
          <div className="flex justify-between items-center w-full">
            <p className="text-sm font-semibold text-slate-500 tracking-wide">Total Assets</p>
            <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-colors">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">KES {totalAssets.toLocaleString()}</h3>
          </div>
        </button>

        {/* Card 2: Liabilities */}
        <button 
          type="button"
          onClick={() => setActiveTab('purchase_orders')}
          className="bg-white p-6 text-left rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[145px] cursor-pointer hover:shadow-md hover:border-amber-400 transition-all group hover:-translate-y-1 duration-200"
        >
          <div className="flex justify-between items-center w-full">
            <p className="text-sm font-semibold text-slate-500 tracking-wide">Total Liabilities</p>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Wallet size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">KES {totalLiabilities.toLocaleString()}</h3>
          </div>
        </button>

        {/* Card 3: Revenue */}
        <button 
          type="button"
          onClick={() => setActiveTab('finance_requisitions')}
          className="bg-white p-6 text-left rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[145px] cursor-pointer hover:shadow-md hover:border-emerald-400 transition-all group hover:-translate-y-1 duration-200"
        >
          <div className="flex justify-between items-center w-full">
            <p className="text-sm font-semibold text-slate-500 tracking-wide">Total Revenue</p>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-emerald-600 tracking-tight">KES {totalRevenue.toLocaleString()}</h3>
          </div>
        </button>

        {/* Card 4: Expenses */}
        <button 
          type="button"
          onClick={() => setActiveTab('expenses')}
          className="bg-white p-6 text-left rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[145px] cursor-pointer hover:shadow-md hover:border-rose-400 transition-all group hover:-translate-y-1 duration-200"
        >
          <div className="flex justify-between items-center w-full">
            <p className="text-sm font-semibold text-slate-500 tracking-wide">Total Expenses</p>
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <Receipt size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-rose-600 tracking-tight">
              {loading ? <Loader2 className="animate-spin text-slate-400" size={24} /> : `KES ${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </h3>
          </div>
        </button>
      </div>

      {/* 2. DUAL ANALYTICS BREAKDOWN */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full items-stretch">
        
        {/* CHART 1: PERFORMANCE TRACKING */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[460px] w-full">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
            <h4 className="text-base font-bold text-slate-900 tracking-tight">Monthly Performance Tracking</h4>
            <div className="flex border border-slate-200 bg-slate-50 rounded-xl p-1 shadow-xs self-start sm:self-center">
              {[
                { id: 'all', label: 'All' },
                { id: 'revenue', label: 'Revenue' },
                { id: 'expenses', label: 'Expenses' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChartView(tab.id)}
                  className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                    chartView === tab.id ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 flex gap-4 min-h-[300px] relative mt-4 px-2">
            <div className="absolute inset-0 left-14 right-0 bottom-8 flex flex-col justify-between pointer-events-none z-0">
              {[1, 0.75, 0.5, 0.25, 0].map((ratio, index) => (
                <div key={index} className="w-full border-t border-slate-100 relative">
                  <span className="absolute -top-2 left-0 -ml-14 text-xs font-bold text-slate-400 w-11 text-right tracking-tight bg-white pr-2">
                    {formatAxisLabel(maxValue * ratio)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="flex-1 ml-14 h-full flex items-end justify-between gap-3 sm:gap-4 pb-8 z-10">
              {months.map((month, i) => {
                const revHeight = (monthlyRevenue[i] / maxValue) * 100;
                const expHeight = (monthlyExpenses[i] / maxValue) * 100;
                
                return (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative min-w-[20px]">
                    <div className="w-full bg-slate-50/60 rounded-t-xl h-full flex items-end justify-center gap-1 transition-all group-hover:bg-slate-100/80 px-0.5">
                      {(chartView === 'all' || chartView === 'revenue') && (
                        <div 
                          title={`Revenue: KES ${monthlyRevenue[i].toLocaleString()}`}
                          className="w-full bg-teal-500 rounded-t-md shadow-xs transition-all hover:brightness-95 cursor-pointer min-w-[6px]" 
                          style={{ height: `${Math.max(revHeight, monthlyRevenue[i] > 0 ? 4 : 0)}%` }} 
                        />
                      )}
                      {(chartView === 'all' || chartView === 'expenses') && (
                        <div 
                          title={`Expenses: KES ${monthlyExpenses[i].toLocaleString()}`}
                          className="w-full bg-rose-500 rounded-t-md shadow-xs transition-all hover:brightness-95 cursor-pointer min-w-[6px]" 
                          style={{ height: `${Math.max(expHeight, monthlyExpenses[i] > 0 ? 4 : 0)}%` }} 
                        />
                      )}
                    </div>
                    <span className="absolute -bottom-6 text-[11px] font-bold text-slate-400 tracking-tight uppercase transition-colors group-hover:text-slate-900">{month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CHART 2: GROWTH RATE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[460px] w-full">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-base font-bold text-slate-900 tracking-tight">Month-Over-Month Growth Rates</h4>
            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">
              <Percent size={13} /> Percentage Index
            </span>
          </div>

          <div className="flex-1 flex gap-4 min-h-[300px] relative mt-4 px-2">
            <div className="absolute inset-0 left-14 right-0 bottom-8 flex flex-col justify-between pointer-events-none z-0">
              {[1, 0.5, 0, -0.5, -1].map((ratio, index) => (
                <div key={index} className="w-full border-t border-slate-100 relative">
                  <span className="absolute -top-2 left-0 -ml-14 text-xs font-bold text-slate-400 w-11 text-right tracking-tight bg-white pr-2">
                    {(maxGrowthValue * ratio).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            
            <div className="flex-1 ml-14 h-full flex items-center justify-between gap-3 sm:gap-4 pb-8 z-10">
              {months.map((month, i) => {
                const value = monthlyGrowth[i];
                const heightPercentage = Math.abs(value / maxGrowthValue) * 50; 
                const isPositive = value >= 0;

                return (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative min-w-[20px]">
                    <div className="w-full bg-slate-50/60 rounded-xl h-full flex flex-col justify-center relative group-hover:bg-slate-100/80">
                      <div 
                        title={`Growth: ${value}%`}
                        className={`w-3.5 mx-auto transition-all rounded-full ${isPositive ? 'bg-indigo-500' : 'bg-rose-500'} absolute left-1/2 -translate-x-1/2 shadow-xs`} 
                        style={{ 
                          height: `${heightPercentage}%`,
                          bottom: isPositive ? '50%' : 'auto',
                          top: !isPositive ? '50%' : 'auto'
                        }} 
                      />
                    </div>
                    <span className="absolute -bottom-6 text-[11px] font-bold text-slate-400 tracking-tight uppercase transition-colors group-hover:text-slate-900">{month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* 3. CORE FINANCIAL STATEMENTS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm w-full">
        <h4 className="text-base font-bold text-slate-900 tracking-tight mb-6">Financial Statements</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'balance_sheet', title: 'Balance Sheet', icon: <FileSpreadsheet size={20} />, bgClass: 'bg-indigo-50', textClass: 'text-indigo-600' },
            { id: 'pnl', title: 'Profit & Loss (P&L) Summary', icon: <BarChart3 size={20} />, bgClass: 'bg-teal-50', textClass: 'text-teal-600' },
            { id: 'cash_flow', title: 'Cash Flow Statement', icon: <Wallet size={20} />, bgClass: 'bg-amber-50', textClass: 'text-amber-600' }
          ].map((card) => {
            const filter = reportTimelines[card.id];
            return (
              <div key={card.id} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/40 flex flex-col justify-between space-y-5 hover:border-slate-300 transition-colors">
                <div className="flex gap-3 items-start">
                  <div className={`p-3 rounded-xl ${card.bgClass} ${card.textClass}`}>{card.icon}</div>
                  <h5 className="text-sm font-bold text-slate-800 tracking-tight">{card.title}</h5>
                </div>

                <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Calendar size={12} /> Timeline
                    </span>
                    <select 
                      value={filter.type}
                      onChange={(e) => handleTimelineChange(card.id, 'type', e.target.value)}
                      className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                    >
                      <option value="annual">Annual Statement</option>
                      <option value="monthly">Monthly Statement</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {filter.type === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 animate-in slide-in-from-top-1 duration-150">
                      <input type="date" value={filter.startDate} onChange={(e) => handleTimelineChange(card.id, 'startDate', e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 text-slate-700 font-medium focus:outline-none"/>
                      <input type="date" value={filter.endDate} onChange={(e) => handleTimelineChange(card.id, 'endDate', e.target.value)} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 text-slate-700 font-medium focus:outline-none"/>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 w-full pt-1">
                  <button type="button" onClick={() => setActiveReport(card.id)} className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                    <Eye size={14} /> View Portal
                  </button>
                  <button type="button" onClick={() => alert(`Exporting Template...`)} className="bg-slate-950 hover:bg-slate-800 text-teal-400 p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer shadow-sm">
                    <Download size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- STATEMENT PREVIEW MODALS --- */}
      {activeReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative flex flex-col text-left">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-6 print:hidden">
              <div className="flex items-center gap-2 text-slate-900">
                <FileSpreadsheet className="text-teal-500" size={22} />
                <h3 className="text-sm font-bold capitalize">{activeReport.replace('_', ' ')} Registry Portal</h3>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => window.print()} className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <Printer size={14} /> Print Ledger
                </button>
                <button type="button" onClick={() => setActiveReport(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 font-mono text-xs text-slate-800 border border-slate-300 p-8 rounded-xl bg-white shadow-inner select-text">
              <div className="flex flex-col items-center text-center space-y-2 pb-6 border-b-2 border-slate-900 relative">
                {!imageError && (
                  <div className="w-16 h-16 mb-1 object-contain">
                    <img src={logoImg} alt="Salama Cancer Centre" className="w-full h-full object-contain" onError={() => setImageError(true)}/>
                  </div>
                )}
                <h2 className="text-xl font-bold tracking-tight text-slate-900 font-sans">SALAMA CANCER CENTRE</h2>
                <p className="text-xs uppercase font-sans text-slate-500 font-bold tracking-wider">Nairobi, Kenya • Financial Services Division</p>
                <p className="text-xs font-bold pt-2 uppercase underline decoration-1 tracking-widest font-sans text-slate-900">
                  {activeReport === 'balance_sheet' && "Statement of Financial Position (Balance Sheet)"}
                  {activeReport === 'pnl' && "Statement of Comprehensive Income (Profit & Loss)"}
                  {activeReport === 'cash_flow' && "Statement of Cash Flows (Direct Method)"}
                </p>
              </div>

              {/* RENDER A: BALANCE SHEET */}
              {activeReport === 'balance_sheet' && (
                <div className="space-y-6 mt-6">
                  <div>
                    <h4 className="font-bold border-b border-slate-300 pb-1 text-slate-900 uppercase font-sans">1. Assets Ledger</h4>
                    <div className="pl-4 space-y-1.5 mt-2">
                      <div className="flex justify-between"><span>Pharmacy Department Assets Value</span><span className="font-bold">KES {deptAssets.PHARMACY.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Laboratory Department Hardware</span><span className="font-bold">KES {deptAssets.LAB.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Radiology & Imaging Systems</span><span className="font-bold">KES {deptAssets.RADIOLOGY.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Nursing Unit Infrastructure</span><span className="font-bold">KES {deptAssets.NURSING.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>General Administrative Properties</span><span className="font-bold">KES {deptAssets.ADMIN.toLocaleString()}</span></div>
                      <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 mt-1"><span>Total Fixed Assets Valuation</span><span>KES {totalAssets.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold border-b border-slate-300 pb-1 text-slate-900 uppercase font-sans">2. Liabilities & Balanced Equity</h4>
                    <div className="pl-4 space-y-1.5 mt-2">
                      <div className="flex justify-between"><span>Accounts Payable (Unpaid Supplier Invoices)</span><span className="font-bold">KES {supplierPayablesPart.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Unpaid Operational Expense Vouchers</span><span className="font-bold">KES {unpaidExpensesPart.toLocaleString()}</span></div>
                      <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 mt-1"><span>Total Dynamic Liabilities</span><span>KES {totalLiabilities.toLocaleString()}</span></div>
                    </div>
                    <div className="pl-4 space-y-1 mt-4 border-t-2 border-slate-900 pt-2">
                      <div className="flex justify-between font-bold text-slate-900 text-sm"><span>TOTAL STRUCTURAL EQUITY (Assets - Liabilities)</span><span>KES {structuralEquity.toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER B: PROFIT & LOSS */}
              {activeReport === 'pnl' && (
                <div className="space-y-6 mt-6">
                  <div>
                    <h4 className="font-bold border-b border-slate-300 pb-1 text-slate-900 uppercase font-sans">Operating Gross Revenue</h4>
                    <div className="pl-4 space-y-1.5 mt-2">
                      <div className="flex justify-between"><span>Hospital Point-Of-Sale Revenue Streams</span><span className="font-bold">KES {totalRevenue.toLocaleString()}</span></div>
                      <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 mt-1"><span>GROSS RECORDED REVENUE</span><span>KES {totalRevenue.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold border-b border-slate-300 pb-1 text-slate-900 uppercase font-sans">Less: Expenditures (OPEX)</h4>
                    <div className="pl-4 space-y-1.5 mt-2">
                      <div className="flex justify-between"><span>Total Dynamic Accrued Expenditures</span><span className="font-bold">KES {totalExpenses.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <div className="border-t-2 border-slate-900 pt-3 mt-4">
                    <div className="flex justify-between text-sm font-bold text-teal-700 font-sans">
                      <span>NET OPERATING SURPLUS</span>
                      <span>KES {(totalRevenue - totalExpenses).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER C: CASH FLOW */}
              {activeReport === 'cash_flow' && (
                <div className="space-y-6 mt-6">
                  <div>
                    <h4 className="font-bold border-b border-slate-300 pb-1 text-slate-900 uppercase font-sans">Operating Cash Flows</h4>
                    <div className="pl-4 space-y-1.5 mt-2">
                      <div className="flex justify-between"><span>Point of Sale Cash Collections</span><span className="font-bold">KES {totalRevenue.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Total Disbursals for Operations & Suppliers</span><span className="font-bold">(- KES {totalExpenses.toLocaleString()})</span></div>
                      <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 mt-2">
                        <span>NET CASH FLOW FROM OPERATIONS</span>
                        <span>KES {(totalRevenue - totalExpenses).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t-2 border-slate-900 pt-3 mt-4">
                    <div className="flex justify-between text-sm font-bold text-slate-900 font-sans">
                      <span>NET INCREASE IN LIQUID CASH BALANCE</span>
                      <span>KES {(totalRevenue - totalExpenses).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinanceDashboard;