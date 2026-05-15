import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Send, Calculator, FileText } from 'lucide-react';
import API from '@/api/api';

const CreatePOModal = ({ isOpen, onClose, suppliers }) => {
  const [step, setStep] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [poItems, setPoItems] = useState([{ item_id: '', quantity: 1, unit_price: 0 }]);
  const [deadline, setDeadline] = useState('');

  const addItemRow = () => setPoItems([...poItems, { item_id: '', quantity: 1, unit_price: 0 }]);
  
  const removeItemRow = (index) => {
    const list = [...poItems];
    list.splice(index, 1);
    setPoItems(list);
  };

  const calculateTotal = () => {
    return poItems.reduce((acc, current) => acc + (current.quantity * current.unit_price), 0);
  };

  const handleSubmit = async () => {
    const payload = {
      supplier: selectedSupplier,
      delivery_deadline: deadline,
      items: poItems,
      total_estimated_cost: calculateTotal()
    };
    try {
      await API.post('/purchase-orders/', payload);
      alert("Purchase Order Generated & Queued for Sending");
      onClose();
    } catch (err) {
      console.error("PO Error", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Generate <span className="text-teal-600">Purchase Order</span></h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-1 text-left">Step {step} of 2: {step === 1 ? 'Vendor & Schedule' : 'Line Items'}</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"><X size={24}/></button>
        </div>

        {/* Content */}
        <div className="p-12 overflow-y-auto flex-1">
          {step === 1 ? (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 text-left">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Target Supplier</label>
                  <select 
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-teal-500"
                  >
                    <option value="">Select Partner...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Expected Delivery</label>
                  <input 
                    type="date" 
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <table className="w-full">
                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="pb-4 text-left px-2">Description</th>
                    <th className="pb-4 text-center w-32">Qty</th>
                    <th className="pb-4 text-center w-40">Unit Price</th>
                    <th className="pb-4 text-right w-40">Total</th>
                    <th className="pb-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="space-y-4">
                  {poItems.map((row, idx) => (
                    <tr key={idx} className="group">
                      <td className="py-2 px-2">
                         <input type="text" placeholder="Item Name..." className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-xs font-bold outline-none" />
                      </td>
                      <td className="py-2 px-2">
                         <input type="number" value={row.quantity} onChange={(e) => {
                           const list = [...poItems];
                           list[idx].quantity = e.target.value;
                           setPoItems(list);
                         }} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-xs font-bold text-center outline-none" />
                      </td>
                      <td className="py-2 px-2 text-left">
                         <input type="number" placeholder="0.00" onChange={(e) => {
                           const list = [...poItems];
                           list[idx].unit_price = e.target.value;
                           setPoItems(list);
                         }} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-xs font-bold text-center outline-none" />
                      </td>
                      <td className="py-2 px-2 text-right italic font-black text-slate-900 text-sm">
                        {(row.quantity * row.unit_price).toLocaleString()}
                      </td>
                      <td className="py-2 px-2">
                        <button onClick={() => removeItemRow(idx)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addItemRow} className="flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase tracking-widest hover:text-teal-700 bg-teal-50 px-6 py-3 rounded-xl transition-all">
                <Plus size={14}/> Add Another Item
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-12">
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Grand Total Estimate</p>
            <p className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">KES {calculateTotal().toLocaleString()}</p>
          </div>
          
          <div className="flex gap-4">
            {step === 2 && <button onClick={() => setStep(1)} className="px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Back</button>}
            
            <button 
              onClick={() => step === 1 ? setStep(2) : handleSubmit()}
              className="bg-[#020617] text-teal-400 px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-2xl shadow-slate-900/20 hover:scale-105 transition-all active:scale-95"
            >
              {step === 1 ? 'Next Step' : <><Send size={18}/> Issue Order</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePOModal;