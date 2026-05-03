import React from 'react';
import { 
  Receipt, 
  CreditCard, 
  History, 
  Download, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';

const BillingPayments = () => {
  // Mock data representing the patient's financial records
  const billingData = {
    totalBalance: 12500.00,
    currency: "KES",
    invoices: [
      { id: "INV-2026-881", date: "May 01, 2026", service: "Chemotherapy Session - Cycle 2", amount: 45000, insurance: 38000, patientPay: 7000, status: "Pending" },
      { id: "INV-2026-742", date: "April 20, 2026", service: "CT Scan (Abdomen)", amount: 15000, insurance: 15000, patientPay: 0, status: "Paid" },
      { id: "INV-2026-610", date: "April 15, 2026", service: "Oncology Consultation", amount: 5500, insurance: 0, patientPay: 5500, status: "Paid" },
    ]
  };

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Billing & Payments</h1>
        <p className="text-slate-500 font-medium text-sm">Manage your invoices and view your payment history.</p>
      </header>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Total Outstanding Balance</p>
            <h2 className="text-5xl font-black italic mb-6">
              <span className="text-xl not-italic mr-2 font-bold text-slate-500">{billingData.currency}</span>
              {billingData.totalBalance.toLocaleString()}
            </h2>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20">
              <CreditCard size={18} /> Pay Balance Now
            </button>
          </div>
          <Wallet className="absolute -right-8 -bottom-8 text-white/5 w-48 h-48" />
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-4 text-emerald-600">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Insurance Coverage</p>
              <p className="text-xs text-slate-500 font-medium">NHIF & Private Insurance Linked</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Your primary insurance has covered <span className="font-bold text-slate-900">85%</span> of your total medical expenses this year.
          </p>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <History size={18} className="text-blue-600" />
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Invoice History</h3>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date & Service</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Total Amount</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Insurance</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Your Share</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {billingData.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-900 leading-tight">{inv.service}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">{inv.date} • {inv.id}</p>
                  </td>
                  <td className="px-6 py-5 font-bold text-slate-700">
                    {billingData.currency} {inv.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 text-emerald-600 font-bold text-sm">
                    -{inv.insurance.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 font-black text-slate-900">
                    {billingData.currency} {inv.patientPay.toLocaleString()}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-3">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.status === 'Paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {inv.status}
                      </div>
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Download size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingPayments;