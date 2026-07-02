import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
    CheckCircle, Clock, Search, Loader2, Play, BarChart3 
} from 'lucide-react';

// FIXED: Parameters updated to match the parent Dashboard's explicit property pass
const RadiologistHome = ({ onSelectPatient, attendedSessionCount }) => {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]); 
    const [searchQuery, setSearchQuery] = useState('');
    
    const [stats, setStats] = useState({
        pendingScans: 0,
        completedToday: 0,
        totalScansVolume: 0,
    });

    const fetchImagingDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const resOrders = await API.get('/api/imaging-orders/?status=PENDING').catch(() => ({ data: [] }));
            const activeOrders = resOrders.data.results || resOrders.data || [];
            setOrders(activeOrders);

            const resAnalytics = await API.get('/api/imaging-orders/analytics/').catch(() => ({ data: {} }));
            const completedBackend = resAnalytics.data.completed_today || 0;
            const totalVolume = resAnalytics.data.total_scans_processed || 0;

            setStats({
                pendingScans: activeOrders.length,
                // FIXED: Using correctly bound attendedSessionCount reference here
                completedToday: completedBackend + attendedSessionCount, 
                totalScansVolume: totalVolume
            });

        } catch (err) {
            console.error("Radiology Dashboard Sync Error:", err);
        } finally {
            setLoading(false);
        }
    }, [attendedSessionCount]); // FIXED: Dependency array updated

    useEffect(() => {
        fetchImagingDashboard();
        const interval = setInterval(fetchImagingDashboard, 15000); 
        return () => clearInterval(interval);
    }, [fetchImagingDashboard]);

    const handleProcessScan = async (order) => {
        try {
            // FIXED: Calls parent method safely to set active state & flip active tab to 'diagnostics'
            if (onSelectPatient) {
                onSelectPatient(order);
            }
        } catch (err) {
            console.error("Order Access Error:", err);
        }
    };

    const filteredOrders = orders.filter(order => {
        const name = order.patient_name || "";
        const token = order.token_id || "";
        const recordNum = order.health_record_number || "";
        const selectedScans = (order.requested_imaging || []).join(" ");
        
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               token.toLowerCase().includes(searchQuery.toLowerCase()) ||
               selectedScans.toLowerCase().includes(searchQuery.toLowerCase()) ||
               recordNum.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-700 font-['Inter']">
            
            {/* 3-CARD RADIOLOGY KPI TIER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard label="Pending Scans" value={stats.pendingScans} icon={<Clock className="text-blue-600"/>} sub="Awaiting Execution" color="blue" />
                <KPICard label="Scans Completed Today" value={stats.completedToday} icon={<CheckCircle className="text-green-600"/>} sub="Results Dispatched" color="green" />
                <KPICard label="Total Imaging Volume" value={stats.totalScansVolume} icon={<BarChart3 className="text-purple-600"/>} sub="Lifetime Scans" color="purple" />
            </div>

            {/* SEARCH PIPELINE */}
            <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by Patient Name, Token ID, Health Record, or Scan Type..." 
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm" 
                    />
                </div>
            </div>

            {/* IMAGING WORKLIST TABLE */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-10">Incoming Patient</th>
                                <th className="p-10">Record Number</th>
                                <th className="p-10 text-center">Token ID</th>
                                <th className="p-10 text-center">Requested Procedures</th>
                                <th className="p-10 text-right pr-16">Workflow Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-40 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                        <Loader2 className="animate-spin text-blue-500 mx-auto mb-3" size={24} />
                                        Refreshing Scanning Queue...
                                    </td>
                                </tr>
                            ) : filteredOrders.length > 0 ? filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="px-10 py-8">
                                        <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{order.patient_name}</p>
                                        
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className="text-sm font-bold font-mono text-blue-600 bg-blue-50/50 border border-blue-100/70 px-3 py-1.5 rounded-lg">
                                            {order.health_record_number || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <span className="bg-slate-900 text-white px-4 py-2 rounded-xl font-mono font-bold shadow-lg group-hover:bg-blue-600 transition-colors">
                                            {order.token_id}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8 text-center max-w-xs">
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {(order.requested_imaging || []).map((scan, idx) => (
                                                <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-tight border border-slate-200">
                                                    {scan}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right pr-16">
                                        <button 
                                            onClick={() => handleProcessScan(order)} 
                                            className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ml-auto hover:bg-blue-600 transition-all shadow-xl"
                                        >
                                            Perform Scan <Play size={14} fill="currentColor"/>
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-40 text-center text-slate-300 italic font-black uppercase tracking-widest text-xs">
                                        {searchQuery ? "No imaging requests match your query filter" : "No pending diagnostic orders found"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ label, value, icon, sub, color }) => {
    const borderColors = {
        blue: 'hover:border-blue-500',
        green: 'hover:border-green-500',
        purple: 'hover:border-purple-500',
    };

    const textColors = {
        blue: 'text-blue-600',
        green: 'text-green-600',
        purple: 'text-purple-600',
    };

    const pulseColors = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
    };

    return (
        <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group transition-all ${borderColors[color] || 'hover:border-slate-500'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
            </div>
            <h4 className="text-4xl font-black text-slate-950 tracking-tighter italic">{value}</h4>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{label}</p>
            <p className={`text-[9px] font-black uppercase mt-3 flex items-center gap-2 ${textColors[color] || 'text-slate-600'}`}>
                <span className={`w-1 h-1 rounded-full animate-pulse ${pulseColors[color] || 'bg-slate-500'}`} /> {sub}
            </p>
        </div>
    );
};

export default RadiologistHome;