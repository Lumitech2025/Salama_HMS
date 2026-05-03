import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  UserCheck, 
  MapPin,
  Filter
} from 'lucide-react';

const AppointmentCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Sample Data - This will eventually be fetched from your Django API
  const appointments = [
    { id: 1, patient: 'Alice Njeri', time: '09:00 AM', dept: 'Oncology', type: 'Chemotherapy', status: 'Confirmed' },
    { id: 2, patient: 'Kevin Mutua', time: '10:30 AM', dept: 'Radiology', type: 'CT Scan', status: 'Checked-in' },
    { id: 3, patient: 'Sarah Chen', time: '11:15 AM', dept: 'General', type: 'Consultation', status: 'Pending' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* Calendar Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="bg-slate-900 text-white p-3 rounded-2xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {currentDate.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Appointment Scheduler</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <button className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600"><ChevronLeft size={20} /></button>
          <button className="px-6 py-2 bg-white shadow-sm rounded-xl text-xs font-black text-slate-900 uppercase tracking-widest">Today</button>
          <button className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600"><ChevronRight size={20} /></button>
        </div>

        <button className="flex items-center space-x-2 bg-teal-50 text-teal-700 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-teal-100 transition-all">
          <Filter size={16} />
          <span>Filter by Dept</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Date Picker / Stats (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
            <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] mb-6">Today's Summary</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-slate-400 font-bold text-sm">Total Booked</span>
                <span className="text-2xl font-black">24</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-slate-400 font-bold text-sm">Arrived</span>
                <span className="text-2xl font-black text-teal-400">08</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold text-sm">No-shows</span>
                <span className="text-2xl font-black text-red-400">02</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Legend</h4>
             <div className="space-y-3">
                <div className="flex items-center space-x-3 text-xs font-bold text-slate-600">
                  <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center space-x-3 text-xs font-bold text-slate-600">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span>Pending Payment</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Side: Appointment List (8/12) */}
        <div className="lg:col-span-8 bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
             <h3 className="font-black text-slate-900 tracking-tight">Active Schedule</h3>
             <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">
               {currentDate.toDateString()}
             </span>
          </div>

          <div className="divide-y divide-slate-50">
            {appointments.map((appt) => (
              <div key={appt.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between group">
                <div className="flex items-center space-x-6">
                  <div className="text-center min-w-[60px]">
                    <p className="text-sm font-black text-slate-900">{appt.time.split(' ')[0]}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{appt.time.split(' ')[1]}</p>
                  </div>
                  
                  <div className="h-10 w-px bg-slate-100 hidden md:block"></div>

                  <div>
                    <p className="font-black text-slate-800 text-lg group-hover:text-teal-600 transition-colors">{appt.patient}</p>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        <MapPin size={12} className="mr-1" /> {appt.dept}
                      </span>
                      <span className="text-slate-200">•</span>
                      <span className="text-[10px] font-bold text-slate-500 italic">{appt.type}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    appt.status === 'Checked-in' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {appt.status}
                  </span>
                  <button className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-teal-600 transition-all shadow-lg shadow-slate-900/10">
                    <UserCheck size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-8 bg-slate-50/50 text-center">
            <button className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors">
              Load more appointments
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AppointmentCalendar;