import React from 'react';
import { CreditCard, ShieldCheck, Receipt, ArrowUpRight } from 'lucide-react';

const PaymentSummaryCard = ({ totalBilled, insuranceCovered, amountDue }) => {
  // Logic to calculate the coverage percentage for the progress bar
  const coveragePercentage = totalBilled > 0 ? (insuranceCovered / totalBilled) * 100 : 0;

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        
        {/* Main Balance Section */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-slate-400">
            <Receipt size={16} />
            <span className="text-xs font-black uppercase tracking-widest">Outstanding Balance</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 tracking-tighter">
              KES {amountDue.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg">
              Due Now
            </span>
          </div>
        </div>

        {/* Insurance Split Visualizer */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck size={18} />
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Insurance Contribution</span>
            </div>
            <span className="text-sm font-black text-emerald-600 italic">
              {coveragePercentage.toFixed(0)}% Covered
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
              style={{ width: `${coveragePercentage}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Insurance: KES {insuranceCovered.toLocaleString()}</span>
            <span>Total: KES {totalBilled.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 w-full lg:w-auto">
          <button className="w-full lg:w-auto flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 group-hover:shadow-blue-100">
            <CreditCard size={20} />
            Pay Now
            <ArrowUpRight size={16} className="opacity-50" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryCard;