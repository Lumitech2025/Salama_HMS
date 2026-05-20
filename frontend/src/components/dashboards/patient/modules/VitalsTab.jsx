import React from 'react';
import { Activity, Thermometer, Heart, Scale } from 'lucide-react';

const VitalsTab = ({ vitals }) => {
  const latestVitals = vitals[0] || {};

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-300 font-['Inter']">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Personal Health Parameters & Vitals</h2>
        <p className="text-xs text-slate-400 mt-0.5">Biometric logs compiled by triage nursing teams during clinical check-ins.</p>
      </div>

      {/* LATEST CAPTURED VITALS QUICK READ CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Blood Pressure / Baseline', value: latestVitals.blood_pressure || '—', sub: 'Systolic/Diastolic Index', icon: Heart, color: 'text-rose-600 bg-rose-50' },
          { label: 'Pulse Rate Count', value: latestVitals.pulse_rate ? `${latestVitals.pulse_rate} bpm` : '—', sub: 'Heart Cycle Frequency', icon: Activity, color: 'text-teal-600 bg-teal-50' },
          { label: 'Last Logged Weight Index', value: latestVitals.weight ? `${latestVitals.weight} kg` : '—', sub: 'Dosage Mass Coefficient', icon: Scale, color: 'text-blue-600 bg-blue-50' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm text-left">
            <div className={`p-2 rounded-xl w-fit mb-4 ${card.color}`}><card.icon size={16} /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{card.label}</p>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">{card.value}</h3>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* LONGITUDINAL SYSTEM LEDGER TABLE */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4">Historical Triage Parameter Registry</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-600">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                <th className="p-3 px-4 font-semibold text-left">Assessment Date Frame</th>
                <th className="p-3 font-semibold text-center">Blood Pressure</th>
                <th className="p-3 font-semibold text-center">Heart Rate</th>
                <th className="p-3 font-semibold text-center">Temperature</th>
                <th className="p-3 text-right px-4 font-semibold">Body Mass Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vitals.length > 0 ? vitals.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                  <td className="p-4 px-4 text-left font-medium text-slate-500">{item.created_at?.slice(0, 10) || 'Clinical Triage Check'}</td>
                  <td className="p-4 text-center font-mono font-bold text-slate-800">{item.blood_pressure || '—'}</td>
                  <td className="p-4 text-center font-mono text-slate-600">{item.pulse_rate ? `${item.pulse_rate} bpm` : '—'}</td>
                  <td className="p-4 text-center font-mono text-slate-600">{item.temperature ? `${item.temperature} °C` : '—'}</td>
                  <td className="p-4 text-right px-4 font-mono font-bold text-blue-600">{item.weight ? `${item.weight} kg` : '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400 font-medium">
                    No longitudinal triage histories detected within database layers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default VitalsTab;