import React, { useState, useEffect } from 'react';
import { 
  User, Phone, Mail, ShieldAlert, HeartHandshake, 
  Search, CheckCircle2, UserCheck, AlertCircle, Loader2 
} from 'lucide-react';
import API from '@/api/api';

const BillingRegistrationForm = ({ onSuccess, onCancel }) => {
  const [isReturning, setIsReturning] = useState(false);
  const [idSearchLoading, setIdSearchLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [insuranceCompanies, setInsuranceCompanies] = useState([]);

  // Registration Payload State
  const [formData, setFormData] = useState({
    id_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    email: '',
    age: '',
    gender: 'M',
    payment_mode: 'CASH',
    insurance_company_id: '',
    insurance_number: '',
    is_urgent: false,
    next_of_kin_name: '',
    next_of_kin_relationship: 'SPOUSE',
    next_of_kin_phone: ''
  });

  // Fetch insurance options for dropdown selection
  useEffect(() => {
    API.get('/insurance-companies/')
      .then(res => setInsuranceCompanies(res.data?.results || res.data || []))
      .catch(err => console.error("Failed loading insurance data matrix", err));
  }, []);

  // 🌟 Real-time lookup loop tracking the ID field when 'isReturning' is active
  useEffect(() => {
    if (!isReturning || formData.id_number.trim().length < 4) return;

    const delayDebounceFn = setTimeout(async () => {
      setIdSearchLoading(true);
      setFormError('');
      try {
        const response = await API.get(`/registrations/lookup/?search=${formData.id_number.trim()}`);
        const masterProfile = response.data;

        if (masterProfile) {
          // Autofill profile datasets & guarantee fields match historical parameters
          setFormData(prev => ({
            ...prev,
            first_name: masterProfile.first_name || '',
            middle_name: masterProfile.middle_name || '',
            last_name: masterProfile.last_name || '',
            phone: masterProfile.phone || '',
            email: masterProfile.email || '',
            age: masterProfile.age || '',
            gender: masterProfile.gender || 'M',
            payment_mode: masterProfile.payment_mode || 'CASH',
            insurance_company_id: masterProfile.insurance_company_id || '',
            insurance_number: masterProfile.insurance_number || '',
            next_of_kin_name: masterProfile.next_of_kin_name || '',
            next_of_kin_relationship: masterProfile.next_of_kin_relationship || 'SPOUSE',
            next_of_kin_phone: masterProfile.next_of_kin_phone || ''
          }));
          setSuccessMsg(`Linked to existing profile! HRN: ${masterProfile.health_record_number}`);
        }
      } catch (err) {
        // Fallback error safely handling 404 profiles
        if (err.response?.status === 404) {
          setFormError("No existing patient matches this ID. Consider creating a new file profile.");
        } else {
          setFormError("Network profile verification failed.");
        }
      } finally {
        setIdSearchLoading(false);
      }
    }, 800); // 800ms debounce buffer to limit heavy database queries while typing

    return () => clearTimeout(delayDebounceFn);
  }, [formData.id_number, isReturning]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setSubmitting(true);

    // Assemble clean structural JSON payload
    const postPayload = {
      ...formData,
      is_returning: isReturning,
      // Convert blank parameters or zeros to true null references for relational validation
      insurance_company_id: formData.payment_mode === 'INSURANCE' && formData.insurance_company_id 
        ? parseInt(formData.insurance_company_id, 10) 
        : null,
      insurance_number: formData.payment_mode === 'INSURANCE' ? formData.insurance_number : '',
      email: formData.email.trim() || null,
      middle_name: formData.middle_name.trim() || ''
    };

    try {
      await API.post('/registrations/', postPayload);
      if (onSuccess) onSuccess();
    } catch (err) {
      const errData = err.response?.data;
      if (errData && typeof errData === 'object') {
        // Flatten backend nested structural exception responses
        const serverMessages = Object.entries(errData)
          .map(([key, val]) => `${key.toUpperCase()}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ');
        setFormError(serverMessages);
      } else {
        setFormError('An unhandled system registration failure occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 max-w-4xl mx-auto font-['Inter']">
      
      {/* Title Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 font-mono">SALAMA HMS / COUNTER REGISTRY</span>
          <h2 className="text-2xl font-serif text-slate-900 font-black tracking-tight">Onboard Patient Encounter</h2>
        </div>
      </div>

      {/* 🌟 1. THE RETURNING PATIENT STATUS CHECK (Sits prominently at the top) */}
      <div className={`p-5 rounded-2xl border mb-6 transition-all flex items-center justify-between ${
        isReturning ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50/50 border-slate-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isReturning ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Returning Salama Patient?</p>
            <p className="text-xs text-slate-400 font-medium">Toggle this to automatically pull history using National ID or Passport numbers.</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={isReturning}
            onChange={(e) => {
              setIsReturning(e.target.checked);
              setFormError('');
              setSuccessMsg('');
            }}
            className="sr-only peer"
          />
          <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <form onSubmit={handleSubmitRegistration} className="space-y-6">
        
        {/* Alerts Center */}
        {formError && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2">
            <AlertCircle size={16} /> {formError}
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-100 text-green-700 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2">
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {/* Section A: Primary Identity Identification Keys */}
        <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono flex items-center gap-2">
            Identification Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">National ID / Passport Number</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  name="id_number"
                  required
                  value={formData.id_number}
                  onChange={handleInputChange}
                  placeholder="Enter identification document number..."
                  className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium uppercase"
                />
                {idSearchLoading && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={16} />
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Priority Intake Workflow</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox"
                    name="is_urgent"
                    checked={formData.is_urgent}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  Mark as Emergency / Urgent Case
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Demographics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">First Name</label>
            <input 
              type="text" required name="first_name" value={formData.first_name} onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Middle Name (Optional)</label>
            <input 
              type="text" name="middle_name" value={formData.middle_name} onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Last Name</label>
            <input 
              type="text" required name="last_name" value={formData.last_name} onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
            <input 
              type="text" name="phone" required value={formData.phone} onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Age</label>
            <input 
              type="number" name="age" required value={formData.age} onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Gender Identity</label>
            <select 
              name="gender" value={formData.gender} onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Email Address (Optional)</label>
          <input 
            type="email" name="email" value={formData.email} onChange={handleInputChange}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
            placeholder="patient@domain.com"
          />
        </div>

        {/* Section C: Financial & Billing Setup */}
        <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono flex items-center gap-2">
            Financial & Payment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment Method Mode</label>
              <select 
                name="payment_mode" value={formData.payment_mode} onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold"
              >
                <option value="CASH">Cash Settlement</option>
                <option value="INSURANCE">Insurance Underwriting</option>
              </select>
            </div>

            {formData.payment_mode === 'INSURANCE' && (
              <>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Insurance Provider</label>
                  <select 
                    name="insurance_company_id" required value={formData.insurance_company_id} onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold"
                  >
                    <option value="">-- Choose Provider --</option>
                    {insuranceCompanies.map(co => (
                      <option key={co.id} value={co.id}>{co.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Policy / Card Number</label>
                  <input 
                    type="text" name="insurance_number" required value={formData.insurance_number} onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section D: Next of Kin */}
        <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono flex items-center gap-2">
            Next of Kin Emergency Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
              <input 
                type="text" name="next_of_kin_name" required value={formData.next_of_kin_name} onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Relationship</label>
              <select 
                name="next_of_kin_relationship" value={formData.next_of_kin_relationship} onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold"
              >
                <option value="SPOUSE">Spouse</option>
                <option value="PARENT">Parent</option>
                <option value="CHILD">Child</option>
                <option value="SIBLING">Sibling</option>
                <option value="GUARDIAN">Legal Guardian</option>
                <option value="DEPENDENT">Dependent</option>
                <option value="OTHER">Other Relative</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
              <input 
                type="text" name="next_of_kin_phone" required value={formData.next_of_kin_phone} onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={submitting}
            className="px-6 py-3 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={submitting || idSearchLoading}
            className="px-8 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>Saving File Record <Loader2 className="animate-spin" size={14} /></>
            ) : (
              'Complete Onboarding'
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default BillingHome;