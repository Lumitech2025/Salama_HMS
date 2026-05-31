import React, { useState, useEffect, useRef } from 'react';
import API from '@/api/api';
import { Search, Loader2, CheckSquare, Square, AlertCircle } from 'lucide-react';

const ICD10DiagnosisSearch = ({ selectedSite, selectedDiagnoses, onToggleDiagnosis }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const debounceRef = useRef(null);

    // Fetch matching data from local backend whenever site or search text changes
    useEffect(() => {
        if (!selectedSite) {
            setResults([]);
            setSearchQuery('');
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                // 🟢 Updated to match active Django URL configuration path: cancer-sites/<pk>/types/
                const response = await API.get(`/cancer-sites/${selectedSite}/types/`, {
                    params: {
                        q: searchQuery
                    }
                });
                
                // DRF lists sometimes package arrays inside response.data or response.data.results
                const dataPayload = response.data?.results || response.data;
                setResults(Array.isArray(dataPayload) ? dataPayload : []);
            } catch (err) {
                console.error("Diagnosis lookup error:", err);
                setError("Failed to fetch matching medical registries.");
            } finally {
                setLoading(false);
            }
        }, 300); // 300ms clinical-grade debounce

        return () => clearTimeout(debounceRef.current);
    }, [selectedSite, searchQuery]);

    if (!selectedSite) return null;

    return (
        <div className="space-y-4 w-full md:col-span-2 border-t border-slate-100 pt-4 animate-in fade-in duration-300">
            {/* Search Input Box */}
            <div className="relative">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">
                    Query Localized Disease Codes / Terms
                </p>
                <div className="relative">
                    <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 font-semibold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        placeholder="Type clinical term or code (e.g., C50.9)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute left-4 top-4 text-slate-400">
                        {loading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Search size={16} />}
                    </div>
                </div>
            </div>

            {/* Error Handlers */}
            {error && (
                <div className="text-xs text-rose-500 bg-rose-50 p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} /> <span>{error}</span>
                </div>
            )}

            {/* Query Selection List Grid Container */}
            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                {results.length === 0 ? (
                    <div className="p-4 text-center text-xs font-medium text-slate-400">
                        {searchQuery ? "No matching diagnostic data entries found" : "Type to filter down database options..."}
                    </div>
                ) : (
                    results.map((item) => {
                        const isChecked = selectedDiagnoses.some(d => d.id === item.id);
                        return (
                            <div
                                key={item.id}
                                onClick={() => onToggleDiagnosis(item)}
                                className={`flex items-start gap-3 p-3.5 cursor-pointer transition-all hover:bg-white ${
                                    isChecked ? 'bg-blue-50/40 hover:bg-blue-50/60' : ''
                                }`}
                            >
                                <button className="mt-0.5 text-slate-400 transition-colors">
                                    {isChecked ? (
                                        <CheckSquare size={18} className="text-blue-600 fill-blue-50" />
                                    ) : (
                                        <Square size={18} className="text-slate-300" />
                                    )}
                                </button>
                                <div className="flex-1">
                                    <span className="inline-block bg-slate-200 text-slate-800 font-mono font-bold text-[11px] px-2 py-0.5 rounded mr-2">
                                        {item.code}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700">{item.short_description}</span>
                                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-relaxed">
                                        {item.long_description}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ICD10DiagnosisSearch;