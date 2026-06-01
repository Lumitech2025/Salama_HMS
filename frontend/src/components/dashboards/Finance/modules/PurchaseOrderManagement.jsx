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

export default function PurchaseOrderManagement() {
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
          satisfaction_level: 'GoodCondition',
          category: item.category
        }));
        setGrnForm(prev => ({ ...prev, items_received: itemsForGrn }));
      }
    } else {
      setGrnForm(prev => ({ ...prev, items_received: [] }));
    }
  }, [grnForm.purchase_order, purchaseOrders]);

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
      // Structure explicitly targets custom "items_raw" key within Django Serializer layer
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
      const payload = {
        purchase_order: grnForm.purchase_order,
        delivery_note_ref: grnForm.delivery_note_ref,
        date_received: grnForm.date_received,
        items_received_raw: grnForm.items_received
      };
      await API.post('/goods-received-notes/', payload, getAuthConfig());
      setShowCreateModal(false);
      setGrnForm({ purchase_order: '', delivery_note_ref: '', date_received: new Date().toISOString().split('T')[0], items_received: [] });
      fetchGRNs();
      fetchPurchaseOrders(); // Refresh order status change
    } catch (err) {
      console.error("Failed logging goods delivery note: ", err);
      alert("Error logging Goods Received Note.");
    } finally { setLoading(false); }
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Use FormData to allow physical file upload attachments
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
      fetchInvoices(); // Refresh paid flags state checks
    } catch (err) {
      console.error("Failed executing voucher logging pipeline: ", err);
      alert("Error processing payment voucher.");
    } finally { setLoading(false); }
  };

  const updatePOStatus = async (id, newStatus) => {
    try {
      // Hits custom router action built into Viewset class architecture
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
                        <th className="pb-2 text-right">Satisfaction Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGRN.items_received?.map((item, idx) => (
                        <tr key={idx} className="border-b border-white">
                          <td className="py-3 font-bold">{item.item_name}</td>
                          <td className="py-3 text-center text-slate-500">{item.ordered_quantity}</td>
                          <td className="py-3 text-center text-teal-600 font-bold">{item.quantity_received}</td>
                          <td className="py-3 text-center text-rose-500 font-bold">{item.damaged_quantity}</td>
                          <td className="py-3 text-right">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.satisfaction_level?.includes('Good') || item.satisfaction_level?.includes('Satisfactory') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {item.satisfaction_level === 'GoodCondition' ? 'Good Condition' : item.satisfaction_level}
                            </span>
                          </td>
                        </tr>
                      ))}
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

        {/* TAB 4: PAYMENTS MADE */}
        {!loading && currentMasterTab === 'VOUCHERS' && (
          selectedVoucher ? (
            <div className="p-12 animate-in fade-in duration-300">
              <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 mb-6 hover:text-slate-900 uppercase font-bold text-[10px] tracking-wider flex items-center gap-2 cursor-pointer">← Back to List</button>
              <div className="bg-emerald-950/5 border border-emerald-500/20 rounded-[2.5rem] p-10 space-y-6">
                <div className="flex justify-between items-start border-b border-emerald-900/10 pb-6">
                  <div>
                    <span className="bg-emerald-600 text-white text-[9px] font-bold tracking-wider uppercase px-3 py-1 rounded">Payment Advice Receipt</span>
                    <h2 className="text-3xl font-bold mt-2 text-slate-900">{selectedVoucher.voucher_number}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Payment Date: {selectedVoucher.date_issued}</p>
                  </div>
                  <button onClick={() => handleEmailNotification('Payment Voucher', selectedVoucher.voucher_number)} className="bg-emerald-600 text-white text-[9px] font-bold uppercase px-4 py-3 rounded-xl flex items-center gap-2"><Send size={12}/> Email Receipt</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-slate-700">
                  <div><p className="text-[10px] uppercase text-slate-400 font-bold">Paid Invoice</p><p className="text-slate-900 font-bold">{selectedVoucher.purchase_invoice_number}</p></div>
                  <div><p className="text-[10px] uppercase text-slate-400 font-bold">PO Number</p><p className="text-slate-900 font-bold">{selectedVoucher.po_number}</p></div>
                  <div><p className="text-[10px] uppercase text-slate-400 font-bold">Payment Method</p><p className="text-slate-900 font-bold">{selectedVoucher.payment_mode}</p></div>
                  <div><p className="text-[10px] uppercase text-slate-400 font-bold">Reference Code</p><p className="text-emerald-700 font-mono font-bold">{selectedVoucher.payment_reference}</p></div>
                </div>
                <div className="pt-4 border-t border-dashed border-emerald-900/10 flex justify-between items-center">
                  <span className="text-xs uppercase font-bold text-slate-400">Total Paid Amount:</span>
                  <span className="text-2xl font-bold text-emerald-600">KES {parseFloat(selectedVoucher.amount_paid || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b">
                    <th className="px-8 py-6">Voucher Number</th>
                    <th className="px-4 py-6">Vendor Name</th>
                    <th className="px-4 py-6">Invoice Paid</th>
                    <th className="px-4 py-6">Payment Method</th>
                    <th className="px-4 py-6">Reference ID</th>
                    <th className="px-8 py-6 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map(v => (
                    <tr key={v.id} onClick={() => setSelectedVoucher(v)} className="border-b hover:bg-slate-50/50 cursor-pointer">
                      <td className="px-8 py-6 font-bold text-emerald-600">{v.voucher_number}</td>
                      <td className="px-4 py-6 text-xs font-bold text-slate-700 uppercase">{v.supplier_name}</td>
                      <td className="px-4 py-6 text-xs font-mono text-slate-600">{v.purchase_invoice_number}</td>
                      <td className="px-4 py-6 text-xs text-slate-500">{v.payment_mode}</td>
                      <td className="px-4 py-6 text-xs font-mono font-bold text-slate-800">{v.payment_reference}</td>
                      <td className="px-8 py-6 text-right text-xs font-bold text-emerald-600">KES {parseFloat(v.amount_paid || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {vouchers.length === 0 && (
                    <tr><td colSpan="6" className="text-center p-12 text-xs text-slate-400 uppercase tracking-wide">No Payment Remittances issued via accounting system yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* MODAL CONFIGURATION PANELS */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => { setShowCreateModal(false); setAttachedFile(null); }}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b flex justify-between items-center bg-slate-50/50 px-12">
              <h3 className="text-2xl font-bold text-slate-900 uppercase italic">
                {currentMasterTab === 'POS' && 'Create Purchase Order'}
                {currentMasterTab === 'GRNS' && 'Log Goods Received Note (GRN)'}
                {currentMasterTab === 'INVOICES' && 'Record Supplier Invoice'}
                {currentMasterTab === 'VOUCHERS' && 'Create Payment Voucher'}
              </h3>
              <button onClick={() => { setShowCreateModal(false); setAttachedFile(null); }} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
            </div>

            {/* FORM 1: CREATE PO */}
            {currentMasterTab === 'POS' && (
              <form onSubmit={handlePOSubmit} className="p-12 space-y-8 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Select Vendor</label>
                    <select required value={poForm.supplier} onChange={(e) => setPoForm({...poForm, supplier: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none uppercase">
                      <option value="">-- Choose Vendor --</option>
                      {suppliers.map(sup => (<option key={sup.id} value={sup.id}>{sup.name}</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Payment Terms</label>
                    <select value={poForm.payment_terms} onChange={(e) => setPoForm({...poForm, payment_terms: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none">
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 60">Net 60</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Delivery Date</label>
                    <input type="date" required value={poForm.delivery_date} onChange={(e) => setPoForm({...poForm, delivery_date: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Items</h4>
                    <button type="button" onClick={handleAddItemRow} className="text-teal-600 font-bold text-[10px] uppercase flex items-center gap-1"><Plus size={14}/> Add New Item</button>
                  </div>
                  {poForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-2xl border">
                      <div className="col-span-4 space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Item Details</label>
                        <input required type="text" placeholder="Name or Description" value={item.item_name} onChange={(e) => handleItemChange(index, 'item_name', e.target.value)} className="w-full bg-white border rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                      </div>
                      <div className="col-span-3 space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Department</label>
                        <select value={item.category} onChange={(e) => handleItemChange(index, 'category', e.target.value)} className="w-full bg-white border rounded-xl py-3 px-4 text-xs font-bold outline-none uppercase">
                          {DEPARTMENTS.filter(d => d !== 'ALL').map(dept => (<option key={dept} value={dept}>{dept}</option>))}
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block text-center">Quantity</label>
                        <input required type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)} className="w-full bg-white border rounded-xl py-3 px-4 text-xs font-bold text-center outline-none" />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block text-right">Unit Price</label>
                        <input required type="number" min="0" value={item.unit_cost} onChange={(e) => handleItemChange(index, 'unit_cost', parseFloat(e.target.value) || 0)} className="w-full bg-white border rounded-xl py-3 px-4 text-xs font-bold text-right outline-none" />
                      </div>
                      <div className="col-span-1 text-center pb-3">
                        {poForm.items.length > 1 && (<button type="button" onClick={() => handleRemoveItemRow(index)} className="text-rose-400 hover:text-rose-600"><Trash2 size={16}/></button>)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-6 flex justify-between items-center px-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Value</span>
                    <span className="text-xl font-bold text-rose-600">KES {calculatePOTotal().toLocaleString()}</span>
                  </div>
                  <button type="submit" className="bg-[#020617] text-teal-400 px-10 py-5 rounded-[2rem] font-bold uppercase tracking-wider text-[10px] flex items-center gap-2 shadow-2xl"><Save size={16}/> Save Purchase Order</button>
                </div>
              </form>
            )}

            {/* FORM 2: LOG INCOMING GOODS */}
            {currentMasterTab === 'GRNS' && (
              <form onSubmit={handleGRNSubmit} className="p-12 space-y-6 text-left max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Purchase Order</label>
                    <select required value={grnForm.purchase_order} onChange={(e) => setGrnForm({...grnForm, purchase_order: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none">
                      <option value="">-- Choose PO --</option>
                      {purchaseOrders.map(po => (<option key={po.id} value={po.id}>{po.po_number} ({po.supplier_name})</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Note Ref</label>
                    <input type="text" required placeholder="e.g. DN-88192A" value={grnForm.delivery_note_ref} onChange={(e) => setGrnForm({...grnForm, delivery_note_ref: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Received</label>
                    <input type="date" required value={grnForm.date_received} onChange={(e) => setGrnForm({...grnForm, date_received: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                  </div>
                </div>

                {grnForm.items_received.length > 0 && (
                  <div className="space-y-4 border-t pt-6">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Quantities & Condition Check</h4>
                    {grnForm.items_received.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-2xl border">
                        <div className="col-span-3 space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Item Description</label>
                          <div className="text-xs font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-100">{item.item_name}</div>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block text-center">Ordered Qty</label>
                          <div className="text-xs font-bold text-slate-500 bg-white p-3 rounded-xl border border-slate-100 text-center">{item.ordered_quantity}</div>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block text-center">Received Qty</label>
                          <input type="number" required min="0" value={item.quantity_received} onChange={(e) => handleGrnItemChange(index, 'quantity_received', parseInt(e.target.value) || 0)} className="w-full bg-white border rounded-xl py-2.5 px-3 text-xs font-bold text-center outline-none border-teal-200 focus:border-teal-500" />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block text-center">Damaged Qty</label>
                          <input type="number" required min="0" value={item.damaged_quantity} onChange={(e) => handleGrnItemChange(index, 'damaged_quantity', parseInt(e.target.value) || 0)} className="w-full bg-white border rounded-xl py-2.5 px-3 text-xs font-bold text-center outline-none border-rose-200 focus:border-rose-500" />
                        </div>
                        <div className="col-span-3 space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Satisfaction Level</label>
                          <select value={item.satisfaction_level} onChange={(e) => handleGrnItemChange(index, 'satisfaction_level', e.target.value)} className="w-full bg-white border rounded-xl py-2.5 px-3 text-xs font-bold outline-none">
                            <option value="GoodCondition">Good Condition</option>
                            <option value="Satisfactory">Satisfactory</option>
                            <option value="Shortage">Shortage / Discrepancy</option>
                            <option value="Damaged">Damaged & Rejected</option>
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
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link to Purchase Order</label>
                    <select required value={invoiceForm.purchase_order} onChange={(e) => setInvoiceForm({...invoiceForm, purchase_order: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none">
                      <option value="">-- Choose Matching PO --</option>
                      {purchaseOrders.map(po => (<option key={po.id} value={po.id}>{po.po_number} ({po.supplier_name})</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice Number</label>
                    <input required type="text" placeholder="e.g. INV-2026-99" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm({...invoiceForm, invoice_number: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Billed Amount (KES)</label>
                    <input required type="number" placeholder="0.00" value={invoiceForm.total_billed} onChange={(e) => setInvoiceForm({...invoiceForm, total_billed: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Due Date</label>
                    <input required type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({...invoiceForm, due_date: e.target.value})} className="w-full bg-slate-50 border rounded-2xl py-4 px-5 text-xs font-bold outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attach Scanned Invoice File</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50/50 transition-colors relative">
                    <input type="file" required accept=".pdf,.png,.jpg" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={24} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">{attachedFile ? attachedFile.name : 'Click or drag invoice file here'}</span>
                      <span className="text-[9px] text-slate-400 uppercase">PDF, PNG, JPG accepted (Max 10MB)</span>
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full bg-[#020617] text-teal-400 py-4 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-900">Save Supplier Invoice</button>
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
        </div>
      )}

    </div>
  );
}