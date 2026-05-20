import React, { useState } from 'react';
import { FileText, Download, ShieldCheck, Heart, Info, Landmark, Users, MapPin, Award } from 'lucide-react';

const OverviewTab = ({ patientData, chemoSessions }) => {
  const [subTab, setSubTab] = useState('overview');

  const subLinks = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'income', label: 'Income & Contribution', icon: Landmark },
    { id: 'dependants', label: 'Dependants Matrix', icon: Users },
    { id: 'kin', label: 'Next of Kin', icon: Users },
    { id: 'address', label: 'Address Base', icon: MapPin },
    { id: 'facilities', label: 'Empaneled Facilities', icon: Award }
  ];

  const renderSubView = () => {
    switch (subTab) {
      case 'overview':
        return (
          <div className="space-y-6 text-center py-12 animate-in fade-in duration-200">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
                <FileText size={40} className="stroke-[1.5]" />
              </div>
              <p className="text-slate-400 text-xs font-medium">There are no activities or flagged medical claims pending review.</p>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 text-left max-w-2xl mx-auto flex items-start gap-4">
              <div className="p-2 bg-white rounded-xl text-emerald-600 border border-emerald-100 shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Application Submitted</h4>
                <p className="text-[11px] font-mono text-emerald-700 font-semibold">Ref: CR4404733914546-2</p>
                <p className="text-xs text-slate-600 leading-relaxed font-medium pt-1">
                  You have successfully registered to the Social Health Authority. You may proceed to view linked medical care summaries or register digital care cards.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4">
              <button className="border border-blue-200 text-blue-600 hover:bg-blue-50/40 font-bold px-4 py-2.5 rounded-xl text-xs tracking-wide transition-all active:scale-95 flex items-center gap-1.5 shadow-sm">
                View Verification App
              </button>
              <button className="border border-blue-200 text-blue-600 hover:bg-blue-50/40 font-bold px-4 py-2.5 rounded-xl text-xs tracking-wide transition-all active:scale-95 flex items-center gap-1.5 shadow-sm">
                <Download size={13} /> Download SHA Certificate
              </button>
            </div>
          </div>
        );
      case 'income':
        return (
          <div className="p-6 bg-slate-50/40 border border-slate-100 rounded-2xl text-xs space-y-4 font-medium text-slate-600">
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">Statutory Premium Contribution Ledger</h4>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="p-4 bg-white border border-slate-100 rounded-xl"><p className="text-slate-400 mb-0.5">SHA Member Bracket</p><p className="font-bold text-slate-800">Formal Employment Pool</p></div>
              <div className="p-4 bg-white border border-slate-100 rounded-xl"><p className="text-slate-400 mb-0.5">Subsidy Allocation Tier</p><p className="font-bold text-slate-800">Exempt / Oncology Protocol Package</p></div>
            </div>
          </div>
        );
      case 'dependants':
        return (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">
            No attached minor or spouse dependants registered under this unique SHA account key pointer.
          </div>
        );
      case 'kin':
        return (
          <div className="p-6 bg-slate-50/40 border border-slate-100 rounded-2xl text-xs space-y-4 font-medium text-slate-600">
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">Next of Kin Point of Contact</h4>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="p-4 bg-white border border-slate-100 rounded-xl"><p className="text-slate-400 mb-0.5">Relative Name</p><p className="font-bold text-slate-800">{patientData?.next_of_kin_name || "Mary Mwiti"}</p></div>
              <div className="p-4 bg-white border border-slate-100 rounded-xl"><p className="text-slate-400 mb-0.5">Contact Line</p><p className="font-bold text-slate-800">{patientData?.next_of_kin_phone || "+254 711 222333"}</p></div>
            </div>
          </div>
        );
      case 'address':
        return (
          <div className="p-6 bg-slate-50/40 border border-slate-100 rounded-2xl text-xs space-y-1 font-medium text-slate-600">
            <p className="text-slate-400">Primary Resident Location Marker</p>
            <p className="text-sm font-bold text-slate-800">{patientData?.address || "Nyeri County, Republic of Kenya"}</p>
          </div>
        );
      case 'facilities':
        return (
          <div className="p-6 bg-slate-50/40 border border-slate-100 rounded-2xl text-xs space-y-3 font-medium text-slate-600">
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">Assigned Primary Healthcare Level Links</h4>
            <div className="p-4 bg-white border border-slate-100 rounded-xl flex justify-between items-center">
              <div><p className="font-bold text-slate-800">Salama Specialized Oncology Center</p><p className="text-[11px] text-slate-400 mt-0.5">Facility Level: Category 6 Tertiary Unit</p></div>
              <span className="bg-blue-50 text-blue-600 font-bold px-3 py-1 rounded-md border border-blue-100 text-[10px]">MAIN EMPANELED HUB</span>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300 font-['Inter']">
      
      {/* SECTION TOP COMPILATION HEADER TRACK */}
      <div className="flex justify-between items-start pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Member Care Portal Portfolio</h2>
          <p className="text-xs text-slate-400 mt-0.5">Review verified statutory profiles, enrollment numbers, and empaneled health vectors.</p>
        </div>
        <div className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 tracking-tight">
          Staged Profile Plan: {patientData?.cancer_type || 'Active Treatment Protocol'}
        </div>
      </div>

      {/* CORE INNER MATRIX SWITCH SEGMENTS */}
      <div className="flex border-b border-slate-100 gap-1 overflow-x-auto">
        {subLinks.map((tab) => {
          const Icon = tab.icon;
          const isSelected = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all relative border-b-2 -mb-[2px] ${
                isSelected 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-800'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* RENDER DYNAMIC FRAME PANEL WINDOW */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm min-h-[380px]">
        {renderSubView()}
      </div>

    </div>
  );
};

export default OverviewTab;