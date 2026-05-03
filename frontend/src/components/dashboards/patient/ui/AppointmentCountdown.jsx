import React, { useState, useEffect } from 'react';
import { Clock, Calendar, ArrowRight, AlertCircle } from 'lucide-react';

const AppointmentCountdown = ({ appointmentDate, appointmentTime }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    isToday: false
  });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(`${appointmentDate}T${appointmentTime}`);
      const now = new Date();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          isToday: now.toDateString() === target.toDateString()
        });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [appointmentDate, appointmentTime]);

  return (
    <div className={`rounded-[2rem] p-8 border transition-all ${
      timeLeft.isToday 
        ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-100 animate-pulse' 
        : 'bg-white border-slate-100 shadow-sm'
    }`}>
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl ${timeLeft.isToday ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
          {timeLeft.isToday ? <Clock size={24} /> : <Calendar size={24} />}
        </div>
        {timeLeft.isToday && (
          <span className="bg-white text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            Happening Today
          </span>
        )}
      </div>

      <h3 className={`text-sm font-bold uppercase tracking-widest mb-1 ${timeLeft.isToday ? 'text-blue-100' : 'text-slate-400'}`}>
        Next Consultation In
      </h3>

      <div className="flex items-baseline gap-4">
        {timeLeft.days > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tighter">{timeLeft.days}</span>
            <span className="text-xs font-bold uppercase tracking-tight opacity-60">Days</span>
          </div>
        )}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black tracking-tighter">{timeLeft.hours}</span>
          <span className="text-xs font-bold uppercase tracking-tight opacity-60">Hrs</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black tracking-tighter">{timeLeft.minutes}</span>
          <span className="text-xs font-bold uppercase tracking-tight opacity-60">Min</span>
        </div>
      </div>

      <div className={`mt-6 pt-6 border-t flex justify-between items-center ${timeLeft.isToday ? 'border-white/10' : 'border-slate-50'}`}>
        <div>
          <p className={`text-xs font-bold ${timeLeft.isToday ? 'text-blue-100' : 'text-slate-500'}`}>
            Dr. Mwiti • Oncology Wing
          </p>
        </div>
        <button className={`flex items-center gap-2 text-xs font-black uppercase tracking-tighter transition-transform hover:translate-x-1 ${
          timeLeft.isToday ? 'text-white' : 'text-blue-600'
        }`}>
          Check In <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default AppointmentCountdown;