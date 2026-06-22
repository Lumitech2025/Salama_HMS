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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm w-full print:hidden">
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
                  <div className="flex flex-col gap-2">
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
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>

                    {filter.type === 'monthly' && (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 transition-all">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Month:</span>
                        <select
                          value={filter.month || '1'}
                          onChange={(e) => handleTimelineChange(card.id, 'month', e.target.value)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 font-medium text-slate-700 focus:outline-none"
                        >
                          <option value="1">January</option>
                          <option value="2">February</option>
                          <option value="3">March</option>
                          <option value="4">April</option>
                          <option value="5">May</option>
                          <option value="6">June</option>
                          <option value="7">July</option>
                          <option value="8">August</option>
                          <option value="9">September</option>
                          <option value="10">October</option>
                          <option value="11">November</option>
                          <option value="12">December</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {filter.type === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 animate-in slide-in-from-top-1 duration-150">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200 print:absolute print:inset-0 print:bg-white print:p-0 print:block">
          
          <style>{`
            @media print {
              body, html { background: #fff !important; color: #000 !important; width: 100%; }
              .print\\:hidden { display: none !important; }
              .printable-sheet-paper { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; max-height: none !important; overflow: visible !important; position: absolute !important; top: 0; left: 0; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          `}</style>

          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative flex flex-col text-left printable-sheet-paper">
            
            {/* Modal Control Top Bar */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-6 print:hidden">
              <div className="flex items-center gap-2 text-slate-900">
                <FileSpreadsheet className="text-slate-700" size={20} />
                <h3 className="text-xs font-bold uppercase tracking-wider">{activeReport.replace('_', ' ')} Sheet Preview</h3>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => window.print()} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition flex items-center gap-2 text-xs font-bold cursor-pointer shadow-2xs">
                  <Printer size={14} /> Print Document
                </button>
                <button type="button" onClick={() => setActiveReport(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Standard A4 Formal Paper Wrapper */}
            <div className="flex-1 bg-white p-6 font-sans text-slate-800 print:p-0">
              
              {/* Header Letterhead Grid with Left Logo & Complete Address Info */}
              <div className="flex flex-row items-start justify-between pb-6 border-b border-slate-300 gap-6">
                <div className="flex items-start gap-5">
                  {!imageError && (
                    <img src={logoImg} alt="Salama Logo" className="h-20 w-auto object-contain shrink-0 mt-1" onError={() => setImageError(true)}/>
                  )}
                  <div className="space-y-1">
                    <h2 className="text-xl font-black tracking-tight text-slate-900">SALAMA CANCER CENTRE</h2>
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Financial Services Division</p>
                    
                    {/* Detailed Corporate Address Section */}
                    <div className="pt-1 text-[11px] text-slate-500 font-medium space-y-0.5 font-mono">
                      <p>P.O. Box 45212 - 00100, Nairobi, Kenya</p>
                      <p>Tel: +254 (0) 20 271 4400 / +254 722 000 000</p>
                      <p>Email: finance@salamacancer.org | Web: www.salamacancer.org</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <span className="inline-block text-[10px] font-bold px-2.5 py-1 bg-slate-100 rounded-md text-slate-700 tracking-wider font-mono uppercase print:bg-transparent print:border print:border-slate-300">
                    OFFICIAL LEDGER
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono mt-2">Date: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              {/* Title & Active Filter Flag */}
              <div className="my-6 space-y-1.5">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 border-l-2 border-slate-900 pl-2">
                  {activeReport === 'balance_sheet' && "Statement of Financial Position (Balance Sheet)"}
                  {activeReport === 'pnl' && "Statement of Comprehensive Income (Profit & Loss)"}
                  {activeReport === 'cash_flow' && "Statement of Cash Flows"}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium font-mono lowercase pl-2">
                  reporting horizon: <span className="font-bold uppercase text-slate-700">{reportTimelines[activeReport].type}</span>
                  {reportTimelines[activeReport].type === 'monthly' && ` (month code: ${reportTimelines[activeReport].month || '1'})`}
                </p>
              </div>

              {/* RENDER A: BALANCE SHEET LEDGER TABLE */}
              {activeReport === 'balance_sheet' && (
                <div className="space-y-6">
                  <div>
                    <div className="bg-slate-900 text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-sm">1.0 ASSETS ACCOUNTING UNITS</div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-300 text-slate-400 text-[10px] uppercase font-bold tracking-wider bg-slate-50/50">
                          <th className="py-2 px-3 w-28 font-mono">Account Code</th>
                          <th className="py-2 px-3">Description Category</th>
                          <th className="py-2 px-3 text-right">Value Balance (KES)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        <tr className="hover:bg-slate-50/40"><td className="py-2 px-3 font-mono text-slate-400 text-[11px]">1010-PHA</td><td className="py-2 px-3">Pharmacy Department Asset Inventories</td><td className="py-2 px-3 text-right font-mono">{deptAssets.PHARMACY.toLocaleString()}</td></tr>
                        <tr className="hover:bg-slate-50/40"><td className="py-2 px-3 font-mono text-slate-400 text-[11px]">1020-LAB</td><td className="py-2 px-3">Laboratory Infrastructure & Diagnostic Systems</td><td className="py-2 px-3 text-right font-mono">{deptAssets.LAB.toLocaleString()}</td></tr>
                        <tr className="hover:bg-slate-50/40"><td className="py-2 px-3 font-mono text-slate-400 text-[11px]">1030-RAD</td><td className="py-2 px-3">Radiology & Clinical Imaging Equipment Base</td><td className="py-2 px-3 text-right font-mono">{deptAssets.RADIOLOGY.toLocaleString()}</td></tr>
                        <tr className="hover:bg-slate-50/40"><td className="py-2 px-3 font-mono text-slate-400 text-[11px]">1040-NUR</td><td className="py-2 px-3">Nursing Unit Ward Infrastructure Assets</td><td className="py-2 px-3 text-right font-mono">{deptAssets.NURSING.toLocaleString()}</td></tr>
                        <tr className="hover:bg-slate-50/40"><td className="py-2 px-3 font-mono text-slate-400 text-[11px]">1050-ADM</td><td className="py-2 px-3">General Corporate Administrative Properties</td><td className="py-2 px-3 text-right font-mono">{deptAssets.ADMIN.toLocaleString()}</td></tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-400">
                          <td colSpan="2" className="py-2.5 px-3 text-right uppercase text-[10px] tracking-wider">Total Fixed Assets Portfolio</td>
                          <td className="py-2.5 px-3 text-right font-mono border-b-2 border-slate-950">KES {totalAssets.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div>
                    <div className="bg-slate-900 text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-sm">2.0 LIABILITIES & BALANCED CURRENT EQUITIES</div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-300 text-slate-400 text-[10px] uppercase font-bold tracking-wider bg-slate-50/50">
                          <th className="py-2 px-3 w-28 font-mono">Account Code</th>
                          <th className="py-2 px-3">Description Category</th>
                          <th className="py-2 px-3 text-right">Value Balance (KES)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        <tr className="hover:bg-slate-50/40"><td className="py-2 px-3 font-mono text-slate-400 text-[11px]">2010-PAY</td><td className="py-2 px-3">Accounts Payable (Outstanding Vendor Invoices)</td><td className="py-2 px-3 text-right font-mono text-rose-600">{supplierPayablesPart.toLocaleString()}</td></tr>
                        <tr className="hover:bg-slate-50/40"><td className="py-2 px-3 font-mono text-slate-400 text-[11px]">2020-OPX</td><td className="py-2 px-3">Unpaid Operational Expense Accrual Vouchers</td><td className="py-2 px-3 text-right font-mono text-rose-600">{unpaidExpensesPart.toLocaleString()}</td></tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-400">
                          <td colSpan="2" className="py-2.5 px-3 text-right uppercase text-[10px] tracking-wider">Total Aggregate Liabilities</td>
                          <td className="py-2.5 px-3 text-right font-mono border-b border-slate-400">KES {totalLiabilities.toLocaleString()}</td>
                        </tr>
                        <tr className="bg-slate-100/80 font-black text-slate-950 border-t border-slate-300">
                          <td colSpan="2" className="py-3 px-3 text-right uppercase text-[11px] tracking-widest text-slate-900">NET STRUCTURAL EQUITY BALANCE (Assets - Liabilities)</td>
                          <td className="py-3 px-3 text-right font-mono text-sm border-b-4 border-double border-slate-950 bg-slate-100">KES {structuralEquity.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* RENDER B: PROFIT & LOSS REPORT */}
              {activeReport === 'pnl' && (
                <div className="space-y-6">
                  <div>
                    <div className="bg-slate-900 text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-sm">Operating Gross Revenues</div>
                    <table className="w-full text-left text-xs border-collapse">
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        <tr className="hover:bg-slate-50/40"><td className="py-3 px-4 w-28 font-mono text-slate-400">4010-REV</td><td className="py-3 px-4">Hospital Main Point-Of-Sale Medical Revenue Streams</td><td className="py-3 px-4 text-right font-mono">KES {totalRevenue.toLocaleString()}</td></tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-300">
                          <td colSpan="2" className="py-2.5 px-4 text-right uppercase text-[10px] tracking-wider">GROSS ANCHOR OPERATING REVENUE</td>
                          <td className="py-2.5 px-4 text-right font-mono border-b border-slate-400">KES {totalRevenue.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div>
                    <div className="bg-slate-900 text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-sm">Less: Operating Expenditures (OPEX)</div>
                    <table className="w-full text-left text-xs border-collapse">
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        <tr className="hover:bg-slate-50/40"><td className="py-3 px-4 w-28 font-mono text-slate-400">5010-EXP</td><td className="py-3 px-4">Dynamic General Operating Expenditures Ledger</td><td className="py-3 px-4 text-right font-mono text-rose-600">({totalExpenses.toLocaleString()})</td></tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-300">
                          <td colSpan="2" className="py-2.5 px-4 text-right uppercase text-[10px] tracking-wider">TOTAL ACCRUED EXPENDITURES LOAD</td>
                          <td className="py-2.5 px-4 text-right font-mono border-b border-slate-400 text-rose-600">({totalExpenses.toLocaleString()})</td>
                        </tr>
                        <tr className="bg-slate-100/80 font-black text-slate-950 border-t-2 border-slate-400">
                          <td colSpan="2" className="py-3 px-4 text-right uppercase text-[11px] tracking-widest text-slate-900">NET RUNNING OPERATING SURPLUS</td>
                          <td className="py-3 px-4 text-right font-mono text-sm border-b-4 border-double border-slate-950 bg-slate-100">
                            KES {(totalRevenue - totalExpenses).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* RENDER C: CASH FLOW STATEMENT */}
              {activeReport === 'cash_flow' && (
                <div>
                  <div className="bg-slate-900 text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-sm">Operating Cash Flow Activities</div>
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      <tr className="hover:bg-slate-50/40"><td className="py-3 px-4 w-28 font-mono text-slate-400">3010-OPS</td><td className="py-3 px-4">Point of Sale Direct Cash Collections Summary</td><td className="py-3 px-4 text-right font-mono">KES {totalRevenue.toLocaleString()}</td></tr>
                      <tr className="hover:bg-slate-50/40"><td className="py-3 px-4 w-28 font-mono text-slate-400">3020-SUP</td><td className="py-3 px-4">Direct Cash Disbursements for Operations & Material Suppliers</td><td className="py-3 px-4 text-right font-mono text-rose-600">(- KES {totalExpenses.toLocaleString()})</td></tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td colSpan="2" className="py-2.5 px-4 text-right uppercase text-[10px] tracking-wider">NET CASH FLOW GENERATED FROM OPERATIONS</td>
                        <td className="py-2.5 px-4 text-right font-mono border-b border-slate-400">KES {(totalRevenue - totalExpenses).toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-100/80 font-black text-slate-950 border-t-2 border-slate-400">
                        <td colSpan="2" className="py-3 px-4 text-right uppercase text-[11px] tracking-widest text-slate-900">NET ABSOLUTE INCREASE IN LIQUID CASH POSITION</td>
                        <td className="py-3 px-4 text-right font-mono text-sm border-b-4 border-double border-slate-950 bg-slate-100">KES {(totalRevenue - totalExpenses).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* CORPORATE SIGNATURE ATTESTATION BLOCKS */}
              <div className="mt-16 pt-12 border-t border-dashed border-slate-300 grid grid-cols-2 gap-16 text-[10px] uppercase font-sans font-bold tracking-wider text-slate-400">
                <div className="space-y-6">
                  <div className="h-4 border-b border-slate-300"></div>
                  <p className="pl-1">Prepared By: Lead Financial Accountant</p>
                </div>
                <div className="space-y-6">
                  <div className="h-4 border-b border-slate-300"></div>
                  <p className="pl-1">Certified By: Chief Internal Auditor</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinanceDashboard;