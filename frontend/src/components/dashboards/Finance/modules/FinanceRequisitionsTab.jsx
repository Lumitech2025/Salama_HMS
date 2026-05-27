import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Building2, 
    Search
} from 'lucide-react';

const FinanceRequisitionsTab = () => {
    // Pipeline data state arrays
    const [requisitions, setRequisitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDept, setFilterDept] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Performance Metrics trackers
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

    // Fetch incoming records pipeline from backend database instance
    const fetchRequisitions = async () => {
        try {
            setLoading(true);
            const res = await API.get('/requisitions/');
            
            // Handle both raw payloads or standard paginated structures safely
            const dataArray = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setRequisitions(dataArray);
            
            // Compute card data values dynamically from real runtime arrays
            const pending = dataArray.filter(r => r.status === 'PENDING').length;
            const approvedSum = dataArray.filter(r => r.status === 'APPROVED').reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
            const rejectedSum = dataArray.filter(r => r.status === 'REJECTED').reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
            
            setStats({ pending, approved: approvedSum, rejected: rejectedSum });
        } catch (err) {
            console.error("Failed to load clinical allocations channel", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequisitions();
        
        // Secondary safety execution thread: whenever finance lands here, 
        // flag pending items as viewed so the badge handles alerts logically
        const markItemsAsViewed = async () => {
            try {
                await API.post('/requisitions/mark-viewed/');
            } catch (e) {
                // Background operational silent pass execution block
            }
        };
        markItemsAsViewed();
    }, []);

    // Live Action Execution Pipeline Handlers
    const handleProcessRequest = async (id, newStatus) => {
        try {
            // Commit to underlying microservice architecture instances
            await API.patch(`/requisitions/${id}/`, { 
                status: newStatus,
                is_viewed_by_finance: true 
            });
            
            // Refresh local state arrays to enforce structural sync with Sidebar component streams
            fetchRequisitions();
        } catch (err) {
            console.error(`Failed to assign status mutation ${newStatus} on reference ${id}`, err);
            alert("Error committing status update. Please try again.");
        }
    };

    // Logical UI filtering arrays evaluation
    const filteredLedger = requisitions.filter(req => {
        // Map backend 'department' fields uniformly regardless of string casing variances
        const deptString = (req.dept || req.department || '').toUpperCase();
        const matchesDept = filterDept === 'ALL' || deptString === filterDept;
        
        const summary = (req.itemSummary || req.item_summary || req.description || '').toLowerCase();
        const reqId = String(req.id || '').toLowerCase();
        const matchesSearch = summary.includes(searchTerm.toLowerCase()) || reqId.includes(searchTerm.toLowerCase());
        
        return matchesDept && matchesSearch;
    });

    const getStatusStyle = (status) => {
        switch (status?.toUpperCase()) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    return (
        <div className="space-y-6 font-sans antialiased text-slate-800">
            
            {/* COMPACT HEADLINE BAR */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Requisition Hub</h2>
                
            </div>

            {/* REAL FINANCIAL BALANCE SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Clock size={20} /></div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Awaiting Review</span>
                        <span className="text-xl font-extrabold text-slate-900">{stats.pending} Requisitions </span>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle2 size={20} /></div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Approved Requisitions</span>
                        <span className="text-xl font-extrabold text-slate-900">
                            KES {stats.approved.toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center gap-4 shadow-xs">
                    <div className="p-3 bg-rose-50 rounded-xl text-rose-600"><XCircle size={20} /></div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Declined Requisitions</span>
                        <span className="text-xl font-extrabold text-slate-900">
                            KES {stats.rejected.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* FILTERS & CONTROL STRIP */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Department filtering toggles matching your infrastructure */}
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
                    {['ALL', 'NURSING', 'LABORATORY', 'PHARMACY', 'MARKETING'].map((dept) => (
                        <button
                            key={dept}
                            onClick={() => setFilterDept(dept)}
                            className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wide transition-colors cursor-pointer ${
                                filterDept === dept 
                                ? 'bg-slate-900 text-white shadow-xs' 
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            {dept}
                        </button>
                    ))}
                </div>

                {/* Input query field search box */}
                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search line descriptions or IDs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all"
                    />
                </div>
            </div>

            {/* REQUISITIONS CENTRAL CLEARING LEDGER TABLE */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Req ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source Origin</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details & Requestor</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Justification Reason</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Outlay</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Audit Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-24 text-center text-slate-400 font-medium text-sm italic">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Querying live clearing stream matrix...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLedger.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-24 text-center text-slate-400 font-medium text-sm italic">
                                        No requisitions matching selection found in financial pipeline.
                                    </td>
                                </tr>
                            ) : (
                                filteredLedger.map((req) => {
                                    const currentStatus = (req.status || 'PENDING').toUpperCase();
                                    return (
                                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                                            
                                            {/* Req ID */}
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold font-mono text-slate-600">
                                                #{req.id}
                                            </td>

                                            {/* Department Badge */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide border bg-slate-50 text-slate-700 border-slate-200 uppercase">
                                                    <Building2 size={11} className="text-slate-400" />
                                                    {req.dept || req.department || 'UNKNOWN'}
                                                </span>
                                            </td>

                                            {/* Item summary description & originator context */}
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="font-semibold text-slate-900 text-sm line-clamp-1">
                                                    {req.itemSummary || req.item_summary || req.description}
                                                </p>
                                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                                    By: {req.requestedBy || req.requested_by || 'Staff Item'} • {req.date || req.created_at || 'Recent'}
                                                </span>
                                            </td>

                                            {/* Procurement reason */}
                                            <td className="px-6 py-4 text-xs text-slate-600 font-medium max-w-xs truncate">
                                                {req.reason || req.justification || 'Standard procurement indent'}
                                            </td>

                                            {/* Total financial cost */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-900 text-sm">
                                                KES {(parseFloat(req.total) || 0).toLocaleString()}
                                            </td>

                                            {/* Status indicator badge */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(currentStatus)}`}>
                                                    {currentStatus === 'APPROVED' && <CheckCircle2 size={10} />}
                                                    {currentStatus === 'REJECTED' && <XCircle size={10} />}
                                                    {currentStatus === 'PENDING' && <Clock size={10} />}
                                                    {currentStatus}
                                                </span>
                                            </td>

                                            {/* Dynamic clearings review operations buttons */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {currentStatus === 'PENDING' ? (
                                                    <div className="flex justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleProcessRequest(req.id, 'APPROVED')}
                                                            className="px-3 py-1 bg-emerald-600 text-white rounded font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs focus:outline-none"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleProcessRequest(req.id, 'REJECTED')}
                                                            className="px-3 py-1 bg-rose-600 text-white rounded font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer shadow-xs focus:outline-none"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] font-mono text-slate-400 italic font-medium pr-2">Audited & Sealed</span>
                                                )}
                                            </td>

                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default FinanceRequisitionsTab;