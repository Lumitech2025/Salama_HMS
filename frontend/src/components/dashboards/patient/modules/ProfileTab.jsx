import React from 'react';
import { 
  User, Shield, Users, Mail, Phone, IdCard, FileText, AlertCircle, Building2
} from 'lucide-react';
 
// Relationship choice mapping to match Django choices cleanly in the UI
const RELATIONSHIP_LABELS = {
  'SPOUSE': 'Spouse',
  'PARENT': 'Parent',
  'CHILD': 'Child',
  'SIBLING': 'Sibling',
  'GUARDIAN': 'Legal Guardian',
  'DEPENDENT': 'Dependent',
  'OTHER': 'Other Relative',
};

// Gender decoding helpers
const GENDER_LABELS = {
  'M': 'Male',
  'F': 'Female',
  'O': 'Other',
  'MALE': 'Male',
  'FEMALE': 'Female'
};

const ProfileTab = ({ patientData, isLoading }) => {

  // Safeguard name extraction across different nested API structures
  const getRenderedFullName = () => {
    const data = patientData?.patient || patientData;
    
    if (data?.first_name || data?.last_name) {
      const mid = data.middle_name ? ` ${data.middle_name}` : '';
      return `${data.first_name || ''}${mid} ${data.last_name || ''}`.trim().toUpperCase();
    }
    
    // Explicitly check for an explicit full name property string
    return (data?.name || patientData?.name || 'Unknown Patient').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-24 text-slate-500">
        <span className="text-sm font-medium">Loading patient profile metrics...</span>
      </div>
    );
  }

  if (!patientData || Object.keys(patientData).length === 0) {
    return (
      <div className="w-full px-2">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 text-sm font-medium flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0 text-amber-600" />
          <span>No active patient registration context detected. Verify selection.</span>
        </div>
      </div>
    );
  }

  // Resolve direct or nested field items safely
  const corePatient = patientData.patient || patientData;
  
  const displayPhone = patientData.phone || corePatient.phone || '—';
  const displayEmail = patientData.email || corePatient.email || '—';
  
  const kinName = patientData.next_of_kin_name || corePatient.next_of_kin_name || '—';
  const kinRelation = patientData.next_of_kin_relationship || corePatient.next_of_kin_relationship || '';
  const kinPhone = patientData.next_of_kin_phone || corePatient.next_of_kin_phone || '—';

  return (
    <div className="w-full flex-1 px-2 pb-12 text-left antialiased font-sans">
      
      {/* Dynamic Header Block */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Patient Identification File</h2>
          <p className="text-xs text-slate-500">Core administrative registration variables and verification anchors.</p>
        </div>
      </div>

      {/* Main Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        
        {/* PANEL 1: PRIMARY IDENTITY CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-slate-100 to-slate-50 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200 shrink-0">
              <User size={24} className="stroke-[1.75]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">Names</span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
                {getRenderedFullName()}
              </h3>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Health Record Number</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{patientData.health_record_number || corePatient.health_record_number || '—'}</span>
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-mono">HRN</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">National ID / Passport</span>
                <span className="text-xs font-bold text-slate-800 font-mono">{patientData.id_number || corePatient.id_number || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Biological Age</span>
                <span className="text-xs font-bold text-slate-800">{patientData.age || corePatient.age ? `${patientData.age || corePatient.age} Yrs` : '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gender Label</span>
                <span className="text-xs font-semibold text-slate-700">
                  {GENDER_LABELS[String(patientData.gender || corePatient.gender).toUpperCase()] || patientData.gender || corePatient.gender || '—'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Queue ID</span>
                <span className="text-xs font-bold text-slate-700 font-mono">{patientData.queue_id || corePatient.queue_id || '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Intake Type</span>
                <span className="text-xs font-semibold text-slate-700">
                  {patientData.is_returning || corePatient.is_returning ? 'Returning Patient' : 'New Registration'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Triage Status</span>
                <span className={`text-xs font-bold ${patientData.is_urgent || corePatient.is_urgent ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {patientData.is_urgent || corePatient.is_urgent ? 'Urgent Case' : 'Normal'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: CORE COMMUNICATIONS & FINANCIAL PROFILE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs lg:col-span-2 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText size={16} className="text-slate-400" /> Patient Contact & Billing Metrics
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="p-2 bg-white rounded-lg text-slate-400 shadow-xs"><Phone size={14} /></div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Primary Phone Line</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">{displayPhone}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="p-2 bg-white rounded-lg text-slate-400 shadow-xs"><Mail size={14} /></div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Email Address</span>
                  <span className="text-xs font-semibold text-slate-800 block truncate">{displayEmail}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white border border-slate-900 rounded-xl p-4 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Shield size={12} className="text-teal-400" /> Payment Allocation Method
                </span>
                <p className="text-sm font-semibold text-slate-100">
                  {(patientData.payment_mode || corePatient.payment_mode) === 'INSURANCE' ? 'Insurance Cover Scheme' : 'Out-of-Pocket Cash'}
                </p>
              </div>

              {(patientData.payment_mode || corePatient.payment_mode) === 'INSURANCE' && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Building2 size={12} className="text-teal-400 shrink-0" />
                    <span className="text-xs text-slate-200 truncate">
                      {patientData.insurance_company_name || corePatient.insurance_company_name || patientData.insurance_company?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IdCard size={12} className="text-teal-400 shrink-0" />
                    <span className="text-xs font-mono text-slate-200 truncate">
                      No: {patientData.insurance_number || corePatient.insurance_number || '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL 3: NEXT OF KIN RELATIONAL REGISTRY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs lg:col-span-2 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users size={16} className="text-slate-400" /> Next of Kin (Emergency Proxy Reference)
            </h4>
          </div>

          {kinName !== '—' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Representative Name</span>
                <span className="text-xs font-bold text-slate-900">{kinName}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Relationship Status</span>
                <span className="text-xs font-semibold text-slate-700">
                  {RELATIONSHIP_LABELS[kinRelation] || kinRelation || '—'}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Emergency Contact Line</span>
                <span className="text-xs font-bold text-slate-800 font-mono">{kinPhone}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs font-medium text-slate-400 italic py-2">No next of kin parameters mapped to this profile index yet.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProfileTab;