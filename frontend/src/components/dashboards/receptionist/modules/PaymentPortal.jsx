import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Receipt, 
  Search, 
  Plus, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const PaymentPortal = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [cart, setCart] = useState([
    { id: 1, service: 'Consultation Fee (Oncology)', price: 3000 },
    { id: 2, service: 'File Registration', price: 500 },
  ]);

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Payments</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Point of Sale Terminal</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Date</p>
          <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('en-KE')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Cart & Service Selection (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search service or patient..." 
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none font-medium"
                />
              </div>
            </div>

            <div className="p-8 space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items for Billing</h3>
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">{item.service}</p>
                    <p className="text-[10px] font-black text-teal-600 uppercase">General Service</p>
                  </div>
                  <p className="font-black text-slate-900">KES {item.price.toLocaleString()}</p>
                </div>
              ))}
              
              <button className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-4 flex items-center justify-center space-x-2 text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-all">
                <Plus size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Add Service</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Checkout (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] mb-8">Payment Summary</h3>
              
              <div className="space-y-4 mb-10">
                <div className="flex justify-between items-center text-slate-400 font-bold text-sm">
                  <span>Subtotal</span>
                  <span>KES {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-bold text-sm">
                  <span>Tax (Exempt)</span>
                  <span>KES 0</span>
                </div>
                <div className="h-px bg-white/10 my-4"></div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-black italic">Total Payable</span>
                  <span className="text-3xl font-black text-teal-400 underline underline-offset-8">KES {total.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3 mb-10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Method</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPaymentMethod('mpesa')}
                    className={`flex items-center justify-center space-x-2 p-4 rounded-2xl transition-all border ${paymentMethod === 'mpesa' ? 'bg-teal-600 border-teal-500 shadow-lg shadow-teal-900/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <Smartphone size={18} />
                    <span className="text-[10px] font-black uppercase">M-Pesa</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center justify-center space-x-2 p-4 rounded-2xl transition-all border ${paymentMethod === 'card' ? 'bg-teal-600 border-teal-500 shadow-lg shadow-teal-900/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <CreditCard size={18} />
                    <span className="text-[10px] font-black uppercase">Card/Cash</span>
                  </button>
                </div>
              </div>

              <button className="w-full bg-white text-slate-900 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center space-x-2 hover:bg-teal-400 transition-all group">
                <span>Process Transaction</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Background Aesthetic Circle */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex items-start space-x-4">
             <Receipt className="text-blue-600 mt-1" size={20} />
             <div>
               <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest leading-none">Smart Receipting</p>
               <p className="text-[11px] text-blue-700 font-medium mt-2 leading-relaxed">
                 A digital receipt will be sent to the patient's registered phone number via SMS upon completion.
               </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PaymentPortal;