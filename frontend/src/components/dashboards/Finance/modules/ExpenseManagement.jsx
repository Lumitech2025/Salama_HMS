import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Paperclip, 
  AlertTriangle, 
  Plus, 
  Search, 
  FileText,
  Edit2
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'SALARIES', label: 'Salaries' },
  { id: 'WAGES', label: 'Wages' },
  { id: 'LOCUM', label: 'Locum' },
  { id: 'TRANSPORT', label: 'Transport' },
  { id: 'SECURITY', label: 'Security & Alarm' },
  { id: 'MAINTENANCE', label: 'Maintenance' },
  { id: 'CATERING', label: 'Catering' },
  { id: 'BANK_CHARGES', label: 'Bank Charges' },
  { id: 'LICENSING', label: 'Licensing' },
  { id: 'MARKETING', label: 'Marketing' },
  { id: 'LEGAL_FEES', label: 'Legal Fees' },
  { id: 'COMMUNICATION', label: 'Communication' },
  { id: 'RENT', label: 'Rent' },
  { id: 'UTILITIES', label: 'Utilities (Water & Elec)' }
];

// Fallback utility URL base (Update this matching your internal URL router structures if serving via a distinct proxy subpath)
const API_BASE_URL = '/api/expenses/';

export default function ExpensesManagement() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '', category: 'SALARIES', behavior: 'Fixed',
    date: new Date().toISOString().split('T')[0], amount: '', reference: '', document: null, documentName: ''
  });

  const [selectedExpense, setSelectedExpense] = useState(null);

  // Fetch data live from backend using Django Viewset filtering hooks
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let url = API_BASE_URL;
      const params = new URLSearchParams();
      
      if (activeTab !== 'ALL') {
        params.append('category', activeTab);
      }
      if (searchQuery.trim() !== '') {
        params.append('search', searchQuery);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Network error loading ledger values.');
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error("Error connecting to live ledger:", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-run whenever filter tabs or search strings change
  useEffect(() => {
    fetchExpenses();
  }, [activeTab, searchQuery]);

  // Aggregate Metrics derived cleanly from the database array state
  const currentMonthTotal = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const fixedCommitments = expenses.filter(e => e.behavior === 'Fixed').reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const unvouchedCount = expenses.filter(e => !e.document).length;

  // Handle creating a new expense voucher with multipart/form-data support
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const uploadData = new FormData();
      uploadData.append('description', formData.description);
      uploadData.append('category', formData.category);
      uploadData.append('behavior', formData.behavior);
      uploadData.append('date', formData.date);
      uploadData.append('amount', formData.amount);
      if (formData.reference) {
        uploadData.append('reference', formData.reference);
      }
      if (formData.document) {
        uploadData.append('document', formData.document);
      }

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        body: uploadData, // Browser automatically applies correct multipart form bounds header
      });

      if (!response.ok) throw new Error('Failed to post voucher ledger entry.');
      
      setIsModalOpen(false);
      setFormData({ 
        description: '', category: 'SALARIES', behavior: 'Fixed', 
        date: new Date().toISOString().split('T')[0], amount: '', reference: '', document: null, documentName: '' 
      });
      fetchExpenses(); // Reload data instantly
    } catch (error) {
      alert(error.message);
    }
  };

  const openEditRow = (expense) => {
    setSelectedExpense({ ...expense });
    setIsEditModalOpen(true);
  };

  // Handle updating payment reference and proof document records via HTTP PATCH
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updateData = new FormData();
      updateData.append('reference', selectedExpense.reference);
      
      // Only append if a new file object is selected locally
      if (selectedExpense.newFileUploaded && selectedExpense.documentFileObject) {
        updateData.append('document', selectedExpense.documentFileObject);
      }

      const response = await fetch(`${API_BASE_URL}${selectedExpense.id}/`, {
        method: 'PATCH',
        body: updateData
      });

      if (!response.ok) throw new Error('Voucher modification failed.');
      
      setIsEditModalOpen(false);
      fetchExpenses();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="p-8 w-full bg-[#f8fafc] min-h-screen font-sans">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#062e3d] uppercase">General Ledger Expenditures</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">Record operational cash outflows and upload payment proofs.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#051924] hover:bg-[#0c2a3a] text-[#00f2fe] border border-[#00f2fe]/20 text-xs font-bold px-5 py-2.5 rounded-md tracking-wider flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={14} /> RECORD NEW EXPENSE
        </button>
      </div>

      {/* METRIC BADGES CARD GROUP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">TOTAL CURRENT VIEW OPEX</span>
          <h2 className="text-2xl font-bold text-[#051924] italic">
            KES {currentMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">FIXED OBLIGATIONS RETRIEVED</span>
          <h2 className="text-2xl font-bold text-[#051924] italic">
            KES {fixedCommitments.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">UNVOUCHED ALERTS</span>
          <h2 className={`text-2xl font-bold italic ${unvouchedCount > 0 ? 'text-rose-500' : 'text-slate-800'}`}>
            {unvouchedCount} BATCHES
          </h2>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="mb-6 max-w-md relative">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
        <input 
          type="text" 
          placeholder="Search main ledger inventory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white text-xs border border-slate-200 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium placeholder:text-slate-300"
        />
      </div>

      {/* TWO-COLUMN SIDE SELECTION LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT-SIDE CATEGORY NAVIGATION */}
        <div className="w-full lg:w-64 bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-1 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-3 mb-2 block">Ledger Filter</span>
          {EXPENSE_CATEGORIES.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#051924] text-[#00f2fe] shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* MAIN DATA TABLE VIEW */}
        <div className="flex-1 w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc]/60 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-4">Expense Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Status / Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs text-slate-600 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      Syncing Ledger Database Rows...
                    </td>
                  </tr>
                ) : expenses.length > 0 ? (
                  expenses.map((exp) => (
                    <tr 
                      key={exp.id} 
                      onClick={() => openEditRow(exp)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <td className="p-4">
                        <span className="font-bold text-[#051924] block text-sm group-hover:text-teal-600 transition-colors uppercase">
                          {exp.description}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
                          ID: EXP-{exp.id} • REF: {exp.reference || 'PENDING_SORT'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-block bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded text-[9px] uppercase">
                          {exp.category_display || exp.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs ${exp.behavior === 'Fixed' ? 'text-indigo-600' : 'text-teal-600'}`}>
                          {exp.behavior_display || exp.behavior}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-400">{exp.date}</td>
                      <td className="p-4 text-right font-bold text-[#051924] italic text-sm">
                        KES {parseFloat(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {exp.document ? (
                          <div 
                            onClick={() => openEditRow(exp)}
                            className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer max-w-[120px] truncate"
                            title={exp.document_name || "Verified Receipt"}
                          >
                            <FileText size={12} /> {exp.document_name || "Verified"}
                          </div>
                        ) : (
                          <button 
                            onClick={() => openEditRow(exp)}
                            className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-md text-[10px] font-bold border border-rose-100 uppercase animate-pulse"
                          >
                            <AlertTriangle size={11} /> Missing Proof
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-slate-300 text-xs font-bold uppercase italic">
                      No matching database logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ROW EDIT ACTION MODAL OVERLAY */}
      {isEditModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 bg-[#051924]/40 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="bg-[#051924] text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#00f2fe]">Settle / Update Expense Record</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{selectedExpense.description}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition text-sm">✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Transaction Ref / Check ID</label>
                <input 
                  type="text" required
                  placeholder="e.g., MPESA Ref or Cheque Number"
                  value={selectedExpense.reference === 'PENDING_SORT' ? '' : selectedExpense.reference || ''}
                  onChange={(e) => setSelectedExpense({...selectedExpense, reference: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Upload Payment Receipt Proof</label>
                <label className="flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50 h-[38px] cursor-pointer hover:bg-slate-100 transition text-[11px] font-bold text-slate-500">
                  <Paperclip size={12} className="mr-1.5 text-slate-400" />
                  <span className="truncate max-w-[250px]">
                    {selectedExpense.document_name || selectedExpense.document || "Attach Receipt File"}
                  </span>
                  <input 
                    type="file" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if(file) {
                        setSelectedExpense({
                          ...selectedExpense, 
                          document_name: file.name,
                          documentFileObject: file,
                          newFileUploaded: true
                        });
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="button" onClick={() => setIsEditModalOpen(false)}
                  className="border border-slate-200 text-slate-500 text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button 
                  type="submit"
                  className="bg-[#051924] text-[#00f2fe] text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#0c2a3a] transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD NEW EXPENSE MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#051924]/40 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100">
            <div className="bg-[#051924] text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#00f2fe]">Record Ledger Voucher</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Post an operating cost obligation directly to the system ledger.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition text-sm">✕</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expense Description</label>
                <input 
                  type="text" required
                  placeholder="e.g., June Water Billing Tokens"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ledger Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white font-bold text-slate-600"
                  >
                    {EXPENSE_CATEGORIES.filter(c => c.id !== 'ALL').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Schedule Type</label>
                  <select 
                    value={formData.behavior}
                    onChange={(e) => setFormData({...formData, behavior: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white font-bold text-slate-600"
                  >
                    <option value="Fixed">Fixed (Auto-Renewable)</option>
                    <option value="Variable">Variable (On-Demand)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (KES)</label>
                  <input 
                    type="number" required step="0.01" placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Posting Date</label>
                  <input 
                    type="date" required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white font-medium text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Transaction Ref</label>
                  <input 
                    type="text" placeholder="e.g., MPESA / CHQ ID"
                    value={formData.reference}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Verification Document</label>
                  <label className="flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50 h-[34px] cursor-pointer hover:bg-slate-100 transition text-[11px] font-bold text-slate-500">
                    <Paperclip size={12} className="mr-1.5 text-slate-400" />
                    <span className="truncate max-w-[150px]">
                      {formData.documentName ? formData.documentName : "Attach File"}
                    </span>
                    <input 
                      type="file" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setFormData({
                            ...formData, 
                            document: file, 
                            documentName: file.name
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="border border-slate-200 text-slate-500 text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-50 transition"
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  className="bg-[#051924] text-[#00f2fe] text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#0c2a3a] transition"
                >
                  POST VOUCHER ENTRY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}