import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, AlertCircle, CheckCircle, 
  Printer, History, FileCheck, Loader2, User,
  CreditCard, Calendar, Activity, Zap
} from 'lucide-react';

const InsuranceVerification = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [status, setStatus] = useState('idle'); 
  const [insuranceData, setInsuranceData] = useState(null);

  const API_BASE = "http://127.0.0.1:8000/api/patients";

  useEffect(() => {
    const searchPatients = async () => {
      if (searchTerm.length < 3) {
        setSearchResults([]);
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/?search=${searchTerm}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search failed", err);
      }
    };

    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleVerify = async (patient) => {
    setStatus('loading');
    try {
      const response = await fetch(`${API_BASE}/${patient.id}/verify_insurance/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) throw new Error('Gateway Connection Failed');
      const updatedPatient = await response.json();

      setInsuranceData({
        name: updatedPatient.name,
        provider: updatedPatient.insurance_type || "SHA (Social Health Authority)",
        memberNo: updatedPatient.insurance_no || "N/A",
        scheme: "Oncology Comprehensive",
        status: updatedPatient.insurance_verified ? "Active" : "Review Required",
        validUntil: "Dec 31, 2026",
        balance: updatedPatient.benefit_balance || "0.00",
        lastVerified: new Date().toLocaleTimeString(),
      });

      setStatus('active');
      setSearchTerm('');
      setSearchResults([]);
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* Top Utility Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-teal-600" /> INSURANCE COMMAND CENTER
          </h1>
          <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Health Act Verification Gateway v2.0</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase">Gateway Status</span>
            <span className="text-xs font-bold text-teal-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-ping" /> SHA LIVE
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column: Search & Verification */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Enhanced Search Section */}
          <div className="bg-slate-900 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Search size={120} className="text-white" />
            </div>
            
            <label className="block text-teal-400 text-[10px] font-black tracking-widest uppercase mb-4">Patient Look-up</label>
            <div className="relative z-10">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter Patient Name, ID, or Registry No..." 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-6 pl-16 pr-8 text-white text-lg font-medium placeholder:text-slate-600 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all"
              />
            </div>

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute left-8 right-8 mt-2 bg-white rounded-2xl shadow-2xl z-50 border border-slate-200 divide-y divide-slate-50 overflow-hidden">
                {searchResults.map((p) => (
                  <button 
                    key={p.id}
                    onClick={() => handleVerify(p)}
                    className="w-full p-5 flex justify-between items-center hover:bg-teal-50 transition-all group"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500 font-mono tracking-tighter uppercase">{p.registry_no} • {p.phone}</p>
                      </div>
                    </div>
                    <Zap className="text-slate-300 group-hover:text-teal-500" size={18} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Result Card: The Billing Specialist's View */}
          {status === 'active' && insuranceData && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-teal-600 p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                    <CheckCircle size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{insuranceData.name}</h2>
                    <p className="text-teal-100 text-[10px] font-bold uppercase tracking-widest">{insuranceData.provider} • MEMBER ID: {insuranceData.memberNo}</p>
                  </div>
                </div>
                <div className="text-right">
                    <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase mb-1">Status: {insuranceData.status}</div>
                    <p className="text-[9px] opacity-70">Last Verified: {insuranceData.lastVerified}</p>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatCard icon={<Activity size={18}/>} label="Policy Scheme" value={insuranceData.scheme} />
                <StatCard icon={<Calendar size={18}/>} label="Valid Until" value={insuranceData.validUntil} />
                <StatCard 
                    icon={<CreditCard size={18}/>} 
                    label="Current Balance" 
                    value={`Ksh ${insuranceData.balance}`} 
                    variant="highlight" 
                />
              </div>

              <div className="px-8 pb-8 flex gap-4">
                <button className="flex-[2] bg-slate-900 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-700 transition-all shadow-lg shadow-slate-200">
                  <FileCheck size={16} /> Authorize Chemo Cycle
                </button>
                <button className="flex-1 bg-white text-slate-600 border border-slate-200 py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                  <Printer size={16} /> Print E-Slip
                </button>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
               <Loader2 className="animate-spin text-teal-600 mb-4" size={40} />
               <p className="text-slate-500 font-bold text-sm">Synchronizing with Insurance Servers...</p>
            </div>
          )}
        </div>

        {/* Right Column: Audit Trail & Analytics */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <History size={16} className="text-teal-600" /> Recent Verifications
            </h3>
            <div className="space-y-3">
              <AuditItem name="Sarah Kamau" id="SHA-902" status="Success" time="2 mins ago" />
              <AuditItem name="John Mutua" id="NHIF-112" status="Rejected" time="15 mins ago" />
              <AuditItem name="Grace Omondi" id="SHA-884" status="Success" time="1 hr ago" />
            </div>
            <button className="w-full mt-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-teal-600 border-t border-slate-50 transition-colors">
              View Full Audit Logs
            </button>
          </div>

          <div className="bg-teal-50 rounded-3xl p-6 border border-teal-100">
             <h4 className="text-[10px] font-black text-teal-700 uppercase tracking-widest mb-4">Daily Performance</h4>
             <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-teal-900">128</span>
                <span className="text-teal-600 font-bold text-xs">Claims</span>
             </div>
             <div className="w-full bg-teal-200 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-teal-600 h-full w-[75%]" />
             </div>
             <p className="text-[10px] text-teal-600 mt-2 font-bold">75% of Monthly Target Reached</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, variant }) => (
  <div className={`p-4 rounded-2xl ${variant === 'highlight' ? 'bg-teal-50 border border-teal-100' : 'bg-slate-50 border border-slate-100'}`}>
    <div className="flex items-center gap-2 text-slate-400 mb-2">
      {icon}
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <p className={`text-lg font-bold ${variant === 'highlight' ? 'text-teal-700' : 'text-slate-900'}`}>
      {value}
    </p>
  </div>
);

const AuditItem = ({ name, id, status, time }) => (
  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${status === 'Success' ? 'bg-teal-500' : 'bg-red-500'}`} />
      <div>
        <p className="text-xs font-bold text-slate-800">{name}</p>
        <p className="text-[9px] text-slate-400 uppercase font-bold">{id} • {time}</p>
      </div>
    </div>
    <span className={`text-[8px] font-black px-2 py-1 rounded-lg ${status === 'Success' ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'}`}>
      {status}
    </span>
  </div>
);

export default InsuranceVerification;