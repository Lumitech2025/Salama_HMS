import React, { useState } from 'react';
import { Beaker, AlertTriangle, Share2, Download, CheckCircle } from 'lucide-react';

const LabResultEntry = ({ patient, onComplete }) => {
    const [results, setResults] = useState({
        wbc: '',
        hemoglobin: '',
        platelets: '',
        neutrophils: '',
        creatinine: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Critical Value Logic: Based on standard oncology 'Panic Values'
    const checkCritical = (key, value) => {
        const numVal = parseFloat(value);
        if (isNaN(numVal)) return false;

        switch (key) {
            case 'wbc': return numVal < 2.0 || numVal > 30.0;
            case 'hemoglobin': return numVal < 7.0;
            case 'platelets': return numVal < 50;
            case 'neutrophils': return numVal < 1.0; // High risk for sepsis
            default: return false;
        }
    };

    const handleSendResults = async () => {
        setIsSubmitting(true);
        // Logic for Django API call will go here
        setTimeout(() => {
            alert(`Results for ${patient.name} sent to Oncology team and Patient Portal.`);
            setIsSubmitting(false);
            onComplete();
        }, 1500);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Quick Stats Header */}
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sample ID</p>
                    <p className="text-lg font-bold text-slate-700">LAB-{Math.floor(1000 + Math.random() * 9000)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collection Date</p>
                    <p className="text-lg font-bold text-slate-700">{new Date().toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Status</p>
                    <p className="text-lg font-bold text-indigo-600">Pending Entry</p>
                </div>
            </div>

            {/* Entry Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(results).map((test) => {
                    const isCritical = checkCritical(test, results[test]);
                    return (
                        <div key={test} className="relative group">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                {test.replace('_', ' ')}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={results[test]}
                                    onChange={(e) => setResults({ ...results, [test]: e.target.value })}
                                    className={`w-full bg-slate-50 border-2 rounded-2xl p-4 pt-6 text-xl font-black transition-all outline-none
                                        ${isCritical 
                                            ? 'border-red-500 text-red-600 bg-red-50' 
                                            : 'border-slate-100 focus:border-indigo-500 text-slate-800'}`}
                                    placeholder="0.00"
                                />
                                {isCritical && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-red-600 animate-pulse">
                                        <AlertTriangle size={20} />
                                        <span className="text-[10px] font-black uppercase">Critical</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button className="flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">
                    <Download size={18} />
                    Draft Report PDF
                </button>

                <div className="flex gap-4">
                    <button 
                        onClick={handleSendResults}
                        disabled={isSubmitting}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all shadow-lg
                            ${isSubmitting ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:scale-105 shadow-indigo-200'}`}
                    >
                        {isSubmitting ? 'Processing...' : (
                            <>
                                <Share2 size={20} />
                                Release & Share Results
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LabResultEntry;