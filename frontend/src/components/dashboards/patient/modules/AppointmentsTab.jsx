import React, { useState } from 'react';
import API from '@/api/api';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus, Loader2, Calendar } from 'lucide-react';

const AppointmentsTab = ({ appointments = [], patientData, refreshTrigger }) => {
  const [submitting, setSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Setup default state structure mapping seamlessly to our DRF Serializer
  const [formData, setFormData] = useState({
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '08:30',
    visit_type: 'SUBSEQUENT',
    status: 'PENDING',
    reason: 'Chemotherapy Infusion Cycle',
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
        appointment_time: '08:30',
        visit_type: 'SUBSEQUENT',
        status: 'PENDING',
        reason: 'Chemotherapy Infusion Cycle',
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
    <div className="w-full flex-1 max-w-none px-2 pb-12 text-left animate-in fade-in duration-300 antialiased font-sans">
      
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments Hub</h2>
        <p className="text-sm text-slate-500">Schedule fresh diagnostic sessions or look over your existing clinical visitation footprint maps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        
        {/* LEFT COMPONENT: CALENDAR & PARAMETER SELECTOR FORM */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          
          {/* THE INTEGRATED APP CALENDAR WIDGET */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Select Appointment Date</h3>
                <p className="text-xs text-slate-500">Click a date cell to specify your target check-in frame</p>
              </div>
              <div className="flex items-center gap-2 border border-slate-200 p-1 rounded-xl bg-slate-50">
                <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-md text-slate-600 border border-transparent hover:border-slate-200 transition-all">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-800 font-mono px-1">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-md text-slate-600 border border-transparent hover:border-slate-200 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 bg-slate-50 py-2 rounded-xl">
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
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105' 
                        : hasClinic
                        ? 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {day}
                    {hasClinic && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PARAMETERS FORM ASSIGNMENT BOX */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
            
            
            <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-500">
              
              {/* Reason Selection Dropdown */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reason for Visit Consultation</label>
                <select
                  name="reason" 
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                >
                  <option value="Chemotherapy Infusion Cycle">Chemotherapy Infusion Cycle</option>
                  <option value="Oncology Follow-up Checkup">Oncology Follow-up Checkup</option>
                  <option value="Routine General Triage">Routine General Triage</option>
                  <option value="Post-Operation Evaluation">Post-Operation Evaluation</option>
                  <option value="Diagnostic Lab Review">Diagnostic Lab Review</option>
                </select>
              </div>

              {/* Target Time Block Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Time Block</label>
                <input
                  type="time" 
                  required 
                  name="appointment_time" 
                  value={formData.appointment_time}
                  onChange={e => setFormData({ ...formData, appointment_time: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              {/* Readonly Selected Execution Date */}
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Selected Execution Date</label>
                <input
                  type="date" 
                  readOnly 
                  value={formData.appointment_date}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              {/* Submission CTA Trigger */}
              <div className="sm:col-span-2 pt-2">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs tracking-wider uppercase hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xs"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : "Commit Booking Request"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COMPONENT: INDIVIDUAL PATIENT TRACKING LOGS LEDGER */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col self-stretch justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">My Appointment Registry Logs</h4>
            
            <div className="space-y-3 overflow-y-auto max-h-[580px] pr-1">
              {appointments.length > 0 ? appointments.map((app, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs font-medium text-slate-600 animate-in fade-in duration-150">
                  <div className="space-y-1 text-left">
                    <p className="font-bold text-slate-900 text-sm tracking-tight">{app.reason || 'General Consultation'}</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{app.appointment_date}</span>
                      <span>•</span>
                      <span>{app.appointment_time?.slice(0, 5)}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                    app.status === 'COMPLETED'
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {app.status}
                  </span>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-400 font-medium font-mono text-[11px] bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                  No appointment instances discovered on your EMR footprint.
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 mt-6 leading-relaxed">
            * Booked requests will process immediately through the core receptionist queue for confirmation scheduling allocations.
          </p>
        </div>

      </div>
    </div>
  );
};

export default AppointmentsTab;