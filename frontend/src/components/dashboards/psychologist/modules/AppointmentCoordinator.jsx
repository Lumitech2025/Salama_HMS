import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, CheckCircle, XCircle, AlertCircle, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AppointmentCoordinator() {
  // Master Patient List
  const [activeCases] = useState([
    { id: '1', name: 'John Doe Njoroge', mrn: 'MRN-2026-0412', phone: '+254 711 000111', email: 'j.njoroge@mail.com' },
    { id: '2', name: 'Mary Wanjiku', mrn: 'MRN-2026-0981', phone: '+254 722 000222', email: 'm.wanjiku@mail.com' },
    { id: '3', name: 'David Mutua', mrn: 'MRN-2026-0334', phone: '+254 733 000333', email: 'd.mutua@mail.com' }
  ]);

  // Counseling Psychologists Staff
  const [psychologists] = useState([
    { id: 'psy_1', name: 'Dr. Ayana Nkirote', title: 'Senior Counseling Psychologist' },
    { id: 'psy_2', name: 'Dr. Lucas Omondi', title: 'Onco-Psychologist Consultant' },
    { id: 'psy_3', name: 'Sister Grace Mwangi', title: 'Palliative Care Counselor' }
  ]);

  // Appointment Database
  const [appointments, setAppointments] = useState([
    {
      id: 'appt_1',
      patientName: 'Mary Wanjiku',
      mrn: 'MRN-2026-0981',
      phone: '+254 722 000222',
      email: 'm.wanjiku@mail.com',
      date: '2026-05-28',
      time: '09:00',
      reason: 'Follow-up Counseling',
      practitioner: 'Dr. Ayana Nkirote',
      status: 'Completed',
    },
    {
      id: 'appt_2',
      patientName: 'David Mutua',
      mrn: 'MRN-2026-0334',
      phone: '+254 733 000333',
      email: 'd.mutua@mail.com',
      date: '2026-05-28',
      time: '11:30',
      reason: 'Adherence Support',
      practitioner: 'Dr. Lucas Omondi',
      status: 'In-Session',
    },
    {
      id: 'appt_3',
      patientName: 'John Doe Njoroge',
      mrn: 'MRN-2026-0412',
      phone: '+254 711 000111',
      email: 'j.njoroge@mail.com',
      date: '2026-05-28',
      time: '14:00',
      reason: 'Shock & Denial (New Diagnosis)',
      practitioner: 'Dr. Ayana Nkirote',
      status: 'Arrived',
    }
  ]);

  // Calendar view tracking (Defaulting to May 2026 as seen in image_cbdbaa.png)
  const [selectedDate, setSelectedDate] = useState('2026-05-28');
  
  // Form Fields
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingReason, setBookingReason] = useState('Follow-up Counseling');
  const [selectedPsychologist, setSelectedPsychologist] = useState('');

  // Auto-fill patient contact details on drop-down select
  const handlePatientChange = (caseId) => {
    setSelectedCaseId(caseId);
    const chosen = activeCases.find(c => c.id === caseId);
    if (chosen) {
      setCustomPhone(chosen.phone);
      setCustomEmail(chosen.email);
    } else {
      setCustomPhone('');
      setCustomEmail('');
    }
  };

  // Change appointment status
  const handleUpdateStatus = (id, newStatus) => {
    setAppointments(prev =>
      prev.map(appt => appt.id === id ? { ...appt, status: newStatus } : appt)
    );
  };

  // Create new appointment
  const handleCreateAppointment = (e) => {
    e.preventDefault();
    if (!selectedCaseId || !bookingDate || !bookingTime || !selectedPsychologist) return;

    const chosenCase = activeCases.find(c => c.id === selectedCaseId);
    const chosenPsych = psychologists.find(p => p.id === selectedPsychologist);
    if (!chosenCase || !chosenPsych) return;

    const newAppt = {
      id: `appt_${Date.now()}`,
      patientName: chosenCase.name,
      mrn: chosenCase.mrn,
      phone: customPhone || chosenCase.phone,
      email: customEmail || chosenCase.email,
      date: bookingDate,
      time: bookingTime,
      reason: bookingReason,
      practitioner: chosenPsych.name,
      status: 'Scheduled'
    };

    setAppointments(prev => [...prev, newAppt].sort((a, b) => a.time.localeCompare(b.time)));
    
    // Clear form entries
    setSelectedCaseId('');
    setCustomPhone('');
    setCustomEmail('');
    setBookingDate('');
    setBookingTime('');
    setSelectedPsychologist('');
  };

  // Turn time input (14:00) into clean readable standard text (2:00 PM)
  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return '--:--';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  // Filter appointments for the selected day
  const filteredAppointments = appointments.filter(appt => appt.date === selectedDate);

  // Status badges
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In-Session': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Arrived': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Scheduled': return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'Missed': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  // Quick Mock Days generator for the month grid component (May 2026)
  const daysInMay = Array.from({ length: 31 }, (_, i) => {
    const dayNum = i + 1;
    return `2026-05-${dayNum < 10 ? '0' + dayNum : dayNum}`;
  });

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen text-slate-800 font-sans">
      
      {/* Page Title Header */}
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Psychology Booking Scheduler</h1>
        <p className="text-sm text-slate-500 mt-0.5">Book sessions and keep track of today's appointments for counseling patients.</p>
      </div>

      <div className="space-y-6">
        
        {/* BOOKING SECTION CARD */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-[#0f172a] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <CalendarIcon className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">New Psychology Appointment</h2>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-md border border-slate-700 font-medium">
              Booking Form
            </span>
          </div>

          <form onSubmit={handleCreateAppointment} className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Patient Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Select Patient</label>
                <select 
                  required
                  value={selectedCaseId}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-500 h-10"
                >
                  <option value="">Choose patient</option>
                  {activeCases.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.mrn})</option>
                  ))}
                </select>
              </div>

              {/* Phone Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400"><Phone className="w-4 h-4" /></span>
                  <input 
                    type="tel"
                    placeholder="e.g. +254 7..."
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-500 h-10"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400"><Mail className="w-4 h-4" /></span>
                  <input 
                    type="email"
                    placeholder="patient@example.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-500 h-10"
                  />
                </div>
              </div>

              {/* Psychologist Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Assigned Psychologist</label>
                <select 
                  required
                  value={selectedPsychologist}
                  onChange={(e) => setSelectedPsychologist(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-500 h-10"
                >
                  <option value="">Select psychologist...</option>
                  {psychologists.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Appointment Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Appointment Date</label>
                <input 
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-500 h-10 font-medium"
                />
              </div>

              {/* Appointment Time */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Appointment Time</label>
                <input 
                  type="time"
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-500 h-10 font-medium"
                />
              </div>

              {/* Reason Selection */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Reason for Visit</label>
                <select 
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-500 h-10"
                >
                  <option value="Follow-up Counseling">Follow-up Counseling Session</option>
                  <option value="Shock & Denial (New Diagnosis)">Shock & Denial (New Diagnosis Setup)</option>
                  <option value="Adherence Support">Support Counseling</option>
                  <option value="Caregiver Grief Support">Caregiver Grief & Bereavement Program</option>
                </select>
              </div>

            </div>

            {/* Form Submit Row */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 px-5 rounded-lg shadow-sm transition duration-150 uppercase tracking-wider"
              >
                Confirm Booking Slot
              </button>
            </div>
          </form>
        </div>

        {/* WORKSPACE AREA: Visual Interactive Calendar (Left) & Bigger Schedule Table (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Column: Visual Grid Calendar Component */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Select Date</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 font-mono">May 2026</span>
            </div>

            {/* Small Calendar Days-of-Week Label Row */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>

            {/* Interactive Grid of Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty spacers to adjust the first day of May 2026 (May 1st is a Friday) */}
              <div className="p-1"></div>
              <div className="p-1"></div>
              <div className="p-1"></div>
              <div className="p-1"></div>
              
              {daysInMay.map((dateString, idx) => {
                const dayNum = idx + 1;
                const isSelected = dateString === selectedDate;
                return (
                  <button
                    key={dateString}
                    type="button"
                    onClick={() => setSelectedDate(dateString)}
                    className={`p-1.5 text-xs font-medium rounded-md text-center transition-all ${
                      isSelected 
                        ? 'bg-teal-600 text-white font-bold shadow-xs' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Viewing Schedule:</span>
              <span className="font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 font-mono">{selectedDate}</span>
            </div>
          </div>

          {/* Right Column: Main Schedule Table (Enlarged) */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Appointments List</h3>
                <p className="text-xs text-slate-400 mt-0.5">Showing scheduled patient visits for the day chosen on the left.</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-md border border-slate-200">
                {filteredAppointments.length} Patient{filteredAppointments.length === 1 ? '' : 's'} Listed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/40 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-3.5 pl-4">Time</th>
                    <th className="p-3.5">Patient Details</th>
                    <th className="p-3.5">Psychologist</th>
                    <th className="p-3.5">Reason for Visit</th>
                    <th className="p-3.5 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400 font-medium text-xs">
                        No patient appointments scheduled for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-50/40 transition-colors">
                        
                        {/* Time Column */}
                        <td className="p-3.5 pl-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{formatTimeDisplay(appt.time)}</span>
                          </div>
                        </td>

                        {/* Patient Core Info */}
                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-sm">{appt.patientName}</span>
                              <span className={`text-xs font-bold border px-2 py-0.5 rounded-md ${getStatusBadgeClass(appt.status)}`}>
                                {appt.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 font-medium">
                              <span className="font-mono text-slate-400 font-semibold">MRN: {appt.mrn}</span>
                              <span>•</span>
                              <span>{appt.phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* Psychologist Column */}
                        <td className="p-3.5 whitespace-nowrap text-slate-600 font-medium text-sm">
                          {appt.practitioner}
                        </td>

                        {/* Reason Column */}
                        <td className="p-3.5">
                          <span className="bg-slate-100 px-2.5 py-1 rounded text-xs font-bold text-slate-600 inline-block">
                            {appt.reason}
                          </span>
                        </td>

                        {/* Context Pipeline Actions */}
                        <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {appt.status === 'Scheduled' && (
                              <button 
                                onClick={() => handleUpdateStatus(appt.id, 'Arrived')}
                                className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition"
                              >
                                Mark Arrived
                              </button>
                            )}
                            
                            {appt.status === 'Arrived' && (
                              <button 
                                onClick={() => handleUpdateStatus(appt.id, 'In-Session')}
                                className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg transition"
                              >
                                Start Session
                              </button>
                            )}

                            {appt.status === 'In-Session' && (
                              <button 
                                onClick={() => handleUpdateStatus(appt.id, 'Completed')}
                                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg inline-flex items-center space-x-1 transition"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Complete Log</span>
                              </button>
                            )}

                            {(appt.status === 'Scheduled' || appt.status === 'Arrived') && (
                              <button 
                                onClick={() => handleUpdateStatus(appt.id, 'Missed')}
                                className="text-xs font-bold bg-white hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 px-3 py-1.5 rounded-lg inline-flex items-center space-x-1 transition"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Missed</span>
                              </button>
                            )}

                            {appt.status === 'Missed' && (
                              <div className="flex items-center space-x-1 text-xs bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-md font-bold">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                <span>Tracing Out</span>
                              </div>
                            )}

                            {appt.status === 'Completed' && (
                              <div className="flex items-center space-x-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md font-bold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Logged Sync</span>
                              </div>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}