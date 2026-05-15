import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { CheckCircle, XCircle, Eye, Filter, Search } from 'lucide-react';

const RequisitionHub = () => {
    const [requisitions, setRequisitions] = useState([]);

    const fetchReqs = async () => {
        const res = await API.get('/requisitions/');
        setRequisitions(res.data.results || res.data);
    };

    const handleAction = async (id, status) => {
        await API.patch(`/requisitions/${id}/`, { status: status, is_viewed_by_finance: true });
        fetchReqs();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Requisition <span className="text-teal-600">Hub</span></h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Departmental Procurement Requests</p>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                            <th className="p-8">ID & Department</th>
                            <th className="p-8">Requested By</th>
                            <th className="p-8">Items</th>
                            <th className="p-8">Total Cost</th>
                            <th className="p-8 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {requisitions.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-all group">
                                <td className="p-8 italic font-black text-slate-900">
                                    REQ-{req.id}
                                    <div className="text-[9px] text-teal-600 tracking-widest uppercase">{req.department}</div>
                                </td>
                                <td className="p-8 font-bold text-slate-600 text-sm">
                                    {req.requested_by_name}
                                    <div className="text-[10px] text-slate-400 font-medium">{new Date(req.created_at).toLocaleDateString()}</div>
                                </td>
                                <td className="p-8 max-w-xs">
                                    <p className="text-xs font-bold text-slate-800 line-clamp-1 italic">"{req.reason}"</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Multi-item request</p>
                                </td>
                                <td className="p-8 font-black text-slate-900 italic">KES {req.total_cost.toLocaleString()}</td>
                                <td className="p-8 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleAction(req.id, 'APPROVED')} className="p-3 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-600 hover:text-white transition-all">
                                            <CheckCircle size={18} />
                                        </button>
                                        <button onClick={() => handleAction(req.id, 'REJECTED')} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RequisitionHub;