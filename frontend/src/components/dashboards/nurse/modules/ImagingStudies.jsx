import React from 'react';
import { FileText, Eye, Download, Image as ImageIcon } from 'lucide-react';

const ImagingStudies = () => {
    const studies = [
        { date: "2026-04-15", type: "CT Chest/Abdomen/Pelvis", indication: "Staging", status: "Report Finalized" },
        { date: "2026-02-10", type: "PET-CT Scan", indication: "Baseline", status: "Archived" }
    ];

    return (
        <div className="p-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Imaging & Radiology Reports</h2>
            
            <div className="grid gap-6">
                {studies.map((study, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                <ImageIcon size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{study.date}</p>
                                <h4 className="font-black text-slate-800 text-lg">{study.type}</h4>
                                <p className="text-xs font-bold text-blue-500">Indication: {study.indication}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all">
                                <Eye size={16} /> View DICOM
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 border-2 border-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                                <FileText size={16} /> Report PDF
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ImagingStudies;