import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const LabRequisitionsTab = () => {
    // Spreadsheet data tracking
    const [basket, setBasket] = useState([
        { item_name: '', quantity: 1, cost: 0, reason: '' }
    ]);
    
    // Live tracking states from Django API
    const [historicalReqs, setHistoricalReqs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);

    // Pre-populated suggestions
    const quickItems = [
        { name: 'Blood Collection Tubes (EDTA)', defaultCost: 450 },
        { name: 'Reagent Grade Ethanol 99%', defaultCost: 3200 },
        { name: 'Giemsa Stain Solution', defaultCost: 1850 },
        { name: 'Malaria Test Kits', defaultCost: 7500 },
        { name: 'Disposable Syringes 5ml', defaultCost: 1200 }
    ];

    // Helper to extract the authentication header safely
    const getAuthHeaders = () => {
        // MATCHED: Added the exact storage key variant found in your local storage lookup
        const token = 
            localStorage.getItem('access_token') || 
            localStorage.getItem('access') || 
            localStorage.getItem('salama_access_token') || 
            localStorage.getItem('token') || 
            localStorage.getItem('accessToken');

        console.log("HMS Debugger — Active Token Found:", token ? "YES (Prefixing Bearer)" : "NO TOKEN FOUND");

        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    // 1. FETCH HISTORICAL LEDGER ON MOUNT
    const fetchRequisitionHistory = async () => {
        setIsLoading(true);
        setApiError(null);
        try {
            const response = await fetch('/api/requisitions/?dept=LABORATORY', {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }

            const data = await response.json();
            // Expected DRF array wrapper check (handles both plain arrays or paginated setups)
            const records = Array.isArray(data) ? data : (data.results || []);
            setHistoricalReqs(records);
        } catch (err) {
            console.error("Ledger Fetch Exception:", err);
            setApiError("Could not retrieve real-time tracking history from backend.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequisitionHistory();
    }, []);

    const addBasketLine = () => {
        setBasket([...basket, { item_name: '', quantity: 1, cost: 0, reason: '' }]);
    };

    const updateBasketLine = (index, field, value) => {
        const updated = [...basket];
        updated[index][field] = value;

        if (field === 'item_name') {
            const matched = quickItems.find(i => i.name === value);
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

    // 2. POST DATA PATHWAY TO DJANGO LEDGER
    const handleSubmitRequisition = async (e) => {
        e.preventDefault();
        
        const validLines = basket.filter(b => b.item_name.trim() !== '');
        if (validLines.length === 0) return alert("Please specify at least one item name.");

        setIsSubmitting(true);
        setApiError(null);

        // Compile a primary reason string representing the general breakdown
        const centralReason = validLines.map(i => `${i.item_name} (x${i.quantity})`).join(', ');

        // Structure vector specifically tailored for RequisitionSerializer rules
        const payload = {
            dept: 'LABORATORY', 
            reason: centralReason.substring(0, 255), 
            items: validLines.map(line => ({
                non_inventory_title: line.item_name,
                quantity: parseInt(line.quantity),
                unit_price: parseFloat(line.cost || 0).toFixed(2)
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

            // Document added safely on backend ledger, clear layout basket state
            setBasket([{ item_name: '', quantity: 1, cost: 0, reason: '' }]);
            alert("Supply Requisition processed and committed to the hospital master ledger!");
            
            // Trigger auto-refresh to update ledger pipeline view UI
            await fetchRequisitionHistory();

        } catch (err) {
            console.error("Requisition Post Exception:", err);
            alert(`Operational Error: ${err.message}`);
            setApiError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 font-sans antialiased text-slate-800">
            
            {/* LEFT SIDE: Spreadsheet Data Entry Framework */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-slate-900">Lab Supply Requisition</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Key-in operational supply demands directly to finance ledger.</p>
                    </div>
                    <button
                        type="button"
                        onClick={addBasketLine}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold text-xs tracking-wide uppercase rounded-md hover:bg-teal-700 transition-colors cursor-pointer"
                    >
                        <Plus size={15} /> Add Item Line
                    </button>
                </div>

                {apiError && (
                    <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-100">
                        <AlertCircle size={16} />
                        <span>{apiError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmitRequisition} className="space-y-6">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        
                        {/* Spreadsheet Table Headers */}
                        <div className="grid grid-cols-12 gap-3 bg-slate-100/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                            <div className="col-span-4">Item Name</div>
                            <div className="col-span-2 text-center">Quantity</div>
                            <div className="col-span-2 text-right">Unit Cost</div>
                            <div className="col-span-3 pl-2">Reason / Justification</div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* Spreadsheet Input Grid Body */}
                        <div className="divide-y divide-slate-200 bg-white">
                            {basket.map((line, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-slate-50/50 transition-colors">
                                    
                                    {/* 1. Item Selection */}
                                    <div className="col-span-4">
                                        <input
                                            type="text"
                                            required
                                            list="quick-lab-items"
                                            placeholder="Type or select product..."
                                            value={line.item_name}
                                            onChange={(e) => updateBasketLine(idx, 'item_name', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-inner focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                                        />
                                        <datalist id="quick-lab-items">
                                            {quickItems.map((item, k) => (
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
                                            value={line.quantity}
                                            onChange={(e) => updateBasketLine(idx, 'quantity', parseInt(e.target.value) || 0)}
                                            className="w-full p-2 bg-white border border-slate-300 rounded-md text-sm text-center font-bold text-slate-900"
                                        />
                                    </div>

                                    {/* 3. Estimated Cost */}
                                    <div className="col-span-2 text-right">
                                        <div className="relative rounded-md shadow-xs">
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                placeholder="0"
                                                value={line.cost || ''}
                                                onChange={(e) => updateBasketLine(idx, 'cost', parseFloat(e.target.value) || 0)}
                                                className="w-full p-2 bg-white border border-slate-300 rounded-md text-sm text-right font-semibold text-slate-800"
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium block mt-1 pr-0.5">
                                            Sub: KES {(Number(line.quantity || 0) * Number(line.cost || 0)).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* 4. Justification Tracking */}
                                    <div className="col-span-3">
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g., Critical stock-out"
                                            value={line.reason}
                                            onChange={(e) => updateBasketLine(idx, 'reason', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-600 placeholder-slate-400"
                                        />
                                    </div>

                                    {/* Action Row Remove Button */}
                                    <div className="col-span-1 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeBasketLine(idx)}
                                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Grand Tally & API Trigger Button Panel */}
                    <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md">
                        <div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Estimated Gross Valuation</span>
                            <span className="text-2xl font-black tracking-tight text-teal-400">KES {getBasketGrandTotal().toLocaleString()}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={13} /> Processing...
                                </>
                            ) : (
                                <>
                                    <Send size={13} /> Submit Requisition
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* RIGHT SIDE: Real-Time Verification History Ledger */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col h-fit">
                <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                    <div>
                        <h4 className="text-base font-bold text-slate-900">Recent Tracking Ledger</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Real-time workflow progress pipeline.</p>
                    </div>
                    {isLoading && <Loader2 className="animate-spin text-teal-600" size={16} />}
                </div>

                <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1">
                    {historicalReqs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                            No recent lab requisitions recorded for this period.
                        </div>
                    ) : (
                        historicalReqs.map((req) => (
                            <div key={req.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:border-slate-300 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID: REQ-{req.id}</span>
                                        <span className="text-sm font-black text-slate-900">
                                            KES {parseFloat(req.total || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 border ${
                                        req.status === 'APPROVED' 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : req.status === 'REJECTED'
                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                        {req.status === 'APPROVED' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                        {req.status}
                                    </span>
                                </div>

                                <div className="text-xs text-slate-500 border-t border-slate-200/60 pt-2">
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">
                                        <span>Allocated Line Items:</span>
                                        <span>{req.date}</span>
                                    </div>
                                    <p className="line-clamp-2 leading-relaxed text-slate-700 font-medium">
                                        {req.itemSummary || req.reason}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
};

export default LabRequisitionsTab;