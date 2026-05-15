import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  CheckCircle, XCircle, Search, 
  Clock, Package, Tag, Landmark, FileText 
} from 'lucide-react';

const RequisitionHub = () => {
    const [requisitions, setRequisitions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReqs();
    }, []);

    const fetchReqs = async () => {
        try {
            const res = await API.get('/requisitions/');
            // We assume the backend serializer returns 'items' nested within each requisition
            setRequisitions(res.data.results || res.data);
        } catch (err) {
            console.error("Failed to load requisitions", err);
        }
    };

    const handleAction = async (id, status) => {
        try {
            await API.patch(`/requisitions/${id}/`, { 
                status: status, 
                is_viewed_by_finance: true 
            });
            fetchReqs();
        } catch (err) {
            alert("Action failed. Check permissions.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
            
            {/* Header Area */}
            <div className="flex justify-between items-end">
                <div className="text-left">
                    <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
                        Approval <span className="text-teal-600">Pipeline</span>
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
                        Real-time Departmental Requisitions
                    </p>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                        type="text" 
                        placeholder="Filter by Department or Item..." 
                        className="pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none shadow-sm w-80 focus:ring-2 ring-teal-500/20"
                    />
                </div>
            </div>

            {/* Flattened Requisition Table */}
            <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                            <th className="p-8 px-10">Department</th>
                            <th className="p-8">Product Details</th>
                            <th className="p-8 text-center">Qty</th>
                            <th className="p-8">Unit / Total Cost</th>
                            <th className="p-8 w-64">Justification</th>
                            <th className="p-8 text-right px-10">Decision</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {requisitions.map((req) => (
                            // Mapping through individual items within the requisition
                            req.items?.map((item, idx) => (
                                <tr key={`${req.id}-${idx}`} className={`group hover:bg-slate-50/50 transition-all ${!req.is_viewed_by_finance ? 'bg-teal-50/20' : ''}`}>
                                    
                                    {/* Department */}
                                    <td className="p-8 px-10">
                                        <div className="flex items-center gap-3">
                                            {!req.is_viewed_by_finance && idx === 0 && <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />}
                                            <div>
                                                <p className="font-black text-slate-900 uppercase italic text-sm">{req.department}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Ref: REQ-{req.id}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Product Name */}
                                    <td className="p-8">
                                        <p className="font-black text-slate-800 uppercase italic text-xs">{item.item_name}</p>
                                        <div className="flex items-center gap-1 mt-1 text-slate-400">
                                            <Tag size={10} />
                                            <span className="text-[9px] font-bold uppercase">SKU: {item.item_sku || 'ONC-DRG'}</span>
                                        </div>
                                    </td>

                                    {/* Quantity */}
                                    <td className="p-8 text-center font-black text-slate-900 italic text-sm">
                                        {item.quantity}
                                    </td>

                                    {/* Cost */}
                                    <td className="p-8">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Total</p>
                                        <p className="font-black text-slate-900 italic text-base tracking-tighter">
                                            KES {Number(item.line_total).toLocaleString()}
                                        </p>
                                    </td>

                                    {/* Justification */}
                                    <td className="p-8">
                                        <p className="text-[11px] font-bold text-slate-600 italic leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                            "{req.reason}"
                                        </p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mt-2 italic">- {req.requested_by_name}</p>
                                    </td>

                                    {/* Decision */}
                                    <td className="p-8 text-right px-10">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button 
                                                onClick={() => handleAction(req.id, 'APPROVED')}
                                                className="flex items-center gap-2 px-5 py-3 bg-teal-50 text-teal-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <CheckCircle size={14} /> Approve
                                            </button>
                                            <button 
                                                onClick={() => handleAction(req.id, 'REJECTED')}
                                                className="flex items-center gap-2 px-5 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <XCircle size={14} /> Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ))}
                    </tbody>
                </table>
                
                {requisitions.length === 0 && (
                    <div className="p-40 text-center">
                        <Package className="mx-auto text-slate-100 mb-4" size={64} />
                        <p className="text-slate-300 font-black uppercase italic tracking-[0.5em]">No Pending Requisitions</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequisitionHub;