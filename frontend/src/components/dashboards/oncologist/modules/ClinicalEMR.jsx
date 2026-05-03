import React from 'react';
import { FileText, Image, ClipboardCheck, History, Info } from 'lucide-react';

const ClinicalEMR = () => {
    const clinicalHistory = [
        { date: '15 Mar 2026', event: 'Biopsy Confirmed', detail: 'Invasive Ductal Carcinoma, Grade 3', type: 'Pathology' },
        { date: '20 Mar 2026', event: 'CT Thorax/Abdomen', detail: 'Primary mass 2.4cm. No distant metastasis noted.', type: 'Imaging' },
        { date: '01 Apr 2026', event: 'MDT Meeting', detail: 'Recommended: Neoadjuvant AC-T Regimen', type: 'Consult' },
    ];

    return (
        <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-500 font-['Inter']">
            {/* Left Column: Staging & Pathology (4 Cols) */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Info size={18} className="text-blue-600" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Disease Staging</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Primary Site</p>
                            <p className="font-bold text-slate-900 uppercase">C50.1 Central portion of breast</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-4 bg-blue-50 rounded-2xl text-center border border-blue-100">
                                <p className="text-[10px] font-black text-blue-400 uppercase">T</p>
                                <p className="text-2xl font-black text-blue-700 uppercase">2</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl text-center border border-blue-100">
                                <p className="text-[10px] font-black text-blue-400 uppercase">N</p>
                                <p className="text-2xl font-black text-blue-700 uppercase">1</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl text-center border border-blue-100">
                                <p className="text-[10px] font-black text-blue-400 uppercase">M</p>
                                <p className="text-2xl font-black text-blue-700 uppercase">0</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-900 rounded-2xl text-white">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Clinical Stage</p>
                            <p className="text-xl font-black">STAGE IIB</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <ClipboardCheck size={18} className="text-teal-600" /> Molecular Profile
                    </h3>
                    <div className="space-y-3">
                        <Biomarker label="ER" status="Positive (90%)" color="teal" />
                        <Biomarker label="PR" status="Positive (60%)" color="teal" />
                        <Biomarker label="HER2" status="Negative" color="slate" />
                        <Biomarker label="Ki-67" status="High (35%)" color="amber" />
                    </div>
                </div>
            </div>

            {/* Right Column: Timeline & Reports (8 Cols) */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <History size={20} className="text-slate-900" />
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Clinical Timeline</h3>
                        </div>
                        <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl">Add Note</button>
                    </div>

                    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-100 before:to-transparent">
                        {clinicalHistory.map((item, idx) => (
                            <div key={idx} className="relative flex items-start gap-6 group">
                                <div className="absolute left-0 mt-1.5 h-10 w-10 rounded-2xl bg-white border-4 border-slate-50 flex items-center justify-center shadow-sm z-10 group-hover:border-blue-100 transition-all">
                                    <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                                </div>
                                <div className="ml-14 flex-1">
                                    <div className="flex items-center gap-4 mb-1">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.date}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">{item.type}</span>
                                    </div>
                                    <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">{item.event}</h4>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Diagnostic Quick-Access */}
                <div className="grid grid-cols-2 gap-4">
                    <ReportCard title="Pathology Report" icon={<FileText className="text-teal-600"/>} date="15 Mar" />
                    <ReportCard title="Radiology Images" icon={<Image className="text-purple-600"/>} date="20 Mar" />
                </div>
            </div>
        </div>
    );
};

const Biomarker = ({ label, status, color }) => (
    <div className="flex justify-between items-center p-3 rounded-xl border border-slate-100">
        <span className="text-xs font-black text-slate-500 uppercase">{label}</span>
        <span className={`text-xs font-bold text-${color}-600 bg-${color}-50 px-3 py-1 rounded-lg`}>{status}</span>
    </div>
);

const ReportCard = ({ title, icon, date }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between hover:border-blue-500 cursor-pointer transition-all">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
            <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Released: {date}</p>
            </div>
        </div>
    </div>
);

export default ClinicalEMR;