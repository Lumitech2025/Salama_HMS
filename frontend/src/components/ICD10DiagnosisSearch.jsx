import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api/api';
import { Search, Loader2, Check, AlertCircle } from 'lucide-react';

const ICD10DiagnosisSearch = ({ selectedSite, selectedDiagnoses, onToggleDiagnosis }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Extract the exact value for primary_site matching your model choices (e.g., 'BREAST', 'LUNG')
    const currentSiteValue = selectedSite && typeof selectedSite === 'object' 
        ? selectedSite.id 
        : selectedSite;

    // Live search function mapping directly to your Django model filters
    const fetchDiagnoses = useCallback(async (query) => {
        if (!currentSiteValue) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Queries your model endpoint using standard DRF query filter params
            const response = await API.get('/icd10-diagnoses/', {
                params: {
                    primary_site: currentSiteValue,
                    search: query // Maps to search fields (code, short_description) on the backend
                }
            });

            // Handle both paginated results (.results) and direct arrays
            const data = response.data.results || response.data;
            setResults(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error loading ICD-10 codes:", err);
            setError("Failed to fetch diagnosis codes from registry.");
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [currentSiteValue]);

    // Debounce search inputs to minimize backend workload
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchDiagnoses(searchTerm);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, fetchDiagnoses]);

    // Wipe previous results if the doctor shifts the primary site selector
    useEffect(() => {
        setSearchTerm('');
        setResults([]);
    }, [currentSiteValue]);

    return (
        <div className="w-full space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">
                Query ICD-10 Registry
            </p>
            
            <div className="relative">
                <input
                    type="text"
                    disabled={!currentSiteValue}
                    placeholder={currentSiteValue ? `Search codes or descriptions for ${currentSiteValue}...` : "Select a primary site first..."}
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-xl pl-11 pr-4 py-3.5 font-semibold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute left-4 top-4 text-slate-400">
                    {loading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Search size={16} />}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs font-semibold">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                </div>
            )}

            {/* SEARCH DROPDOWN MATRIX RESULTS */}
            {currentSiteValue && results.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl max-h-60 overflow-y-auto shadow-xl divide-y divide-slate-100 animate-in fade-in duration-200 z-50 relative">
                    {results.map((item) => {
                        const isChecked = selectedDiagnoses.some(d => d.code === item.code);
                        return (
                            <div
                                key={item.code}
                                onClick={() => onToggleDiagnosis(item)}
                                className={`flex items-start justify-between p-4 cursor-pointer transition-colors text-left ${
                                    isChecked ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                                }`}
                            >
                                <div className="space-y-0.5 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-black text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                            {item.code}
                                        </span>
                                        <span className="text-xs font-bold text-slate-800">
                                            {item.short_description}
                                        </span>
                                    </div>
                                    {item.long_description && (
                                        <p className="text-[11px] font-medium text-slate-400 line-clamp-1">
                                            {item.long_description}
                                        </p>
                                    )}
                                </div>
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
                                    isChecked ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-300 bg-white'
                                }`}>
                                    {isChecked && <Check size={12} strokeWidth={3} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* EMPTY STATE */}
            {currentSiteValue && searchTerm && !loading && results.length === 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                    <p className="text-xs font-semibold text-slate-400">
                        No active matching conditions found for "{searchTerm}" under {currentSiteValue}.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ICD10DiagnosisSearch;