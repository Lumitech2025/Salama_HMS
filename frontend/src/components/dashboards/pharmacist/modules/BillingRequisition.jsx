import React from 'react';
import { Receipt, ArrowDownUp, CreditCard, ShoppingCart } from 'lucide-react';

const BillingRequisition = () => {
    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Billing Summary Card */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl">
                            <Receipt size={24} />
                        </div>
                        <span className="text-[10px] font-black bg-teal-50 text-teal-700 px-3 py-1 rounded-full uppercase tracking-widest">Active Claims</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Ksh 124,000</h3>
                    <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Unbilled Pharmaceutical Orders</p>
                </div>

                {/* Stock Requisition Card */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <ArrowDownUp size={24} />
                        </div>
                        <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 transition-all">
                            New Requisition
                        </button>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">12 Pending</h3>
                    <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Warehouse Stock Requests</p>
                </div>
            </div>

            {/* Recent Billing History Table Placeholder */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden p-8">
                <h4 className="font-black text-slate-800 mb-6">Recent Pharmacy Invoices</h4>
                <div className="space-y-4">
                    <div className="flex items-center justify-between py-4 border-b border-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                <CreditCard size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">INV-9902</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Patient: Collins Kimathi</p>
                            </div>
                        </div>
                        <p className="font-black text-slate-900">Ksh 4,500</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingRequisition;