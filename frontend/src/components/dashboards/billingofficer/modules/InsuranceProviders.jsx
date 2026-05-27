import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Instantiated API Interceptor configuration utilizing system token routing fallbacks
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // Adjusted to match your target backend deployment port
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically inject valid tokens dynamically on every transaction request lifecycle
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token') || 
                localStorage.getItem('access') || 
                localStorage.getItem('salama_access_token') || 
                localStorage.getItem('token') || 
                localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// 🚀 FIXED: Configuration constants mapped precisely to your Django model choices matrix
const PAYER_TYPES = [
  { value: 'COMMERCIAL', label: 'Private Commercial Insurance' },
  { value: 'STATUTORY', label: 'State/Statutory Payer (e.g., SHA / SHIF)' },
  { value: 'CORPORATE_DIRECT', label: 'Corporate Direct Self-Funded Account' },
  { value: 'SUBSIDIZED', label: 'Low-Tier Subsidized / NGO Programs' }
];

const TARIFF_OPTIONS = [
  { value: 'Standard Cash Rates Base', label: 'Standard Cash Rates Base' },
  { value: 'Negotiated Corporate Tariff', label: 'Negotiated Corporate Tariff' },
  { value: 'NHIF/SHA Capitation Matrix', label: 'NHIF/SHA Capitation Matrix' }
];

const SCHEME_CLASSIFICATIONS = [
  { value: 'CORPORATE', label: 'Corporate Tier' },
  { value: 'INDIVIDUAL', label: 'Individual Retail' },
  { value: 'MANAGED_CARE', label: 'Managed Care / Capitation' }
];

export default function InsuranceProvider() {
  // Global View & UI Management States
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  
  // 🚀 FIXED: State initialization only allows a single structural value primitive
  const [activeTab, setActiveTab] = useState('details'); // details | schemes | contact | contract
  const [searchTerm, setSearchTerm] = useState('');
  
  // Notice Banner Handling
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('error'); // error | success | info

  // Unified State Tree mapping baseline primitives cleanly
  const [formData, setFormData] = useState({
    name: '',
    payer_code: '',
    payer_type: 'COMMERCIAL',
    kra_pin: '',
    api_endpoint: '',
    physical_address: '',
    postal_address: '',
    contact_person: '',
    contact_role: '',
    email: '',
    phone: '',
    contract_start_date: '',
    contract_end_date: '',
    price_list_tariff: 'Standard Cash Rates Base',
    claim_submission_window: 90,
    corporate_discount_rate: 0.00,
    schemes: [] 
  });

  // Track SLA File attachments separately to route cleanly to multipart handlers
  const [slaFile, setSlaFile] = useState(null);

  // Initialize Data Matrix on component mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/insurance-companies/');
      // Fallback configuration processing arrays safely if backend uses standard DRF or raw lists
      const data = response.data.results || response.data;
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      triggerAlert('Failed to load corporate profiles registry from API service.', 'error');
    }
  };

  const triggerAlert = (msg, type = 'error') => {
    setAlertMessage(msg);
    setAlertType(type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Synchronize dynamic updates directly into the main consolidated state tree
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle initialization setup for empty fresh profiles
  const handleAddNewCompany = () => {
    setSelectedCompany(null);
    setSlaFile(null);
    setActiveTab('details');
    setFormData({
      name: '',
      payer_code: '',
      payer_type: 'COMMERCIAL',
      kra_pin: '',
      api_endpoint: '',
      physical_address: '',
      postal_address: '',
      contact_person: '',
      contact_role: '',
      email: '',
      phone: '',
      contract_start_date: new Date().toISOString().split('T')[0],
      contract_end_date: '',
      price_list_tariff: 'Standard Cash Rates Base',
      claim_submission_window: 90,
      corporate_discount_rate: 0.00,
      schemes: []
    });
  };

  // Map active targets directly into editing memory safely
  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
    setSlaFile(null);
    setFormData({
      ...company,
      payer_type: company.payer_type || 'COMMERCIAL',
      price_list_tariff: company.price_list_tariff || 'Standard Cash Rates Base',
      claim_submission_window: company.claim_submission_window || 90,
      corporate_discount_rate: company.corporate_discount_rate ? parseFloat(company.corporate_discount_rate) : 0.00,
      schemes: company.schemes ? [...company.schemes] : []
    });
  };

  // --- Dynamic Inline Sub-Plan Array Handlers ---
  const handleAddSchemeRow = () => {
    const tempId = `temp-${Date.now()}`;
    const freshScheme = {
      id: tempId,
      name: '',
      classification: 'CORPORATE',
      preauth_threshold: 50000.00,
      copay_amount: 0.00,
      shif_coordination: false,
      is_active: true
    };
    setFormData(prev => ({
      ...prev,
      schemes: [...prev.schemes, freshScheme]
    }));
  };

  const handleSchemeRowChange = (index, field, value) => {
    setFormData(prev => {
      const updatedSchemes = [...prev.schemes];
      updatedSchemes[index] = {
        ...updatedSchemes[index],
        [field]: value
      };
      return { ...prev, schemes: updatedSchemes };
    });
  };

  const handleRemoveSchemeRow = (index) => {
    setFormData(prev => ({
      ...prev,
      schemes: prev.schemes.filter((_, i) => i !== index)
    }));
  };

  // --- Unified API Submission Management ---
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    
    if (!formData.name || !formData.payer_code) {
      triggerAlert('Validation Error: Corporate Identity Name and Unique Payer Code are mandatory properties.', 'error');
      return;
    }

    const processedPayload = {
      ...formData,
      claim_submission_window: parseInt(formData.claim_submission_window, 10) || 90,
      corporate_discount_rate: parseFloat(formData.corporate_discount_rate) || 0.00,
      schemes: formData.schemes.map(sch => ({
        ...sch,
        classification: sch.classification || 'CORPORATE',
        shif_coordination: sch.shif_coordination === true || sch.shif_coordination === 'DEDUCT' ? 'DEDUCT' : 'NONE',
        preauth_threshold: parseFloat(sch.preauth_threshold) || 0.00,
        copay_amount: parseFloat(sch.copay_amount) || 0.00
      }))
    };

    try {
      let savedCompanyId = null;

      if (selectedCompany?.id) {
        const response = await api.put(`/insurance-companies/${selectedCompany.id}/`, processedPayload);
        savedCompanyId = response.data.id;
        triggerAlert(`Corporate details for ${response.data.name} updated successfully.`, 'success');
      } else {
        const response = await api.post('/insurance-companies/', processedPayload);
        savedCompanyId = response.data.id;
        triggerAlert(`New corporate profile for ${response.data.name} initialized successfully.`, 'success');
      }

      // Handle binary file stream routing sequentially if a physical file payload asset exists
      if (savedCompanyId && slaFile) {
        const fileForm = new FormData();
        fileForm.append('sla_document', slaFile);
        await api.post(`/insurance-companies/${savedCompanyId}/upload-sla/`, fileForm, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      await fetchCompanies();
      setSlaFile(null);
    } catch (err) {
      const serverErrors = err.response?.data;
      let errorString = "Failed to update corporate configurations profile database fields.";
      
      if (serverErrors && typeof serverErrors === 'object') {
        errorString = Object.entries(serverErrors)
          .map(([key, val]) => `${key.toUpperCase()}: ${Array.isArray(val) ? val.join(' ') : JSON.stringify(val)}`)
          .join(' | ');
      }
      triggerAlert(errorString, 'error');
    }
  };

  const navigateTab = (targetTab) => {
    setActiveTab(targetTab);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Main Workspace Frame */}
      <div style={{ flex: 1, padding: '40px' }}>
        
        {/* Operational Notice Banner */}
        {alertMessage && (
          <div style={{
            padding: '15px 20px',
            backgroundColor: alertType === 'error' ? '#ffebee' : alertType === 'success' ? '#e8f5e9' : '#e3f2fd',
            color: alertType === 'error' ? '#c62828' : alertType === 'success' ? '#2e7d32' : '#0277bd',
            borderRadius: '6px',
            marginBottom: '30px',
            borderLeft: `5px solid ${alertType === 'error' ? '#c62828' : alertType === 'success' ? '#2e7d32' : '#0277bd'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: '500' }}>{alertMessage}</span>
            <button type="button" onClick={() => setAlertMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>Dismiss</button>
          </div>
        )}

        {/* View Header Bar Component */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ color: '#0a192f', margin: 0, fontSize: '28px' }}>Insurance Companies & Payers</h1>
            <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Configure corporate insurance engines, scheme coverage parameters, and revenue coordination thresholds.</p>
          </div>
          <button type="button" onClick={handleAddNewCompany} style={{ backgroundColor: '#009688', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            + Add New Company
          </button>
        </div>

        {/* Core Workspace Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px' }}>
          
          {/* Left Navigation Master Lookup Desk */}
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: 'fit-content' }}>
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {companies.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(company => (
                <div
                  key={company.id}
                  onClick={() => handleSelectCompany(company)}
                  style={{
                    padding: '12px 15px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: selectedCompany?.id === company.id ? '#e0f2f1' : '#f8fafc',
                    borderLeft: selectedCompany?.id === company.id ? '4px solid #009688' : '4px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#334155' }}>{company.name || "Unnamed Payer"}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Code: {company.payer_code} | Schemes: {company.schemes?.length || 0}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Work Desk Form Window Workspace */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            
            {/* Tab Multi-Switch Track */}
            <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <button type="button" onClick={() => navigateTab('details')} style={{ flex: 1, padding: '15px', border: 'none', background: activeTab === 'details' ? '#fff' : 'transparent', borderBottom: activeTab === 'details' ? '3px solid #009688' : '3px solid transparent', fontWeight: 'bold', color: activeTab === 'details' ? '#009688' : '#64748b', cursor: 'pointer' }}>Company Details</button>
              <button type="button" onClick={() => navigateTab('schemes')} style={{ flex: 1, padding: '15px', border: 'none', background: activeTab === 'schemes' ? '#fff' : 'transparent', borderBottom: activeTab === 'schemes' ? '3px solid #009688' : '3px solid transparent', fontWeight: 'bold', color: activeTab === 'schemes' ? '#009688' : '#64748b', cursor: 'pointer' }}>Schemes & Benefits</button>
              <button type="button" onClick={() => navigateTab('contact')} style={{ flex: 1, padding: '15px', border: 'none', background: activeTab === 'contact' ? '#fff' : 'transparent', borderBottom: activeTab === 'contact' ? '3px solid #009688' : '3px solid transparent', fontWeight: 'bold', color: activeTab === 'contact' ? '#009688' : '#64748b', cursor: 'pointer' }}>Contact Routing</button>
              <button type="button" onClick={() => navigateTab('contract')} style={{ flex: 1, padding: '15px', border: 'none', background: activeTab === 'contract' ? '#fff' : 'transparent', borderBottom: activeTab === 'contract' ? '3px solid #009688' : '3px solid transparent', fontWeight: 'bold', color: activeTab === 'contract' ? '#009688' : '#64748b', cursor: 'pointer' }}>Contract Rules & SLA</button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ padding: '30px' }}>
              
              {/* TAB CONTENT: Basic Corporate Identity Profiles */}
              {activeTab === 'details' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Legal Corporate Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Unique Payer Code</label>
                    <input type="text" name="payer_code" value={formData.payer_code} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Payer Classification Category</label>
                    <select name="payer_type" value={formData.payer_type} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      {PAYER_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>KRA Tax PIN</label>
                    <input type="text" name="kra_pin" value={formData.kra_pin || ''} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Verification API Link (Eligibility Sync)</label>
                    <input type="text" name="api_endpoint" value={formData.api_endpoint || ''} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Physical Headquarters Address</label>
                    <input type="text" name="physical_address" value={formData.physical_address || ''} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Official Postal Address</label>
                    <input type="text" name="postal_address" value={formData.postal_address || ''} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Nested Multi-Plan Matrix Rows */}
              {activeTab === 'schemes' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: '#334155' }}>Configured Coverage Sub-Plans</h3>
                    <button type="button" onClick={handleAddSchemeRow} style={{ backgroundColor: '#0288d1', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>+ Append New Scheme Line</button>
                  </div>
                  
                  {formData.schemes.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1', borderRadius: '6px' }}>No policy schemes attached to this corporate profile yet. Click above to append tracking matrices.</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>
                            <th style={{ padding: '8px' }}>Scheme Name / Brochure Identifier</th>
                            <th style={{ padding: '8px' }}>Classification</th>
                            <th style={{ padding: '8px' }}>Pre-Auth Cap ($)</th>
                            <th style={{ padding: '8px' }}>Co-Pay Fixed ($)</th>
                            <th style={{ padding: '8px' }}>SHA Split</th>
                            <th style={{ padding: '8px' }}>Active Status</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.schemes.map((scheme, idx) => (
                            <tr key={scheme.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '6px' }}><input type="text" value={scheme.name} onChange={(e) => handleSchemeRowChange(idx, 'name', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} required placeholder="e.g. JCare Johari Plan A" /></td>
                              <td style={{ padding: '6px' }}>
                                <select value={scheme.classification} onChange={(e) => handleSchemeRowChange(idx, 'classification', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                                  {SCHEME_CLASSIFICATIONS.map(sc => <option key={sc.value} value={sc.value}>{sc.label}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '6px' }}><input type="number" value={scheme.preauth_threshold} onChange={(e) => handleSchemeRowChange(idx, 'preauth_threshold', e.target.value)} style={{ width: '85px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></td>
                              <td style={{ padding: '6px' }}><input type="number" value={scheme.copay_amount} onChange={(e) => handleSchemeRowChange(idx, 'copay_amount', e.target.value)} style={{ width: '75px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></td>
                              <td style={{ padding: '6px', textAlign: 'center' }}><input type="checkbox" checked={scheme.shif_coordination === 'DEDUCT' || scheme.shif_coordination === true} onChange={(e) => handleSchemeRowChange(idx, 'shif_coordination', e.target.checked)} /></td>
                              <td style={{ padding: '6px', textAlign: 'center' }}><input type="checkbox" checked={scheme.is_active} onChange={(e) => handleSchemeRowChange(idx, 'is_active', e.target.checked)} /></td>
                              <td style={{ padding: '6px', textAlign: 'center' }}><button type="button" onClick={() => handleRemoveSchemeRow(idx)} style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>❌</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: Contact Escalations & Communications */}
              {activeTab === 'contact' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Contact Person Name</label>
                    <input type="text" name="contact_person" value={formData.contact_person || ''} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Designation / Role</label>
                    <input type="text" name="contact_role" value={formData.contact_role || ''} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Department Email Address (Claims Dispatch)</label>
                    <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Escalation Hotline Number</label>
                    <input type="text" name="phone" value={formData.phone || ''} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              )}

              {/* TAB CONTENT: SLA Operational Governance Fields */}
              {activeTab === 'contract' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Contract Commencing Date</label>
                    <input type="date" name="contract_start_date" value={formData.contract_start_date || ''} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Contract Termination Date</label>
                    <input type="date" name="contract_end_date" value={formData.contract_end_date || ''} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Baseline Tariff Matrix</label>
                    <select name="price_list_tariff" value={formData.price_list_tariff} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      {TARIFF_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Claims Submission Window (Days)</label>
                    <input type="number" name="claim_submission_window" value={formData.claim_submission_window} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Global Corporate Discount Rate (%)</label>
                    <input type="number" step="0.01" name="corporate_discount_rate" value={formData.corporate_discount_rate} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  
                  <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Executed Contract Copy (SLA PDF)</label>
                    <div style={{ padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                      <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setSlaFile(e.target.files[0])} style={{ marginBottom: '5px' }} />
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Accepted formats: PDF, DOCX up to 15MB. {formData.sla_document && <span style={{ color: '#009688', fontWeight: 'bold' }}>✓ Active SLA link stored on server</span>}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Unified Workspace Form Submission Trigger Block */}
              <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ backgroundColor: '#004d40', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Save Profiles Database
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}