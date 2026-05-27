import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Clock, CheckCircle2, Loader2 } from 'lucide-react';

const NurseRequisitionsTab = () => {
    // Core state matrices for basket handling
    const [basket, setBasket] = useState([
        { item_name: '', quantity: 1, cost: 0, reason: '' }
    ]);
    
    // Live tracking ledger connected to Salama Core API
    const [historicalReqs, setHistoricalReqs] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState(null);

    // Pre-populated quick suggestions common to general ward and triage needs
    const commonWardItems = [
        { name: 'Surgical Gloves (Box of 100) - Medium', defaultCost: 850 },
        { name: 'Sterile Gauze Swabs 10cm x 10cm', defaultCost: 350 },
        { name: 'IV Cannula 22G (Blue)', defaultCost: 150 },
        { name: 'Normal Saline Infusion 0.9% (500ml)', defaultCost: 280 },
        { name: 'Adhesive Plasters / Zinc Oxide Tape', defaultCost: 400 },
        { name: 'Paracetamol 500mg Tablets (Pack)', defaultCost: 600 }
    ];

    // Extraction helper for the explicit 'access_token' layout variant
    const getAuthHeaders = () => {
        const token = 
            localStorage.getItem('access_token') || 
            localStorage.getItem('access') || 
            localStorage.getItem('salama_access_token') || 
            localStorage.getItem('token') || 
            localStorage.getItem('accessToken');

        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    // Fetch matching department transaction records directly from backend API
    const fetchRequisitionHistory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/requisitions/', {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`Fetch failure: ${response.status}`);
            
            const data = await response.json();
            // Filter records dynamically to display Nursing layouts
            const nursingData = data.filter(req => req.dept === 'NURSING' || req.department === 'NURSING');
            setHistoricalReqs(nursingData);
        } catch (err) {
            console.error("HMS Core Connectivity Error:", err);
            setApiError("Failed to synchronize tracking ledger with Salama Core API.");
            
            // Graceful fallback to local cache if offline or server recycling
            const savedHistory = localStorage.getItem('salama_nurse_req_history');
            if (savedHistory) setHistoricalReqs(JSON.parse(savedHistory));
        } finally {
            setIsLoading(false);
        }
    };

    // Synchronize workflow states on view component mount
    useEffect(() => {
        fetchRequisitionHistory();
    }, []);

    const addBasketLine = () => {
        setBasket([...basket, { item_name: '', quantity: 1, cost: 0, reason: '' }]);
    };

    const updateBasketLine = (index, field, value) => {
        const updated = [...basket];
        updated[index][field] = value;

        // Automatically fill unit cost if a predefined item name is selected
        if (field === 'item_name') {
            const matched = commonWardItems.find(i => i.name === value);
            if (matched) {
                updated[index].cost = matched.defaultCost;
            }
        }
        setBasket(updated);
    };

    const removeBasketLine = (index) => {
        if (basket.length === 1) {
            setBasket([{ item_name: '', quantity: 1, cost: 0, reason: '' }]);
        } else {
            setBasket(basket.filter((_, i) => i !== index));
        }
    };

    const getBasketGrandTotal = () => {
        return basket.reduce((acc, curr) => acc + (Number(curr.quantity || 0) * Number(curr.cost || 0)), 0);
    };

    const handleSubmitRequisition = async (e) => {
        e.preventDefault();
        
        const validLines = basket.filter(b => b.item_name.trim() !== '');
        if (validLines.length === 0) return alert("Please specify at least one ward item name.");

        setIsSubmitting(true);
        setApiError(null);

        // Aggregate primary descriptive text string for the master record summary
        const centralReason = validLines.map(i => `${i.item_name} (x${i.quantity})`).join(', ');

        // Payload structural vector matching the RequisitionSerializer constraints
        const payload = {
            dept: 'NURSING', 
            reason: centralReason.substring(0, 255), 
            items: validLines.map(line => ({
                non_inventory_title: line.item_name,
                quantity: parseInt(line.quantity) || 1,
                unit_price: parseFloat(line.cost || 0).toFixed(2) // Maps line.cost to writable backend field
            }))
        };

        try {
            const response = await fetch('/api/requisitions/', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Submission failed with status ${response.status}`);
            }

            // Reset operational view state rows on successful ledger confirmation
            setBasket([{ item_name: '', quantity: 1, cost: 0, reason: '' }]);
            alert("Nurse Ward Requisition submitted and logged successfully!");
            
            // Force interface refresh from the live database
            await fetchRequisitionHistory();

        } catch (err) {
            console.error("Requisition Network Exception:", err);
            alert(`Operational Connection Failure: ${err.message}`);
            setApiError(err.message);
            
            // Emergency fallback execution path to maintain service continuity in clinical zones
            const grandTotal = getBasketGrandTotal();
            const emergencyReq = {
                id: Math.floor(500 + Math.random() * 400),
                total: grandTotal,
                itemSummary: centralReason,
                status: 'PENDING (OFFLINE)',
                date: new Date().toISOString().split('T')[0]
            };
            const updatedHistory = [emergencyReq, ...historicalReqs];
            setHistoricalReqs(updatedHistory);
            localStorage.setItem('salama_nurse_req_history', JSON.stringify(updatedHistory));
            setBasket([{ item_name: '', quantity: 1, cost: 0, reason: '' }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 font-sans antialiased text-slate-800">
            
            {/* LEFT SIDE: Clean 4-Column Entry Spreadsheet */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-slate-900">Nursing Department Requisitions</h3>
                        {apiError && <p className="text-xs font-semibold text-rose-600 mt-1">{apiError}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={addBasketLine}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold text-xs tracking-wide uppercase rounded-md hover:bg-blue-700 disabled:bg-slate-300 transition-colors cursor-pointer"
                    >
                        <Plus size={15} /> Add Item
                    </button>
                </div>

                <form onSubmit={handleSubmitRequisition} className="space-y-6">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        
                        {/* Column Structure Header */}
                        <div className="grid grid-cols-12 gap-3 bg-slate-100/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                            <div className="col-span-4">Item Specification</div>
                            <div className="col-span-2 text-center">Quantity</div>
                            <div className="col-span-2 text-right">Est. Unit Cost</div>
                            <div className="col-span-3 pl-2">Reason</div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* Layout Row Entry Blocks */}
                        <div className="divide-y divide-slate-200 bg-white">
                            {basket.map((line, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-slate-50/50 transition-colors">
                                    
                                    {/* 1. Item Name Input with quick data-list options */}
                                    <div className="col-span-4">
                                        <input
                                            type="text"
                                            required
                                            disabled={isSubmitting}
                                            list="quick-nurse-items"
                                            placeholder="Type item name or search list..."
                                            value={line.item_name}
                                            onChange={(e) => updateBasketLine(idx, 'item_name', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-inner focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                                        />
                                        <datalist id="quick-nurse-items">
                                            {commonWardItems.map((item, k) => (
                                                <option key={k} value={item.name} />
                                            ))}
                                        </datalist>
                                    </div>

                                    {/* 2. Quantity */}
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            disabled={isSubmitting}
                                            value={line.quantity}
                                            onChange={(e) => updateBasketLine(idx, 'quantity', parseInt(e.target.value) || 0)}
                                            className="w-full p-2 bg-white border border-slate-300 rounded-md text-sm text-center font-bold text-slate-900"
                                        />
                                    </div>

                                    {/* 3. Cost */}
                                    <div className="col-span-2 text-right">
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            disabled={isSubmitting}
                                            placeholder="0"
                                            value={line.cost || ''}
                                            onChange={(e) => updateBasketLine(idx, 'cost', parseFloat(e.target.value) || 0)}
                                            className="w-full p-2 bg-white border border-slate-300 rounded-md text-sm text-right font-semibold text-slate-800"
                                        />
                                        <span className="text-[10px] text-slate-400 font-medium block mt-1 pr-0.5">
                                            Total: KES {(Number(line.quantity || 0) * Number(line.cost || 0)).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* 4. Reason */}
                                    <div className="col-span-3">
                                        <input
                                            type="text"
                                            required
                                            disabled={isSubmitting}
                                            placeholder="e.g., Ward stock depleted"
                                            value={line.reason}
                                            onChange={(e) => updateBasketLine(idx, 'reason', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-600 placeholder-slate-400"
                                        />
                                    </div>

                                    {/* Remove Line */}
                                    <div className="col-span-1 text-center">
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => removeBasketLine(idx)}
                                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Summary Action Panel */}
                    <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md">
                        <div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Cost</span>
                            <span className="text-2xl font-black tracking-tight text-blue-400">KES {getBasketGrandTotal().toLocaleString()}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer disabled:bg-slate-700 disabled:text-slate-400"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={13} className="animate-spin" /> Processing...
                                </>
                            ) : (
                                <>
                                    <Send size={13} /> Submit Request
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* RIGHT SIDE: Ward Tracking Ledger */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col h-fit">
                <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                    <h4 className="text-base font-bold text-slate-900">Requisition Status</h4>
                    {isLoading && <Loader2 size={14} className="animate-spin text-blue-600" />}
                </div>

                <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1">
                    {historicalReqs.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 font-medium">No active ward requisitions recorded for this period.</p>
                    ) : (
                        historicalReqs.map((req) => {
                            // Support both API payload variants (total vs total_cost or raw number mapping)
                            const displayTotal = req.total_cost || req.total || 0;
                            return (
                                <div key={req.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:border-slate-300 transition-colors">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID: REQ-{req.id}</span>
                                            <span className="text-sm font-black text-slate-900">
                                                KES {Number(displayTotal).toLocaleString()}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 border ${
                                            req.status === 'APPROVED' 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {req.status === 'APPROVED' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                            {req.status}
                                        </span>
                                    </div>

                                    <div className="text-xs text-slate-500 border-t border-slate-200/60 pt-2">
                                        <span className="font-bold block text-[10px] text-slate-400 uppercase tracking-wide">Requested Line Items:</span>
                                        <p className="line-clamp-2 mt-0.5 leading-relaxed text-slate-700 font-medium">
                                            {req.itemSummary || req.reason}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

        </div>
    );
};

export default NurseRequisitionsTab;