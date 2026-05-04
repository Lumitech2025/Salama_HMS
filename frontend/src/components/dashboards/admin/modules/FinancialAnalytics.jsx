import React from 'react';
import { TrendingUp, DollarSign, CreditCard, PieChart, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

const FinancialAnalytics = () => {
    // Mock financial data for Salama HMS
    const revenueStats = [
        { label: 'Total Revenue', value: 'Ksh 4.2M', trend: '+12.5%', isUp: true },
        { label: 'Insurance Claims', value: 'Ksh 2.8M', trend: '+8.2%', isUp: true },
        { label: 'Out-of-Pocket', value: 'Ksh 1.4M', trend: '-2.1%', isUp: false },
        { label: 'Pending Billing', value: 'Ksh 850K', trend: 'Critical', isUp: false },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
            {/* Header & Date Filter */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Financial Intelligence</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Real-time Revenue Cycle Management</p>
                </div>
                <div className="flex space-x-3">
                    <button className="bg-white/5 border border-white/10 text-slate-400 p-3 rounded-xl hover:text-white transition-all">
                        <Filter size={20} />
                    </button>
                    <select className="bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest px-4 py-3 rounded-xl outline-none focus:border-teal-500/50 transition-all">
                        <option>Last 30 Days</option>
                        <option>Q1 FY2026</option>
                        <option>Current Year</option>
                    </select>
                </div>
            </div>

            {/* Top Level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {revenueStats.map((stat, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/[0.07] transition-all group">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
                        <div className="flex justify-between items-end">
                            <h3 className="text-2xl font-black text-white italic tracking-tighter">{stat.value}</h3>
                            <div className={`flex items-center text-[10px] font-black px-2 py-1 rounded-lg ${
                                stat.isUp ? 'bg-teal-500/10 text-teal-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                                {stat.isUp ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                                {stat.trend}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Distribution Chart Area */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Revenue Distribution</h3>
                        <PieChart size={20} className="text-teal-500" />
                    </div>
                    {/* Placeholder for a Charting Library like Recharts or Chart.js */}
                    <div className="h-64 w-full bg-slate-900/50 rounded-3xl border border-dashed border-white/10 flex items-center justify-center">
                        <p className="text-slate-600 font-black uppercase text-[10px] tracking-[0.5em]">Chart Visualization Engine</p>
                    </div>
                </div>

                {/* Recent Transactions / Billing Feed */}
                <div className="bg-slate-900/50 border border-white/10 rounded-[2.5rem] p-8">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-8">Recent Billing</h3>
                    <div className="space-y-6">
                        <TransactionItem patient="M. Kimathi" amount="Ksh 15,000" type="Insurance" status="Paid" />
                        <TransactionItem patient="C. Mwiti" amount="Ksh 4,500" type="Cash" status="Pending" />
                        <TransactionItem patient="B. Ujuzi" amount="Ksh 85,000" type="Insurance" status="Processing" />
                        <TransactionItem patient="L. Kemboi" amount="Ksh 12,200" type="Mobile Money" status="Paid" />
                    </div>
                    <button className="w-full mt-8 py-4 bg-teal-500/10 hover:bg-teal-500 text-teal-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Generate Financial Report
                    </button>
                </div>
            </div>
        </div>
    );
};

const TransactionItem = ({ patient, amount, type, status }) => (
    <div className="flex justify-between items-center group cursor-pointer">
        <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-teal-500 transition-colors">
                <CreditCard size={18} />
            </div>
            <div>
                <p className="text-xs text-white font-bold">{patient}</p>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">{type}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-xs text-white font-black">{amount}</p>
            <p className={`text-[8px] font-black uppercase tracking-widest ${
                status === 'Paid' ? 'text-teal-500' : 'text-amber-500'
            }`}>{status}</p>
        </div>
    </div>
);

export default FinancialAnalytics;