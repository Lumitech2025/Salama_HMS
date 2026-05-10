import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  CreditCard, Smartphone, Receipt, Search, Plus, 
  CheckCircle2, ArrowRight, ShieldCheck, User, 
  FileText, Loader2, X, Mail, MessageSquare,
  Activity //
} from 'lucide-react';

const PaymentPortal = () => {
  const [billingMode, setBillingMode] = useState('self_pay'); // self_pay or insurance
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, prompting, success

  // Cart state representing services assigned to the patient
  const [cart, setCart] = useState([
    { id: 1, service: 'Consultation Fee (Oncology)', category: 'Consultation', price: 3000 },
    { id: 2, service: 'File Registration', category: 'Admin', price: 500 },
  ]);

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handleRemoveService = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    
    if (paymentMethod === 'mpesa') {
      setPaymentStatus('prompting');
      // Here you would call your backend which triggers Daraja STK Push
      // await API.post('/payments/stk-push/', { amount: total, phone: '...' });
      
      // Simulating M-Pesa Response delay
      setTimeout(() => {
        setPaymentStatus('success');
        setIsProcessing(false);
        // After success, backend triggers Httpsms and Email
      }, 4000);
    } else {
      // Cash/Card Flow
      setPaymentStatus('success');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 font-['Plus_Jakarta_Sans']">
      
      {/* HEADER & MODE SELECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#020617] p-8 rounded-[2.5rem] shadow-2xl border border-white/5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight italic uppercase">
            Salama <span className="text-teal-400">POS Terminal</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Transaction Date: {new Date().toLocaleDateString('en-KE')}</p>
        </div>

        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button 
            onClick={() => setBillingMode('self_pay')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${billingMode === 'self_pay' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <User size={14} /> Self Pay
          </button>
          <button 
            onClick={() => setBillingMode('insurance')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${billingMode === 'insurance' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <ShieldCheck size={14} /> Insurance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT SIDE: SERVICE INVENTORY & CART */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                    type="text" 
                    placeholder="Search Patient bill or add service..." 
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                    />
                </div>
                <button className="ml-4 p-4 bg-teal-50 text-teal-600 rounded-2xl hover:bg-teal-600 hover:text-white transition-all shadow-sm">
                    <Plus size={20} />
                </button>
            </div>

            <div className="p-10 space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">Service Items Breakdown</h3>
              
              <div className="space-y-3">
                {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-6 rounded-[1.5rem] border border-slate-100 hover:border-teal-200 transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-500 transition-colors">
                            <FileText size={18} />
                        </div>
                        <div>
                            <p className="font-black text-slate-800 uppercase text-sm tracking-tight">{item.service}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{item.category}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <p className="font-black text-slate-900 text-lg">KES {item.price.toLocaleString()}</p>
                        <button onClick={() => handleRemoveService(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    </div>
                ))}
              </div>
              
              <div className="pt-8 flex gap-4">
                <button className="flex-1 border-2 border-slate-900 text-slate-900 rounded-2xl py-4 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2">
                    <Receipt size={16} /> Generate Invoice
                </button>
                <button className="flex-1 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl py-4 font-black text-[10px] uppercase tracking-[0.2em] hover:border-teal-500 hover:text-teal-600 transition-all flex items-center justify-center gap-2">
                    <Plus size={16} /> Custom Charge
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: PAYMENT ORCHESTRATION */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#020617] rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
            
            {paymentStatus === 'success' ? (
                <div className="relative z-10 py-10 text-center space-y-6 animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-teal-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-teal-500/40">
                        <CheckCircle2 size={48} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black italic">Payment Confirmed</h2>
                        <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Transaction ID: SAL-MP-{Math.floor(Math.random()*1000000)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-3">
                            <Mail size={16} className="text-teal-400" />
                            <span className="text-[9px] font-black uppercase">Email Sent</span>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-3">
                            <MessageSquare size={16} className="text-teal-400" />
                            <span className="text-[9px] font-black uppercase">SMS Alerted</span>
                        </div>
                    </div>
                    <button onClick={() => setPaymentStatus('idle')} className="w-full bg-teal-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">New Transaction</button>
                </div>
            ) : (
                <div className="relative z-10">
                    <h3 className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] mb-8">Settlement Summary</h3>
                    
                    <div className="space-y-5 mb-12">
                        <div className="flex justify-between items-center text-slate-500 font-bold text-xs uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span className="text-slate-300">KES {total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-bold text-xs uppercase tracking-widest">
                            <span>Adjustment</span>
                            <span className="text-slate-300">KES 0</span>
                        </div>
                        <div className="h-px bg-white/10 my-6"></div>
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Total Payable</span>
                            <span className="text-4xl font-black text-white tracking-tighter">
                                <small className="text-sm text-teal-500 mr-2 italic">KES</small> 
                                {total.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 mb-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Disbursement Method</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setPaymentMethod('mpesa')}
                                className={`flex items-center justify-center gap-3 p-5 rounded-3xl transition-all border-2 ${paymentMethod === 'mpesa' ? 'bg-teal-600 border-teal-400 shadow-xl shadow-teal-900' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                            >
                                <Smartphone size={20} />
                                <span className="text-xs font-black uppercase italic">M-Pesa</span>
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('card')}
                                className={`flex items-center justify-center gap-3 p-5 rounded-3xl transition-all border-2 ${paymentMethod === 'card' ? 'bg-teal-600 border-teal-400 shadow-xl shadow-teal-900' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                            >
                                <CreditCard size={20} />
                                <span className="text-xs font-black uppercase italic">Cash/Card</span>
                            </button>
                        </div>
                    </div>

                    <button 
                        disabled={isProcessing}
                        onClick={handleProcessPayment}
                        className={`w-full py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all group ${isProcessing ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-900 hover:bg-teal-400'}`}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>{paymentStatus === 'prompting' ? 'STK PUSH SENT...' : 'Processing...'}</span>
                            </>
                        ) : (
                            <>
                                <span>Initiate Payment</span>
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Background Aesthetic */}
            <Activity className="absolute -bottom-20 -left-20 text-white/5 w-80 h-80 -rotate-12" />
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-8 rounded-[2.5rem] flex items-start gap-5">
             <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-200">
                <Smartphone size={20} />
             </div>
             <div>
               <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest"></p>
               <p className="text-[11px] text-blue-700 font-bold mt-2 leading-relaxed italic">
                 
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPortal;