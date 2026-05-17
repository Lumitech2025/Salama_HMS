import React, { useState, useEffect } from 'react';
import API from '@/api/api';
import { Users, Plus, Phone, MapPin, Building2, UserPlus, Loader2 } from 'lucide-react';

const ReferralNetwork = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Intake State
  const [formData, setFormData] = useState({
    facility_or_doctor_name: '',
    partner_type: 'PRIVATE_CLINIC',
    contact_phone: '',
    email_address: '',
    location_base: ''
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await API.get('/referral-partners/');
      setPartners(res.data.results || res.data || []);
    } catch (err) {
      console.error("Error connecting with partner registries:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/referral-partners/', formData);
      alert("Healthcare provider partner successfully mapped to Salama CRM.");
      setFormData({
        facility_or_doctor_name: '',
        partner_type: 'PRIVATE_CLINIC',
        contact_phone: '',
        email_address: '',
        location_base: ''
      });
      fetchPartners();
    } catch (err) {
      alert("Error adding provider to medical network directory.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left font-['Inter']">
      
      {/* HEADER CONTENT ROW */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="text-teal-600" size={24} /> Referral Provider Network
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Maintain regional clinic integrations, map referring medical practitioners, and view incoming patient pipeline volumes.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: PROVIDER ONBOARDING FORM FRAMEWORK (5 Columns) */}
        <form onSubmit={handleSubmit} className="xl:col-span-5 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-2 flex items-center gap-2">
            <UserPlus size={16} className="text-teal-500" /> Onboard External Referring Partner
          </h4>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Clinician or Facility Name</label>
            <div className="relative">
              <Building2 size={12} className="absolute left-3.5 top-4 text-slate-400" />
              <input 
                type="text" 
                name="facility_or_doctor_name"
                value={formData.facility_or_doctor_name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Dr. Jane Kinyua (Meru Medical Clinic)"
                className="w-full bg-slate-50/70 border border-slate-100 rounded-xl pl-9 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Provider Classification</label>
            <select 
              name="partner_type"
              value={formData.partner_type}
              onChange={handleInputChange}
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-3 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
            >
              <option value="PRIVATE_CLINIC">Private Medical Practitioner / Clinic</option>
              <option value="COUNTY_HOSPITAL">County Referral Hospital Unit</option>
              <option value="CHV_NETWORK">Community Health Volunteer Network</option>
              <option value="ALUMNI_PATIENT">Patient Advocate / Survivor</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Contact Phone</label>
              <div className="relative">
                <Phone size={12} className="absolute left-3.5 top-4 text-slate-400" />
                <input 
                  type="text" 
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., +254 712 345678"
                  className="w-full bg-slate-50/70 border border-slate-100 rounded-xl pl-9 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Geographic Base</label>
              <div className="relative">
                <MapPin size={12} className="absolute left-3.5 top-4 text-slate-400" />
                <input 
                  type="text" 
                  name="location_base"
                  value={formData.location_base}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Maua, Meru"
                  className="w-full bg-slate-50/70 border border-slate-100 rounded-xl pl-9 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Email Address (Optional)</label>
            <input 
              type="email" 
              name="email_address"
              value={formData.email_address}
              onChange={handleInputChange}
              placeholder="e.g., info@meruhealthclinic.co.ke"
              className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-slate-900 text-teal-400 font-semibold py-3.5 rounded-xl text-xs tracking-wider hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> MAPPING PARTNER...
              </>
            ) : "Register Medical Provider"}
          </button>
        </form>

        {/* RIGHT COLUMN: INTEGRATED CRM PROVIDERS INTERACTIVE GRID (7 Columns) */}
        <div className="xl:col-span-7 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm min-h-[520px] flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-4">Network Activity Ledger</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    <th className="p-3 px-4 font-semibold text-left">Medical Provider / Facility</th>
                    <th className="p-3 font-semibold text-left">Location</th>
                    <th className="p-3 text-center font-semibold">Patients Referred</th>
                    <th className="p-3 text-right px-4 font-semibold">Engagement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="4" className="p-12 text-center text-slate-400 animate-pulse font-medium">Synchronizing health provider maps...</td></tr>
                  ) : partners.length > 0 ? partners.map((partner, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors animate-in fade-in duration-200">
                      <td className="p-4 px-4 text-left">
                        <p className="font-semibold text-slate-800">{partner.facility_or_doctor_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {partner.contact_phone} • {partner.partner_type_display || partner.partner_type.replace('_', ' ')}
                        </p>
                      </td>
                      <td className="p-4 text-left">
                        <span className="font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100/70">{partner.location_base}</span>
                      </td>
                      <td className="p-4 text-center font-semibold font-mono text-slate-800">
                        {partner.total_patients_referred || 0} Cases
                      </td>
                      <td className="p-4 text-right px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                          partner.is_active_engagement 
                            ? 'bg-teal-50 text-teal-600 border-teal-100' 
                            : 'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                          {partner.is_active_engagement ? "Active Link" : "Dormant"}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-400 font-medium">
                        No healthcare partners mapped in the database tracking loop.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-left px-2 border-t border-slate-50 pt-3">
            * Referral counts are incremented automatically when incoming triage cases record their respective partner facility ID during the intake process.
          </p>
        </div>

      </div>

    </div>
  );
};

export default ReferralNetwork;