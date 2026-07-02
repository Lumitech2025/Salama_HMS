import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const LabRequisitionsTab = () => {
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
    const fetchRequisitionHistory = async () => {
        setIsLoading(true);
        try {
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
            updated[index].sku = match.sku || 'No SKU';
            updated[index].cost = parseFloat(match.cost_per_unit) || 0;
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
    const handleSubmitRequisition = async (e) => {
        e.preventDefault();
        
        const validLines = basket.filter(b => b.inventory_item_id !== '');
        if (validLines.length === 0) return alert("Please specify at least one valid laboratory inventory item.");

        const missingReason = validLines.some(line => !line.reason.trim());
        if (missingReason) return alert("Please specify a justification reason for all selected items in the table.");

        setIsSubmitting(true);
        setApiError(null);

        const finalReasonPayload = validLines
            .map(i => `[${i.item_name}]: ${i.reason.trim()}`)
            .join(' | ');

        const payload = {
            dept: "LABORATORY",
            department: "LABORATORY",
            reason: finalReasonPayload, 
            items: validLines.map(line => ({
                inventory_item: line.inventory_item_id, 
                quantity: parseInt(line.quantity, 10) || 1, 
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
            alert("Laboratory Supply Requisition processed and committed to the hospital master ledger!");
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 font-sans antialiased text-slate-800">
            
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Lab Requisitions</h2>
                        <p className="text-sm text-slate-500 mt-1">Request laboratory reagents and equipment from the Main Store.</p>
                        {apiError && (
                            <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-md mt-2 text-sm font-semibold border border-rose-100">
                                <AlertCircle size={15} /> {apiError}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={addBasketLine}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-bold text-sm tracking-wide uppercase rounded-md hover:bg-teal-700 disabled:bg-slate-300 transition-colors cursor-pointer shadow-xs"
                    >
                        <Plus size={16} /> Add Item
                    </button>
                </div>

                <form onSubmit={handleSubmitRequisition} className="space-y-6">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        
                        <div className="grid grid-cols-12 gap-3 bg-slate-100/90 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                            <div className="col-span-4">Item Name / Product</div>
                            <div className="col-span-3">Justification / Reason</div>
                            <div className="col-span-2 text-center">SKU Reference</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-1 text-right">Unit Cost</div>
                            <div className="col-span-1"></div>
                        </div>

                        <div className="divide-y divide-slate-200 bg-white">
                            {basket.map((line, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-3 px-4 py-4 items-center hover:bg-slate-50/50 transition-colors">
                                    
                                    <div className="col-span-4">
                                        <select
                                            required
                                            disabled={isSubmitting}
                                            value={line.inventory_item_id}
                                            onChange={(e) => handleItemSelectionChange(idx, e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm shadow-inner focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-semibold text-slate-900"
                                        >
                                            <option value="">-- Choose Lab Item --</option>
                                            {inventoryItems.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} {item.strength ? `(${item.strength})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-3">
                                        <input
                                            type="text"
                                            required
                                            disabled={isSubmitting || !line.inventory_item_id}
                                            placeholder="Reason (e.g., Low stock)"
                                            value={line.reason}
                                            onChange={(e) => updateBasketLine(idx, 'reason', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium text-slate-900 placeholder-slate-400 disabled:bg-slate-50"
                                        />
                                    </div>

                                    <div className="col-span-2 text-center">
                                        <span className="font-mono bg-slate-100 px-1.5 py-1 rounded text-xs font-bold text-slate-700 block tracking-wide truncate mx-auto w-fit max-w-full">
                                            {line.sku || '---'}
                                        </span>
                                    </div>

                                    <div className="col-span-1">
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            disabled={isSubmitting || !line.inventory_item_id}
                                            value={line.quantity}
                                            onChange={(e) => updateBasketLine(idx, 'quantity', parseInt(e.target.value, 10) || 0)}
                                            className="w-full py-2 bg-white border border-slate-300 rounded-md text-sm font-bold text-center text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
                                        />
                                    </div>

                                    <div className="col-span-1 text-right">
                                        <span className="font-mono text-xs font-semibold text-slate-600 block">
                                            {Number(line.cost).toFixed(2)}
                                        </span>
                                        <span className="text-[9px] text-slate-400 block font-medium mt-0.5 whitespace-nowrap">
                                            Tot: {(Number(line.quantity) * Number(line.cost)).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="col-span-1 text-center">
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => removeBasketLine(idx)}
                                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md">
                        <div>
                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block">Estimated Gross Valuation</span>
                            <span className="text-3xl font-black tracking-tight text-teal-400">
                                KES {getBasketGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer disabled:bg-slate-700 disabled:text-slate-400"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={15} /> Processing...
                                </>
                            ) : (
                                <>
                                    <Send size={15} /> Submit Requisition
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col h-fit space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <h4 className="text-lg font-bold text-slate-900">Requisition Tracker</h4>
                    {isLoading && <Loader2 className="animate-spin text-teal-600" size={16} />}
                </div>

                <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
                    {historicalReqs.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8 font-medium">No active lab requisitions recorded for this period.</p>
                    ) : (
                        historicalReqs.map((req) => {
                            const displayTotal = req.total_cost || req.total || 0;
                            return (
                                <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 hover:border-slate-300 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">ID: REQ-{req.id}</span>
                                            <span className="text-base font-black text-slate-900">
                                                KES {Number(displayTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <span className={`text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1 border ${
                                            req.status === 'APPROVED' || req.status === 'FULFILLED'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : req.status === 'REJECTED'
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {(req.status === 'APPROVED' || req.status === 'FULFILLED') ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                            {req.status}
                                        </span>
                                    </div>

                                    <div className="text-sm text-slate-600 border-t border-slate-200/60 pt-2.5">
                                        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">
                                            <span>Requested At:</span>
                                            <span className="font-mono text-slate-600">
                                                {req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : req.date || '---'}
                                            </span>
                                        </div>
                                        <p className="mt-1 leading-relaxed text-slate-700 font-medium whitespace-pre-line">
                                            {req.reason}
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

export default LabRequisitionsTab;