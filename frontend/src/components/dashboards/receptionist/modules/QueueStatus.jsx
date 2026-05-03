import React, { useState } from 'react';
import { 
  Users, 
  ArrowRightCircle, 
  Clock, 
  Timer, 
  Search,
  MoreVertical,
  Activity
} from 'lucide-react';

const QueueStatus = () => {
  // Sample queue data - This will sync with your Django backend
  const [queue, setQueue] = useState([
    { id: 'Q-101', name: 'Alice Njeri', station: 'Triage', waitTime: '12 min', priority: 'Normal', status: 'Waiting' },
    { id: 'Q-102', name: 'Kevin Mutua', station: 'Radiology', waitTime: '45 min', priority: 'High', status: 'In-Progress' },
    { id: 'Q-103', name: 'Sarah Chen', station: 'Consultation', waitTime: '5 min', priority: 'Normal', status: 'Waiting' },
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header & Global Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Live Queue Monitor</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Hospital Workflow Orchestration</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white border border-slate-200 px-6 py-4 rounded-[2rem] shadow-sm flex items-center space-x-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><Users size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Total in Queue</p>
              <p className="text-xl font-black text-slate-900">32</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 px-6 py-4 rounded-[2rem] shadow-sm flex items-center space-x-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Timer size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Avg. Wait Time</p>
              <p className="text-xl font-black text-slate-900">18m</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Queue Table */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or Queue ID..." 
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none font-medium"
            />
          </div>
          <div className="flex space-x-2">
            {['All', 'Triage', 'Doctor', 'Lab', 'Radiology'].map((dept) => (
              <button key={dept} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
                {dept}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Station</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Wait Time</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queue.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-6 font-black text-slate-400 text-xs">{item.id}</td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                      item.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.priority} Priority
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                      <span className="font-bold text-sm text-slate-700">{item.station}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-slate-500 font-medium text-sm">
                      <Clock size={14} className="mr-2" /> {item.waitTime}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      item.status === 'Waiting' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-teal-600 transition-all shadow-lg shadow-slate-900/10">
                      <ArrowRightCircle size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Card */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden">
        <div className="z-10">
          <h4 className="text-teal-400 font-black text-xs uppercase tracking-[0.3em] mb-2">Bottle-neck Alert</h4>
          <p className="text-xl font-bold tracking-tight">Radiology currently has a <span className="text-red-400 underline italic">45-minute</span> delay.</p>
        </div>
        <button className="z-10 mt-6 md:mt-0 bg-white/10 hover:bg-white/20 border border-white/10 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
          View Detailed Analytics
        </button>
        <Activity className="absolute -right-10 top-0 text-white/5 w-64 h-64" />
      </div>

    </div>
  );
};

export default QueueStatus;