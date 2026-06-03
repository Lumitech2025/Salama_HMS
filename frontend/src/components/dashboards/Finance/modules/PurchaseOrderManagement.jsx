import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  FileSpreadsheet, Plus, FileText, Send, X, Save, 
  Trash2, ShoppingBag, Eye, CheckCircle2, AlertTriangle, 
  Clock, DollarSign, Users, ChevronDown, Upload, FileCheck, Mail, Calendar
} from 'lucide-react';

const DEPARTMENTS = ['ALL', 'NURSING', 'PHARMACY', 'RADIOLOGY', 'LAB', 'MARKETING', 'ADMIN'];
const MASTER_TABS = [
  { id: 'POS', name: '1. Purchase Orders' },
  { id: 'GRNS', name: '2. Goods Received Notes (GRN)' },
  { id: 'INVOICES', name: '3. Bills & Invoices' },
  { id: 'VOUCHERS', name: '4. Payments Made' }
];


export default function PurchaseOrderManagement({ prefilledData, clearPrefilledData }) {

  // Navigation State
  const [currentMasterTab, setCurrentMasterTab] = useState('POS');
  const [activeTab, setActiveTab] = useState('ALL');

  // Core Data State
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // UI Controls
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const [catalog, setCatalog] = useState([]);

  // File Upload State
  const [attachedFile, setAttachedFile] = useState(null);

  // Form States
  const [poForm, setPoForm] = useState({
    supplier: '', payment_terms: 'Net 30', delivery_date: '', notes: '',
    items: [{ item_name: '', quantity: 1, unit_cost: 0, category: 'PHARMACY' }]
  });

  const [grnForm, setGrnForm] = useState({
    purchase_order: '',
    delivery_note_ref: '',
    date_received: new Date().toISOString().split('T')[0],
    items_received: []
  });

  const [invoiceForm, setInvoiceForm] = useState({
    purchase_order: '', invoice_number: '', total_billed: 0, due_date: '', tax_withheld: 0
  });

  const [voucherForm, setVoucherForm] = useState({
    purchase_order: '', purchase_invoice: '', payment_reference: '', amount_paid: 0, payment_mode: 'Bank Wire'
  });

  // Helper config to fetch Authorization headers cleanly on the fly
  const getAuthConfig = () => {
    const token = localStorage.getItem('access_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  useEffect(() => {
    API.get('/inventory-items/unique-catalog/')
        .then(res => setCatalog(res.data))
        .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchGRNs();
    fetchInvoices();
    fetchVouchers();
  }, []);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const response = await API.get('/purchase-orders/', getAuthConfig());
      setPurchaseOrders(response.data || []);
    } catch (err) { 
      console.error("Error loading purchase orders:", err);
      setPurchaseOrders([]);
    } finally { setLoading(false); }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await API.get('/suppliers/', getAuthConfig());
      setSuppliers(response.data || []);
    } catch (err) { 
      console.error("Error loading suppliers:", err); 
      setSuppliers([]);
    }
  };

  const fetchGRNs = async () => {
    try {
      const response = await API.get('/goods-received-notes/', getAuthConfig());
      setGrns(response.data || []);
    } catch (err) { 
      console.error("Error loading GRNs:", err);
      setGrns([]); 
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await API.get('/purchase-invoices/', getAuthConfig());
      setInvoices(response.data || []);
    } catch (err) { 
      console.error("Error loading invoices:", err);
      setInvoices([]); 
    }
  };

  const fetchVouchers = async () => {
    try {
      const response = await API.get('/payment-vouchers/', getAuthConfig());
      setVouchers(response.data || []);
    } catch (err) { 
      console.error("Error loading vouchers:", err);
      setVouchers([]); 
    }
  };

  // Watch PO selection in GRN Form to populate physical items
  useEffect(() => {
    if (grnForm.purchase_order) {
      const selectedOrder = purchaseOrders.find(p => p.id === parseInt(grnForm.purchase_order));
      if (selectedOrder && selectedOrder.items) {
        const itemsForGrn = selectedOrder.items.map(item => ({
          item_name: item.item_name,
          ordered_quantity: item.quantity,
          quantity_received: item.quantity, 
          damaged_quantity: 0,
          expiry_date: '',
          satisfaction_level: 'GoodCondition',
          category: item.category
        }));
        setGrnForm(prev => ({ ...prev, items_received: itemsForGrn }));
      }
    } else {
      setGrnForm(prev => ({ ...prev, items_received: [] }));
    }
  }, [grnForm.purchase_order, purchaseOrders]);

  useEffect(() => {
    if (!prefilledData) return;

    // 1. Force the active tab workspace and form popup modal to display
    setShowCreateModal(true);
    setCurrentMasterTab('POS');

    let parsedItems = [];

    // 2. Parse structural branch choices built directly in your Python data models
    if (prefilledData.department === 'MARKETING' && prefilledData.marketing_meta) {
      const meta = prefilledData.marketing_meta;
      parsedItems.push({
        item_name: `Campaign Outreach Support: ${meta.category_display || meta.category || 'Services'}`,
        category: 'MARKETING',
        quantity: 1,
        unit_cost: parseFloat(meta.requested_amount || prefilledData.total_cost || 0)
      });
    } else if (prefilledData.items && prefilledData.items.length > 0) {
      parsedItems = prefilledData.items.map(lineItem => {
        let resolvedName = lineItem.non_inventory_title || 'Unspecified Line Item';
        
        if (lineItem.pharmacy_item && typeof lineItem.pharmacy_item === 'object') {
          resolvedName = lineItem.pharmacy_item.name || resolvedName;
        } else if (lineItem.lab_item && typeof lineItem.lab_item === 'object') {
          resolvedName = lineItem.lab_item.name || resolvedName;
        }

        return {
          item_name: resolvedName,
          category: prefilledData.department, 
          quantity: parseInt(lineItem.quantity || 1),
          unit_cost: parseFloat(lineItem.unit_price || 0)
        };
      });
    } else {
      parsedItems.push({
        item_name: `Balance Fulfillment for Request Ref: REQ-${prefilledData.id}`,
        category: prefilledData.department || 'ADMIN',
        quantity: 1,
        unit_cost: parseFloat(prefilledData.total_cost || 0)
      });
    }

    // 3. Drop data straight into your working poForm state fields seamlessly
    setPoForm({
      supplier: '', 
      payment_terms: 'Net 30',
      delivery_date: '',
      notes: `Linked automatically to origin system record: REQ-${prefilledData.id}. Reason: ${prefilledData.reason || ''}`,
      items: parsedItems,
      origin_requisition_id: prefilledData.id 
    });

    // 4. Safely release the pointer state on the portal container layout wrapper
    if (clearPrefilledData) clearPrefilledData();
  }, [prefilledData]);


  const handleEmailNotification = (docType, docNumber) => {
    alert(`Email Notification:\nA copy of ${docType} (${docNumber}) has been sent to the vendor.`);
  };

  const handleFileUpload = (e) => {
    if (e.target.files.length > 0) {
      setAttachedFile(e.target.files[0]);
    }
  };

  // PO Table Rows handlers
  const handleAddItemRow = () => {
    setPoForm(prev => ({
      ...prev,
      items: [...prev.items, { item_name: '', quantity: 1, unit_cost: 0, category: activeTab !== 'ALL' ? activeTab : 'PHARMACY' }]
    }));
  };

  const handleRemoveItemRow = (index) => {
    const updatedItems = [...poForm.items];
    updatedItems.splice(index, 1);
    setPoForm(prev => ({ ...prev, items: updatedItems }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...poForm.items];
    updatedItems[index][field] = value;
    setPoForm(prev => ({ ...prev, items: updatedItems }));
  };

  // GRN dynamic item fields value adjustments
  const handleGrnItemChange = (index, field, value) => {
    const updatedItems = [...grnForm.items_received];
    updatedItems[index][field] = value;
    setGrnForm(prev => ({ ...prev, items_received: updatedItems }));
  };

  const calculatePOTotal = () => {
    return poForm.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  // Form Actions Handlers
  const handlePOSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        supplier: poForm.supplier,
        payment_terms: poForm.payment_terms,
        delivery_date: poForm.delivery_date,
        notes: poForm.notes,
        items_raw: poForm.items
      };
      await API.post('/purchase-orders/', payload, getAuthConfig());
      setShowCreateModal(false);
      setPoForm({
        supplier: '', payment_terms: 'Net 30', delivery_date: '', notes: '',
        items: [{ item_name: '', quantity: 1, unit_cost: 0, category: 'PHARMACY' }]
      });
      fetchPurchaseOrders();
    } catch (err) {
      console.error("Failed saving purchase order: ", err);
      alert("Error saving Purchase Order. Please check backend authentication or permissions.");
    } finally { setLoading(false); }
  };

  const handleGRNSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Map through items and sanitize the expiry_date string for non-clinical categories
      const processedItems = grnForm.items_received.map(item => {
        const isNonExpiring = item.category === 'MARKETING' || item.category === 'ADMIN';
        return {
          ...item,
          // If it's marketing/admin, explicitly force null. Otherwise, pass the date string (or null if blank).
          expiry_date: isNonExpiring ? null : (item.expiry_date || null)
        };
      });

      // 2. Build the payload using the sanitized 'processedItems' array
      const payload = {
        purchase_order: grnForm.purchase_order,
        delivery_note_ref: grnForm.delivery_note_ref,
        date_received: grnForm.date_received,
        items_received_raw: processedItems // Hooked up the sanitized items here
      };
      
      await API.post('/goods-received-notes/', payload, getAuthConfig());
      setShowCreateModal(false);
      setGrnForm({ purchase_order: '', delivery_note_ref: '', date_received: new Date().toISOString().split('T')[0], items_received: [] });
      fetchGRNs();
      fetchPurchaseOrders();
    } catch (err) {
      console.error("Failed logging goods delivery note: ", err);
      alert("Error logging Goods Received Note.");
    } finally { setLoading(false); }
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('purchase_order', invoiceForm.purchase_order);
      formData.append('invoice_number', invoiceForm.invoice_number);
      formData.append('total_billed', invoiceForm.total_billed);
      formData.append('due_date', invoiceForm.due_date);
      if (attachedFile) {
        formData.append('invoice_file', attachedFile);
      }

      const multiPartConfig = getAuthConfig();
      if (!multiPartConfig.headers) multiPartConfig.headers = {};
      multiPartConfig.headers['Content-Type'] = 'multipart/form-data';

      await API.post('/purchase-invoices/', formData, multiPartConfig);
      setShowCreateModal(false);
      setAttachedFile(null);
      setInvoiceForm({ purchase_order: '', invoice_number: '', total_billed: 0, due_date: '', tax_withheld: 0 });
      fetchInvoices();
    } catch (err) {
      console.error("Failed creating invoice balance tracking: ", err);
      alert("Error saving supplier invoice layout.");
    } finally { setLoading(false); }
  };

  const handleVoucherSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        purchase_order: voucherForm.purchase_order,
        purchase_invoice: voucherForm.purchase_invoice,
        payment_reference: voucherForm.payment_reference,
        amount_paid: voucherForm.amount_paid,
        payment_mode: voucherForm.payment_mode
      };
      await API.post('/payment-vouchers/', payload, getAuthConfig());
      setShowCreateModal(false);
      setVoucherForm({ purchase_order: '', purchase_invoice: '', payment_reference: '', amount_paid: 0, payment_mode: 'Bank Wire' });
      fetchVouchers();
      fetchInvoices();
    } catch (err) {
      console.error("Failed executing voucher logging pipeline: ", err);
      alert("Error processing payment voucher.");
    } finally { setLoading(false); }
  };

  const updatePOStatus = async (id, newStatus) => {
    try {
      if (newStatus === 'APPROVED') {
        await API.patch(`/purchase-orders/${id}/approve/`, {}, getAuthConfig());
      } else {
        await API.patch(`/purchase-orders/${id}/`, { status: newStatus }, getAuthConfig());
      }
      fetchPurchaseOrders();
      setSelectedPO(null);
    } catch (err) {
      console.error("Error setting purchase order state lifecycle transformation: ", err);
    }
  };

  const filteredOrders = activeTab === 'ALL' ? purchaseOrders : purchaseOrders.filter(po => po.items?.some(item => item.category?.toUpperCase() === activeTab));

  return (
    <div className="space-y-8 font-['Inter'] text-left">
      
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-100 p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[12px] font-bold text-slate-600 uppercase tracking-wider mb-1">Ordered Capital (POs)</p>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              KES {filteredOrders.reduce((acc, po) => acc + parseFloat(po.total_amount || 0), 0).toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-blue-100 p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[12px] font-bold text-slate-600 uppercase tracking-wider mb-1">Deliveries Received</p>
            <h3 className="text-xl font-bold text-teal-600 tracking-tight">
              {grns.length}
            </h3>
          </div>
        </div>

        <div className="bg-blue-100 p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[12px] font-bold text-slate-600 uppercase tracking-wider mb-1">Pending Payments</p>
            <h3 className="text-xl font-bold text-amber-600 tracking-tight">
              KES {invoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL').reduce((sum, i) => sum + parseFloat(i.total_billed || 0), 0).toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-blue-100 p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[12px] font-bold text-slate-600 uppercase tracking-wider mb-1">Total Amount Paid</p>
            <h3 className="text-xl font-bold text-emerald-600 tracking-tight">
              KES {vouchers.reduce((sum, v) => sum + parseFloat(v.amount_paid || 0), 0).toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Workflow Navigation */}
      <div className="bg-[#020617] p-3 rounded-[2.5rem] shadow-xl flex gap-1 overflow-x-auto">
        {MASTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setCurrentMasterTab(tab.id); setSelectedPO(null); setSelectedGRN(null); setSelectedInvoice(null); setSelectedVoucher(null); }}
            className={`flex-1 text-center py-4 px-6 rounded-3xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              currentMasterTab === tab.id ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Control Strip */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex justify-between items-center">
          <div className="p-1.5 flex gap-2 items-center px-4">
            <FileSpreadsheet size={16} className="text-slate-800" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {currentMasterTab === 'POS' && 'Purchase Orders'}
              {currentMasterTab === 'GRNS' && 'Goods Received Notes (GRN)'}
              {currentMasterTab === 'INVOICES' && 'Supplier Invoices'}
              {currentMasterTab === 'VOUCHERS' && 'Payment Vouchers'}
            </span>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-[#020617] text-teal-400 px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl active:scale-95 cursor-pointer"
          >
            <Plus size={18} /> 
            {currentMasterTab === 'POS' && 'Create New PO'}
            {currentMasterTab === 'GRNS' && 'Log Goods Received'}
            {currentMasterTab === 'INVOICES' && 'Record Supplier Invoice'}
            {currentMasterTab === 'VOUCHERS' && 'Create Payment Voucher'}
          </button>
        </div>

        {currentMasterTab === 'POS' && (
          <div className="flex items-center gap-2 border-t border-slate-100 pt-4 overflow-x-auto scrollbar-none">
            {DEPARTMENTS.map(dept => (
              <button key={dept} onClick={() => { setActiveTab(dept); setSelectedPO(null); }} className={`px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-wider uppercase cursor-pointer ${activeTab === dept ? 'bg-[#020617] text-teal-400' : 'bg-slate-50 text-slate-400'}`}>
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CREATION WORKSPACE FOR ACTIVE CREATION WORKFLOWS (MOVED ABOVE THE MAIN TABLES) */}
      {showCreateModal && (
        <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-top duration-300">
          <div className="px-12 pt-8 flex justify-between items-center border-b pb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
              {currentMasterTab === 'POS' && 'Draft New Purchase Order Request'}
              {currentMasterTab === 'GRNS' && 'Log Physical Quantities Received (GRN)'}
              {currentMasterTab === 'INVOICES' && 'Record Supplier Financial Invoice Document'}
              {currentMasterTab === 'VOUCHERS' && 'Authorize Capital Disbursement Voucher'}
            </h3>
            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-rose-600 p-2 rounded-full bg-slate-50"><X size={16}/></button>
          </div>

          {/* FORM 1: CREATE PURCHASE ORDER */}
          {currentMasterTab === 'POS' && (
            <form onSubmit={handlePOSubmit} className="p-12 space-y-6 text-left">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Vendor</label>
                  <select required value={poForm.supplier} onChange={(e) => setPoForm({...poForm, supplier: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none">
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (<option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Terms</label>
                  <select value={poForm.payment_terms} onChange={(e) => setPoForm({...poForm, payment_terms: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none">
                    <option value="Immediate">Immediate Cash</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Delivery Date</label>
                  <input required type="date" value={poForm.delivery_date} onChange={(e) => setPoForm({...poForm, delivery_date: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Line Items</h4>
                  <button type="button" onClick={handleAddItemRow} className="text-xs bg-slate-900 text-teal-400 font-bold uppercase px-4 py-2 rounded-xl flex items-center gap-2"><Plus size={14}/> Add Row</button>
                </div>
                {poForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-2xl border">
                    <div className="col-span-4">
                      <input list="catalog-items" required placeholder="Item description or SKU" value={item.item_name} onChange={(e) => handleItemChange(index, 'item_name', e.target.value)} className="w-full bg-white border rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                      <datalist id="catalog-items">
                        {catalog.map((c, i) => <option key={i} value={c} />)}
                      </datalist>
                    </div>
                    <div className="col-span-2">
                      <select value={item.category} onChange={(e) => handleItemChange(index, 'category', e.target.value)} className="w-full bg-white border rounded-xl py-3 px-2 text-xs font-bold outline-none">
                        {DEPARTMENTS.filter(d => d !== 'ALL').map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input required type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-white border rounded-xl py-3 px-3 text-xs font-bold text-center outline-none" />
                    </div>
                    <div className="col-span-3">
                      <input required type="number" min="0" step="0.01" placeholder="Unit Price (KES)" value={item.unit_cost} onChange={(e) => handleItemChange(index, 'unit_cost', parseFloat(e.target.value) || 0)} className="w-full bg-white border rounded-xl py-3 px-3 text-xs font-bold outline-none" />
                    </div>
                    <div className="col-span-1 text-center">
                      <button type="button" disabled={poForm.items.length === 1} onClick={() => handleRemoveItemRow(index)} className="text-slate-300 hover:text-rose-600 disabled:opacity-30"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center border-t pt-6">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Estimated Total Capital Required</p>
                  <p className="text-2xl font-black text-slate-900">KES {calculatePOTotal().toLocaleString()}</p>
                </div>
                <button type="submit" className="bg-[#020617] text-teal-400 py-4 px-12 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-900 shadow-xl">Commit Purchase Requisition</button>
              </div>
            </form>
          )}

          {/* FORM 2: LOG INCOMING GOODS (GRN) */}
          {currentMasterTab === 'GRNS' && (
            <form onSubmit={handleGRNSubmit} className="p-12 space-y-6 text-left max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source Purchase Order</label>
                  <select required value={grnForm.purchase_order} onChange={(e) => setGrnForm({...grnForm, purchase_order: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none">
                    <option value="">-- Choose Approved PO --</option>
                    {purchaseOrders.filter(p => p.status === 'APPROVED' || p.status === 'PENDING').map(po => (
                      <option key={po.id} value={po.id}>{po.po_number} ({po.supplier_name})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Note / Waybill Ref</label>
                  <input required type="text" placeholder="e.g. DN-88120" value={grnForm.delivery_note_ref} onChange={(e) => setGrnForm({...grnForm, delivery_note_ref: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Received</label>
                  <input required type="date" value={grnForm.date_received} onChange={(e) => setGrnForm({...grnForm, date_received: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
              </div>

              {grnForm.items_received.length > 0 && (
                <div className="space-y-4 border-t pt-6">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Quantities, Expiries & Condition Check</h4>
                  {grnForm.items_received.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-2xl border">
                      
                      <div className="col-span-3 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Item Description</label>
                        <div className="text-xs font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-100 truncate">{item.item_name}</div>
                      </div>
                      
                      <div className="col-span-1.5 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block text-center">Ordered</label>
                        <div className="text-xs font-bold text-slate-500 bg-white p-3 rounded-xl border border-slate-100 text-center">{item.ordered_quantity}</div>
                      </div>
                      
                      <div className="col-span-1.5 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block text-center">Received</label>
                        <input type="number" required min="0" value={item.quantity_received} onChange={(e) => handleGrnItemChange(index, 'quantity_received', parseInt(e.target.value) || 0)} className="w-full bg-white border rounded-xl py-2.5 px-2 text-xs font-bold text-center outline-none border-teal-200 focus:border-teal-500" />
                      </div>
                      
                      <div className="col-span-1.5 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block text-center">Damaged</label>
                        <input type="number" required min="0" value={item.damaged_quantity} onChange={(e) => handleGrnItemChange(index, 'damaged_quantity', parseInt(e.target.value) || 0)} className="w-full bg-white border rounded-xl py-2.5 px-2 text-xs font-bold text-center outline-none border-rose-200 focus:border-rose-500" />
                      </div>

                      <div className="col-span-2.5 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">
                          Expiry Date { (item.category === 'MARKETING' || item.category === 'ADMIN') && <span className="text-amber-500 font-black"></span> }
                        </label>
                        <input 
                          type="date" 
                          // Dynamically remove required and disable field for non-clinical items
                          required={item.category !== 'MARKETING' && item.category !== 'ADMIN'} 
                          disabled={item.category === 'MARKETING' || item.category === 'ADMIN'} 
                          value={(item.category === 'MARKETING' || item.category === 'ADMIN') ? '' : (item.expiry_date || '')} 
                          className={`w-full border rounded-xl py-2.5 px-2 text-xs font-bold outline-none transition-all ${
                            (item.category === 'MARKETING' || item.category === 'ADMIN') 
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300' 
                              : 'bg-white border-slate-200 focus:border-teal-500'
                          }`} 
                          onChange={(e) => handleGrnItemChange(index, 'expiry_date', e.target.value)} 
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Satisfaction</label>
                        <select value={item.satisfaction_level} onChange={(e) => handleGrnItemChange(index, 'satisfaction_level', e.target.value)} className="w-full bg-white border rounded-xl py-2.5 px-1 text-xs font-bold outline-none">
                          <option value="GoodCondition">Good</option>
                          <option value="Satisfactory">Satisfactory</option>
                          <option value="Shortage">Shortage</option>
                          <option value="Damaged">Damaged</option>
                        </select>
                      </div>

                    </div>
                  ))}
                </div>
              )}

              <button type="submit" className="w-full bg-teal-600 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-teal-700 transition-colors mt-4">Save Goods Received Note</button>
            </form>
          )}

          {/* FORM 3: RECORD SUPPLIER INVOICE */}
          {currentMasterTab === 'INVOICES' && (
            <form onSubmit={handleInvoiceSubmit} className="p-12 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Associated Purchase Order</label>
                  <select required value={invoiceForm.purchase_order} onChange={(e) => setInvoiceForm({...invoiceForm, purchase_order: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none">
                    <option value="">-- Choose PO --</option>
                    {purchaseOrders.map(po => (<option key={po.id} value={po.id}>{po.po_number} ({po.supplier_name})</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier Invoice Serial Code</label>
                  <input required type="text" placeholder="e.g. INV-2024-99" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm({...invoiceForm, invoice_number: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Billed Sum (KES)</label>
                  <input required type="number" step="0.01" placeholder="0.00" value={invoiceForm.total_billed} onChange={(e) => setInvoiceForm({...invoiceForm, total_billed: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Due Deadline</label>
                  <input required type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({...invoiceForm, due_date: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
              </div>
              <div className="space-y-2 border border-dashed border-slate-200 rounded-3xl p-6 bg-slate-50 text-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Upload Digitized PDF Copy</label>
                <div className="flex justify-center items-center gap-3">
                  <Upload size={16} className="text-slate-400" />
                  <input type="file" onChange={handleFileUpload} className="text-xs text-slate-600" />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#020617] text-white py-4 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-900">Process Supplier Bill Details</button>
            </form>
          )}

          {/* FORM 4: CREATE PAYMENT VOUCHER */}
          {currentMasterTab === 'VOUCHERS' && (
            <form onSubmit={handleVoucherSubmit} className="p-12 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Purchase Order</label>
                  <select required value={voucherForm.purchase_order} onChange={(e) => setVoucherForm({...voucherForm, purchase_order: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none">
                    <option value="">-- Choose PO --</option>
                    {purchaseOrders.map(po => (<option key={po.id} value={po.id}>{po.po_number} ({po.supplier_name})</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Invoice</label>
                  <select required value={voucherForm.purchase_invoice} onChange={(e) => setVoucherForm({...voucherForm, purchase_invoice: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none">
                    <option value="">-- Choose Invoice --</option>
                    {invoices.filter(inv => inv.purchase_order === parseInt(voucherForm.purchase_order || 0)).map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.invoice_number} - KES {parseFloat(inv.total_billed || 0).toLocaleString()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount Paid (KES)</label>
                  <input required type="number" placeholder="0.00" value={voucherForm.amount_paid} onChange={(e) => setVoucherForm({...voucherForm, amount_paid: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
                  <select value={voucherForm.payment_mode} onChange={(e) => setVoucherForm({...voucherForm, payment_mode: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none">
                    <option value="Bank Wire">Bank Wire</option>
                    <option value="M-Pesa Corporate">M-Pesa Corporate Paybill</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction Reference ID</label>
                  <input required type="text" placeholder="e.g. FT-99120-CBK" value={voucherForm.payment_reference} onChange={(e) => setVoucherForm({...voucherForm, payment_reference: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-700">Issue Payment Voucher</button>
            </form>
          )}

        </div>
      )}

      {/* Main Data View Panels */}
      <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl min-h-[450px] overflow-hidden">
        {loading && (
          <div className="p-24 text-center text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
            Loading Live HMS Ledger Streams...
          </div>
        )}

        {/* TAB 1: PURCHASE ORDERS */}
        {!loading && currentMasterTab === 'POS' && (
          selectedPO ? (
            <div className="p-12 animate-in fade-in duration-300">
              <button onClick={() => setSelectedPO(null)} className="text-slate-400 mb-6 hover:text-slate-900 uppercase font-bold text-[10px] tracking-wider flex items-center gap-2 cursor-pointer">← Back to List</button>
              <div className="border-b border-slate-100 pb-6 mb-6 flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold uppercase text-slate-900">{selectedPO.po_number}</h2>
                  <p className="text-[10px] mt-1 text-slate-400 font-bold uppercase tracking-wider">Vendor: <span className="text-slate-800">{selectedPO.supplier_name}</span></p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleEmailNotification('Purchase Order', selectedPO.po_number)} className="bg-blue-50 text-blue-600 text-[9px] font-bold uppercase px-4 py-3 rounded-xl flex items-center gap-2"><Mail size={12}/> Email to Vendor</button>
                  {(selectedPO.status === 'PENDING' || selectedPO.status === 'DRAFT') && (
                    <button onClick={() => updatePOStatus(selectedPO.id, 'APPROVED')} className="bg-emerald-600 text-white text-[9px] font-bold uppercase px-6 py-3 rounded-xl">Approve & Send</button>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b pb-3">
                      <th className="pb-3">Item Description</th>
                      <th className="pb-3 text-center">Qty Ordered</th>
                      <th className="pb-3 text-right">Unit Price</th>
                      <th className="pb-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-medium text-slate-800">
                    {selectedPO.items?.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-4">{item.item_name} <span className="text-[9px] text-slate-400 block uppercase">{item.category}</span></td>
                        <td className="py-4 text-center">{item.quantity}</td>
                        <td className="py-4 text-right">KES {parseFloat(item.unit_cost || 0).toLocaleString()}</td>
                        <td className="py-4 text-right">KES {parseFloat(item.total_cost || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b">
                    <th className="px-8 py-6">PO Number</th>
                    <th className="px-4 py-6">Vendor</th>
                    <th className="px-4 py-6">Delivery Date</th>
                    <th className="px-4 py-6">Total Cost</th>
                    <th className="px-4 py-6">Status</th>
                    <th className="px-8 py-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(po => (
                    <tr key={po.id} onClick={() => setSelectedPO(po)} className="border-b hover:bg-slate-50/50 cursor-pointer">
                      <td className="px-8 py-6 font-bold text-slate-900">{po.po_number}</td>
                      <td className="px-4 py-6 text-xs font-bold text-slate-700 uppercase">{po.supplier_name}</td>
                      <td className="px-4 py-6 text-xs text-slate-500">{po.delivery_date}</td>
                      <td className="px-4 py-6 text-xs font-bold text-slate-900">KES {parseFloat(po.total_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase ${
                          po.status === 'PENDING' || po.status === 'DRAFT' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>{po.status}</span>
                      </td>
                      <td className="px-8 py-6 text-right text-slate-400"><Eye size={16}/></td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr><td colSpan="6" className="text-center p-12 text-xs text-slate-400 uppercase tracking-wide">No Active Purchase Orders Registered.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

{/* TAB 2: GOODS RECEIVED NOTES (GRN) */}
        {!loading && currentMasterTab === 'GRNS' && (
          selectedGRN ? (
            <div className="p-12 animate-in fade-in duration-300">
              <button onClick={() => setSelectedGRN(null)} className="text-slate-400 mb-6 hover:text-slate-900 uppercase font-bold text-[10px] tracking-wider flex items-center gap-2 cursor-pointer">← Back to List</button>
              <div className="border-b border-slate-100 pb-6 mb-6 flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold text-teal-600">{selectedGRN.grn_number}</h2>
                  <p className="text-[10px] mt-1 text-slate-400 font-bold uppercase tracking-wider">
                    PO Ref: <span className="font-bold text-slate-900">{selectedGRN.po_number}</span> | Delivery Note: {selectedGRN.delivery_note_ref} | Date Received: <span className="text-slate-900 font-bold">{selectedGRN.date_received}</span>
                  </p>
                </div>
                <button onClick={() => handleEmailNotification('Goods Received Note', selectedGRN.grn_number)} className="bg-teal-50 text-teal-700 text-[9px] font-bold uppercase px-4 py-3 rounded-xl flex items-center gap-2"><Mail size={12}/> Email GRN Details</button>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Verified Item Breakdown</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium text-slate-800">
                    <thead>
                      <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b pb-2">
                        <th className="pb-2">Item Name</th>
                        <th className="pb-2 text-center">Ordered Qty</th>
                        <th className="pb-2 text-center">Received Qty</th>
                        <th className="pb-2 text-center">Damaged Qty</th>
                        <th className="pb-2 text-center">Expiry Date</th>
                        <th className="pb-2 text-right">Satisfaction Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGRN.items_received?.map((item, idx) => {
                        const isNonExpiring = item.category === 'MARKETING' || item.category === 'ADMIN';
                        return (
                          <tr key={idx} className="border-b border-white">
                            <td className="py-3 font-bold">{item.item_name}</td>
                            <td className="py-3 text-center text-slate-500">{item.ordered_quantity}</td>
                            <td className="py-3 text-center text-teal-600 font-bold">{item.quantity_received}</td>
                            <td className="py-3 text-center text-rose-500 font-bold">{item.damaged_quantity}</td>
                            <td className="py-3 text-center">
                              {isNonExpiring ? (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-200/60 px-2 py-0.5 rounded">N/A</span>
                              ) : (
                                <span className="font-mono text-slate-600">{item.expiry_date || '—'}</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.satisfaction_level?.includes('Good') || item.satisfaction_level?.includes('Satisfactory') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                {item.satisfaction_level === 'GoodCondition' ? 'Good Condition' : item.satisfaction_level}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b">
                    <th className="px-8 py-6">GRN Number</th>
                    <th className="px-4 py-6">PO Reference</th>
                    <th className="px-4 py-6">Vendor Name</th>
                    <th className="px-4 py-6">Delivery Note</th>
                    <th className="px-4 py-6">Date Received</th>
                    <th className="px-8 py-6 text-right">View</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.map(grn => (
                    <tr key={grn.id} onClick={() => setSelectedGRN(grn)} className="border-b hover:bg-slate-50/50 cursor-pointer">
                      <td className="px-8 py-6 font-bold text-teal-600">{grn.grn_number}</td>
                      <td className="px-4 py-6 text-xs font-bold text-slate-900 underline">{grn.po_number}</td>
                      <td className="px-4 py-6 text-xs font-bold text-slate-700 uppercase">{grn.supplier_name}</td>
                      <td className="px-4 py-6 text-xs text-slate-500">{grn.delivery_note_ref}</td>
                      <td className="px-4 py-6 text-xs text-slate-600">{grn.date_received}</td>
                      <td className="px-8 py-6 text-right text-slate-400"><Eye size={16}/></td>
                    </tr>
                  ))}
                  {grns.length === 0 && (
                    <tr><td colSpan="6" className="text-center p-12 text-xs text-slate-400 uppercase tracking-wide">No Deliveries Logged via GRN registry yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB 3: BILLS & INVOICES */}
        {!loading && currentMasterTab === 'INVOICES' && (
          selectedInvoice ? (
            <div className="p-12 animate-in fade-in duration-300">
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 mb-6 hover:text-slate-900 uppercase font-bold text-[10px] tracking-wider flex items-center gap-2 cursor-pointer">← Back to List</button>
              <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex justify-between items-center">
                <div>
                  <span className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase ${selectedInvoice.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{selectedInvoice.status}</span>
                  <h3 className="text-2xl font-bold mt-2 text-slate-900">Invoice: {selectedInvoice.invoice_number}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">PO Link: {selectedInvoice.po_number} | Due Date: {selectedInvoice.due_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Bill</p>
                  <p className="text-2xl font-bold text-rose-600">KES {parseFloat(selectedInvoice.total_billed || 0).toLocaleString()}</p>
                  {selectedInvoice.invoice_file && (
                    <a href={selectedInvoice.invoice_file} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 text-xs bg-white border invert-0 px-3 py-1.5 rounded-xl text-blue-600 font-semibold hover:underline">
                      <FileCheck size={14} className="text-emerald-500" /> {selectedInvoice.file_name}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b">
                    <th className="px-8 py-6">Invoice Number</th>
                    <th className="px-4 py-6">PO Reference</th>
                    <th className="px-4 py-6">Vendor Name</th>
                    <th className="px-4 py-6">Due Date</th>
                    <th className="px-4 py-6">Total Bill</th>
                    <th className="px-4 py-6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} onClick={() => setSelectedInvoice(inv)} className="border-b hover:bg-slate-50/50 cursor-pointer">
                      <td className="px-8 py-6 font-bold text-slate-900">{inv.invoice_number}</td>
                      <td className="px-4 py-6 text-xs text-slate-500">{inv.po_number}</td>
                      <td className="px-4 py-6 text-xs font-bold text-slate-700 uppercase">{inv.supplier_name}</td>
                      <td className="px-4 py-6 text-xs text-slate-600">{inv.due_date}</td>
                      <td className="px-4 py-6 text-xs font-bold text-rose-600">KES {parseFloat(inv.total_billed || 0).toLocaleString()}</td>
                      <td className="px-4 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{inv.status}</span>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr><td colSpan="6" className="text-center p-12 text-xs text-slate-400 uppercase tracking-wide">No Outgoing Invoices recorded for outstanding balances.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

      </div>
    </div>
  );
}