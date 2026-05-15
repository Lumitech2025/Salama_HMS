import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Package, FileText, Calendar, Plus, Search, 
  Download, ArrowRight, X, Save, Upload, Eye, FileDigit
} from 'lucide-react';

const MainStoreLedger = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]); // Base items from LabInventoryItem
  const [invoices, setInvoices] = useState([]);

  // Form State for Receiving Stock (Matching PurchaseInvoice + MainStoreBatch models)
  const [formData, setFormData] = useState({
    base_item: '',        // ForeignKey to LabInventoryItem
    supplier: '',         // ForeignKey to Supplier
    invoice_number: '',   // PurchaseInvoice.invoice_number
    grn_number: '',       // MainStoreBatch.grn_number
    batch_number: '',     // MainStoreBatch.batch_number
    quantity: '',         // MainStoreBatch.quantity_received
    buying_price: '',     // MainStoreBatch.buying_price
    expiry_date: '',      // MainStoreBatch.expiry_date
    due_date: '',         // PurchaseInvoice.due_date
    invoice_file: null    // PurchaseInvoice.invoice_file (File Upload)
  });

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'invoice_file') {
      setFormData({ ...formData, invoice_file: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Using FormData for file upload support
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });

    try {
      // Backend logic should handle creating both Invoice and Batch from this payload
      await API.post('/main-store/receive-stock/', data); 
      setShowModal(false);
      // refreshData();
    } catch (err) {
      console.error("Procurement error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
      
      {/* 1. KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Assets Value</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">KES 14,800,000</h3>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Expiring Soon</p>
          <h3 className="text-3xl font-black text-rose-500 tracking-tighter italic text-rose-500">KES 1,240,000</h3>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unpaid Supplier Invoices</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic text-amber-600">KES 3,100,000</h3>
        </div>
      </div>

      {/* 2. Navigation & Actions */}
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 w-fit">
          {[
            { id: 'inventory', label: 'Inventory Ledger', icon: Package },
            { id: 'invoices', label: 'Purchase Invoices', icon: FileText },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search batch or invoice..." className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-64 focus:ring-2 ring-teal-500/20" />
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-teal-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-teal-700 shadow-lg shadow-teal-600/20 active:scale-95 transition-all"
          >
            <Plus size={16} /> Receive New Stock
          </button>
        </div>
      </div>

      {/* 3. Dynamic Table Content */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'inventory' ? (
          <table className="w-full text-left animate-in slide-in-from-bottom-4">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-8">Asset Description</th>
                <th className="p-8">Batch/GRN</th>
                <th className="p-8 text-center">Qty Received</th>
                <th className="p-8">Unit Price</th>
                <th className="p-8">Total Value</th>
                <th className="p-8">Expiry</th>
                <th className="p-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-8">
                  <p className="font-black text-slate-900 uppercase italic">Cisplatin 50mg</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Roche Pharmaceuticals</p>
                </td>
                <td className="p-8">
                  <p className="text-xs font-bold text-slate-700 uppercase">BT-2024-X</p>
                  <p className="text-[9px] text-teal-600 font-black uppercase mt-1">GRN #0029</p>
                </td>
                <td className="p-8 text-center font-black text-slate-900 italic">45 Units</td>
                <td className="p-8 text-xs font-bold text-slate-500 italic">KES 8,200</td>
                <td className="p-8 font-black text-slate-900 italic">KES 369,000</td>
                <td className="p-8">
                  <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg">14 JUN 2027</span>
                </td>
                <td className="p-8 text-right"><ArrowRight size={18} className="text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" /></td>
              </tr>
            </tbody>
          </table>
        ) : (
          /* INVOICE TAB: Reflecting PurchaseInvoice Model */
          <table className="w-full text-left animate-in slide-in-from-bottom-4">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-8">Invoice Number</th>
                <th className="p-8">Supplier</th>
                <th className="p-8">Amount</th>
                <th className="p-8">Due Date</th>
                <th className="p-8">Document</th>
                <th className="p-8">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               <tr className="hover:bg-slate-50/50">
                  <td className="p-8 font-black text-slate-900 uppercase italic text-sm">INV-2024-8820</td>
                  <td className="p-8 text-xs font-bold text-slate-600 uppercase italic">Mission For Essential Drugs</td>
                  <td className="p-8 font-black text-slate-900 text-sm italic">KES 1,204,000</td>
                  <td className="p-8 text-xs font-bold text-slate-500">20 OCT 2024</td>
                  <td className="p-8">
                     <button className="flex items-center gap-2 text-teal-600 hover:underline font-black text-[10px] uppercase">
                        <Eye size={14}/> View PDF
                     </button>
                  </td>
                  <td className="p-8">
                     <span className="bg-rose-50 text-rose-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-rose-100">Unpaid</span>
                  </td>
               </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: Receive New Stock - Detailed Capture */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Procurement <span className="text-teal-600">Inventory Entry</span></h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto">
              {/* Row 1: Source & Identification */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Drug/Item Name (Catalog)</label>
                  <select name="base_item" required onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-teal-500">
                    <option value="">Select Item from Catalog...</option>
                    <option value="1">Cisplatin 50mg Injection</option>
                    <option value="2">Disposable Gloves (Boxes)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                  <select name="supplier" required onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-teal-500">
                    <option value="">Select Vendor...</option>
                    <option value="1">Roche Kenya</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Invoicing & Identification */}
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-teal-600">Invoice Number</label>
                  <input name="invoice_number" required onChange={handleInputChange} type="text" placeholder="INV-..." className="w-full bg-white border-2 border-teal-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GRN Number</label>
                  <input name="grn_number" required onChange={handleInputChange} type="text" placeholder="GRN-0000" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch Number</label>
                  <input name="batch_number" required onChange={handleInputChange} type="text" placeholder="BT-..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none" />
                </div>
              </div>

              {/* Row 3: Financials & Expiry */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input name="quantity" required onChange={handleInputChange} type="number" placeholder="0" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buy Price/Unit</label>
                  <input name="buying_price" required onChange={handleInputChange} type="number" placeholder="KES" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-rose-500">Expiry Date</label>
                  <input name="expiry_date" required onChange={handleInputChange} type="date" className="w-full bg-rose-50 border border-rose-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Due</label>
                  <input name="due_date" required onChange={handleInputChange} type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold outline-none" />
                </div>
              </div>

              {/* Row 4: Document Upload (Functional) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scan/Upload Official Invoice (PDF)</label>
                <div className="relative group border-2 border-dashed border-slate-100 rounded-[2rem] p-8 bg-slate-50/50 hover:bg-teal-50 hover:border-teal-300 transition-all cursor-pointer text-center">
                  <input type="file" name="invoice_file" onChange={handleInputChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="mx-auto text-slate-300 group-hover:text-teal-600 mb-2" size={32} />
                  <p className="text-[10px] font-black text-slate-400 group-hover:text-teal-700 uppercase tracking-widest">
                    {formData.invoice_file ? formData.invoice_file.name : "Click to select file or drag and drop"}
                  </p>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#020617] text-teal-400 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4 hover:bg-slate-900 transition-all shadow-2xl active:scale-95"
              >
                {loading ? "COMMITTING TO DATABASE..." : <><Save size={20}/> Finalize Procurement Entry</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainStoreLedger;