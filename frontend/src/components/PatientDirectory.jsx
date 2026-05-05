import React, { useEffect, useState } from 'react';
import { Search, User, Activity, Calendar, Hash, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const PatientDirectory = () => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPatients = async () => {
    setIsLoading(true);
    setError(null);
    
    // Uses the SearchFilter defined in your ViewSet for name/registry_no
    const url = searchTerm 
      ? `http://127.0.0.1:8000/api/patients/?search=${searchTerm}`
      : 'http://127.0.0.1:8000/api/patients/';
      
    try {
      const response = await fetch(url, {
        headers: { 
          // Assuming JWT storage for your Django backend
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Unauthorized: Please login again.");
        throw new Error("Failed to fetch patient records.");
      }

      const data = await response.json();
      setPatients(data);
    } catch (err) {
      setError(err.message);
      console.error("Directory Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search to avoid hitting the API on every keystroke
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPatients();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  return (
    <div className="max-w-5xl mx-auto p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[600px]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">
            Patient <span className="text-teal-600">Archive</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Accessing Salama Cloud Registry
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or Registry No..."
            className="w-full bg-slate-50 border-2 border-transparent focus:border-teal-500/20 p-4 pl-12 rounded-2xl outline-none font-bold text-slate-700 transition-all shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Status Indicators */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
          <AlertCircle size={20} />
          {error}
          <button onClick={fetchPatients} className="ml-auto bg-white px-3 py-1 rounded-lg border border-red-200 hover:bg-red-100">Retry</button>
        </div>
      )}

      {/* Patient List Grid */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing with Health Cloud...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="font-black text-slate-400 uppercase tracking-tighter">No Patient Records Found</p>
          </div>
        ) : (
          patients.map(patient => (
            <div 
              key={patient.id} 
              className="group flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-900/5 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform">
                  <User size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg leading-tight uppercase italic">{patient.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
                      <Hash size={10} /> {patient.registry_no}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <Calendar size={10} /> {patient.dob}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-100">
                    {patient.cancer_type}
                  </span>
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                    Stage {patient.staging}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                   <Activity size={12} />
                   <p className="text-[10px] font-bold uppercase">Ready for Consult</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PatientDirectory;