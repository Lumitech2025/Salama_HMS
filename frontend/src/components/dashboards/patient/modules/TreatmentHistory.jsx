import React from 'react';
import { 
  Clock, 
  User, 
  Stethoscope, 
  MapPin, 
  FileText, 
  ChevronRight,
  CalendarDays
} from 'lucide-react';

const TreatmentHistory = () => {
  // Mock data representing the patient's journey through different clinical departments
  const history = [
    {
      id: 1,
      date: "May 01, 2026",
      time: "10:30 AM",
      type: "Chemotherapy Session",
      doctor: "Dr. Mwiti",
      department: "Oncology Wing",
      notes: "Cycle 2 completed successfully. Patient tolerated treatment well. Vitals stable post-infusion.",
      icon: <Stethoscope size={20} />
    },
    {
      id: 2,
      date: "April 15, 2026",
      time: "09:00 AM",
      type: "Oncology Consultation",
      doctor: "Dr. Mwiti",
      department: "Consultation Room 4",
      notes: "Reviewed initial scan results. Discussed treatment roadmap and started medication regimen.",
      icon: <User size={20} />
    },
    {
      id: 3,
      date: "April 10, 2026",
      time: "02:15 PM",
      type: "Initial Triage & Assessment",
      doctor: "Nurse Sarah",
      department: "Triage Station A",
      notes: "Baseline vitals recorded. Patient history documented. Referred to Oncology for specialist review.",
      icon: <Clock size={20} />
    }
  ];

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Treatment History</h1>
        <p className="text-slate-500 font-medium text-sm">A comprehensive timeline of your medical journey at Salama.</p>
      </header>

      <div className="relative">
        {/* The Vertical Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-100 hidden md:block" />

        <div className="space-y-12">
          {history.map((event, index) => (
            <div key={event.id} className="relative flex flex-col md:flex-row gap-8 group">
              {/* Date Column (Sticky-like feel) */}
              <div className="md:w-32 pt-2 text-left md:text-right">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{event.date}</p>
                <p className="text-[10px] font-bold text-blue-500 uppercase">{event.time}</p>
              </div>

              {/* Timeline Dot */}
              <div className="absolute left-8 top-3 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-white bg-blue-600 z-10 hidden md:block group-hover:scale-125 transition-transform" />

              {/* Content Card */}
              <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:border-blue-200 transition-all">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        {event.icon}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{event.type}</h3>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <span className="flex items-center gap-1.5 text-sm text-slate-500 font-bold">
                        <User size={16} className="text-blue-500" /> {event.doctor}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-slate-500 font-bold">
                        <MapPin size={16} className="text-blue-500" /> {event.department}
                      </span>
                    </div>
                  </div>
                  
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-900 hover:text-white transition-all">
                    View Full Summary <ChevronRight size={14} />
                  </button>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 relative">
                  <div className="flex items-center gap-2 mb-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                    <FileText size={14} /> Encounter Notes
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    {event.notes}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center py-10">
        <div className="flex items-center gap-2 text-slate-400">
          <CalendarDays size={18} />
          <p className="text-xs font-bold uppercase tracking-widest text-center">
            End of recorded history for 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default TreatmentHistory;