import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { 
  ClipboardCheck, Package, AlertTriangle, Plus, FileSpreadsheet, 
  FileText, Search, X, Layers, CheckCircle 
} from 'lucide-react';

const StockTakeManager = () => {
  // Data States
  const [stockTakes, setStockTakes] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredStockTakes, setFilteredStockTakes] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form States for New Stock Take Entry
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [physicalCount, setPhysicalCount] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  
  // --- NEW STATE LINE: TIMELINE INTERCEPTOR PARAMETER ---
  // Initializes cleanly to the running browser instance's current regional calendar date
  const [auditDate, setAuditDate] = useState(new Date().toISOString().slice(0, 10));

  // Hospital sub-store options matched precisely to back-end choice requirements
  const departments = [
    { value: 'ALL', label: 'All Departments' },
    { value: 'PHARMACY', label: 'Pharmacy' },
    { value: 'LAB', label: 'Laboratory' },
    { value: 'NURSING', label: 'Nursing' },
    { value: 'RADIOLOGY', label: 'Radiology' },
    { value: 'ADMIN', label: 'General Admin' } 
  ];

  useEffect(() => {
    fetchStockTakes();
    fetchInventoryItems();
  }, []);

  // Sync Search & Department Filters
  useEffect(() => {
    let results = stockTakes;
    if (activeTab !== 'ALL') {
      results = results.filter(st => st.item_dept === activeTab);
    }
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      results = results.filter(st => 
        st.item_name.toLowerCase().includes(query) || 
        st.item_sku.toLowerCase().includes(query) ||
        st.item_batch.toLowerCase().includes(query)
      );
    }
    setFilteredStockTakes(results);
  }, [searchQuery, activeTab, stockTakes]);

  const fetchStockTakes = async () => {
    try {
      const res = await API.get('/stock-takes/');
      const rawData = res.data?.results || res.data || [];
      
      const mapped = rawData.map(st => ({
        id: st.id,
        // DYNAMIC EVALUATION FALLBACK: Prioritize back-dated parameters over entry creations
        date: new Date(st.recorded_at || st.created_at).toLocaleDateString('en-GB'),
        item_name: st.item_details?.name || 'Unknown Product',
        item_strength: st.item_details?.strength || '',
        item_dept: st.item_details?.department || 'ADMIN',
        item_sku: st.item_details?.sku || '—',
        item_batch: st.item_details?.batch_number || '—',
        item_expiry: st.item_details?.expiry_date || '—',
        system_qty: st.system_quantity,
        physical_qty: st.physical_quantity,
        variance: st.variance,
        variance_pct: st.variance_percentage,
        notes: st.notes || ''
      }));
      setStockTakes(mapped);
    } catch (err) {
      console.error("Failed fetching standard historical audit rows", err);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const res = await API.get('/inventory-items/');
      const items = res.data?.results || res.data || [];
      setInventoryItems(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed loading backend inventory schema maps", err);
    }
  };

  const handleItemSelection = (itemId) => {
    setSelectedItemId(itemId);
    const item = inventoryItems.find(i => i.id.toString() === itemId.toString());
    setSelectedItemDetails(item || null);
    setPhysicalCount('');
  };

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    if (!selectedItemDetails || physicalCount === '') return;
    setLoading(true);

    try {
      const payload = {
        item: selectedItemDetails.id,
        system_quantity: selectedItemDetails.quantity_available,
        physical_quantity: Number(physicalCount),
        notes: auditNotes,
        // --- ADDED TIMELINE PAYLOAD KEY LINK ---
        recorded_at: auditDate 
      };

      await API.post('/stock-takes/', payload);
      
      // Reset Modal Form States safely
      setIsModalOpen(false);
      setSelectedItemId('');
      setSelectedItemDetails(null);
      setPhysicalCount('');
      setAuditNotes('');
      setAuditDate(new Date().toISOString().slice(0, 10)); // Recalibrate calendar hook
      
      // Refresh Lists
      await fetchStockTakes();
      await fetchInventoryItems();
    } catch (err) {
      console.error(err);
      alert("Error saving stocktake confirmation log entry. Check authorization scope.");
    } finally {
      setLoading(false);
    }
  };

  // --- EXPORT CONTROLLERS ---
  const exportToExcel = () => {
    if (filteredStockTakes.length === 0) return alert("No stocktake records found to export.");
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Audit Date,Product,Department,SKU Code,Batch Number,Expiry Date,System Qty,Physical Qty,Variance,Variance %\r\n";
    
    filteredStockTakes.forEach(row => {
      csvContent += `"${row.date}","${row.item_name} ${row.item_strength}","${row.item_dept}","${row.item_sku}","${row.item_batch}","${row.item_expiry}",${row.system_qty},${row.physical_qty},${row.variance},${row.variance_pct}%\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SALAMA_STOCKTAKE_REPORT_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (filteredStockTakes.length === 0) return alert("No data available to print.");

    const printWindow = window.open('', '_blank');
    const tableRows = filteredStockTakes.map(row => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${row.item_name} <span style="color:#64748b; font-size:10px;">(${row.item_strength})</span></td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size:11px;">${row.item_dept}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${row.item_sku}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #475569;">${row.item_batch}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${row.item_expiry}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${row.system_qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${row.physical_qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 900; color: ${row.variance < 0 ? '#ef4444' : '#0f172a'}">${row.variance > 0 ? `+${row.variance}` : row.variance}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Salama Cancer Center - Stocktake Report</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: 900; text-transform: uppercase; font-style: italic; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background-color: #f8fafc; padding: 12px 10px; text-align: left; font-weight: bold; color: #64748b; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">SALAMA <span style="color:#0d9488;">CANCER CENTER</span></div>
              <div style="font-size: 10px; color: #94a3b8; font-weight: bold; margin-top: 5px;">INVENTORY STOCKTAKE & RECONCILIATION SUMMARY AUDIT</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
              <p><strong>Scope:</strong> ${activeTab === 'ALL' ? 'Hospital-Wide' : activeTab}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product Description</th>
                <th>Dept</th>
                <th>SKU Code</th>
                <th>Batch No</th>
                <th>Expiry Date</th>
                <th style="text-align: center;">System Qty</th>
                <th style="text-align: center;">Physical Qty</th>
                <th style="text-align: right;">Variance</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalMismatches = stockTakes.filter(s => s.variance !== 0).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-['Inter'] text-left">
      
      {/* 1. TOP HEADER BANNER CONTROL MATRIX */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 px-10 rounded-[2.5rem] border border-slate-50 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Stocktake <span className="text-teal-600">Reconciliation</span></h2>
          <p className="text-xs text-slate-400 font-bold tracking-wide mt-1">Verify physical shelf balances against central ledger parameters</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-teal-400 hover:bg-slate-800 transition-all font-black text-xs uppercase tracking-widest px-8 py-4.5 rounded-2xl flex items-center gap-3 shadow-xl shadow-slate-900/10 active:scale-95 cursor-pointer">
          <Plus size={16} strokeWidth={3} /> Record Audit Entry
        </button>
      </div>

      {/* 2. LIVE METRICS SUMMARY COUNTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Audits Processed</p>
            <p className="text-3xl font-black italic text-slate-900 mt-2">{stockTakes.length} <span className="text-xs text-slate-400 font-bold">Batches</span></p>
          </div>
          <div className="p-4 bg-slate-50 text-slate-700 rounded-2xl"><ClipboardCheck size={22} /></div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Mismatches Identified</p>
            <p className={`text-3xl font-black italic mt-2 ${totalMismatches > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{totalMismatches} <span className="text-xs text-slate-400 font-bold">Alerts</span></p>
          </div>
          <div className={`p-4 rounded-2xl ${totalMismatches > 0 ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}><AlertTriangle size={22} /></div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Document Export Channels</p>
            <div className="flex gap-2 mt-3">
              <button onClick={exportToExcel} className="p-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer"><FileSpreadsheet size={14}/> Excel</button>
              <button onClick={exportToPDF} className="p-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer"><FileText size={14}/> PDF Report</button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUB-STORE NAVIGATION AND FILTER BOARD */}
      <div className="bg-white p-4 px-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {departments.map((dept) => (
            <button
              key={dept.value}
              onClick={() => setActiveTab(dept.value)}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === dept.value 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {dept.label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by SKU, Batch, or Item Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-12 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-teal-500 transition-all"
          />
        </div>
      </div>

      {/* 4. MAIN AUDIT LOG SHEET TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-6 px-8">Product Description / Log Date</th>
                <th className="p-6">SKU Code</th>
                <th className="p-6">Batch No</th>
                <th className="p-6">Expiry Date</th>
                <th className="p-6 text-center">System Qty</th>
                <th className="p-6 text-center">Physical Qty</th>
                <th className="p-6 text-right pr-8">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold">
              {filteredStockTakes.length > 0 ? filteredStockTakes.map((st) => {
                const isMismatched = st.variance !== 0;
                return (
                  <tr key={st.id} className="hover:bg-slate-50/40 transition-all group">
                    <td className="p-6 px-8">
                      <p className="font-black text-slate-900 uppercase italic text-[13px] tracking-tight">{st.item_name} <span className="text-slate-400 font-bold text-xs">({st.item_strength})</span></p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[8px] font-black tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md uppercase inline-block">{st.item_dept}</span>
                        <span className="text-[9px] text-slate-400 font-mono">Audited: {st.date}</span>
                      </div>
                      {st.notes && <p className="text-[10px] text-slate-400 font-medium mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">Obs: "{st.notes}"</p>}
                    </td>
                    <td className="p-6">
                      <span className="font-mono text-xs font-black text-teal-600 bg-teal-50/50 px-3 py-1.5 rounded-xl border border-teal-100/30">{st.item_sku}</span>
                    </td>
                    <td className="p-6">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">#{st.item_batch}</span>
                    </td>
                    <td className="p-6 text-slate-500 font-medium">{st.item_expiry}</td>
                    <td className="p-6 text-center text-slate-500 font-mono text-[13px]">{st.system_qty?.toLocaleString()}</td>
                    <td className="p-6 text-center text-slate-900 font-mono text-[13px] bg-slate-50/30">{st.physical_qty?.toLocaleString()}</td>
                    <td className="p-6 text-right pr-8">
                      <p className={`font-black italic text-[14px] ${isMismatched ? 'text-rose-500' : 'text-slate-900'}`}>
                        {st.variance > 0 ? `+${st.variance}` : st.variance}
                      </p>
                      <span className={`text-[9px] font-black ${isMismatched ? 'text-rose-400' : 'text-slate-400'}`}>
                        ({st.variance_pct}%)
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="7" className="p-32 text-center text-slate-300 font-black uppercase italic tracking-widest bg-slate-50/10">
                    No matching verification logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. SLIDE-OUT AUDIT FORM SHEET MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md h-full bg-white p-8 px-10 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <form onSubmit={handleCreateAudit} className="h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b pb-5 border-slate-100">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Record Audit</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Commit Physical Ground Quantities</p>
                  </div>
                  <button type="button" onClick={() => { setIsModalOpen(false); setSelectedItemDetails(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"><X size={18}/></button>
                </div>

                <div className="mt-6 space-y-5">
                  {/* --- NEW CALENDAR PICKER FIELD MODULE --- */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">1. Stocktake Valuation Date</label>
                    <input 
                      required 
                      type="date" 
                      value={auditDate} 
                      onChange={(e) => setAuditDate(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-5 text-xs font-black text-slate-800 outline-none focus:border-teal-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">2. Target Inventory Item Batch</label>
                    <select required value={selectedItemId} onChange={(e) => handleItemSelection(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-5 text-xs font-black text-slate-800 outline-none appearance-none cursor-pointer focus:border-teal-500">
                      <option value="">Select item lineage record...</option>
                      {inventoryItems.map(i => (
                        <option key={i.id} value={i.id}>[{i.department}] {i.name} {i.strength ? `(${i.strength})` : ''} — #{i.batch_number}</option>
                      ))}
                    </select>
                  </div>

                  {selectedItemDetails && (
                    <div className="bg-slate-50 border border-slate-100/70 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-3 duration-200 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">SKU Code</p>
                          <p className="font-mono font-black text-teal-600 mt-0.5">{selectedItemDetails.sku}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Batch Stamp</p>
                          <p className="font-mono font-bold text-slate-700 mt-0.5">#{selectedItemDetails.batch_number}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-200/50 pt-3">
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Expiry Date</p>
                          <p className="font-bold text-slate-700 mt-0.5">{selectedItemDetails.expiry_date || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Expected Balance</p>
                          <p className="font-mono font-black text-slate-900 text-sm mt-0.5">{selectedItemDetails.quantity_available?.toLocaleString()} U</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">3. Physical Counted Quantity</label>
                    <input required disabled={!selectedItemDetails} type="number" min="0" placeholder={selectedItemDetails ? "Key in ground shelf total..." : "Select item balance reference first..."} value={physicalCount} onChange={(e) => setPhysicalCount(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-5 text-xs font-black outline-none focus:border-teal-500 disabled:opacity-50" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Audit Findings Observations</label>
                    <textarea rows="3" placeholder="Enter notes or discrepancies here..." value={auditNotes} onChange={(e) => setAuditNotes(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-5 text-xs font-bold outline-none focus:border-teal-500" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-5 border-slate-100 flex gap-3 bg-white">
                <button type="button" onClick={() => { setIsModalOpen(false); setSelectedItemDetails(null); }} className="w-1/2 border border-slate-200 text-slate-500 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all cursor-pointer">Cancel</button>
                <button type="submit" disabled={loading || !selectedItemDetails || physicalCount === ''} className="w-1/2 bg-slate-900 text-teal-400 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer">
                  <CheckCircle size={14}/> {loading ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTakeManager;