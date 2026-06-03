import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  Package, TrendingDown, Search, ArrowRightLeft, PlusCircle,
  Loader2, X, Edit3, Store
} from 'lucide-react';

const PharmacyInventory = ({ setActiveTab }) => {
  const [inventory, setInventory] = useState([]);
  const [mainStorePharmacyItems, setMainStorePharmacyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Maximum quantity boundary and reference tracking state
  const [maxAvailableQty, setMaxAvailableQty] = useState(0);
  const [selectedMainStoreId, setSelectedMainStoreId] = useState(null);

  // Precision Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    batch_no: '',
    dosage_form: 'TABLET', 
    strength: '', 
    stock_quantity: '', 
    reorder_level: '50', 
    cost_price_unit: '', 
    selling_price_kes: '',
    expiry_date: ''
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await API.get('/drugs/');
      setInventory(res.data?.results || res.data || []);
    } catch (err) {
      console.error("Ledger acquisition failure", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMainStorePharmacyItems = async () => {
    try {
      const res = await API.get('/inventory-items/');
      const items = res.data?.results || res.data || [];
      setMainStorePharmacyItems(items.filter(item => item.department === 'PHARMACY'));
    } catch (err) {
      console.error("Main store sync failure", err);
    }
  };

  useEffect(() => { 
    fetchInventory(); 
    fetchMainStorePharmacyItems();
  }, []);

  // Autofill, Stock Boundaries, and DB Primary Key Tracking Engine
  const handleMainStoreSelection = (selectedItemName) => {
    if (!selectedItemName) {
      resetAddForm();
      setMaxAvailableQty(0);
      setSelectedMainStoreId(null);
      return;
    }

    const matchedItem = mainStorePharmacyItems.find(item => item.name === selectedItemName);
    
    if (matchedItem) {
      const suggestedRetail = parseFloat(matchedItem.cost_per_unit || 0) * 1.33;
      
      // Lock down the max available stock and track its primary database ID
      setMaxAvailableQty(parseInt(matchedItem.quantity_available) || 0);
      setSelectedMainStoreId(matchedItem.id);

      setFormData(prev => ({
        ...prev,
        name: matchedItem.name,
        sku: matchedItem.sku || '',
        batch_no: matchedItem.batch_number || '',
        dosage_form: matchedItem.dosage_form || 'TABLET',
        strength: matchedItem.strength || '',
        cost_price_unit: matchedItem.cost_per_unit || '',
        expiry_date: matchedItem.expiry_date || '',
        selling_price_kes: suggestedRetail.toFixed(2)
      }));
    }
  };

  // Dual-stage Stock Transaction Handler
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    
    const requestedQty = parseInt(formData.stock_quantity) || 0;

    // Guard Check: Absolute allocation boundary condition
    if (requestedQty > maxAvailableQty) {
      alert(`Stock Allocation Error: Requested quantity (${requestedQty}) exceeds available Main Store stock (${maxAvailableQty}).`);
      return;
    }

    try {
      // Phase 1: Onboard or update the item on the Pharmacy Shop Floor
      const payload = {
        ...formData,
        stock_quantity: requestedQty,
        reorder_level: parseInt(formData.reorder_level) || 0,
        cost_price_unit: parseFloat(formData.cost_price_unit) || 0,
        selling_price_kes: parseFloat(formData.selling_price_kes) || 0,
        expiry_date: formData.expiry_date || null 
      };

      await API.post('/drugs/', payload);

      // Phase 2: Deduct allocated quantity from the Main Store Inventory record
      if (selectedMainStoreId) {
        const remainingStoreQty = maxAvailableQty - requestedQty;
        
        await API.patch(`/inventory-items/${selectedMainStoreId}/`, {
          quantity_available: remainingStoreQty
        });
      }

      // Close transaction modal, clean state variables, and trigger interface sync
      setShowAddModal(false);
      resetAddForm();
      fetchInventory();
      fetchMainStorePharmacyItems(); // Vital: Pulls real-time balanced quantities from the store pool
    } catch (err) {
      console.error("Stock allocation transaction failure:", err);
      alert("Database error: Failed to complete the dual stock allocation routine.");
    }
  };

  const handleUpdateProductData = async (e) => {
    e.preventDefault();
    try {
      await API.patch(`/drugs/${selectedItem.id}/`, {
        name: formData.name,
        dosage_form: formData.dosage_form,
        strength: formData.strength,
        reorder_level: parseInt(formData.reorder_level) || 0,
        selling_price_kes: parseFloat(formData.selling_price_kes) || 0
      });
      setShowPricingModal(false);
      fetchInventory();
    } catch (err) { 
      alert("Error updating product properties."); 
    }
  };

  const resetAddForm = () => {
    setFormData({
      name: '', sku: '', batch_no: '', dosage_form: 'TABLET',
      strength: '', stock_quantity: '', reorder_level: '50',
      cost_price_unit: '', selling_price_kes: '', expiry_date: ''
    });
    setMaxAvailableQty(0);
    setSelectedMainStoreId(null);
  };

  const openEditMatrix = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      batch_no: item.batch_no,
      dosage_form: item.dosage_form || 'TABLET',
      strength: item.strength || '',
      stock_quantity: item.stock_quantity,
      reorder_level: item.reorder_level,
      cost_price_unit: item.cost_price_unit,
      selling_price_kes: item.selling_price_kes,
      expiry_date: item.expiry_date || ''
    });
    setShowPricingModal(true);
  };

  const handleInitializeRequisition = (item) => {
    const prefilledData = {
      drug_name: item.name,
      sku: item.sku,
      batch_number: item.batch_no,
      dosage_form: item.dosage_form,
      strength: item.strength,
      suggested_quantity: Math.max(0, (parseInt(item.reorder_level || 50) * 2) - parseInt(item.stock_quantity || 0)),
      notes: `Auto stock alert trigger for batch: ${item.batch_no}`
    };
    localStorage.setItem('salama_prefilled_requisition', JSON.stringify(prefilledData));
    if (setActiveTab) setActiveTab('requisitions');
  };

  const filteredInventory = inventory.filter(item => 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.batch_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = inventory.filter(item => (parseInt(item.stock_quantity) || 0) <= (parseInt(item.reorder_level) || 50)).length;

  return (
    <div className="space-y-8 font-['Inter'] p-6 bg-[#fafafa] rounded-3xl min-h-screen">
      
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                <Store className="text-teal-600" size={32} /> Pharmacy Shop Floor
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Dispensing Point Ledger Matrix</p>
        </div>
        <button 
          onClick={() => { resetAddForm(); setShowAddModal(true); }}
          className="bg-[#020617] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-teal-600 transition-all shadow-xl"
        >
          <PlusCircle size={18} /> Add Shop Stock
        </button>
      </div>

      {/* STATS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-xl bg-red-50 text-red-600 border border-red-100"><TrendingDown size={24}/></div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 font-mono">{String(lowStockCount).padStart(2, '0')}</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Threshold Breach Alerts</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-xl bg-teal-50 text-teal-600 border border-teal-100"><Package size={24}/></div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 font-mono">Ksh {(filteredInventory.reduce((acc, curr) => acc + (parseFloat(curr.selling_price_kes || 0) * parseInt(curr.stock_quantity || 0)), 0)).toLocaleString()}</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Shop Floor Value (Retail)</p>
          </div>
        </div>
      </div>

      {/* SEARCH PANEL */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-xl w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" placeholder="Search pharmacy stock..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium" 
                />
            </div>
        </div>

        {/* LEDGER DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/70 border-b border-slate-100">
                <th className="px-8 py-5">Product</th>
                <th className="px-8 py-5">SKU</th>
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5">Strength</th>
                <th className="px-8 py-5">Batch No</th>
                <th className="px-8 py-5">Qty</th>
                <th className="px-8 py-5">Min Level</th>
                <th className="px-8 py-5">Cost Price</th>
                <th className="px-8 py-5">Retail Price</th>
                <th className="px-8 py-5 text-right pr-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="10" className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-teal-600" size={36} /></td></tr>
              ) : filteredInventory.length === 0 ? (
                <tr><td colSpan="10" className="py-16 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">No stock floor records found.</td></tr>
              ) : filteredInventory.map((item) => {
                const stockQty = parseInt(item.stock_quantity) || 0;
                const minThreshold = parseInt(item.reorder_level) || 50;
                const isBreached = stockQty <= minThreshold;

                return (
                  <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${isBreached ? 'bg-red-50/20' : ''}`}>
                    <td className="px-8 py-6 font-black text-slate-900 uppercase tracking-tight">{item.name}</td>
                    <td className="px-8 py-6 font-mono text-xs font-bold text-slate-600">{item.sku}</td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 font-black uppercase">
                        {item.dosage_form || 'TABLET'}
                      </span>
                    </td>
                    <td className="px-8 py-6 font-bold text-slate-800 font-mono text-sm">{item.strength || 'N/A'}</td>
                    <td className="px-8 py-6 font-mono text-xs text-slate-500 font-bold">{item.batch_no || 'N/A'}</td>
                    <td className="px-8 py-6"><span className={`text-base font-black ${isBreached ? 'text-red-600' : 'text-slate-900'}`}>{stockQty}</span></td>
                    <td className="px-8 py-6 font-mono text-sm text-slate-600 font-bold">{minThreshold}</td>
                    <td className="px-8 py-6 font-mono text-xs text-slate-400">Ksh {parseFloat(item.cost_price_unit || 0).toLocaleString()}</td>
                    <td className="px-8 py-6 font-mono font-black text-teal-600">Ksh {parseFloat(item.selling_price_kes || 0).toLocaleString()}</td>
                    <td className="px-8 py-6 text-right pr-12">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditMatrix(item)} className="p-2 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-900 hover:text-white transition-all"><Edit3 size={14}/></button>
                        <button 
                          onClick={() => handleInitializeRequisition(item)} 
                          className={`p-2 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 ${
                            isBreached ? 'bg-red-600 text-white border-red-600 animate-pulse' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-teal-600 hover:text-white'
                          }`}
                        >
                          <ArrowRightLeft size={14} />
                          {isBreached && <span>Requisition</span>}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <Modal title="Onboard Main Store Asset" close={() => setShowAddModal(false)}>
          <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Main Store Product</label>
                <select 
                  className="w-full bg-slate-50 rounded-xl p-3.5 font-bold text-slate-900 border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  value={formData.name}
                  onChange={e => handleMainStoreSelection(e.target.value)}
                  required
                >
                  <option value="">-- Select Active Stock --</option>
                  {mainStorePharmacyItems.map(item => (
                    <option key={item.id} value={item.name}>
                      {item.name} (Avail: {item.quantity_available})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">SKU Reference</label>
                <input type="text" readOnly value={formData.sku} className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 font-mono text-xs font-bold text-slate-500 outline-none" placeholder="Automated" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Batch Number</label>
                <input type="text" readOnly value={formData.batch_no} className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 font-mono text-xs font-bold text-slate-500 outline-none" placeholder="Linked" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Type</label>
                <input type="text" readOnly value={formData.dosage_form} className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 font-bold text-slate-500 text-sm outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Strength</label>
                <input type="text" readOnly value={formData.strength} className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 font-mono text-xs font-bold text-slate-500 outline-none" placeholder="Linked" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                  Quantity to Add {maxAvailableQty > 0 && `(Max: ${maxAvailableQty})`}
                </label>
                <input 
                  type="number" 
                  value={formData.stock_quantity} 
                  onChange={e => setFormData({...formData, stock_quantity: e.target.value})} 
                  placeholder="Enter amount"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  max={maxAvailableQty}
                  min="1"
                  required 
                />
              </div>
              <Input label="Reorder Level" type="number" value={formData.reorder_level} onChange={e => setFormData({...formData, reorder_level: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Unit Cost (Ksh)</label>
                <input type="text" readOnly value={formData.cost_price_unit} className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 font-mono text-sm font-bold text-slate-500 outline-none" />
              </div>
              <Input label="Retail Price (Ksh)" type="number" step="0.01" value={formData.selling_price_kes} onChange={e => setFormData({...formData, selling_price_kes: e.target.value})} />
            </div>

            <button type="submit" className="w-full bg-[#020617] text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-teal-600 transition-colors">
              Save Record Entry
            </button>
          </form>
        </Modal>
      )}

      {/* EDIT MODAL PANEL */}
      {showPricingModal && (
        <Modal title={`Modify Profile: ${formData.sku}`} close={() => setShowPricingModal(false)}>
          <form onSubmit={handleUpdateProductData} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Generic Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Type</label>
                <select 
                  className="w-full bg-slate-50 rounded-xl p-3.5 font-bold text-slate-900 border border-slate-100 text-sm outline-none" 
                  value={formData.dosage_form} 
                  onChange={e => setFormData({...formData, dosage_form: e.target.value})}
                >
                  <option value="TABLET">Tablet</option>
                  <option value="VIAL">Vial</option>
                  <option value="SYRUP">Syrup</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input label="Strength" placeholder="e.g. 250mg" value={formData.strength} onChange={e => setFormData({...formData, strength: e.target.value})} />
              <Input label="Reorder Level" type="number" value={formData.reorder_level} onChange={e => setFormData({...formData, reorder_level: e.target.value})} />
            </div>

            <Input label="Retail Price (Ksh)" type="number" step="0.01" value={formData.selling_price_kes} onChange={e => setFormData({...formData, selling_price_kes: e.target.value})} />
            
            <button type="submit" className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-900 transition-colors">
              Update Record Modification
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const Modal = ({ title, close, children }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">{title}</h3>
                <button onClick={close} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400"><X size={18}/></button>
            </div>
            {children}
        </div>
    </div>
);

const Input = ({ label, ...props }) => (
    <div className="space-y-1 w-full">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">{label}</label>
        <input {...props} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-teal-500" required />
    </div>
);

export default PharmacyInventory;