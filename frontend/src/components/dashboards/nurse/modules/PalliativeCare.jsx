import React, { useState } from 'react';
import { Heart, Home, Calendar, Shield, Activity, Clipboard } from 'lucide-react';

const PalliativeCare = ({ patient }) => {
    const [painLevel, setPainLevel] = useState(0);
    const [carePlan, setCarePlan] = useState({
        hospiceReferral: false,
        homeCareVisit: false,
        recurrenceSurveillance: '6-month interval'
    });

    return (
        <div className="p-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Palliative Care & Follow-up</h2>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
                        Symptom Management & Survivorship
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pain Management Section */}
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="text-rose-500" size={20} />
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Pain Assessment (NRS Scale)</h3>
                    </div>
                    
                    <div className="flex justify-between mb-4">
                        {[...Array(11).keys()].map((num) => (
                            <button
                                key={num}
                                onClick={() => setPainLevel(num)}
                                className={`w-10 h-10 rounded-xl font-black transition-all ${
                                    painLevel === num 
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 scale-110' 
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        <span>No Pain</span>
                        <span>Moderate</span>
                        <span>Worst Possible</span>
                    </div>
                </div>

                {/* Survivorship & Surveillance */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Shield className="text-blue-400" size={20} />
                        <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Survivorship Plan</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recurrence Surveillance Schedule</p>
                            <select className="bg-transparent text-lg font-black w-full outline-none">
                                <option className="text-slate-900">3-Month Follow-up</option>
                                <option className="text-slate-900">6-Month Follow-up</option>
                                <option className="text-slate-900">Annual Surveillance</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Home Care Coordination */}
                <div className="lg:col-span-2 bg-blue-50 border border-blue-100 rounded-[2.5rem] p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Home className="text-blue-600" size={20} />
                        <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Care Coordination</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CoordinationCard 
                            title="Hospice Referral" 
                            status={carePlan.hospiceReferral ? "Active" : "Pending"} 
                            icon={<Heart className="text-rose-400" size={18}/>}
                        />
                        <CoordinationCard 
                            title="Home Care Visit" 
                            status="Scheduled" 
                            icon={<Calendar className="text-blue-400" size={18}/>}
                        />
                        <CoordinationCard 
                            title="Pain Med Refill" 
                            status="Authorized" 
                            icon={<Clipboard className="text-green-400" size={18}/>}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const CoordinationCard = ({ title, status, icon }) => (
    <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
        </div>
        <p className="text-lg font-black text-slate-800">{status}</p>
    </div>
);

export default PalliativeCare;