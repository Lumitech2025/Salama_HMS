import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Ban } from 'lucide-react';

const ResultStatusBadge = ({ status }) => {
  // Normalize status for consistent mapping
  const normalizedStatus = status?.toUpperCase().trim();

  const getStatusStyles = () => {
    switch (normalizedStatus) {
      case 'NORMAL':
      case 'COMPLETED':
      case 'FINALIZED':
        return {
          container: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          icon: <CheckCircle2 size={12} />,
          label: 'Normal'
        };
      case 'CRITICAL':
      case 'ABNORMAL':
      case 'HIGH':
        return {
          container: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
          icon: <AlertCircle size={12} />,
          label: 'Action Required'
        };
      case 'PENDING':
      case 'PROCESSING':
        return {
          container: 'bg-amber-50 text-amber-700 border-amber-100',
          icon: <Clock size={12} />,
          label: 'Pending'
        };
      default:
        return {
          container: 'bg-slate-50 text-slate-500 border-slate-100',
          icon: <Ban size={12} />,
          label: status || 'Unknown'
        };
    }
  };

  const { container, icon, label } = getStatusStyles();

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all ${container}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
};

export default ResultStatusBadge;