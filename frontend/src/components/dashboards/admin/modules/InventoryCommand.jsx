import React from 'react';
import { Package, AlertOctagon, TrendingDown, ShoppingCart, Archive, Plus } from 'lucide-react';

const InventoryCommand = () => {
    // Mock data for Supply Chain Oversight
    const criticalStock = [
        { id: 1, item: "Docetaxel 80mg", dept: "Pharmacy", stock: 12, min: 20, status: "Low" },
        { id: 2, item: "Hematology Reagent", dept: "Lab", stock: 2, min: 10, status: "Critical" },
        { id: 3, item: "Nitrile Gloves (M)", dept: "General", stock: 450, min: 200, status: "Stable" }
    ];

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
            {/* Header with Procurement Action */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Supply Chain Command</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Inventory Control & Procurement</p>
                </div>
                <button className="bg-white hover:bg-teal-500 hover:text-white text-slate-950 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center space-x-2">
                    <Plus size={16} strokeWidth={3} />
                    <span>Create Purchase Order</span>
                </button>
            </div>

            {/* Inventory KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InventoryCard icon={<Package />} label="Total SKU Count" value="1,240" sub="12 Departments" />
                <InventoryCard icon={<AlertOctagon />} label="Low Stock Alerts" value="08" sub="Action Required" color="red" />
                <InventoryCard icon={<TrendingDown />} label="Monthly Burn Rate" value="Ksh 1.2M" sub="+5% vs Last Month" />
            </div>

            {/* Critical Inventory Monitor */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Critical Stock Watchlist</h3>
                    <ShoppingCart size={20} className="text-slate-500" />
                </div>
                <table className="w-full text-left">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Name</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Department</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Stock</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {criticalStock.map((item) => (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-teal-400 transition-colors">
                                            <Archive size={16} />
                                        </div>
                                        <span className="text-sm font-bold text-white uppercase">{item.item}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">{item.dept}</td>
                                <td className="px-8 py-6">
                                    <span className="text-sm font-bold text-white">{item.stock}</span>
                                    <span className="text-slate-500 text-[10px] ml-2 font-bold">/ Min: {item.min}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                        item.status === 'Critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                        'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    }`}>
                                        {item.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const InventoryCard = ({ icon, label, value, sub, color }) => (
    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:border-white/20 transition-all group">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
            color === 'red' ? 'bg-red-500/10 text-red-500' : 'bg-teal-500/10 text-teal-500'
        }`}>
            {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-white italic tracking-tighter">{value}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{sub}</p>
    </div>
);

export default InventoryCommand;