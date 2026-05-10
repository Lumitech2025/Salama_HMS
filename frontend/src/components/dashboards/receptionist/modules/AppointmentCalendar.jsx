import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { 
  Calendar as CalendarIcon, Clock, UserCheck, 
  PlusCircle, Search, ClipboardList, Loader2, AlertCircle 
} from 'lucide-react';

// Added onStatusUpdated to props for real-time synchronization with the Home Dashboard
const AppointmentCalendar = ({ onStatusUpdated }) => {
  const [visitType, setVisitType] = useState('NEW');
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({ 
    patientName: '', 
    practitioner: '', 
    appointmentDate: new Date().toISOString().split('T')[0],
    time: '', 
    reason: '',
    patientId: '' 
  });

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await API.get('/appointments/');
      const data = response.data;
      setAppointments(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load clinical queue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // 🔄 Handle Status Change with Global Sync
  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      // 1. Update the Django Backend
      await API.patch(`/appointments/${appointmentId}/`, { status: newStatus });
      
      // 2. Optimistic local update for this table
      setAppointments(prev => prev.map(appt => 
        appt.id === appointmentId ? { ...appt, status: newStatus } : appt
      ));

      // 3. 🚀 Trigger Global Sync
      // This calls fetchDashboardData() in the parent ReceptionistDashboard
      if (onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (err) {
      console.error("Status Update Failed:", err);
      alert("Failed to update status. Please check server connection.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmBooking = async () => {
    if (!formData.time || !formData.practitioner) {
      alert("Practitioner and Time Slot are required.");
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
        appointment_date: formData.appointmentDate,
        appointment_time: formData.time,
        visit_type: visitType,
        practitioner: parseInt(formData.practitioner),
        reason: formData.reason,
        status: 'PENDING'
    };

    if (visitType === 'NEW') {
        payload.manual_patient_name = formData.patientName;
        payload.patient = null;
    } else {
        payload.patient = parseInt(formData.patientId);
        payload.manual_patient_name = "";
    }

    try {
      const response = await API.post('/appointments/', payload);
      if (response.status === 201 || response.status === 200) {
        await fetchAppointments();
        
        // Refresh the Home stats if a new booking is made
        if (onStatusUpdated) onStatusUpdated();

        setFormData({ 
            patientName: '', 
            practitioner: '', 
            appointmentDate: new Date().toISOString().split('T')[0], 
            time: '', 
            reason: '', 
            patientId: '' 
        });
        alert("Booking Successful.");
      }
    } catch (err) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : "Server connection lost.";
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 pb-12 font-['Plus_Jakarta_Sans']">
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
        </div>
      )}

      {/* Booking Form Card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-[#020617] p-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="bg-teal-500 p-3 rounded-2xl text-white">
                    <PlusCircle size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-extrabold text-white">SALAMA CLINICAL BOOKING</h2>
                </div>
            </div>
            
            <div className="flex bg-slate-800/50 p-1.5 rounded-xl">
                <button 
                    onClick={() => setVisitType('NEW')}
                    className={`px-6 py-2 rounded-lg text-[10px] font-extrabold uppercase transition-all ${visitType === 'NEW' ? 'bg-teal-600 text-white' : 'text-slate-400'}`}
                >New Patient</button>
                <button 
                    onClick={() => setVisitType('SUBSEQUENT')}
                    className={`px-6 py-2 rounded-lg text-[10px] font-extrabold uppercase transition-all ${visitType === 'SUBSEQUENT' ? 'bg-teal-600 text-white' : 'text-slate-400'}`}
                >Existing Patient</button>
            </div>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2 col-span-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Patient Details</label>
                <input 
                  name={visitType === 'NEW' ? "patientName" : "patientId"}
                  value={visitType === 'NEW' ? formData.patientName : formData.patientId}
                  onChange={handleInputChange}
                  type={visitType === 'NEW' ? "text" : "number"} 
                  placeholder={visitType === 'NEW' ? "Full Name" : "Patient ID"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500" 
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Practitioner</label>
                <select 
                  name="practitioner"
                  value={formData.practitioner}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none cursor-pointer"
                >
                    <option value="">Select Specialist</option>
                    <option value="2">Edwin Mwiti (Oncologist)</option>
                    <option value="4">Tamara Makena (Nurse)</option>
                    <option value="3">Andrew MWITI (Lab Technician)</option>
                    <option value="5">Moses Muriungi (Radiologist)</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Booking Date</label>
                <input 
                    name="appointmentDate"
                    type="date"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"
                    value={formData.appointmentDate}
                    onChange={handleInputChange}
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Time Slot</label>
                <input 
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  type="time" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none" 
                />
            </div>

            <div className="col-span-1 md:col-span-3 space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Clinical Reason</label>
                <input 
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  type="text" 
                  placeholder="e.g. Routine consultation" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 outline-none" 
                />
            </div>

            <div className="flex items-end">
                <button 
                  disabled={isSubmitting}
                  onClick={handleConfirmBooking}
                  className="w-full bg-teal-600 text-white py-4 rounded-2xl font-extrabold text-xs uppercase tracking-widest hover:bg-[#020617] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    Confirm Booking
                </button>
            </div>
        </div>
      </div>

      {/* Appointment Queue Table */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 text-lg">Today's Clinical Queue</h3>
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
                                  <td className="px-10 py-6 font-bold text-slate-900">
                                      {appt.patient_name || appt.manual_patient_name}
                                  </td>
                                  <td className="px-10 py-8">
                                      <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700 shadow-sm">
                                              <span className="text-[10px] font-black text-teal-400">
                                                  {appt.practitioner_name ? appt.practitioner_name.substring(0, 2).toUpperCase() : 'DR'}
                                              </span>
                                          </div>
                                          <div className="flex flex-col">
                                              <span className="font-black text-slate-900 text-sm uppercase tracking-tight">
                                                  {appt.practitioner_name || "Staff Member"}
                                              </span>
                                              <div className="flex items-center gap-2 mt-1">
                                                  <span className="bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                      {appt.practitioner_role || "Medical Staff"}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-10 py-6 text-sm text-slate-500 font-semibold italic">{appt.reason || "Routine Consultation"}</td>
                                  
                                  <td className="px-10 py-6 text-right">
                                      <div className="flex items-center justify-end gap-3">
                                          <select 
                                              value={appt.status}
                                              onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                                              className={`text-[10px] font-black uppercase tracking-wider p-2 rounded-lg border border-slate-200 outline-none cursor-pointer transition-all ${
                                                  appt.status === 'CONFIRMED' ? 'bg-teal-50 text-teal-600 border-teal-100' : 
                                                  appt.status === 'WAITING_TRIAGE' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                  appt.status === 'CHECKED_IN' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                  'bg-slate-100 text-slate-600'
                                              }`}
                                          >
                                              <option value="PENDING">Pending</option>
                                              <option value="CONFIRMED">Confirmed</option>
                                              <option value="CHECKED_IN">Checked-in</option>
                                              <option value="WAITING_TRIAGE">Waiting Triage</option>
                                              <option value="COMPLETED">Completed</option>
                                              <option value="CANCELLED">Cancelled</option>
                                          </select>
                                          
                                          <button className="bg-[#020617] text-white p-2.5 rounded-xl hover:bg-teal-600 transition-all shadow-lg">
                                              <UserCheck size={16} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan="6" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                  {isLoading ? "Synchronizing with Server..." : "No active clinical records"}
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

export default AppointmentCalendar;