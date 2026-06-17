import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  CreditCard, Smartphone, Receipt, Search, Plus, 
  CheckCircle2, ArrowRight, ShieldCheck, User, 
  Loader2, X, Mail, MessageSquare, ArrowUpRight, Check, AlertTriangle,
  Download, Printer
} from 'lucide-react';

// Imported Salama Cancer Centre Logo
import SalamaLogo from "@/assets/Salama Cancer Centre logo.png";

const PaymentPortal = () => {
  const [billingMode, setBillingMode] = useState('self_pay'); 
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); 

  const [searchPatient, setSearchPatient] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientQueryResults, setPatientQueryResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); 

  const [cart, setCart] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [invoiceId, setInvoiceId] = useState(null);
  
  const [insuranceData, setInsuranceData] = useState({ company: '', policyNumber: '', preAuthCode: '' });
  const [verificationStatus, setVerificationStatus] = useState('unverified');

  const [masterCatalog, setMasterCatalog] = useState({});
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(60);

  // ✨ NEW: State to trigger the Invoice Document Modal Preview
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Helper to retrieve the CSRF token from Django cookies
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let timer;
    if (paymentStatus === 'prompting' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && paymentStatus === 'prompting') {
      setPaymentStatus('failed');
      setIsProcessing(false);
      setErrorMessage('M-Pesa entry window timed out. Please check mobile handset network connectivity.');
    }
    return () => clearTimeout(timer);
  }, [countdown, paymentStatus]);

  const fetchMasterCatalogPrices = useCallback(async () => {
    try {
      setIsLoadingCatalog(true);
      const response = await fetch('/api/services/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });
      if (response.ok) {
        const data = await response.json();
        const results = data.results || data;
        
        const dynamicPriceMap = {};
        if (Array.isArray(results)) {
          results.forEach(service => {
            if (service.sku || service.sku_code) {
              dynamicPriceMap[service.sku || service.sku_code] = parseFloat(service.price);
            }
          });
        }
        setMasterCatalog(dynamicPriceMap);
      }
    } catch (error) {
      console.error("Critical Failure: Master finance catalog configurations unreachable:", error);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterCatalogPrices();
  }, [fetchMasterCatalogPrices]);

  useEffect(() => {
    if (searchPatient.trim().length > 2) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const response = await fetch(`/api/billing-search/?q=${encodeURIComponent(searchPatient)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            }
          });
          if (response.ok) {
            const data = await response.json();
            setPatientQueryResults(data);
          } else {
            console.error("Search unauthorized or terminal validation failed.");
          }
        } catch (error) {
          console.error("Error communicating with HMS billing ledger:", error);
        } finally {
          setIsSearching(false);
          setHasSearched(true);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setPatientQueryResults([]);
      setHasSearched(false);
    }
  }, [searchPatient]);

  const handleSelectPatient = (patientRecord) => {
    setSelectedPatient(patientRecord);
    setPhoneNumber(patientRecord.phone || '');
    setSearchPatient('');
    setPatientQueryResults([]);
    setHasSearched(false);
    setVerificationStatus('unverified'); 
    setPaymentStatus('idle');
    setErrorMessage('');
    
    if (patientRecord.active_bill && Array.isArray(patientRecord.active_bill.items)) {
      const dynamicallyPricedCart = patientRecord.active_bill.items.map(item => {
        const fallbackPrice = parseFloat(item.price || 0);
        const dynamicMasterPrice = masterCatalog[item.sku || item.sku_code];
        
        return {
          ...item,
          price: dynamicMasterPrice !== undefined ? dynamicMasterPrice : fallbackPrice
        };
      });
      setCart(dynamicallyPricedCart);
      setInvoiceId(patientRecord.active_bill.id);
    } else {
      setCart([]);
      setInvoiceId(null);
    }
  };

  const total = useMemo(() => {
    return cart.reduce((sum, item) => {
      const itemPrice = item.price !== undefined && item.price !== null ? item.price : 0;
      return sum + (parseFloat(itemPrice) || 0);
    }, 0);
  }, [cart]);

  const handleRemoveService = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleProcessPayment = async () => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      alert("Please enter a valid M-Pesa phone number.");
      return;
    }

    try {
      setPaymentStatus('prompting'); 
      setCountdown(60);             

      const response = await fetch('/api/mpesa/trigger-push/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
          phone_number: phoneNumber,
          validated_items: cart
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate M-Pesa payment.");
      }

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/mpesa/check-status/${invoiceId}/`, {
            headers: getAuthHeaders()
          });
          const statusData = await statusResponse.json();

          if (statusData.status === 'PAID') {
            clearInterval(pollInterval);
            setPaymentStatus('success');
          } else if (statusData.status === 'UNPAID') {
            clearInterval(pollInterval);
            setPaymentStatus('failed');
            alert("Transaction was cancelled or rejected on the handset.");
          }
        } catch (pollError) {
          console.error("Error during background status check:", pollError);
        }
      }, 3000);

      setTimeout(() => {
        clearInterval(pollInterval);
        setPaymentStatus((currentStatus) => {
          if (currentStatus === 'prompting') {
            alert("M-Pesa payment validation timed out. Please check your phone or try again.");
            return 'failed';
          }
          return currentStatus;
        });
      }, 60000);

    } catch (error) {
      console.error("Payment initiation failed:", error);
      alert(error.message || "An unexpected error occurred.");
      setPaymentStatus('idle'); 
    }
  };

  const handleVerifyInsurance = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !invoiceId) return;
    setVerificationStatus('verifying');

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/verify-insurance/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          insurance_company: insuranceData.company,
          policy_number: insuranceData.policyNumber,
          pre_auth_code: insuranceData.preAuthCode,
          claim_amount: total
        })
      });

      if (response.ok) {
        setVerificationStatus('verified');
      } else {
        alert("Insurance claim pre-authorization rejected or invalid policy details.");
        setVerificationStatus('unverified');
      }
    } catch (error) {
      console.error("Network error during insurance verification:", error);
      setVerificationStatus('unverified');
    }
  };

  // ✨ NEW: Handles isolated print and download routing for window media configurations
  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 text-slate-700 font-sans p-4 print:p-0">
      
      {/* HEADER SECTION (HIDDEN ON PRINT) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a0f1d] p-5 rounded-xl border border-slate-800 shadow-sm print:hidden">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            Salama <span className="text-emerald-400">POS Billing Terminal</span>
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">System Date: {new Date().toLocaleDateString('en-KE')}</p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button 
            type="button"
            onClick={() => { setBillingMode('self_pay'); setPaymentStatus('idle'); setErrorMessage(''); }}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${billingMode === 'self_pay' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <User size={14} /> Self Pay (M-Pesa / Cash)
          </button>
          <button 
            type="button"
            onClick={() => { setBillingMode('insurance'); setPaymentStatus('idle'); setErrorMessage(''); }}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${billingMode === 'insurance' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <ShieldCheck size={14} /> Insurance Schemes
          </button>
        </div>
      </div>

      {/* PATIENT SELECTOR (HIDDEN ON PRINT) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative print:hidden">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Patient</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input 
            type="text" 
            placeholder="Type patient name, queue ID, or HRN number to fetch Patient's bills..." 
            value={searchPatient}
            onChange={(e) => setSearchPatient(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-slate-300 focus:bg-white transition-all"
          />
          {(isSearching || isLoadingCatalog) && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
        </div>

        {patientQueryResults.length > 0 && (
          <div className="absolute left-4 right-4 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden divide-y divide-slate-100">
            {patientQueryResults.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPatient(p)}
                className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{p.name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    HRN: <span className="text-slate-700 font-bold mr-2">{p.health_record_number}</span> 
                    Token: <span className="text-slate-600 font-semibold">{p.queue_id}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">{p.scheme || 'Cash/Self-Pay'}</span>
                  <span className="text-emerald-600 font-bold block mt-0.5 text-[11px] flex items-center gap-1 justify-end">Pull Charges <ArrowUpRight size={11}/></span>
                </div>
              </button>
            ))}
          </div>
        )}

        {hasSearched && patientQueryResults.length === 0 && searchPatient.trim().length > 2 && !isSearching && (
          <div className="absolute left-4 right-4 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-4 text-center text-xs text-slate-400 font-medium">
            No active outpatient encounters match your parameters.
          </div>
        )}

        {selectedPatient && (
          <div className="mt-2.5 flex items-center justify-between bg-emerald-50/40 border border-emerald-100 p-2.5 rounded-lg text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px]">
                {selectedPatient.name ? selectedPatient.name[0] : 'P'}
              </div>
              <div>
                <span className="font-bold text-slate-900">
                  {selectedPatient.name} — <span className="font-mono text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded text-[11px]">HRN: {selectedPatient.health_record_number}</span>
                </span>
                <span className="block text-slate-400 text-[10px] mt-0.5">Active Cover Link: {selectedPatient.scheme || 'Cash / Self-Pay'} | Token ID: {selectedPatient.queue_id}</span>
              </div>
            </div>
            <button type="button" onClick={() => { setSelectedPatient(null); setCart([]); setInvoiceId(null); setErrorMessage(''); }} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* CORE WORKFLOW AREA (HIDDEN ON PRINT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start print:hidden">
        
        {/* CHARGES TABLE BREAKDOWN */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Incurred Station Charges Matrix</h3>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[10px] font-bold">{cart.length} Items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase bg-slate-50/20">
                  <th className="py-2.5 px-4 w-1/4">Station</th>
                  <th className="py-2.5 px-4 w-1/2">Service / Procedure</th>
                  <th className="py-2.5 px-4 text-right w-1/4">Cost (KES)</th>
                  <th className="py-2.5 px-4 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400 font-medium">
                      {selectedPatient ? 'All station entries cleared.' : 'Select a patient above to generate the operational item ledger.'}
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 text-[10px] font-semibold tracking-wide uppercase">
                          {item.station}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{item.service}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {(parseFloat(item.price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button type="button" onClick={() => handleRemoveService(item.id)} className="text-slate-300 hover:text-rose-500 p-1 transition-colors">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {cart.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              {/* ✨ MODIFIED: Connects Draft Invoice Action to state reveal matrix */}
              <button 
                type="button" 
                onClick={() => setShowInvoiceModal(true)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all text-slate-700"
              >
                <Receipt size={13} /> Create & Preview Invoice
              </button>
              <button type="button" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all">
                <Plus size={13} /> Add Charge
              </button>
            </div>
          )}
        </div>

        {/* PAYMENT OR CLEARING CONTROL PANEL */}
        <div className="lg:col-span-5">
          {billingMode === 'self_pay' ? (
            <div className="bg-[#020617] rounded-xl p-5 text-white shadow-sm border border-slate-800 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Settlement Breakdowns</h3>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal Charges</span>
                    <span className="font-mono">KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-px bg-slate-800 my-1"></div>
                  <div className="flex justify-between items-end">
                    <span className="text-slate-300 font-medium">Net Payable</span>
                    <span className="text-xl font-bold font-mono text-white tracking-tight">
                      <span className="text-xs text-emerald-400 font-normal mr-1">KES</span>
                      {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-200 rounded-lg flex items-center gap-2.5 text-[11px]">
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {paymentStatus === 'success' ? (
                <div className="bg-emerald-950/30 border border-emerald-900 p-4 rounded-lg text-center space-y-3">
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Payment Confirmed</h4>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">REF: SAL-STK-{Math.floor(Math.random()*90000+10000)}</span>
                  </div>
                  <button type="button" onClick={() => { setPaymentStatus('idle'); setSelectedPatient(null); setCart([]); setInvoiceId(null); setErrorMessage(''); }} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-2 rounded-lg text-xs font-bold transition-all">Clear Terminal</button>
                </div>
              ) : paymentStatus === 'prompting' ? (
                <div className="bg-slate-900 border border-emerald-500/20 p-4 rounded-lg text-center space-y-2">
                  <div className="flex items-center justify-center gap-2.5 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                    <Loader2 className="animate-spin" size={14} />
                    <span>Awaiting Patient PIN Input...</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    STK push dispatched to <span className="text-white font-mono font-bold">{phoneNumber}</span>. Window expires in <span className="text-emerald-400 font-bold">{countdown}s</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => { setPaymentMethod('mpesa'); setErrorMessage(''); }}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${paymentMethod === 'mpesa' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      <Smartphone size={14} /> M-Pesa STK
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setPaymentMethod('cash'); setErrorMessage(''); }}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${paymentMethod === 'cash' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      <CreditCard size={14} /> Cash Payments
                    </button>
                  </div>

                  {paymentMethod === 'mpesa' && (
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <label className="block text-[10px] font-semibold text-slate-400">Target M-Pesa Phone Number</label>
                      <input 
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full bg-slate-950 border border-slate-800 rounded-md p-1.5 text-xs font-mono font-bold text-white outline-none focus:border-slate-600"
                        disabled={isProcessing}
                      />
                    </div>
                  )}

                  <button 
                    disabled={isProcessing || !selectedPatient || total === 0}
                    onClick={handleProcessPayment}
                    className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${isProcessing ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-950 hover:bg-emerald-400'}`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        <span>PROCESSING GATEWAY DISPATCH...</span>
                      </>
                    ) : (
                      <>
                        <span>{paymentMethod === 'mpesa' ? 'Execute STK Push Request' : 'Execute Cash Transaction'}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                  
                  {paymentStatus === 'failed' && (
                    <button 
                      type="button" 
                      onClick={() => setPaymentStatus('idle')} 
                      className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 text-[11px] py-1.5 rounded-lg font-semibold transition-all"
                    >
                      Reset Transaction State Node
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* INSURANCE VERIFICATION VIEW */
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3.5 print:hidden">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShieldCheck className="text-blue-600" size={16} />
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Pre-Authorization Validator</h3>
                  <p className="text-[10px] text-slate-400">Verify Insurance</p>
                </div>
              </div>

              <form onSubmit={handleVerifyInsurance} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500">Corporate Underwriter</label>
                  <select 
                    value={insuranceData.company}
                    onChange={(e) => setInsuranceData({...insuranceData, company: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none text-slate-800"
                    required
                    disabled={verificationStatus === 'verified'}
                  >
                    <option value="">Select Insurance Provider...</option>
                    <option value="shif">SHIF / NHIF National Cover</option>
                    <option value="jubilee">Jubilee Corporate Plan</option>
                    <option value="ga">GA Insurance Medical</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500">Policy / Member ID</label>
                    <input 
                      type="text"
                      placeholder="POL-9022"
                      value={insuranceData.policyNumber}
                      onChange={(e) => setInsuranceData({...insuranceData, policyNumber: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono outline-none text-slate-800"
                      required
                      disabled={verificationStatus === 'verified'}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500">Pre-Auth Code</label>
                    <input 
                      type="text"
                      placeholder="Optional"
                      value={insuranceData.preAuthCode}
                      onChange={(e) => setInsuranceData({...insuranceData, preAuthCode: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono outline-none text-slate-800"
                      disabled={verificationStatus === 'verified'}
                    />
                  </div>
                </div>

                {verificationStatus === 'verified' ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2 text-emerald-950 font-medium">
                    <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0"><Check size={12}/></div>
                    <div className="flex-1">
                      <span className="font-bold block text-xs">Claim Approved</span>
                      <span className="text-[10px] block text-slate-500">KES {total.toLocaleString()} authorized.</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setVerificationStatus('unverified')} 
                      className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      Reset
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={verificationStatus === 'verifying' || !selectedPatient || total === 0}
                    className={`w-full py-2 rounded-lg font-bold text-white transition-all text-center flex items-center justify-center gap-2 ${
                      verificationStatus === 'verifying' ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    {verificationStatus === 'verifying' ? (
                      <>
                        <Loader2 className="animate-spin" size={12} />
                        <span>VERIFYING POLICIES...</span>
                      </>
                    ) : (
                      <span>Run Pre-Auth Verification</span>
                    )}
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ✨ NEW: INVOICE GENERATOR MODAL VIEW (AUTO-ISOLATED FOR PRINT & PDF)      */}
      {/* ========================================================================= */}
      {showInvoiceModal && selectedPatient && (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:z-auto">
    
    <style>{`
      @media print {
        body * {
          visibility: hidden !important;
        }
        #salama-invoice-printable, #salama-invoice-printable * {
          visibility: visible !important;
        }
        #salama-invoice-printable {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: white !important;
          color: black !important;
          padding: 0px !important;
          margin: 0px !important;
        }
        @page {
          size: auto;
          margin: 15mm 20mm 15mm 20mm;
        }
      }
    `}</style>

    {/* Main Document Box */}
    <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-h-full print:w-full print:bg-white">
      
      {/* Control Bar (Hidden on print) */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden shrink-0">
        <div className="flex items-center gap-2">
          <Receipt size={16} className="text-slate-600" />
          <span className="text-sm font-bold text-slate-800">Official Patient Invoice</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintInvoice}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer size={14} /> Download / Print PDF
          </button>
          <button
            type="button"
            onClick={() => setShowInvoiceModal(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Print Content Wrapper */}
      <div 
        className="p-12 overflow-y-auto font-sans text-slate-800 print:overflow-visible print:p-0 bg-white" 
        id="salama-invoice-printable"
      >
        
        {/* 1. REPLICATED LAB HEADER: Centralized/Clean Brand Alignment with Contact Details */}
        <div className="text-center border-b-2 border-slate-800 pb-4">
          <div className="flex justify-center items-center gap-3 mb-1">
            <img 
              src={SalamaLogo} 
              alt="Salama Cancer Centre" 
              className="h-14 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">SALAMA CANCER CENTRE</h1>
              <p className="text-xs font-semibold text-emerald-600 tracking-wide -mt-0.5">Holistic Cancer and Palliative Care</p>
            </div>
          </div>
          
          <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase mt-2 bg-slate-100 py-1 print:bg-transparent">
            OFFICIAL PATIENT INVOICE
          </h2>
          
          <p className="text-[11px] text-slate-500 font-medium mt-1.5">
            PO BOX 19619-40123, Kisumu, Kenya<br />
            Tel: +254 756 364 419 | Email: scanccentre@gmail.com
          </p>
        </div>

        {/* Top Floating Metadata Row */}
        <div className="flex justify-between items-center my-4 text-xs font-medium border-b border-slate-100 pb-3">
          <p className="font-mono text-slate-600">
            {/* 2. DYNAMIC FORMAT: Prefixed with INV- followed directly by the HRN string */}
            Invoice No: <span className="text-slate-900 font-bold">INV-{selectedPatient.health_record_number || "SCC-XXXX/XX"}</span>
          </p>
          <p className="text-slate-600">
            Date: <span className="text-slate-900 font-semibold">{new Date().toLocaleDateString('en-KE')}</span>
          </p>
          {/* 3. TERMS REMOVED: (Due on Presentation row is completely gone from here) */}
        </div>

        {/* 4. MODIFIED PATIENT AREA: Payment/Coverage Scheme column completely removed */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 my-6 text-xs print:bg-transparent print:border-none print:p-0">
          <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Patient Details</h4>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
            <p className="text-slate-600">Patient Full Name:</p>
            <p className="font-bold text-slate-900">{selectedPatient.name}</p>

            <p className="text-slate-600">Health Record Number (HRN):</p>
            <p className="font-mono font-bold text-slate-900">{selectedPatient.health_record_number}</p>

            {phoneNumber && (
              <>
                <p className="text-slate-600">Phone Account:</p>
                <p className="font-medium text-slate-900">{phoneNumber}</p>
              </>
            )}
          </div>
        </div>

        {/* Invoice Lines Table Matrix */}
        <div className="border border-slate-200 rounded-lg overflow-hidden my-6 print:border-slate-300">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider print:bg-transparent print:border-b-2 print:border-slate-800">
                <th className="py-3 px-4 w-1/3">Originating Department / Station</th>
                <th className="py-3 px-4 w-1/2">Service / Procedure Rendered</th>
                <th className="py-3 px-4 text-right w-1/4">Cost (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 print:divide-slate-200">
              {cart.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">
                    {item.station}
                  </td>
                  <td className="py-3 px-4 text-slate-900 font-medium">{item.service}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {(parseFloat(item.price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Aggregations Block */}
        <div className="mt-4 flex justify-end">
          <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs print:bg-transparent print:border-none print:p-0">
            <div className="flex justify-between text-slate-500">
              <span>Gross Charges Subtotal</span>
              <span className="font-mono font-semibold">KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="h-px bg-slate-200 my-1 print:bg-slate-400"></div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm font-bold text-slate-900">Total Balance Due</span>
              <span className="text-xl font-bold font-mono text-slate-900 border-b-4 border-double border-slate-900 pb-0.5">
                <span className="text-xs font-normal mr-0.5">KES</span>
                {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Declarations */}
        <div className="mt-16 pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 font-medium space-y-1 print:mt-24">
          <p className="text-slate-600 font-semibold">Thank you for choosing Salama Cancer Centre.</p>
          <p className="font-mono text-[9px]">Report Generated Electronically - Salama HMS Billing Platform</p>
        </div>

      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default PaymentPortal;