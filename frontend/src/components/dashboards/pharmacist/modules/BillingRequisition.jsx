import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
    Receipt, ArrowDownUp, CreditCard, ShoppingCart, 
    Search, FileText, Loader2, X, Send, Smartphone, 
    CheckCircle2, DollarSign, Pill, Info
} from 'lucide-react';

const BillingRequisition = ({ sessionData }) => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('mpesa');
    const [phoneNumber, setPhoneNumber] = useState('');

    // State for the specific bill sent from the Pharmacy complete cycle
    const [activeBill, setActiveBill] = useState(sessionData || null);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await API.get('/bills/');
            setInvoices(res.data.results || res.data || []);
        } catch (err) {
            console.error("Fetch error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInvoices(); }, []);

    const handleMpesaPush = async () => {
        if (!phoneNumber) return alert("Please enter a valid M-Pesa number");
        setPaymentProcessing(true);
        try {
            // M-Pesa STK Push Integration Endpoint
            // await API.post('/payments/stk-push/', { phone: phoneNumber, billId: activeBill.billId });
            
            setTimeout(() => {
                alert(`STK Push sent to ${phoneNumber}. Awaiting confirmation...`);
                setPaymentProcessing(false);
                setActiveBill(null); 
                fetchInvoices();
            }, 2000);
        } catch (err) {
            alert("M-Pesa Gateway Connection Failed");
            setPaymentProcessing(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter'] pb-20">
            
            {/* TIER 1: THE SETTLEMENT HUB (Active Checkout) */}
            {activeBill && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-top-10 duration-500">
                    
                    {/* Invoice Itemization */}
                    <div className="lg:col-span-7 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                                <Receipt size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Regimen Invoice</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {activeBill.billNo}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* In a real scenario, map through items in the bill */}
                            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <Pill size={18} className="text-slate-400" />
                                    <span className="text-sm font-bold text-slate-700 uppercase">Dispensed Pharmaceutical Items</span>
                                </div>
                                <span className="font-mono font-black text-slate-900">Ksh {parseFloat(activeBill.amount).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="mt-10 pt-8 border-t border-dashed border-slate-200 flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payable</p>
                                <h2 className="text-4xl font-black text-slate-950 italic tracking-tighter">Ksh {parseFloat(activeBill.amount).toLocaleString()}</h2>
                            </div>
                            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                                <Info size={14} />
                                <span className="text-[9px] font-black uppercase">Prices inclusive of VAT</span>
                            </div>
                        </div>
                    </div>

                    {/* M-Pesa / Payment Action */}
                    <div className="lg:col-span-5 bg-[#020617] rounded-[3rem] p-10 border border-white/5 shadow-2xl flex flex-col">
                        <div className="flex gap-4 mb-8">
                            <button onClick={() => setPaymentMethod('mpesa')} className={`flex-1 py-5 rounded-2xl flex flex-col items-center gap-3 transition-all ${paymentMethod === 'mpesa' ? 'bg-teal-500 text-white shadow-xl scale-105' : 'bg-white/5 text-slate-500'}`}>
                                <Smartphone size={24} /> 
                                <span className="text-[10px] font-black uppercase tracking-widest">M-Pesa STK</span>
                            </button>
                            <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-5 rounded-2xl flex flex-col items-center gap-3 transition-all ${paymentMethod === 'card' ? 'bg-indigo-500 text-white shadow-xl scale-105' : 'bg-white/5 text-slate-500'}`}>
                                <CreditCard size={24} /> 
                                <span className="text-[10px] font-black uppercase tracking-widest">Corporate/Card</span>
                            </button>
                        </div>

                        {paymentMethod === 'mpesa' ? (
                            <div className="space-y-6 flex-1 flex flex-col justify-center">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Customer Phone Number</label>
                                    <input 
                                        type="text" 
                                        placeholder="2547XXXXXXXX" 
                                        className="w-full bg-white/10 border-none rounded-2xl p-5 text-white font-mono text-xl tracking-widest outline-none focus:ring-2 focus:ring-teal-500"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleMpesaPush}
                                    disabled={paymentProcessing}
                                    className="w-full bg-teal-500 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-teal-400 flex items-center justify-center gap-3 transition-all shadow-2xl shadow-teal-500/20"
                                >
                                    {paymentProcessing ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                                    Complete Payment
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-indigo-400">
                                    <DollarSign size={32} />
                                </div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest px-10 leading-relaxed">External Terminal or Insurance Verification Required for this method.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TIER 2: RECENT ACTIVITY (Registry) */}
            <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden">
                <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h4 className="font-black text-slate-900 text-xl tracking-tight uppercase italic flex items-center gap-2">
                           <FileText className="text-blue-500" size={20} /> Historical Invoices
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cross-referencing dispensed regimens with billing</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Filter invoices..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/5 transition-all text-sm" />
                    </div>
                </div>

                <div className="p-10 space-y-4">
                    {loading ? (
                        <div className="py-20 text-center"><Loader2 className="animate-spin text-teal-500 mx-auto" size={40} /></div>
                    ) : invoices.map((inv, idx) => (
                        <div key={idx} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] hover:border-teal-500 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-6">
                                <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shadow-sm"><FileText size={20} /></div>
                                <div>
                                    <p className="text-lg font-black text-slate-900 tracking-tight uppercase">#{inv.bill_no}</p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inv.patient_name}</p>
                                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                        <p className="text-[10px] font-black text-teal-600 uppercase italic">Cleared</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-slate-900 tracking-tighter italic">Ksh {parseFloat(inv.total_amount).toLocaleString()}</p>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${inv.is_paid ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                    {inv.is_paid ? 'Paid via M-Pesa' : 'Pending Verification'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BillingRequisition;