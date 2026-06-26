import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Activity, FlaskConical, Pill, FileText, 
  User, Loader2, RefreshCcw, AlertCircle, Heart, 
  Thermometer, Droplets, Scale, Calendar, ClipboardList
} from 'lucide-react';

const ClinicalEMR = ({ patient }) => {
  // Timeline tab removed. Defaulting directly to 'vitals'.
  const [activeCategory, setActiveCategory] = useState('vitals');
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState({
    vitals: [],
    labs: [],
    prescriptions: [],
    clinicalNotes: []
  });

  const fetchMedicalHistory = useCallback(async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const patientId = patient.patient || patient.id;
      
      const [vitalsRes, labsRes, notesRes, scriptRes] = await Promise.all([
        API.get(`/vitals?patient=${patientId}`),
        API.get(`/lab-results?patient=${patientId}`),
        API.get(`/clinical-notes?patient=${patientId}`),
        API.get(`/prescriptions?patient=${patientId}`)
      ]);

      setHistoryData({
        vitals: vitalsRes.data.results || vitalsRes.data || [],
        labs: labsRes.data.results || labsRes.data || [],
        clinicalNotes: notesRes.data.results || notesRes.data || [],
        prescriptions: scriptRes.data.results || scriptRes.data || []
      });
    } catch (err) {
      console.error("Failed to load medical history", err);
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => { 
    fetchMedicalHistory(); 
  }, [fetchMedicalHistory]);

  // Helper helper function to parse wide-table field entry data down for the table matrix
  const parseLabMetrics = (labRecord) => {
    const metrics = [];
    const fields = [
      // CBC Panel
      { f: 'cbc_hb', l: 'Hb', u: 'g/dL' }, { f: 'cbc_wbc', l: 'WBC', u: 'x10³/µL' },
      { f: 'cbc_neut', l: 'Neut', u: 'x10³/µL' }, { f: 'cbc_plt', l: 'Plt', u: 'x10³/µL' },
      { f: 'cbc_mcv', l: 'MCV', u: 'fL' },
      // U&E Panel
      { f: 'ue_na', l: 'Na+', u: 'mmol/L' }, { f: 'ue_k', l: 'K+', u: 'mmol/L' },
      { f: 'ue_urea', l: 'Urea', u: 'mmol/L' }, { f: 'ue_creatinine', l: 'Creatinine', u: 'µmol/L' },
      // LFT Panel
      { f: 'lft_alt', l: 'ALT', u: 'U/L' }, { f: 'lft_ast', l: 'AST', u: 'U/L' },
      { f: 'lft_tbil', l: 'T.BIL', u: 'µmol/L' }, { f: 'lft_dbil', l: 'D.BIL', u: 'µmol/L' },
      { f: 'lft_alp', l: 'ALP', u: 'U/L' }, { f: 'lft_albumin', l: 'ALB', u: 'g/L' },
      // Oncology / PSA
      { f: 'psa_total', l: 'Total PSA', u: 'ng/mL' }
    ];

    fields.forEach(({ f, l, u }) => {
      if (labRecord[f] !== undefined && labRecord[f] !== null) {
        metrics.push({ name: l, value: labRecord[f], unit: u });
      }
    });

    // Handle Urinalysis selections text parameters strings strings
    if (labRecord.urine_color) metrics.push({ name: 'Urine Color', value: labRecord.urine_color, unit: '' });
    if (labRecord.urine_clarity) metrics.push({ name: 'Urine Clarity', value: labRecord.urine_clarity, unit: '' });
    if (labRecord.urine_protein) metrics.push({ name: 'Urine Protein', value: labRecord.urine_protein, unit: '' });
    if (labRecord.urine_glucose) metrics.push({ name: 'Urine Glucose', value: labRecord.urine_glucose, unit: '' });
    
    // Blood match Group configs
    if (labRecord.bg_abo) metrics.push({ name: 'Blood Group', value: `${labRecord.bg_abo} ${labRecord.bg_rhesus || ''}`, unit: '' });
    if (labRecord.bg_compatibility) metrics.push({ name: 'Crossmatch', value: labRecord.bg_compatibility, unit: '' });

    // Parasitology
    if (labRecord.malaria_mps) metrics.push({ name: 'Malaria MPS', value: `${labRecord.malaria_mps} (${labRecord.malaria_species || 'N/A'})`, unit: '' });

    return metrics;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans antialiased pb-20">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-slate-100 pb-6">
        <div>
          <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            SALAMA HMS / ONCOLOGY RECORD
          </p>
          <h3 className="text-3xl font-serif font-semibold text-slate-900 mt-1">
            Patient Medical Dashboard
          </h3>
          <p className="text-slate-400 font-medium text-sm mt-0.5">
            Structured clinical history profiles for: <span className="text-blue-600 font-bold">{patient?.patient_name || 'Active Patient'}</span>
          </p>
        </div>

        {/* TABS CONTAINER (TIMELINE TAB SUCCESSFULLY REMOVED) */}
        <nav className="bg-slate-100/80 p-1 rounded-xl flex flex-wrap gap-1 border border-slate-200/60">
          <TabBtn active={activeCategory === 'vitals'} onClick={() => setActiveCategory('vitals')} icon={<Activity size={14}/>} label="Vitals Metrics" />
          <TabBtn active={activeCategory === 'labs'} onClick={() => setActiveCategory('labs')} icon={<FlaskConical size={14}/>} label="Laboratory Summary" />
          <TabBtn active={activeCategory === 'prescriptions'} onClick={() => setActiveCategory('prescriptions')} icon={<Pill size={14}/>} label="Chemotherapy Prescriptions" />
          <TabBtn active={activeCategory === 'notes'} onClick={() => setActiveCategory('notes')} icon={<FileText size={14}/>} label="Clinical Notes & Diagnosis" />
          
          <button onClick={fetchMedicalHistory} className="p-2.5 text-slate-400 hover:text-slate-900 transition-all cursor-pointer">
            <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="animate-spin text-blue-600 w-9 h-9" />
          <p className="text-slate-400 font-semibold tracking-wide text-xs">Accessing Encrypted Medical Dossier...</p>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-2 duration-300">
          
          {/* CATEGORY 1: VITALS METRICS INDIVIDUAL CARD BOXES */}
          {activeCategory === 'vitals' && (
            <div className="space-y-8">
              {historyData.vitals.length === 0 ? <EmptyState /> : historyData.vitals.map((v, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar size={15} className="text-slate-400" />
                      <span className="text-xs font-bold tracking-tight text-slate-900">
                        {new Date(v.created_at || v.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        at {new Date(v.created_at || v.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/40">
                      By: {v.recorded_by_name || "Triage Staff"}
                    </span>
                  </div>

                  {/* Isolated Box Layout Grid per metric */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl shadow-xs">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Heart size={16} />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Systolic / Diastolic</p>
                      </div>
                      <p className="text-xl font-black text-slate-900">{v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '—'} <span className="text-xs font-medium text-slate-400">mmHg</span></p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl shadow-xs">
                      <div className="flex items-center gap-2 text-rose-600 mb-1">
                        <Thermometer size={16} />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Heart Rate & Temperature</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{v.heart_rate ? `${v.heart_rate} BPM` : '—'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{v.temperature ? `${v.temperature} °C` : '—'}</p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl shadow-xs">
                      <div className="flex items-center gap-2 text-teal-600 mb-1">
                        <Droplets size={16} />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Pulse Oximetry</p>
                      </div>
                      <p className="text-xl font-black text-slate-900">{v.oxygen_saturation_percentage || v.spo2 || '—'}<span className="text-xs font-medium text-slate-400">% SpO2</span></p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl shadow-xs">
                      <div className="flex items-center gap-2 text-amber-600 mb-1">
                        <Scale size={16} />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Weight Indices</p>
                      </div>
                      <p className="text-xs font-bold text-slate-700">Weight: <span className="text-slate-900 font-mono">{v.weight ? `${v.weight} kg` : '—'}</span></p>
                      <p className="text-xs font-bold text-slate-700">BMI: <span className="text-slate-900 font-mono">{v.bmi || '—'}</span> | BSA: <span className="text-slate-900 font-mono">{v.bsa ? `${v.bsa} m²` : '—'}</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CATEGORY 2: LAB RESULTS TABLE FORMAT */}
          {activeCategory === 'labs' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {historyData.labs.length === 0 ? <EmptyState /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                        <th className="py-4 px-6">Analysis Date</th>
                        <th className="py-4 px-6">Test Group Panel</th>
                        <th className="py-4 px-6">Analyzed Parameter Values</th>
                        <th className="py-4 px-6 text-center">Fulfillment</th>
                        <th className="py-4 px-6">Technician Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {historyData.labs.map((l, i) => {
                        const parsedMetrics = parseLabMetrics(l);
                        return (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-500 font-mono font-bold">
                              {new Date(l.created_at).toLocaleDateString('en-GB')}
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs font-mono tracking-wide">
                                  {l.get_test_name_display || l.test_name}
                                </span>
                                {l.is_critical && (
                                  <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Critical Variant Threshold Alert" />
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 min-w-[320px]">
                              {parsedMetrics.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">No numeric entries mapped</span>
                              ) : (
                                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs">
                                  {parsedMetrics.map((m, mIdx) => (
                                    <div key={mIdx} className="flex justify-between border-b border-slate-200/40 pb-0.5 pr-2">
                                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{m.name}</span>
                                      <span className="font-bold text-slate-800">{m.value} <span className="text-[9px] text-slate-400 font-normal">{m.unit}</span></span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                l.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {l.status || 'PENDING'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-500 italic max-w-xs">
                              {l.technician_notes || <span className="text-slate-300">No clinician remarks attached.</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 3: PRESCRIPTIONS STAGING TABLE FORMAT */}
          {activeCategory === 'prescriptions' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {historyData.prescriptions.length === 0 ? <EmptyState /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                        <th className="py-4 px-6">Tx Date / Code</th>
                        <th className="py-4 px-6">Oncology Protocol / Cycle</th>
                        <th className="py-4 px-6">Staging Order Matrix & Items</th>
                        <th className="py-4 px-6">Allergy Overrides</th>
                        <th className="py-4 px-6 text-center">Pharmacy Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {historyData.prescriptions.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors items-start">
                          <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-400 font-mono font-medium">
                            <p className="font-bold text-slate-700">{new Date(p.created_at || p.treatment_date).toLocaleDateString('en-GB')}</p>
                            <p className="text-[10px]">Rx ID: #{p.id}</p>
                          </td>
                          <td className="py-4 px-6 max-w-xs">
                            <p className="font-serif font-bold text-blue-600 text-base">{p.protocol || 'No Protocol Directed'}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Cycle: <span className="text-slate-900 font-bold">{p.cycle_no || '1'}</span> of {p.total_cycles || 'N/A'}</p>
                            <p className="text-[10px] text-slate-400 mt-2">Prescribed By: {p.prescribed_by || 'Staff Consultant'}</p>
                          </td>
                          <td className="py-4 px-6 min-w-[420px]">
                            {p.items && p.items.length > 0 ? (
                              <div className="space-y-2">
                                {p.items.map((item, itemIdx) => (
                                  <div key={itemIdx} className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs flex justify-between items-center gap-4">
                                    <div>
                                      <p className="font-bold text-slate-900">{item.medication_name}</p>
                                      <span className="text-[9px] font-bold tracking-wide uppercase bg-slate-200 text-slate-600 px-1 rounded mt-0.5 inline-block">
                                        {item.stage === 'PRE_CHEMO' ? 'Pre-Chemo' : item.stage === 'CHEMO' ? 'Chemo Core' : 'Post-Chemo Take Home'}
                                      </span>
                                    </div>
                                    <div className="text-right font-mono text-[11px]">
                                      <p className="font-bold text-blue-700">{item.dosage || 'STAT'}</p>
                                      <p className="text-[10px] text-slate-400">{item.route} {item.diluent ? `in ${item.diluent} (${item.volume || ''})` : ''} {item.duration ? `over ${item.duration}` : ''}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No structured item rows parsed inside database object.</p>
                            )}
                            {p.dose_adjustment_notes && (
                              <div className="mt-2 bg-amber-50/50 border border-amber-200/60 rounded-lg p-2 text-[11px] text-amber-800">
                                <span className="font-bold">Dose Adjustment Note:</span> {p.dose_adjustment_notes}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 max-w-xs font-medium">
                            {p.allergies ? <span className="text-rose-600 font-semibold">⚠️ {p.allergies}</span> : <span className="text-slate-400">NKDA (None Registered)</span>}
                          </td>
                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {p.pharmacy_status || 'Pending Dispense'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 4: CLINICAL NOTES & DIAGNOSIS COMBINED LAYOUT */}
          {activeCategory === 'notes' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Active Patient Diagnosis Mappings */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-5 py-4 bg-slate-900 text-white flex items-center gap-2">
                    <ClipboardList size={16} className="text-blue-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider">Active Patient Diagnosis Records</h4>
                  </div>
                  <div className="p-4 divide-y divide-slate-100">
                    {historyData.clinicalNotes.some(n => n.icd10_code || n.diagnosis) || historyData.clinicalNotes.length > 0 ? (
                      historyData.clinicalNotes.map((n, i) => {
                        if (!n.icd10_code && !n.diagnosis) return null;
                        return (
                          <div key={i} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex justify-between items-start mb-1.5">
                              <span className="bg-blue-600 text-white font-mono text-[10px] px-2 py-0.5 rounded font-black shadow-xs">
                                {n.icd10_code || 'ICD-10 Mapped'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono font-medium">{new Date(n.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Primary Site: {n.primary_site || 'UNSPECIFIED'}</p>
                            <p className="text-sm font-semibold text-slate-800 mt-0.5">{n.icd10_description || n.diagnosis}</p>
                            {n.long_description && <p className="text-xs text-slate-500 mt-1 leading-snug">{n.long_description}</p>}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 italic p-2">No system diagnostic nodes actively recorded.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Longitudinal Consultation Narratives */}
              <div className="lg:col-span-7 space-y-4">
                {historyData.clinicalNotes.length === 0 ? <EmptyState /> : historyData.clinicalNotes.map((n, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative">
                    <div className="flex justify-between items-center mb-4">
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-100">
                        {n.note_type_display || n.note_type || 'General Progress Note'}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Calendar size={13} />
                        <span>{new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-slate-700 leading-relaxed border-l-4 border-slate-200 pl-4 py-1 italic bg-slate-50/50 p-2 rounded-r-xl">
                      "{n.content}"
                    </p>
                    
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      <User size={12} className="text-slate-300" /> Authorized Sign-off: <span className="text-slate-600">{n.author_name || n.author || 'Oncology Attending Clinician'}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
};

// Reusable Sub-Buttons Layout
const TabBtn = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
      active ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-900'
    }`}
  >
    {icon} {label}
  </button>
);

const EmptyState = () => (
  <div className="text-center py-14 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
    <Activity size={36} className="mx-auto text-slate-300 mb-2 opacity-60" />
    <p className="text-slate-400 font-semibold tracking-wide text-xs">No history data parameters are recorded under this track segment.</p>
  </div>
);

export default ClinicalEMR;