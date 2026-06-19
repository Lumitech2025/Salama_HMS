import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CreditCard, Smartphone, Receipt, Search, Plus, 
  CheckCircle2, ArrowRight, ShieldCheck, User, 
  Loader2, X, AlertTriangle, Check, Printer, ShoppingBag
} from 'lucide-react';

// Imported Salama Cancer Centre Logo
import SalamaLogo from "@/assets/Salama Cancer Centre logo.png";

// Receives standard incoming routed properties seamlessly from active queue desk triggers
const PaymentPortal = ({ routedPatient, onClearRoute }) => {
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
  const [invoiceCounter, setInvoiceCounter] = useState(1);
  
  const [insuranceData, setInsuranceData] = useState({ company: '', policyNumber: '', preAuthCode: '' });
  const [verificationStatus, setVerificationStatus] = useState('unverified');

  const [masterCatalog, setMasterCatalog] = useState({});
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    // Clear any active background check intervals when the clerk leaves this screen
    return () => {
      if (window.mpesaIntervalId) {
        clearInterval(window.mpesaIntervalId);
        console.log("Background M-Pesa tracking loop dismantled safely.");
      }
    };
  }, []);

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

  const getInvoiceNumber = () => {
  const pad = (num) => String(num).padStart(3, '0');
  return `INV${pad(invoiceCounter)}-${selectedPatient?.health_record_number || "SCC-XXXX/XX"}`;
};

  // M-Pesa STK Handset Countdown Monitor Logic
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

  // ✨ Intercept and ingest routed components triggered globally inside the Billing Desk workflow
  useEffect(() => {
    if (routedPatient) {
      // Direct field parsing matching RegistrationRecord schema layouts
      const standardizedPatient = {
        id: routedPatient.id,
        name: routedPatient.patient_name || routedPatient.full_name || "UNREGISTERED ENCOUNTER",
        health_record_number: routedPatient.health_record_number,
        queue_id: routedPatient.token_id || routedPatient.queue_id || `Q-${routedPatient.id}`,
        phone: routedPatient.patient_id_no || routedPatient.phone || '',
        scheme: routedPatient.payment_mode || routedPatient.payment_method || 'CASH'
      };

      setSelectedPatient(standardizedPatient);
      setPhoneNumber(standardizedPatient.phone);
      
      // Sync upper interface billing mode selector tabs to matching model parameters automatically
      if (standardizedPatient.scheme.toUpperCase() === 'INSURANCE') {
        setBillingMode('insurance');
      } else {
        setBillingMode('self_pay');
        setPaymentMethod(standardizedPatient.phone ? 'mpesa' : 'cash');
      }

      setVerificationStatus('unverified');
      setPaymentStatus('idle');
      setErrorMessage('');

      // Aggregates matching dynamic bills, pharmacy prescription entries, and structural line charges
      if (routedPatient.active_bill && Array.isArray(routedPatient.active_bill.items)) {
        setCart(routedPatient.active_bill.items);
        setInvoiceId(routedPatient.active_bill.id);
      } else if (routedPatient.items && Array.isArray(routedPatient.items)) {
        setCart(routedPatient.items);
        setInvoiceId(routedPatient.id || routedPatient.invoice_id);
      } else {
        // Fallback placeholder generating clean items structure if records are separated
        const fallbackItems = [];
        if (routedPatient.service_charges) fallbackItems.push(...routedPatient.service_charges);
        if (routedPatient.pharmacy_invoice?.items) fallbackItems.push(...routedPatient.pharmacy_invoice.items);
        setCart(fallbackItems);
        setInvoiceId(routedPatient.id);
      }
    }
  }, [routedPatient]);

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

  // Live Patient Index search stream tracker
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

  // Reset/Initialize counter for this patient selection
  setInvoiceCounter(1); 

  // Logic to process the cart and invoice ID
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
      // Safely extract the unit price metric
      const itemPrice = item.price !== undefined && item.price !== null ? Number(item.price) : 0;
      
      // Safely extract the quantity metric (defaulting cleanly to 1 if missing or undefined)
      const itemQuantity = item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : 1;
      
      // Calculate line total and accumulate into the subtotal sum
      return sum + (itemPrice * itemQuantity);
    }, 0);
  }, [cart]);

  const handleRemoveService = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // ✨ EXECUTE MPESA OR PHYSICAL CASH TERMINATION SETTLEMENTS
  const handleProcessPayment = async () => {
    if (paymentMethod === 'mpesa' && (!phoneNumber || phoneNumber.trim() === '')) {
      alert("Please enter a valid M-Pesa phone number.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    if (paymentMethod === 'cash') {
      // Execute Direct Physical Cash Ledger Ingestion Workflow
      try {
        const response = await fetch(`/api/invoices/${invoiceId}/settle-cash/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            amount_paid: total,
            validated_items: cart
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to update physical cash model records.");
        }

        setPaymentStatus('success');
      } catch (err) {
        setErrorMessage(err.message || "Cash collection logging operation failed.");
        setPaymentStatus('failed');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Standard automated M-Pesa STK Flow
    try {
      setPaymentStatus('prompting'); 
      setCountdown(60);             

      // 1. FIXED: Pointed to your actual backend view route trigger path
      const response = await fetch('/api/mpesa-trigger/', {
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

      // 2. FIXED: Turned off processing state here so the overlay doesn't block the screen, 
      // allowing the prompting/countdown UI states to display correctly
      setIsProcessing(false);

      const pollInterval = setInterval(async () => {
        try {
          // 3. FIXED: Pointed to your exact lightweight backend status tracking path
          const statusResponse = await fetch(`/api/check-invoice-status/${invoiceId}/`, {
            headers: getAuthHeaders()
          });
          const statusData = await statusResponse.json();

          if (statusData.status === 'PAID') {
            clearInterval(pollInterval);
            setPaymentStatus('success');
            
            // Immediately inform the user and attach receipt data
            alert(`Payment Confirmed Successfully! M-Pesa Receipt: ${statusData.receipt_number || 'N/A'}`);
            
            // Advance the Queue Tracker to clear them from Billing instantly
            if (typeof onClearRoute === 'function') {
              onClearRoute();
            }
          } 
          else if (statusData.status === 'FAILED') {
            clearInterval(pollInterval);
            setPaymentStatus('failed');
            alert("Transaction was cancelled or rejected on the handset.");
          }
        } catch (pollError) {
          console.error("Error during background status check:", pollError);
        }
      }, 2500); // Polls every 2.5 seconds

      // 4. Safety backup window loop clearing timeout
      setTimeout(() => {
        clearInterval(pollInterval);
        setPaymentStatus((currentStatus) => {
          if (currentStatus === 'prompting') {
            alert("M-Pesa payment validation timed out. Please check your phone network or try again.");
            return 'failed';
          }
          return currentStatus;
        });
      }, 60000);

    } catch (error) {
      console.error("Payment initiation failed:", error);
      alert(error.message || "An unexpected error occurred.");
      setPaymentStatus('idle'); 
      setIsProcessing(false);
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

  const handlePrintInvoice = () => {
    window.print();
  };

  // Reset routed context state properties on clear terminal action calls
  const handleClearTerminal = () => {
    setPaymentStatus('idle');
    setSelectedPatient(null);
    setCart([]);
    setInvoiceId(null);
    setErrorMessage('');
    if (onClearRoute) onClearRoute();
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
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Active Inspected Patient Context</label>
        
        {/* Render interactive inputs only if no patient is routed to maintain workflow isolation */}
        {!selectedPatient ? (
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
        ) : (
          <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-xl text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-sm">
                {selectedPatient.name ? selectedPatient.name[0].toUpperCase() : 'P'}
              </div>
              <div>
                <span className="font-black text-slate-900 text-sm block">
                  {selectedPatient.name} 
                  <span className="ml-2 font-mono text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded text-xs font-bold">HRN: {selectedPatient.health_record_number}</span>
                </span>
                <span className="block text-slate-500 font-medium text-[11px] mt-0.5">
                  Registered Mode: <span className="font-bold text-slate-800">{selectedPatient.scheme || 'CASH'}</span> | Active Token Reference: <span className="font-mono text-slate-700 font-bold">{selectedPatient.queue_id}</span>
                </span>
              </div>
            </div>
            <button type="button" onClick={handleClearTerminal} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

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
                  <span className="text-emerald-600 font-bold block mt-0.5 text-[11px] flex items-center gap-1 justify-end">Pull Charges <ArrowRight size={11}/></span>
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
      </div>

      {/* CORE WORKFLOW AREA (HIDDEN ON PRINT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start print:hidden">
        
        {/* INTEGRATED SERVICE CHARGES & PHARMACY INVOICES MATRIX */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag size={14} className="text-slate-400" /> Aggregated System Invoices
            </h3>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[10px] font-bold">{cart.length} Combined Entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase bg-slate-50/20">
                  <th className="py-2.5 px-4 w-1/4">Origin Block</th>
                  <th className="py-2.5 px-4 w-1/2">Service Charge / Dispensed Pharmacy Item</th>
                  <th className="py-2.5 px-4 text-right w-1/4">Cost (KES)</th>
                  <th className="py-2.5 px-4 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400 font-medium">
                      {selectedPatient ? 'All clinical invoices cleared.' : 'Forward patient encounters from the Desk Queue to load pharmacy and procedural itemized logs.'}
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => {
                    const isPharmacy = (item.station || item.department || '').toUpperCase() === 'PHARMACY' || item.is_medication;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 border rounded text-[10px] font-semibold tracking-wide uppercase ${
                            isPharmacy 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {item.station || item.department || (isPharmacy ? 'PHARMACY' : 'SERVICE')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {item.service || item.item_name || item.medication_name}
                          {item.quantity && <span className="text-slate-400 ml-1.5 text-[11px]">x{item.quantity}</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {(parseFloat(item.price || item.cost || 0) * (parseInt(item.quantity || 1, 10))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button type="button" onClick={() => handleRemoveService(item.id)} className="text-slate-300 hover:text-rose-500 p-1 transition-colors">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {cart.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
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

        {/* PAYMENT SETTLEMENT AND CLEARING DASHBOARD PANEL */}
        <div className="lg:col-span-5">
          {billingMode === 'self_pay' ? (
            <div className="bg-[#020617] rounded-xl p-5 text-white shadow-sm border border-slate-800 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Settlement Breakdowns</h3>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal Consolidated Charges</span>
                    <span className="font-mono">KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-px bg-slate-800 my-1"></div>
                  <div className="flex justify-between items-end">
                    <span className="text-slate-300 font-medium">Net Payable Cost</span>
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
                    <h4 className="text-xs font-bold text-white">Payment Confirmed Successfully</h4>
                    
                  </div>
                  <button type="button" onClick={handleClearTerminal} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-2 rounded-lg text-xs font-bold transition-all">Clear Terminal</button>
                </div>
              ) : paymentStatus === 'prompting' ? (
                <div className="bg-slate-900 border border-emerald-500/20 p-4 rounded-lg text-center space-y-2">
                  <div className="flex items-center justify-center gap-2.5 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                    <Loader2 className="animate-spin" size={14} />
                    <span>Awaiting Handset STK Validation Pin...</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dispatched payload to <span className="text-white font-mono font-bold">{phoneNumber}</span>. Window window closing in <span className="text-emerald-400 font-bold">{countdown}s</span>
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
                      <CreditCard size={14} /> Cash Payment
                    </button>
                  </div>

                  {paymentMethod === 'mpesa' ? (
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
                  ) : (
                    <div className="bg-emerald-950/20 border border-emerald-800/40 p-3 rounded-lg text-xs space-y-2">
                      <label className="flex items-start gap-2.5 text-slate-400 select-none cursor-pointer">
                        <input 
                          type="checkbox" 
                          required
                          className="mt-0.5 accent-emerald-500 h-3.5 w-3.5 rounded border-slate-800 bg-slate-900"
                        />
                        <span>Confirm Payment.</span>
                      </label>
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
                        <span>PROCESSING PROTOCOL SYNC...</span>
                      </>
                    ) : (
                      <>
                        <span>{paymentMethod === 'mpesa' ? 'Execute M-Pesa STK Request' : 'Settle & Mark Paid Via Cash'}</span>
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
      {/* ✨ INVOICE GENERATOR MODAL VIEW (AUTO-ISOLATED FOR PRINT & PDF)          */}
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

          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-h-full print:w-full print:bg-white">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-slate-600" />
                <span className="text-sm font-bold text-slate-800">Official Patient Consolidated Invoice</span>
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

            <div className="p-12 overflow-y-auto font-sans text-slate-800 print:overflow-visible print:p-0 bg-white" id="salama-invoice-printable">
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <div className="flex justify-center items-center gap-3 mb-1">
                  <img src={SalamaLogo} alt="Salama Cancer Centre" className="h-14 w-auto object-contain" />
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">SALAMA CANCER CENTRE</h1>
                    <p className="text-xs font-semibold text-emerald-600 tracking-wide -mt-0.5">Holistic Cancer and Palliative Care</p>
                  </div>
                </div>
                <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase mt-2 bg-slate-100 py-1 print:bg-transparent">
                  OFFICIAL CONSOLIDATED INVOICE
                </h2>
                <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                  PO BOX 19619-40123, Kisumu, Kenya<br />
                  Tel: +254 756 364 419 | Email: scanccentre@gmail.com
                </p>
              </div>

              <div className="flex justify-between items-center my-4 text-xs font-medium border-b border-slate-100 pb-3">
                <p className="font-mono text-slate-600">
                  Invoice No: <span className="text-slate-900 font-bold">{getInvoiceNumber()}</span>
                </p>
                <p className="text-slate-600">
                  Date: <span className="text-slate-900 font-semibold">{new Date().toLocaleDateString('en-KE')}</span>
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 my-6 text-xs print:bg-transparent print:border-none print:p-0">
                <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Patient Details</h4>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                  <p className="text-slate-600">Patient Full Name:</p>
                  <p className="font-bold text-slate-900">{selectedPatient.name}</p>

                  <p className="text-slate-600">Health Record Number (HRN):</p>
                  <p className="font-mono font-bold text-slate-900">{selectedPatient.health_record_number}</p>

                  <p className="text-slate-600">Mode of Payment:</p>
                  <p className="font-bold text-slate-900 uppercase">{selectedPatient.scheme || 'CASH'}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden my-6 print:border-slate-300">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider print:bg-transparent print:border-b-2 print:border-slate-800">
                      <th className="py-3 px-4 w-1/3">Station</th>
                      <th className="py-3 px-4 w-1/2">Service/Medication</th>
                      <th className="py-3 px-4 text-right w-1/4">Cost (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 print:divide-slate-200">
                    {cart.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">
                          {item.station || item.department || 'CLINIC ENTRY'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-medium">
                          {item.service || item.item_name || item.medication_name}
                          {item.quantity && <span className="text-slate-400 ml-1">x{item.quantity}</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {(parseFloat(item.price || item.cost || 0) * (parseInt(item.quantity || 1, 10))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs print:bg-transparent print:border-none print:p-0">
                  <div className="flex justify-between text-slate-500">
                    <span>Gross charges subtotal</span>
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