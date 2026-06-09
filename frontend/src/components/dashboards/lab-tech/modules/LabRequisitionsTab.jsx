import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const LabRequisitionsTab = () => {
    // Spreadsheet state initialized with inventory pointers
    const [basket, setBasket] = useState([
        { inventory_item_id: '', item_name: '', sku: '', quantity: 1, cost: 0, reason: '' }
    ]);
    
    const [inventoryItems, setInventoryItems] = useState([]);
    const [historicalReqs, setHistoricalReqs] = useState([]);
    const [isInventoryLoading, setIsInventoryLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);

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

    // 1. FETCH LAB FILTERED INVENTORY
    const fetchLabInventory = async () => {
        setIsInventoryLoading(true);
        try {
            const response = await fetch('/api/inventory/?department=LAB', {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`Inventory API returned status ${response.status}`);
            
            const data = await response.json();
            const records = Array.isArray(data) ? data : (data.results || []);
            setInventoryItems(records);
        } catch (err) {
            console.error("Inventory Fetch Exception:", err);
            setApiError("Could not retrieve real-time Lab Inventory logs.");
        } finally {
            setIsInventoryLoading(false);
        }
    };

    // 2. FETCH HISTORICAL REQUISITION LEDGER
    const fetchRequisitionHistory = async () => {
        setIsLoading(true);
        try {
            // ALIGNED: Fixed parameter key from '?dept=LAB' to '?department=LAB' to match backend configuration
            const response = await fetch('/api/requisitions/?department=LAB', {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`Server returned status ${response.status}`);

            const data = await response.json();
            const records = Array.isArray(data) ? data : (data.results || []);
            setHistoricalReqs(records);
        } catch (err) {
            console.error("Ledger Fetch Exception:", err);
            setApiError("Could not retrieve tracking history from backend.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLabInventory();
        fetchRequisitionHistory();
    }, []);

    const addBasketLine = () => {
        setBasket([...basket, { inventory_item_id: '', item_name: '', sku: '', quantity: 1, cost: 0, reason: '' }]);
    };

    // 3. CAPTURE SELECTION CHANGES AND RESOLVE SKU/NAME
    const handleItemSelectionChange = (index, selectedId) => {
        const updated = [...basket];
        
        if (!selectedId) {
            updated[index] = { inventory_item_id: '', item_name: '', sku: '', quantity: 1, cost: 0, reason: '' };
            setBasket(updated);
            return;
        }

        const match = inventoryItems.find(item => String(item.id) === String(selectedId));
        if (match) {
            updated[index].inventory_item_id = match.id;
            updated[index].item_name = match.name;
            updated[index].sku = match.sku || 'N/A';
            updated[index].cost = match.cost_per_unit || 0;
        }
        setBasket(updated);
    };

    const updateBasketLine = (index, field, value) => {
        const updated = [...basket];
        updated[index][field] = value;
        setBasket(updated);
    };

    const removeBasketLine = (index) => {
        if (basket.length === 1) {
            setBasket([{ inventory_item_id: '', item_name: '', sku: '', quantity: 1, cost: 0, reason: '' }]);
        } else {
            setBasket(basket.filter((_, i) => i !== index));
        }
    };

    const getBasketGrandTotal = () => {
        return basket.reduce((acc, curr) => acc + (Number(curr.quantity || 0) * Number(curr.cost || 0)), 0);
    };

    // 4. SUBMIT REQUISITIONpayload MATCHING NEW REQUISITIONITEM LOGIC
    const handleSubmitRequisition = async (e) => {
        e.preventDefault();
        
        const validLines = basket.filter(b => b.inventory_item_id !== '');
        if (validLines.length === 0) return alert("Please specify at least one valid inventory item.");

        setIsSubmitting(true);
        setApiError(null);

        // Include item names and SKUs inside central ledger overview summary field string
        const centralReason = validLines.map(i => `${i.item_name} [${i.sku}] (x${i.quantity})`).join(', ');

        const payload = {
            dept: "LABORATORY",
            reason: centralReason.substring(0, 255), 
            items: validLines.map(line => ({
                inventory_item: line.inventory_item_id, 
                quantity: parseInt(line.quantity, 10) || 1, // Defensive fallback to prevent NaN submissions
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

            setBasket([{ inventory_item_id: '', item_name: '', sku: '', quantity: 1, cost: 0, reason: '' }]);
            alert("Lab Supply Requisition processed and committed to the hospital master ledger!");
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
            
            {/* LEFT SIDE: Entry Grid Framework */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Lab Requisition</h2>
                        
                    </div>
                    <button
                        type="button"
                        onClick={addBasketLine}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold text-xs tracking-wide uppercase rounded-md hover:bg-teal-700 transition-colors cursor-pointer"
                    >
                        <Plus size={15} /> Add Item
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
                        
                        {/* Table Headers with SKU references */}
                        <div className="grid grid-cols-12 gap-3 bg-slate-100/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                            <div className="col-span-4">Item Name / Product</div>
                            <div className="col-span-2">SKU Reference</div>
                            <div className="col-span-2 text-center">Quantity</div>
                            <div className="col-span-1 text-right">Unit Cost</div>
                            <div className="col-span-2 pl-2">Justification</div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* Input Grid Body */}
                        <div className="divide-y divide-slate-200 bg-white">
                            {basket.map((line, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-slate-50/50 transition-colors">
                                    
                                    {/* 1. Aligned Dropdown Selector */}
                                    <div className="col-span-4">
                                        <select
                                            required
                                            value={line.inventory_item_id}
                                            onChange={(e) => handleItemSelectionChange(idx, e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                                            disabled={isInventoryLoading}
                                        >
                                            <option value="">-- Choose Lab Item --</option>
                                            {inventoryItems.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} {item.strength ? `(${item.strength})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 2. SKU Display Indicator */}
                                    <div className="col-span-2 text-xs font-mono text-slate-500 bg-slate-100 p-2 rounded-md border border-slate-200 text-center truncate">
                                        {line.sku || '---'}
                                    </div>

                                    {/* 3. Quantity Input */}
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={line.quantity}
                                            onChange={(e) => updateBasketLine(idx, 'quantity', parseInt(e.target.value, 10) || 0)}
                                            className="w-full p-2 bg-white border border-slate-300 rounded-md text-sm text-center font-bold text-slate-900"
                                        />
                                    </div>

                                    {/* 4. Cost Tally Snapshot Field */}
                                    <div className="col-span-1 text-right">
                                        <span className="text-sm font-semibold text-slate-700 block">
                                            {window.intl ? new Intl.NumberFormat().format(line.cost) : Number(line.cost).toLocaleString()}
                                        </span>
                                        <span className="text-[9px] text-slate-400 block font-medium mt-0.5">
                                            Total: {window.intl ? new Intl.NumberFormat().format(Number(line.quantity) * Number(line.cost)) : (Number(line.quantity) * Number(line.cost)).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* 5. Reason Tracking */}
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Stock refill"
                                            value={line.reason}
                                            onChange={(e) => updateBasketLine(idx, 'reason', e.target.value)}
                                            className="w-full px-2 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-600"
                                        />
                                    </div>

                                    {/* Line item removal handler */}
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

                    {/* Submit Bar Display */}
                    <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md">
                        <div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Estimated Gross Valuation</span>
                            <span className="text-2xl font-black tracking-tight text-teal-400">KES {window.intl ? new Intl.NumberFormat().format(getBasketGrandTotal()) : getBasketGrandTotal().toLocaleString()}</span>
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

            {/* RIGHT SIDE: History Tracking Pipeline */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col h-fit">
                <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                    <div>
                        <h4 className="text-base font-bold text-slate-900">Requisition Tracker</h4>
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
                                            KES {window.intl ? new Intl.NumberFormat().format(parseFloat(req.total_cost || req.total || 0)) : parseFloat(req.total_cost || req.total || 0).toLocaleString()}
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
                                        <span>Requested At:</span>
                                        <span className="font-mono text-slate-600">
                                            {req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : req.date || '---'}
                                        </span>
                                    </div>
                                    <p className="line-clamp-2 leading-relaxed text-slate-700 font-medium">
                                        {req.reason}
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