import React from 'react';
import { Package, TrendingDown, PlusCircle } from 'lucide-react';

const InventoryManager = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Summary Cards */}
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Low Stock Alerts</p>
              <h4 className="text-2xl font-black text-slate-800">04</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="md:col-span-3 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Drug Inventory</h3>
          <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-teal-600 transition-colors">
            <PlusCircle size={16} />
            <span>Add New Stock</span>
          </button>
        </div>
        {/* Table structure similar to PrescriptionQueue */}
      </div>
    </div>
  );
};

export default InventoryManager;