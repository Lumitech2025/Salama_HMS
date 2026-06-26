import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const NurseRequisitionsTab = () => {
    // Core state matrices for basket handling - managed per inventory item matching pharmacy layout
    const [basket, setBasket] = useState([
        { inventory_item_id: '', name: '', strength: '', sku: '', dosage_form: '', quantity: 1, cost_per_unit: 0, reason: '' }
    ]);
    
    // Live tracking ledger connected to Salama Core API
    const [availableInventory, setAvailableInventory] = useState([]);
    const [historicalReqs, setHistoricalReqs] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState(null);

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

    // Fetch live nursing stock catalog from the master store backend
    const fetchMasterStoreInventory = async () => {
        try {
            const response = await fetch('/api/inventory/?department=NURSING', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error(`Inventory status fault: ${response.status}`);
            const data = await response.json();
            setAvailableInventory(data);
        } catch (err) {
            console.error("Master Store Connection Error:", err);
            setApiError("Failed to cache main store inventory items.");
        }
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
            const nursingData = data.filter(req => req.dept === 'NURSING' || req.department === 'NURSING');
            setHistoricalReqs(nursingData);
        } catch (err) {
            console.error("HMS Nursing Connectivity Error:", err);
            setApiError("Failed to synchronize tracking ledger with Salama Core API.");
            
            const savedHistory = localStorage.getItem('salama_nurse_req_history');
            if (savedHistory) setHistoricalReqs(JSON.parse(savedHistory));
        } finally {
            setIsLoading(false);
        }
    };

    // Synchronize workflow states on view component mount
    useEffect(() => {
        fetchMasterStoreInventory();
        fetchRequisitionHistory();
    }, []);

    const addBasketLine = () => {
        setBasket([...basket, { inventory_item_id: '', name: '', strength: '', sku: '', dosage_form: '', quantity: 1, cost_per_unit: 0, reason: '' }]);
    };

    const updateBasketLine = (index, field, value) => {
        const updated = [...basket];
        
        if (field === 'inventory_item_id') {
            const selectedItem = availableInventory.find(item => item.id.toString() === value.toString());
            if (selectedItem) {
                updated[index].inventory_item_id = selectedItem.id;
                updated[index].name = selectedItem.name;
                updated[index].strength = selectedItem.strength || 'N/A';
                updated[index].sku = selectedItem.sku || 'No SKU';
                updated[index].dosage_form = selectedItem.dosage_form || 'N/A';
                updated[index].cost_per_unit = parseFloat(selectedItem.cost_per_unit) || 0;
            } else {
                updated[index].inventory_item_id = '';
                updated[index].name = '';
                updated[index].strength = '';
                updated[index].sku = '';
                updated[index].dosage_form = '';
                updated[index].cost_per_unit = 0;
            }
        } else {
            updated[index][field] = value;
        }
        setBasket(updated);
    };

    const removeBasketLine = (index) => {
        if (basket.length === 1) {
            setBasket([{ inventory_item_id: '', name: '', strength: '', sku: '', dosage_form: '', quantity: 1, cost_per_unit: 0, reason: '' }]);
        } else {
            setBasket(basket.filter((_, i) => i !== index));
        }
    };

    const getBasketGrandTotal = () => {
        return basket.reduce((acc, curr) => acc + (Number(curr.quantity || 0) * Number(curr.cost_per_unit || 0)), 0);
    };

    const handleSubmitRequisition = async (e) => {
        e.preventDefault();
        
        const validLines = basket.filter(b => b.inventory_item_id !== '');
        if (validLines.length === 0) return alert("Please specify at least one valid ward supply item.");
        
        // Validation: Verify each row item has a filled-out reason column
        const missingReason = validLines.some(line => !line.reason.trim());
        if (missingReason) return alert("Please specify a justification reason for all selected items in the table.");

        setIsSubmitting(true);
        setApiError(null);

        // Concatenate all row reasons into a single narrative block for Django backend fallback tracking
        const finalReasonPayload = validLines
            .map(i => `[${i.name}]: ${i.reason.trim()}`)
            .join(' | ');

        const payload = {
            department: 'NURSING', 
            dept: 'NURSING',
            reason: finalReasonPayload, 
            items: validLines.map(line => ({
                inventory_item: line.inventory_item_id, 
                quantity: parseInt(line.quantity) || 1,
                unit_price: parseFloat(line.cost_per_unit).toFixed(2)
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

            setBasket([{ inventory_item_id: '', name: '', strength: '', sku: '', dosage_form: '', quantity: 1, cost_per_unit: 0, reason: '' }]);
            alert("Nursing Department Requisition submitted and recorded successfully!");
            await fetchRequisitionHistory();

        } catch (err) {
            console.error("Requisition Network Exception:", err);
            alert(`Operational Connection Failure: ${err.message}`);
            setApiError(err.message);
            
            // Fallback mode execution path to maintain service continuity in clinical zones
            const grandTotal = getBasketGrandTotal();
            const emergencyReq = {
                id: Math.floor(500 + Math.random() * 400),
                total: grandTotal,
                reason: finalReasonPayload,
                status: 'PENDING (OFFLINE)',
                date: new Date().toISOString().split('T')[0]
            };
            const updatedHistory = [emergencyReq, ...historicalReqs];
            setHistoricalReqs(updatedHistory);
            localStorage.setItem('salama_nurse_req_history', JSON.stringify(updatedHistory));
            setBasket([{ inventory_item_id: '', name: '', strength: '', sku: '', dosage_form: '', quantity: 1, cost_per_unit: 0, reason: '' }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 font-sans antialiased text-slate-800">
            
            {/* LEFT SIDE: Expanded Entry Spreadsheet Table Workspace */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight text-slate-900">Nursing Department Requisitions</h3>
                        <p className="text-sm text-slate-500 mt-1">Request stock replenishment directly from the Main Store catalog.</p>
                        {apiError && (
                            <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-md mt-2 text-sm font-semibold">
                                <AlertCircle size={15} /> {apiError}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={addBasketLine}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm tracking-wide uppercase rounded-md hover:bg-blue-700 disabled:bg-slate-300 transition-colors cursor-pointer shadow-xs"
                    >
                        <Plus size={16} /> Add Item
                    </button>
                </div>

                <form onSubmit={handleSubmitRequisition} className="space-y-6">
                    
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        {/* Upgraded Grid System: Separated SKU and Form Fields explicitly */}
                        <div className="grid grid-cols-12 gap-3 bg-slate-100/90 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                            <div className="col-span-3">Item Selection</div>
                            <div className="col-span-3">Justification / Reason</div>
                            <div className="col-span-1.5 text-center">SKU</div>
                            <div className="col-span-1 text-center">Form</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-1 text-right">Unit Price</div>
                            <div className="col-span-1 text-right">Total</div>
                            <div className="col-span-0.5"></div>
                        </div>

                        {/* Interactive Row Elements */}
                        <div className="divide-y divide-slate-200 bg-white">
                            {basket.map((line, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-3 px-4 py-4 items-center hover:bg-slate-50/50 transition-colors">
                                    
                                    {/* 1. Item Selection */}
                                    <div className="col-span-3">
                                        <select
                                            required
                                            disabled={isSubmitting}
                                            value={line.inventory_item_id}
                                            onChange={(e) => updateBasketLine(idx, 'inventory_item_id', e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm shadow-inner focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-900"
                                        >
                                            <option value="">-- Select Supply --</option>
                                            {availableInventory.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} {item.strength ? `(${item.strength})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 2. Row Justification Reason Input */}
                                    <div className="col-span-3">
                                        <input
                                            type="text"
                                            required
                                            disabled={isSubmitting || !line.inventory_item_id}
                                            placeholder="Reason (e.g., Ward stock low)"
                                            value={line.reason}
                                            onChange={(e) => updateBasketLine(idx, 'reason', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-slate-900 placeholder-slate-400 disabled:bg-slate-50"
                                        />
                                    </div>

                                    {/* 3. Isolated SKU Field */}
                                    <div className="col-span-1.5 text-center">
                                        <span className="font-mono bg-slate-100 px-1.5 py-1 rounded text-xs font-bold text-slate-700 block tracking-wide truncate mx-auto w-fit max-w-full">
                                            {line.sku || '---'}
                                        </span>
                                    </div>

                                    {/* 4. Isolated Form Field */}
                                    <div className="col-span-1 text-center">
                                        <span className="text-[11px] text-slate-600 font-bold uppercase tracking-tight block truncate">
                                            {line.dosage_form || '---'}
                                        </span>
                                    </div>

                                    {/* 5. Quantity Field */}
                                    <div className="col-span-1">
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            disabled={isSubmitting || !line.inventory_item_id}
                                            value={line.quantity}
                                            onChange={(e) => updateBasketLine(idx, 'quantity', parseInt(e.target.value) || 0)}
                                            className="w-full py-2 bg-white border border-slate-300 rounded-md text-sm font-bold text-center text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
                                        />
                                    </div>

                                    {/* 6. Unit Price Layout */}
                                    <div className="col-span-1 text-right font-mono text-xs font-semibold text-slate-600">
                                        {Number(line.cost_per_unit).toFixed(2)}
                                    </div>

                                    {/* 7. Dynamic Line Total */}
                                    <div className="col-span-1 text-right font-mono text-sm font-bold text-slate-900">
                                        {(Number(line.quantity || 0) * Number(line.cost_per_unit || 0)).toFixed(2)}
                                    </div>

                                    {/* Delete Action Wrapper */}
                                    <div className="col-span-0.5 text-center">
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

                    {/* Action Footer */}
                    <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md">
                        <div>
                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block">Total Valuation</span>
                            <span className="text-3xl font-black tracking-tight text-blue-400">KES {getBasketGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-3.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer disabled:bg-slate-700 disabled:text-slate-400"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" /> Submitting...
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

            {/* RIGHT SIDE: Status Monitoring Sidebar */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col h-fit space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <h4 className="text-lg font-bold text-slate-900">Requisition Status</h4>
                    {isLoading && <Loader2 size={16} className="animate-spin text-blue-600" />}
                </div>

                <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
                    {historicalReqs.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8 font-medium">No active nursing requisitions recorded for this period.</p>
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
                                        <p className="mt-1 leading-relaxed text-slate-700 font-medium whitespace-pre-line">
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