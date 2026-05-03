import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Fingerprint, IdCard, Leaf, ArrowRight, Loader2 } from 'lucide-react';
import salamaBg from '../assets/salama.jpg';

const Login = () => {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        try {
            const response = await fetch('http://localhost:8000/api/auth/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: employeeId, password: password }),
            });

            const data = await response.json();

            if (response.ok) {
                // 1. Securely store credentials
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('user_role', data.designation);
                
                // 2. Normalize role for logic check
                    const role = data.designation?.toUpperCase().trim();

                    if (!role) {
                        setError("Account configuration error: No role assigned. Contact Admin.");
                        return;
                    }
                // 3. Hospital Routing Logic
                // Admins usually have a unique layout, but clinical staff 
                // should hit the main Dashboard 'brain' at the root (/)
                if (role === 'HMS ADMIN' || role === 'ADMIN') {
                    navigate('/admin-dashboard');
                } else if (['ONCOLOGIST', 'NURSE', 'LAB_TECH',  'PHARMACIST', 'RADIOLOGIST', 'RECEPTIONIST', 'BILLING_OFFICER', 'PATIENT', 'CLIENT'].includes(role)) {
                    // Send all clinical staff to the root path
                    // ProtectedRoute will verify them, and Dashboard will show the right UI
                    navigate('/'); 
                } else {
                    // Fallback for generic staff or unknown roles
                    navigate('/'); 
                }
            } else {
                if (response.status === 401) {
                    setError('Invalid Employee ID or Security Code.');
                } else {
                    setError(data.detail || 'Access Denied: Verification Failed');
                }
            }
        } catch (err) {
            setError('Salama Network Connection Error. Contact Admin.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 font-['Inter'] antialiased">
            {/* Background Architecture */}
            <div className="absolute inset-0 z-0">
                <img 
                    src={salamaBg}
                    className="w-full h-full object-cover opacity-15 grayscale"
                    alt="Background"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-teal-950/30 to-slate-900"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="bg-white/95 backdrop-blur-2xl p-12 rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.5)] border border-white/20">
                    
                    {/* Brand Identity */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-50/50 text-teal-600 rounded-3xl mb-6 shadow-sm animate-pulse">
                            <Leaf size={40} strokeWidth={1.7} />
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
                            SALAMA <span className="text-teal-600 font-medium">HMS</span>
                        </h1>
                        <div className="flex items-center justify-center space-x-3 mt-3">
                            <span className="h-px w-6 bg-teal-100"></span>
                            <p className="text-[11px] tracking-[0.25em] text-slate-500 uppercase font-bold">
                                Compassionate Oncology Care
                            </p>
                            <span className="h-px w-6 bg-teal-100"></span>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8">
                        {error && (
                            <div className="p-4 rounded-2xl text-xs font-semibold bg-red-50 text-red-600 border border-red-100 flex items-center animate-in fade-in slide-in-from-top-2 duration-300">
                                <span className="mr-3 text-lg">⚠️</span> {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="group">
                                <label className="ml-2 block text-[12px] font-bold text-slate-600 uppercase mb-2 tracking-widest">
                                    Employee ID
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                        <IdCard size={20} strokeWidth={1.5} />
                                    </span>
                                    <input 
                                        type="text" 
                                        disabled={isLoading}
                                        value={employeeId}
                                        onChange={(e) => setEmployeeId(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border border-slate-200 rounded-[1.5rem] focus:ring-8 focus:ring-teal-500/5 focus:border-teal-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-900 font-medium disabled:opacity-50"
                                        placeholder="Andrew1964"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="ml-2 block text-[12px] font-bold text-slate-600 uppercase mb-2 tracking-widest">
                                    Security Code
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                        <Fingerprint size={20} strokeWidth={1.5} />
                                    </span>
                                    <input 
                                        type="password" 
                                        disabled={isLoading}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border border-slate-200 rounded-[1.5rem] focus:ring-8 focus:ring-teal-500/5 focus:border-teal-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-900 font-medium disabled:opacity-50"
                                        placeholder="••••••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-slate-900 hover:bg-teal-700 text-white font-bold py-5 rounded-[1.5rem] shadow-2xl shadow-teal-900/20 hover:-translate-y-1 transition-all flex items-center justify-center space-x-4 group disabled:bg-slate-700"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span className="uppercase tracking-[0.15em] text-sm">Verify Credentials</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium leading-relaxed">
                            <span className="flex items-center justify-center space-x-2 mb-1 text-slate-300">
                                <Lock size={12} strokeWidth={2} />
                                <span>Secured by Salama Network Encryption</span>
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;