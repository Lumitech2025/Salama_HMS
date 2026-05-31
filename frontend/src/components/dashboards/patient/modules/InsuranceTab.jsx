import React, { useState } from 'react';
import { 
  Receipt, 
  ShieldCheck, 
  CreditCard, 
  FileText, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Activity, 
  FileLock2
} from 'lucide-react';

const BillingInsuranceTab = ({ 
  invoiceRecords = [], 
  insuranceDetails = null 
}) => {
  // Toggle tracker for separating direct Financial Ledger from Insurance Policy Contexts
  const [financialMode, setFinancialMode] = useState('cash-ledger');

  // Calculate totals for quick financial summary cards
  const totalIncurred = invoiceRecords.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalPaid = invoiceRecords
    .filter(item => item.status?.toLowerCase() === 'paid')
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalPending = totalIncurred - totalPaid;

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-300 font-sans w-full max-w-none antialiased">
      
      {/* SECTION 1: MASTER REVENUE HEADER */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Receipt size={24} className="text-blue-600" /> Patient Financial Ledger & Claims Portal
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Real-time point-of-care billing records, cash reconciliations, and third-party insurance adjudication tracking.
        </p>
      </div>

      {/* SECTION 2: METRICS OVERVIEW (Crucial for immediate administrative and point-of-sale visibility) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Cumulative Charges</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">KES {totalIncurred.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Settled (Paid)</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">KES {totalPaid.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Outstanding Balance</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">KES {totalPending.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* SECTION 3: MODE TOGGLE CONTROL SWITCH */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => setFinancialMode('cash-ledger')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
            financialMode === 'cash-ledger'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <CreditCard size={16} />
          Charges & Cash Breakdown
        </button>
        <button
          type="button"
          onClick={() => setFinancialMode('insurance-profile')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
            financialMode === 'insurance-profile'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck size={16} />
          Insurance Coverage & Pre-Auth
        </button>
      </div>

      {/* SECTION 4: RENDERING CORE DETAILS CONTROLLERS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[300px]">
        
        {/* VIEW A: ITEMISED CHARGES & CASH LEDGER */}
        {financialMode === 'cash-ledger' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" /> Itemized Encounter Charges Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Chronological list of billable operations processed within the current visit timeline.</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="p-4 text-left font-bold">Transaction Code</th>
                    <th className="p-4 text-left font-bold">Date & Time Charged</th>
                    <th className="p-4 text-left font-bold">Department / Service Rendered</th>
                    <th className="p-4 text-right font-bold">Charge Amount</th>
                    <th className="p-4 text-right px-6 font-bold">Settlement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceRecords.length > 0 ? invoiceRecords.map((item, idx) => {
                    const isPaid = item.status?.toLowerCase() === 'paid';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        {/* Transaction Code */}
                        <td className="p-4 font-mono font-bold text-slate-900 uppercase">
                          {item.tx_code || `TX-${1000 + idx}`}
                        </td>
                        
                        {/* Timestamp */}
                        <td className="p-4 whitespace-nowrap text-slate-700 font-medium">
                          <span className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
                            <Clock size={13} />
                            {item.charged_at || '—'}
                          </span>
                        </td>
                        
                        {/* Department/Service */}
                        <td className="p-4 text-left font-black text-slate-900 text-base uppercase tracking-tight">
                          {item.service_description || item.service_name || 'General Operational Charge'}
                          <span className="block text-xs text-slate-400 font-medium font-sans lowercase mt-0.5">Category: {item.department || 'Clinical Care'}</span>
                        </td>
                        
                        {/* Charge Amount */}
                        <td className="p-4 text-right font-mono font-black text-slate-900 text-base bg-slate-50/40">
                          KES {(item.amount || 0).toLocaleString()}
                        </td>
                        
                        {/* Settlement Status */}
                        <td className="p-4 text-right px-6 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${
                            isPaid 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          }`}>
                            {isPaid ? 'Settled (Paid)' : 'Pending Balance'}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="5" className="p-16 text-center text-slate-400 font-mono text-sm">
                        No financial billing transactions populated under this file history.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW B: THIRD-PARTY INSURANCE SCHEME PROFILE */}
        {financialMode === 'insurance-profile' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={18} className="text-teal-600" /> Managed Care Policy Adjudication Details
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Pre-authorization criteria, benefit capping variables, and claims processing verification logs.</p>
            </div>

            {insuranceDetails ? (
              <div className="space-y-6">
                
                {/* Policy Core Structural Matrix Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column Fields: Profile Details */}
                  <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-4 text-base">
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Payer Underwriter / Insurance Provider</span>
                      <p className="font-black text-slate-900 text-lg uppercase mt-0.5">{insuranceDetails.provider_name || 'NHIF / SHA / Private Provider'}</p>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Policy Scheme Membership / Card Number</span>
                      <p className="font-mono font-black text-slate-900 text-base mt-0.5">{insuranceDetails.policy_number || '—'}</p>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Policy Benefit Cap Tier / Sub-Scheme Allocation</span>
                      <p className="font-semibold text-slate-700 mt-0.5">{insuranceDetails.benefit_tier || 'Comprehensive Corporate Cover Tier-1'}</p>
                    </div>
                  </div>

                  {/* Right Column Fields: Pre-Auth & Approvals Matrix */}
                  <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-4 text-base">
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">HMO Utilization Pre-Authorization Code</span>
                      <p className="font-mono font-black text-blue-600 text-lg bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 w-fit mt-0.5 tracking-wider">
                        {insuranceDetails.pre_auth_code || 'AUTH-PENDING-00'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Claim Approval State</span>
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                            insuranceDetails.is_approved 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {insuranceDetails.is_approved ? 'Claim Approved' : 'Review In Progress'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Total Amount Approved</span>
                        <p className="font-mono font-black text-slate-900 text-lg mt-0.5">
                          KES {(insuranceDetails.approved_amount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Copay / Co-Insurance Liability (Patient Share)</span>
                      <p className="font-medium text-slate-600 mt-0.5">
                        KES {(insuranceDetails.copay_liability || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                </div>

                {/* Bottom Legal/Compliance Banner (Vital safeguard for hospital operations) */}
                <div className="p-4 rounded-xl border border-dashed border-slate-200 flex items-start gap-3 bg-slate-50/50">
                  <FileLock2 size={20} className="text-slate-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-bold text-slate-700 block mb-0.5">Insurance Verification Protocol Disclaimer:</span>
                    Pre-authorization approval metrics do not guarantee complete claim clearance. Final payment allocations are calculated by medical coders upon review of doctor consultation notes, drug prescription lines, and formal diagnostic summaries during patient discharge processing.
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 font-mono text-sm border border-dashed border-slate-200 rounded-xl">
                No insurance schemes or pre-authorization profiles are mapped to this patient profile context. Defaulting to Cash Settlement framework.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default BillingInsuranceTab;