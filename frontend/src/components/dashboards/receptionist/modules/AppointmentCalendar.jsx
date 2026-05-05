import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, UserCheck, 
  PlusCircle, Search, ClipboardList, Loader2 
} from 'lucide-react';

// Dynamically use the Vite environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const AppointmentCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visitType, setVisitType] = useState('New');
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ 
    patientName: '', 
    practitioner: '', 
    time: '', 
    reason: '',
    patientId: '' 
  });

  // Fetch appointments on mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      // Ensure the trailing slash is present for Django
      const response = await fetch(`${API_BASE_URL}/appointments/`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error("Fetch failure:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmBooking = async () => {
    if (!formData.patientName || !formData.time) {
      alert("Please fill in required fields (Patient Name and Time)");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Use snake_case for the backend keys
        body: JSON.stringify({ 
          patient_name: formData.patientName, 
          patient_id: formData.patientId,
          practitioner: formData.practitioner, 
          appointment_time: formData.time, 
          reason: formData.reason,
          visit_type: visitType,
          appointment_date: currentDate.toISOString().split('T')[0]
        }),
      });

      if (response.ok) {
        await fetchAppointments();
        setFormData({ patientName: '', practitioner: '', time: '', reason: '', patientId: '' });
        alert("Booking Confirmed!");
      } else {
        const errorData = await response.json();
        alert(`Server Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 pb-12 font-['Plus_Jakarta_Sans']">
      
      {/* SECTION 1: THE BOOKING ENGINE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-[#020617] p-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="bg-teal-500 p-3 rounded-2xl text-white shadow-lg shadow-teal-500/20">
                    <PlusCircle size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">NEW BOOKING</h2>
                    <p className="text-teal-400 text-[10px] font-bold uppercase tracking-[0.2em]">Schedule Patient Consultation</p>
                </div>
            </div>
            
            <div className="flex bg-slate-800/50 p-1.5 rounded-xl border border-white/5">
                <button 
                    onClick={() => setVisitType('New')}
                    className={`px-6 py-2 rounded-lg text-[10px] font-extrabold uppercase transition-all ${visitType === 'New' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >New Visit</button>
                <button 
                    onClick={() => setVisitType('Subsequent')}
                    className={`px-6 py-2 rounded-lg text-[10px] font-extrabold uppercase transition-all ${visitType === 'Subsequent' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >Subsequent</button>
            </div>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-4 gap-8">
            {visitType === 'Subsequent' && (
                <div className="space-y-2 col-span-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Patient Unique ID</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          name="patientId"
                          value={formData.patientId}
                          onChange={handleInputChange}
                          type="text" 
                          placeholder="e.g. SAL-101" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all" 
                        />
                    </div>
                </div>
            )}

            <div className={`space-y-2 ${visitType === 'New' ? 'col-span-2' : 'col-span-1'}`}>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Patient Full Name</label>
                <input 
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all" 
                  placeholder="Enter full name" 
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Practitioner</label>
                <select 
                  name="practitioner"
                  value={formData.practitioner}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none appearance-none cursor-pointer"
                >
                    <option value="">Select Specialist</option>
                    <option value="Oncologist">Oncologist</option>
                    <option value="Surgeon">Surgeon</option>
                    <option value="Hematologist">Hematologist</option>
                    <option value="Psychologist">Psychologist</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Time Slot</label>
                <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      type="time" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                </div>
            </div>

            <div className="col-span-1 md:col-span-3 space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Reason for Visit</label>
                <input 
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  type="text" 
                  placeholder="e.g. Initial consultation..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                />
            </div>

            <div className="flex items-end">
                <button 
                  disabled={isSubmitting}
                  onClick={handleConfirmBooking}
                  className="w-full bg-teal-600 text-white py-4 rounded-2xl font-extrabold text-xs uppercase tracking-[0.1em] hover:bg-[#020617] transition-all shadow-lg shadow-teal-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    Confirm Booking
                </button>
            </div>
        </div>
      </div>

      {/* SECTION 2: THE DAILY SCHEDULE TABLE */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-teal-600">
                    <ClipboardList size={20} />
                </div>
                <div>
                    <h3 className="font-extrabold text-slate-900 tracking-tight text-lg">Active Schedule</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentDate.toDateString()}</p>
                </div>
            </div>
            {isLoading && <Loader2 size={24} className="animate-spin text-teal-600" />}
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-slate-50">
                        <th className="px-10 py-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Time</th>
                        <th className="px-10 py-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Patient Details</th>
                        <th className="px-10 py-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Specialist</th>
                        <th className="px-10 py-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Reason</th>
                        <th className="px-10 py-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {!isLoading && appointments.map((appt) => (
                        <tr key={appt.id || appt.patient_name} className="group hover:bg-teal-50/30 transition-all cursor-default">
                            <td className="px-10 py-6">
                                <div className="flex items-center gap-3">
                                    <Clock size={14} className="text-teal-500" />
                                    <span className="font-bold text-slate-900 text-sm">{appt.appointment_time || appt.time}</span>
                                </div>
                            </td>
                            <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-white group-hover:shadow-sm transition-all">
                                        {(appt.patient_name || appt.patientName)?.charAt(0) || 'P'}
                                    </div>
                                    <span className="font-bold text-slate-900">{appt.patient_name || appt.patientName}</span>
                                </div>
                            </td>
                            <td className="px-10 py-6 text-center">
                                <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest group-hover:bg-teal-100 group-hover:text-teal-700 transition-colors">
                                    {appt.practitioner}
                                </span>
                            </td>
                            <td className="px-10 py-6">
                                <span className="text-sm text-slate-500 font-semibold">{appt.reason}</span>
                            </td>
                            <td className="px-10 py-6 text-right">
                                <button className="bg-[#020617] text-white p-3 rounded-xl hover:bg-teal-600 transition-all shadow-lg shadow-slate-900/10 active:scale-90">
                                    <UserCheck size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!isLoading && appointments.length === 0 && (
              <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                No appointments found for today
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentCalendar;