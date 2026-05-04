import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Fingerprint, IdCard, Leaf, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
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
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('user_role', data.designation);
                const role = data.designation?.toUpperCase().trim();

                if (role === 'HMS ADMIN' || role === 'ADMIN') {
                    navigate('/admin-dashboard');
                } else {
                    navigate('/'); 
                }
            } else {
                setError(response.status === 401 ? 'Authentication Failed: Invalid Credentials' : 'Access Denied');
            }
        } catch (err) {
            setError('System Connection Error: Verify Server Status');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 font-['Inter'] antialiased">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <img 
                    src={salamaBg}
                    className="w-full h-full object-cover"
                    alt="Hospital Background"
                />
                {/* High-density mask for text protection */}
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[4px]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90"></div>
            </div>

            <div className="relative z-10 w-full max-w-[480px] px-6">
                <div className="bg-slate-900/80 backdrop-blur-3xl rounded-[2rem] p-12 shadow-2xl border border-white/20">
                    
                    {/* Header Section */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500 rounded-2xl mb-6">
                            <Leaf size={36} className="text-slate-950" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight uppercase">
                            Salama <span className="text-teal-400 font-light">HMS</span>
                        </h1>
                        <p className="text-xs tracking-[0.3em] text-teal-500 font-bold uppercase mt-3">
                            Oncology Management Portal
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 font-['Roboto']">
                        {error && (
                            <div className="p-4 rounded-xl text-xs font-bold bg-red-950/50 text-red-400 border border-red-500/30 flex items-center uppercase tracking-wider">
                                <ShieldCheck size={18} className="mr-3" /> {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-white/70 uppercase tracking-widest ml-1">
                                    Work ID
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-teal-500/50">
                                        <IdCard size={20} />
                                    </span>
                                    <input 
                                        type="text" 
                                        value={employeeId}
                                        onChange={(e) => setEmployeeId(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-white/10 border border-white/20 rounded-2xl focus:border-teal-400 focus:bg-white/15 outline-none transition-all text-white placeholder:text-white/20 font-bold text-lg"
                                        placeholder="Enter ID"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-white/70 uppercase tracking-widest ml-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-teal-500/50">
                                        <Fingerprint size={20} />
                                    </span>
                                    <input 
                                        type="password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-white/10 border border-white/20 rounded-2xl focus:border-teal-400 focus:bg-white/15 outline-none transition-all text-white placeholder:text-white/20 font-bold text-lg"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-5 rounded-2xl transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            <div className="flex items-center justify-center space-x-3">
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        <span className="uppercase tracking-widest text-sm">Login</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-center space-x-3 text-white/30 font-bold uppercase tracking-widest text-[10px]">
                        <Lock size={14} />
                        <span>Authorized Personnel Only</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;