import React, { useState } from 'react';
import API from '@/api/api';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus, Loader2, CheckCircle2, User } from 'lucide-react';

const AppointmentsTab = ({ appointments = [], patientData, refreshTrigger }) => {
  const [submitting, setSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Setup default state structure mapping seamlessly to our DRF Serializer
  const [formData, setFormData] = useState({
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '08:30:00',
    visit_type: patientData?.id ? 'SUBSEQUENT' : 'NEW',
    status: 'PENDING',
    reason: 'Self-booked oncology follow-up check.',
    patient: patientData?.id || null,
    
    // Fallback registration blocks for new entrants
    manual_patient_name: '',
    phone_number: '',
    email_address: ''
  });

  // --- CALENDAR LOGIC ENGINE ---
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDay, totalDays };
  };

  const { firstDay, totalDays } = getDaysInMonth(currentDate);
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDay }, (_, i) => i);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const changeMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleDateSelect = (day) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day + 1);
    setFormData({ ...formData, appointment_date: selected.toISOString().split('T')[0] });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Clean data payload structure to pass serialization vetting rules safely
    const payload = { ...formData };
    if (payload.patient) {
      delete payload.manual_patient_name;
      delete payload.phone_number;
      delete payload.email_address;
    }

    try {
      await API.post('/appointments/', payload);
      alert("Appointment successfully requested! Confirmation notification is processing.");
      
      setFormData({
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '08:30:00',
        visit_type: patientData?.id ? 'SUBSEQUENT' : 'NEW',
        status: 'PENDING',
        reason: 'Self-booked oncology follow-up check.',
        patient: patientData?.id || null,
        manual_patient_name: '',
        phone_number: '',
        email_address: ''
      });
      if (refreshTrigger) refreshTrigger();
    } catch (err) {
      console.error(err);
      alert("Error submitting request payload. Verify required fields.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start text-left font-['Inter'] animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: INTERACTIVE APPOINTMENT SCHEDULER & BOOKER (7 Columns) */}
      <div className="xl:col-span-7 space-y-6">
        
        {/* THE INTEGRATED APP CALENDAR WIDGET */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Select Appointment Date</h3>
              <p className="text-[11px] text-slate-400 font-medium">Click a date cell to specify your target check-in frame</p>
            </div>
            <div className="flex items-center gap-2 border border-slate-100 p-1.5 rounded-xl bg-slate-50/50">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-md text-slate-600 transition-all"><ChevronLeft size={14} /></button>
              <span className="text-xs font-bold text-slate-700 font-mono px-1">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-md text-slate-600 transition-all"><ChevronRight size={14} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 bg-slate-50 py-2 rounded-xl">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {blanksArray.map(b => <div key={`b-${b}`} className="p-3"></div>)}
            {daysArray.map(day => {
              const checkString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = formData.appointment_date === checkString;
              const hasClinic = appointments.some(a => a.appointment_date === checkString);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`p-2.5 text-xs font-mono font-bold rounded-xl relative transition-all border ${
                    isSelected 
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/10 scale-105' 
                      : hasClinic
                      ? 'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100'
                      : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {day}
                  {hasClinic && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-500 rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* INTAKE FIELDS FORM ASSIGNMENT BOX */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <Plus size={14} className="text-teal-500" /> Specify Allocation Parameters
          </h4>
          
          <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-500">
            
            {/* DYNAMIC NEW ENTRANT REGISTRATION BLOCK */}
            {!patientData?.id && (
              <div className="sm:col-span-2 p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3 mb-2">
                <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1">
                  <User size={12} /> Unregistered Profile (New Entrant Info)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text" required={!patientData?.id}
                      placeholder="John Doe"
                      value={formData.manual_patient_name}
                      onChange={e => setFormData({ ...formData, manual_patient_name: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text" required={!patientData?.id}
                      placeholder="e.g. +254700000000"
                      value={formData.phone_number}
                      onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email" required={!patientData?.id}
                      placeholder="name@example.com"
                      value={formData.email_address}
                      onChange={e => setFormData({ ...formData, email_address: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visit Framework</label>
              <select
                name="visit_type" value={formData.visit_type}
                onChange={e => setFormData({ ...formData, visit_type: e.target.value })}
                className="w-full bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-xs text-slate-800 focus:outline-none"
              >
                <option value="NEW">New Clinical Visit Intake</option>
                <option value="SUBSEQUENT">Subsequent Routine Check</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Time Block</label>
              <input
                type="time" required name="appointment_time" value={formData.appointment_time}
                onChange={e => setFormData({ ...formData, appointment_time: e.target.value })}
                className="w-full bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason for Visit Consultation</label>
              <textarea
                rows={2}
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                className="w-full bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selected Execution Date</label>
              <input
                type="date" readOnly value={formData.appointment_date}
                className="w-full bg-slate-100 border border-slate-100 rounded-xl p-3 text-xs font-mono font-bold text-slate-600 focus:outline-none cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button 
                type="submit" disabled={submitting}
                className="w-full bg-slate-900 text-teal-400 font-semibold py-3.5 rounded-xl text-xs tracking-wider uppercase hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : "Commit Booking Request"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: INDIVIDUAL PATIENT TRACKING LOGS LEDGER (5 Columns) */}
      <div className="xl:col-span-5 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm min-h-[500px] flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">My Appointment Registry Logs</h4>
          
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {appointments.length > 0 ? appointments.map((app, idx) => (
              <div key={idx} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs font-medium text-slate-600 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-xs uppercase tracking-tight">{app.visit_type?.replace('_', ' ') || 'Consultation Check'} Visit</p>
                  <p className="text-[10px] font-mono text-slate-400">{app.appointment_date} • {app.appointment_time?.slice(0, 5)}</p>
                  <p className="text-[11px] text-slate-500 italic line-clamp-1">"{app.reason}"</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                  app.status === 'COMPLETED'
                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {app.status}
                </span>
              </div>
            )) : (
              <div className="p-12 text-center text-slate-400 font-medium font-mono text-[11px]">
                No appointment instances discovered on your EMR footprint.
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-slate-400 pt-3 border-t border-slate-50 mt-6 leading-relaxed">
          * Booked requests will process immediately through the core receptionist queue for confirmation scheduling allocations.
        </p>
      </div>

    </div>
  );
};

export default AppointmentsTab;