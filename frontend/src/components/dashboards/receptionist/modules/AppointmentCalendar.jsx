import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Calendar as CalendarIcon, Clock, UserCheck, 
  PlusCircle, Search, ClipboardList, Loader2, AlertCircle, 
  User, Mail, Phone, Send
} from 'lucide-react';

const AppointmentCalendar = ({ onStatusUpdated }) => {
  const [visitType, setVisitType] = useState('NEW');
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Search & Contact States
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({ 
    patientName: '', 
    phone: '',
    email: '',
    practitioner: '', 
    appointmentDate: new Date().toISOString().split('T')[0],
    time: '', 
    reason: '',
    patientId: '' 
  });

  // 1. Live Patient Search Logic (MPI Lookup)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (visitType === 'SUBSEQUENT' && formData.patientName.length > 2) {
        setIsSearching(true);
        try {
          const res = await API.get(`/patients/?search=${formData.patientName}`);
          setSearchResults(res.data.results || res.data || []);
        } catch (err) {
          console.error("Search error", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [formData.patientName, visitType]);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await API.get('/appointments/');
      const data = response.data;
      setAppointments(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      setError("Failed to load clinical queue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectPatient = (patient) => {
    setFormData(prev => ({
      ...prev,
      patientName: patient.name,
      patientId: patient.id,
      phone: patient.phone || '',
      email: patient.email || ''
    }));
    setSearchResults([]);
  };

  const handleConfirmBooking = async () => {
    if (!formData.time || !formData.practitioner || !formData.patientName || !formData.phone) {
      alert("Name, Phone, Practitioner, and Time Slot are required.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
        appointment_date: formData.appointmentDate,
        appointment_time: formData.time,
        visit_type: visitType,
        practitioner: parseInt(formData.practitioner),
        reason: formData.reason,
        status: 'PENDING',
        patient: visitType === 'SUBSEQUENT' ? formData.patientId : null,
        manual_patient_name: visitType === 'NEW' ? formData.patientName : "",
        // These fields will be stored for the notification engine
        phone_number: formData.phone,
        email_address: formData.email
    };

    try {
      await API.post('/appointments/', payload);
      await fetchAppointments();
      if (onStatusUpdated) onStatusUpdated();
      setFormData({ 
        patientName: '', phone: '', email: '', practitioner: '', 
        appointmentDate: new Date().toISOString().split('T')[0], 
        time: '', reason: '', patientId: '' 
      });
      alert("Booking Successful.");
    } catch (err) {
      alert("Booking failed. Check server connection.");
    } finally { setIsSubmitting(false); }
  };

  const handleSendReminder = (appt) => {
    alert(`Reminder queueing for ${appt.patient_name || appt.manual_patient_name}. Functional integration with HTTP SMS & Email coming soon.`);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 pb-12 font-['Plus_Jakarta_Sans']">
      
      {/* Booking Form Card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-[#020617] p-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="bg-teal-500 p-3 rounded-2xl text-white"><PlusCircle size={24} /></div>
                <h2 className="text-xl font-extrabold text-white tracking-tight uppercase">Salama Clinical Booking</h2>
            </div>
            
            <div className="flex bg-slate-800/50 p-1.5 rounded-xl">
                <button onClick={() => {setVisitType('NEW'); setFormData(p => ({...p, patientName: '', patientId: ''}))}}
                    className={`px-6 py-2 rounded-lg text-[10px] font-extrabold uppercase transition-all ${visitType === 'NEW' ? 'bg-teal-600 text-white' : 'text-slate-400'}`}>New Patient</button>
                <button onClick={() => {setVisitType('SUBSEQUENT'); setFormData(p => ({...p, patientName: '', patientId: ''}))}}
                    className={`px-6 py-2 rounded-lg text-[10px] font-extrabold uppercase transition-all ${visitType === 'SUBSEQUENT' ? 'bg-teal-600 text-white' : 'text-slate-400'}`}>Existing Patient</button>
            </div>
        </div>

        <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Patient Detail / Search */}
                <div className="space-y-2 col-span-1 relative">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <User size={12} className="text-teal-500"/> Patient Name
                    </label>
                    <div className="relative">
                        <input name="patientName" value={formData.patientName} onChange={handleInputChange} 
                            placeholder={visitType === 'NEW' ? "Full Name" : "Search Name/ID..."}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500" />
                        {isSearching && <Loader2 size={16} className="absolute right-4 top-4 animate-spin text-teal-500" />}
                    </div>

                    {/* Search Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2">
                            {searchResults.map(p => (
                                <div key={p.id} onClick={() => handleSelectPatient(p)}
                                    className="flex items-center gap-3 p-3 hover:bg-teal-50 rounded-xl cursor-pointer transition-colors">
                                    <div className="bg-slate-100 p-2 rounded-lg"><User size={14} className="text-slate-400"/></div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">{p.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">ID: {p.registry_no}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Contact: Phone */}
                <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Phone size={12} className="text-teal-500"/> Phone Number
                    </label>
                    <input name="phone" value={formData.phone} onChange={handleInputChange} type="tel" placeholder="07..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500" />
                </div>

                {/* Contact: Email */}
                <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Mail size={12} className="text-teal-500"/> Email Address (Optional)
                    </label>
                    <input name="email" value={formData.email} onChange={handleInputChange} type="email" placeholder="patient@example.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500" />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Practitioner</label>
                    <select name="practitioner" value={formData.practitioner} onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none">
                        <option value="">Select Specialist</option>
                        <option value="3">Edwin Mwiti (Oncologist)</option>
                        <option value="2">Victoria Kagwiria (Lab Technician)</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking Date</label>
                    <input name="appointmentDate" type="date" value={formData.appointmentDate} onChange={handleInputChange}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Time Slot</label>
                    <input name="time" value={formData.time} onChange={handleInputChange} type="time"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none" />
                </div>

                <div className="col-span-1 md:col-span-1 space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Clinical Reason</label>
                    <input name="reason" value={formData.reason} onChange={handleInputChange} type="text" placeholder="Reason for visit..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none" />
                </div>

                <div className="flex items-end">
                    <button disabled={isSubmitting} onClick={handleConfirmBooking}
                        className="w-full bg-teal-600 text-white py-4 rounded-2xl font-extrabold text-xs uppercase tracking-widest hover:bg-[#020617] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />} Confirm Booking
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Appointment Queue Table */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight italic">Today's Clinical Queue</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                          <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                          <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Time</th>
                          <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient</th>
                          <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Practitioner</th>
                          <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reason</th>
                          <th className="px-10 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {!isLoading && appointments.length > 0 ? (
                          appointments.map((appt) => (
                              <tr key={appt.id} className="group hover:bg-teal-50/30 transition-all">
                                  <td className="px-10 py-6 font-black text-teal-600 text-xs italic">{appt.appointment_date}</td>
                                  <td className="px-10 py-6 font-bold text-slate-900 text-sm">{appt.appointment_time}</td>
                                  <td className="px-10 py-6">
                                      <p className="font-black text-slate-900 uppercase text-sm">{appt.patient_name || appt.manual_patient_name}</p>
                                  </td>
                                  <td className="px-10 py-8">
                                      <div className="flex flex-col">
                                          <span className="font-black text-slate-900 text-[11px] uppercase">{appt.practitioner_name || "Medical Staff"}</span>
                                          <span className="text-teal-600 text-[9px] font-bold uppercase tracking-wider">{appt.practitioner_role}</span>
                                      </div>
                                  </td>
                                  <td className="px-10 py-6 text-xs text-slate-500 font-semibold italic">{appt.reason || "Consultation"}</td>
                                  <td className="px-10 py-6 text-right">
                                      <div className="flex items-center justify-end gap-3">
                                          {/* Reminder Trigger Button */}
                                          <button onClick={() => handleSendReminder(appt)} 
                                            className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
                                            title="Send Message Reminder">
                                              <Send size={14} />
                                          </button>

                                          <select value={appt.status} onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                                              className={`text-[10px] font-black uppercase tracking-wider p-2 rounded-lg border border-slate-200 outline-none cursor-pointer transition-all ${
                                                  appt.status === 'CONFIRMED' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-slate-100 text-slate-600'
                                              }`}>
                                              <option value="PENDING">Pending</option>
                                              <option value="CONFIRMED">Confirmed</option>
                                              <option value="CHECKED_IN">Checked-in</option>
                                              <option value="WAITING_TRIAGE">Waiting Triage</option>
                                              <option value="CANCELLED">Cancelled</option>
                                          </select>
                                          
                                          <button className="bg-[#020617] text-white p-2.5 rounded-xl hover:bg-teal-600 transition-all shadow-lg">
                                              <UserCheck size={14} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No active records</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default AppointmentCalendar;