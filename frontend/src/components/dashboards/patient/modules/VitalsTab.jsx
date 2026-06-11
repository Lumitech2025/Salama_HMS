import React from 'react';
import { CheckCircle2, Activity, Thermometer, Heart, Scale, Percent, MoveUp, HelpCircle, Wind } from 'lucide-react';

const VitalsTab = ({ vitals = [], patientData }) => {
  
  // 🎯 Safely resolve the patient sub-object properties directly from context
  const corePatient = patientData?.patient || patientData;

  // Format the exact name dynamically based on what's currently in context
  const getPatientFullName = () => {
    if (!corePatient) return "LOADING PATIENT CONTEXT...";
    
    if (corePatient.first_name || corePatient.last_name) {
      const mid = corePatient.middle_name ? ` ${corePatient.middle_name}` : '';
      return `${corePatient.first_name || ''}${mid} ${corePatient.last_name || ''}`.trim().toUpperCase();
    }
    
    // Fallback for flat dictionary name structures
    if (corePatient.name) return corePatient.name.toUpperCase();
    
    return "UNKNOWN PATIENT RECORD";
  };

  const healthRecordNumber = corePatient?.health_record_number || "PENDING ISSUANCE";

  // Rely on the server-filtered vitals data array passed straight down from the parent shell
  const targetVitals = Array.isArray(vitals) ? vitals : [];

  // Helper utility to safely extract or calculate BMI on the fly if backend misses it
  const getBmiValue = (item) => {
    if (item.bmi !== undefined && item.bmi !== null && Number(item.bmi) !== 0) {
      return Number(item.bmi);
    }
    if (item.weight && item.height && Number(item.height) > 0) {
      const heightM = Number(item.height) / 100;
      return roundToTwo(Number(item.weight) / (heightM * heightM));
    }
    return 0;
  };

  // Helper utility to safely extract or calculate BSA (Mosteller Formula) on the fly
  const getBsaValue = (item) => {
    if (item.bsa !== undefined && item.bsa !== null && Number(item.bsa) !== 0) {
      return Number(item.bsa);
    }
    if (item.weight && item.height) {
      return roundToTwo(Math.sqrt((Number(item.height) * Number(item.weight)) / 3600));
    }
    return 0;
  };

  const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  // Extract the latest record 
  const latestVitals = targetVitals[0] || {};
  const latestBmi = getBmiValue(latestVitals);
  const latestBsa = getBsaValue(latestVitals);

  const renderBP = (v) => {
    if (v && v.systolic_bp && v.diastolic_bp) {
      return `${v.systolic_bp}/${v.diastolic_bp} mmHg`;
    }
    return '—';
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300 font-sans w-full max-w-none px-2 pb-12">
      
      {/* ACTIVE PATIENT WORKSPACE CONTEXT TILE */}
      <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0">
            <CheckCircle2 size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">Active Patient Workspace Context</span>
            <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">
              {getPatientFullName()}
            </h3>
            <span className="text-xs font-medium text-slate-500 block mt-0.5">
              Health Record Number: <span className="font-mono font-bold text-slate-700">{healthRecordNumber}</span>
            </span>
          </div>
        </div>
        <div className="hidden sm:block">
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Vitals View Mode Locked
          </span>
        </div>
      </div>

      <div className="pt-2">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Personal Health & Vitals
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Chronological patient biometric diagnostic readings and triage evaluations.
        </p>
      </div>

      {/* QUICK READ CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[
          { 
            label: 'Blood Pressure', 
            value: renderBP(latestVitals), 
            sub: 'Systolic / Diastolic Index', 
            icon: Heart, 
            color: 'text-rose-600 bg-rose-50 border-rose-100' 
          },
          { 
            label: 'Heart Rate', 
            value: latestVitals.heart_rate ? `${latestVitals.heart_rate} bpm` : '—', 
            sub: 'Pulse Cycle Frequency', 
            icon: Activity, 
            color: 'text-emerald-600 bg-emerald-50 border-emerald-100' 
          },
          { 
            label: 'Respiratory Rate', 
            value: latestVitals.respiratory_rate ? `${latestVitals.respiratory_rate} cpm` : '—', 
            sub: 'Breathing Excursion Frequency', 
            icon: Wind, 
            color: 'text-orange-600 bg-orange-50 border-orange-100' 
          },
          { 
            label: 'Body Temperature', 
            value: latestVitals.temperature ? `${latestVitals.temperature} °C` : '—', 
            sub: 'Core Thermal Reading', 
            icon: Thermometer, 
            color: 'text-amber-600 bg-amber-50 border-amber-100' 
          },
          { 
            label: 'Oxygen Saturation', 
            value: latestVitals.spo2 ? `${latestVitals.spo2} %` : '—', 
            sub: 'Peripheral Oxygen Saturation Index', 
            icon: Percent, 
            color: 'text-cyan-600 bg-cyan-50 border-cyan-100' 
          },
          { 
            label: 'Weight & Height', 
            value: latestVitals.weight ? `${latestVitals.weight} kg / ${latestVitals.height || '—'} cm` : '—', 
            sub: 'Gross Physical Metrics', 
            icon: Scale, 
            color: 'text-blue-600 bg-blue-50 border-blue-100' 
          },
          { 
            label: 'Body Mass Index (BMI)', 
            value: latestBmi !== 0 ? `${latestBmi} kg/m²` : '—', 
            sub: 'Calculated Body Mass Value', 
            icon: MoveUp, 
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100 font-bold' 
          },
          { 
            label: 'Body Surface Area (BSA)', 
            value: latestBsa !== 0 ? `${latestBsa} m²` : '—', 
            sub: 'Mosteller Surface Index Metric', 
            icon: HelpCircle, 
            color: 'text-purple-600 bg-purple-50 border-purple-100 font-bold' 
          },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-left flex flex-col justify-between transition-all hover:shadow-md">
            <div>
              <div className={`p-3 rounded-xl w-fit mb-4 border ${card.color}`}><card.icon size={20} /></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{card.label}</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{card.value}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-4 font-medium border-t border-slate-50 pt-2">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* LONGITUDINAL SYSTEM LEDGER TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
        <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight mb-4">
          Historical Vitals Records
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="p-4 text-left font-bold">Assessment Date</th>
                <th className="p-4 text-center font-bold">BP (mmHg)</th>
                <th className="p-4 text-center font-bold">HR (bpm)</th>
                <th className="p-4 text-center font-bold">RR (cpm)</th>
                <th className="p-4 text-center font-bold">Temp (°C)</th>
                <th className="p-4 text-center font-bold">SpO₂ (%)</th>
                <th className="p-4 text-center font-bold">Wt / Ht</th>
                <th className="p-4 text-center font-bold">BMI</th>
                <th className="p-4 text-right px-6 font-bold">BSA (m²)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {targetVitals.length > 0 ? targetVitals.map((item, idx) => {
                const currentBmi = getBmiValue(item);
                const currentBsa = getBsaValue(item);

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors text-slate-700">
                    <td className="p-4 text-left font-semibold text-slate-900">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : 'Clinical Check'}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-slate-900 text-base">{renderBP(item)}</td>
                    <td className="p-4 text-center font-mono text-base">{item.heart_rate || '—'}</td>
                    <td className="p-4 text-center font-mono text-base">{item.respiratory_rate || '—'}</td>
                    <td className="p-4 text-center font-mono text-base">{vitals.temperature ? `${item.temperature}°C` : '—'}</td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-600 text-base">{item.spo2 ? `${item.spo2}%` : '—'}</td>
                    <td className="p-4 text-center font-mono text-sm">{item.weight || '—'}kg / {item.height || '—'}cm</td>
                    <td className="p-4 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40 text-base">
                      {currentBmi !== 0 ? currentBmi : '—'}
                    </td>
                    <td className="p-4 text-right px-6 font-mono font-bold text-purple-700 text-base bg-purple-50/20">
                      {currentBsa !== 0 ? currentBsa : '—'}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="9" className="p-16 text-center text-slate-400 font-medium font-mono text-sm">
                    No Vitals Records Found for this Selection Context
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