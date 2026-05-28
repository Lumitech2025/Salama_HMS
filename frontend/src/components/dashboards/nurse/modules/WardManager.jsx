import React, { useState } from 'react';
import { Bed, Armchair, UserPlus, MessageSquare, CheckCircle, Clock, Activity } from 'lucide-react';

export default function WardManager() {
  // Outpatient Infusion Waiting Queue
  const [infusionQueue, setInfusionQueue] = useState([
    { id: 'inf_q1', name: 'Mercy Chepkoech', mrn: 'MRN-2026-0589', age: 34, gender: 'Female', regimen: 'CHOP - Cycle 3', duration: '4 hrs' },
    { id: 'inf_q2', name: 'David Mutua', mrn: 'MRN-2026-0612', age: 45, gender: 'Male', regimen: 'Rituximab Protocol', duration: '6 hrs' }
  ]);

  // Visual Spatial Allocation Grid: 2 Beds and 8 Specialized Infusion Chairs
  const [unitsCollection, setUnitsCollection] = useState([
    // Infusion Beds (2 Slots)
    { id: 'BED-01', label: 'Bed 1', type: 'Bed', status: 'Occupied', patient: { name: 'Ezra Kipchumba', mrn: 'MRN-2026-0410', age: 29, gender: 'Male', oncologist: 'Dr. Kamau', protocol: 'ABVD Protocol', progress: 'Infusion Active', timeRemaining: '1h 45m' } },
    { id: 'BED-02', label: 'Bed 2', type: 'Bed', status: 'Available', patient: null },
    
    // Infusion Chairs (8 Slots)
    { id: 'CHR-01', label: 'Chair 1', type: 'Chair', status: 'Occupied', patient: { name: 'Halima Abdi', mrn: 'MRN-2026-0302', age: 62, gender: 'Female', oncologist: 'Dr. Ayana Nkirote', protocol: 'FOLFOX Cycle 5', progress: 'Pre-medication', timeRemaining: '4h 15m' } },
    { id: 'CHR-02', label: 'Chair 2', type: 'Chair', status: 'Available', patient: null },
    { id: 'CHR-03', label: 'Chair 3', type: 'Chair', status: 'Occupied', patient: { name: 'Charles Omwamba', mrn: 'MRN-2026-0511', age: 51, gender: 'Male', oncologist: 'Dr. Nkirote', protocol: 'Gemcitabine Monotherapy', progress: 'Post-Infusion Obs', timeRemaining: '0h 30m' } },
    { id: 'CHR-04', label: 'Chair 4', type: 'Chair', status: 'Available', patient: null },
    { id: 'CHR-05', label: 'Chair 5', type: 'Chair', status: 'Available', patient: null },
    { id: 'CHR-06', label: 'Chair 6', type: 'Chair', status: 'Available', patient: null },
    { id: 'CHR-07', label: 'Chair 7', type: 'Chair', status: 'Available', patient: null },
    { id: 'CHR-08', label: 'Chair 8', type: 'Chair', status: 'Available', patient: null },
  ]);

  // Context Selection States
  const [selectedUnitId, setSelectedUnitId] = useState('BED-01');
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [selectedProgress, setSelectedProgress] = useState('Pre-medication');

  const currentUnit = unitsCollection.find(u => u.id === selectedUnitId) || unitsCollection[0];

  // Allocation Metrics
  const totalSlots = unitsCollection.length;
  const occupiedSlots = unitsCollection.filter(u => u.status === 'Occupied').length;
  const availableSlots = totalSlots - occupiedSlots;

  // Handle allocation of bed/chair
  const handleAssignUnit = (e) => {
    e.preventDefault();
    if (!selectedQueueId || currentUnit.status === 'Occupied') return;

    const chosenPatient = infusionQueue.find(p => p.id === selectedQueueId);
    if (!chosenPatient) return;

    setUnitsCollection(prev => prev.map(unit => {
      if (unit.id === currentUnit.id) {
        return {
          ...unit,
          status: 'Occupied',
          patient: {
            name: chosenPatient.name,
            mrn: chosenPatient.mrn,
            age: chosenPatient.age,
            gender: chosenPatient.gender,
            oncologist: 'Dr. Ayana Nkirote',
            protocol: chosenPatient.regimen,
            progress: 'Pre-medication',
            timeRemaining: chosenPatient.duration
          }
        };
      }
      return unit;
    }));

    setInfusionQueue(prev => prev.filter(p => p.id !== selectedQueueId));
    setSelectedQueueId('');
  };

  // Update ongoing session state block
  const handleUpdateProgress = (e) => {
    e.preventDefault();
    setUnitsCollection(prev => prev.map(unit => {
      if (unit.id === currentUnit.id && unit.patient) {
        return {
          ...unit,
          patient: { ...unit.patient, progress: selectedProgress }
        };
      }
      return unit;
    }));
  };

  // Handle completion and discharge
  const handleDischargePatient = (unitId) => {
    setUnitsCollection(prev => prev.map(unit => {
      if (unit.id === unitId) {
        return { ...unit, status: 'Available', patient: null };
      }
      return unit;
    }));
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen text-slate-800 font-sans">
      
      {/* Header Context */}
      <div className="pb-4 mb-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Infusion Suite Manager</h1>
        <p className="text-xs text-slate-500 mt-0.5">Real-time allocation dashboard for outpatient chemotherapy chair matrices and bed monitoring.</p>
      </div>

      {/* Capacity Overview Cards Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suite Capacity</span>
          <span className="text-base font-bold text-slate-800 mt-0.5 block">{totalSlots} Infusion Stations</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Available Stations</span>
          <span className="text-base font-bold text-emerald-700 mt-0.5 block">{availableSlots} Vacant Slots</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Active Treatments</span>
          <span className="text-base font-bold text-rose-700 mt-0.5 block">{occupiedSlots} Running Lines</span>
        </div>
      </div>

      {/* Main Framework Working Core */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* LEFT COLUMN: Structural Layout Units Grid (3/5 Span) */}
        <div className="lg:col-span-3 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-6">
            
            {/* Section A: Heavy Infusion Beds (2 Slots) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bed className="w-3.5 h-3.5" />
                <span>Heavy Treatment Beds (Long Stay / High Risk)</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {unitsCollection.filter(u => u.type === 'Bed').map((unit) => {
                  const isOccupied = unit.status === 'Occupied';
                  const isSelected = unit.id === selectedUnitId;
                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={`cursor-pointer p-3 rounded-xl border transition-all flex flex-col justify-between h-24 ${
                        isSelected 
                          ? 'ring-2 ring-teal-600 bg-white border-transparent' 
                          : isOccupied ? 'bg-rose-50/30 border-rose-100 hover:bg-rose-50/50' : 'bg-emerald-50/20 border-emerald-100 hover:bg-emerald-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-900">{unit.label}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isOccupied ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{unit.status}</span>
                      </div>
                      <div className="mt-1">
                        {isOccupied ? (
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">{unit.patient.name}</span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Ready for allocation</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section B: Chemotherapy Infusion Chairs (8 Slots Layout Matrix) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Armchair className="w-3.5 h-3.5" />
                <span>Standard Infusion Chairs (Day Care Suite)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {unitsCollection.filter(u => u.type === 'Chair').map((unit) => {
                  const isOccupied = unit.status === 'Occupied';
                  const isSelected = unit.id === selectedUnitId;
                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={`cursor-pointer p-3 rounded-xl border transition-all flex flex-col justify-between h-24 ${
                        isSelected 
                          ? 'ring-2 ring-teal-600 bg-white border-transparent' 
                          : isOccupied ? 'bg-rose-50/30 border-rose-100 hover:bg-rose-50/50' : 'bg-emerald-50/20 border-emerald-100 hover:bg-emerald-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-900">{unit.label}</span>
                        <Armchair className={`w-3.5 h-3.5 ${isOccupied ? 'text-rose-400' : 'text-emerald-400'}`} />
                      </div>
                      <div className="mt-1">
                        {isOccupied ? (
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">{unit.patient.name}</span>
                        ) : (
                          <span className="text-xs text-slate-400 text-[11px] block">Available</span>
                        )}
                      </div>
                      {isOccupied && (
                        <div className="text-[10px] text-teal-700 font-medium font-mono truncate">{unit.patient.progress}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Intakes Queue Panel */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Scheduled Infusion Admissions Line</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-3 pl-4">Patient Demographics</th>
                    <th className="p-3">Prescribed Oncology Protocol</th>
                    <th className="p-3 pr-4 text-right">Est. Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {infusionQueue.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-4 text-center text-slate-400 italic">No outpatients pending seating charts.</td>
                    </tr>
                  ) : (
                    infusionQueue.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/40">
                        <td className="p-3 pl-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 block">{p.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{p.mrn} • {p.gender}, {p.age} yrs</span>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-600">{p.regimen}</td>
                        <td className="p-3 pr-4 text-right font-mono text-slate-500 font-medium">{p.duration}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Work Desk Context Card (2/5 Span) */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-4 sticky top-6">
            
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Active Station Monitor</span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">{currentUnit.label} ({currentUnit.type} Unit)</h3>
            </div>

            {currentUnit.status === 'Occupied' ? (
              <div className="space-y-4">
                
                {/* Active Patient Block */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">Current Occupant</span>
                    <span className="text-sm font-bold text-slate-900 block">{currentUnit.patient.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono font-medium">{currentUnit.patient.mrn} • {currentUnit.patient.gender}, {currentUnit.patient.age} Yrs</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-slate-600 font-medium space-y-1">
                    <div>Oncologist: <span className="font-semibold text-slate-800">{currentUnit.patient.oncologist}</span></div>
                    <div>Regimen Track: <span className="font-semibold text-teal-700">{currentUnit.patient.protocol}</span></div>
                  </div>
                </div>

                {/* Tracking Lifecycle Controls Form */}
                <form onSubmit={handleUpdateProgress} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-teal-600" />
                    <span>Update Treatment Phase</span>
                  </div>
                  
                  <div className="space-y-1">
                    <select
                      value={selectedProgress}
                      onChange={(e) => setSelectedProgress(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium h-8"
                    >
                      <option value="Pre-medication">Pre-medication / Hydration</option>
                      <option value="Infusion Active">Infusion Line Running</option>
                      <option value="Post-Infusion Obs">Post-Infusion Observation</option>
                      <option value="Ready for Discharge">Treatment Cycle Complete</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium inline-flex items-center"><Clock className="w-3 h-3 mr-1" /> Est: {currentUnit.patient.timeRemaining}</span>
                    <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded transition uppercase tracking-wider">
                      Commit Status
                    </button>
                  </div>
                </form>

                {/* Discharge Action Button */}
                <button
                  type="button"
                  onClick={() => handleDischargePatient(currentUnit.id)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition uppercase tracking-wide h-9 shadow-xs"
                >
                  <span>Complete Infusion Session & Clear Station</span>
                </button>

              </div>
            ) : (
              /* If vacant: Render quick assign drop */
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/20 border border-emerald-100 rounded-lg text-center text-xs">
                  <p className="font-medium text-emerald-800">Station is unoccupied, sterilized, and clear for the next scheduled regimen track.</p>
                </div>

                <form onSubmit={handleAssignUnit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Select Intake Patient</label>
                    <select
                      required
                      value={selectedQueueId}
                      onChange={(e) => setSelectedQueueId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium h-9"
                    >
                      <option value="">-- Choose Patient --</option>
                      {infusionQueue.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedQueueId}
                    className={`w-full font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition uppercase tracking-wide h-9 ${
                      selectedQueueId ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Allocate Infusion Unit</span>
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}