import React, { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, UserMinus, Search, X, Loader2 } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Registration Form State
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        designation: 'NURSE',
        password: 'TemporaryPass123!'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/users/', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            const data = await response.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Critical Sync Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchUsers(); // Refresh the list
                setFormData({ username: '', email: '', first_name: '', last_name: '', designation: 'NURSE', password: 'TemporaryPass123!' });
            }
        } catch (error) {
            console.error("Registration Failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm("CAUTION: Are you sure you want to revoke access for this staff member?")) return;
        
        try {
            await fetch(`http://localhost:8000/api/users/${userId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            fetchUsers();
        } catch (error) {
            console.error("Deletion Error:", error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Staff Identity Management</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Authorized System Administration Only</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-4 rounded-2xl font-black flex items-center space-x-2 transition-all shadow-xl shadow-teal-500/10 active:scale-95"
                >
                    <UserPlus size={20} />
                    <span>Register New Staff</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-500 transition-colors" size={22} />
                <input 
                    type="text" 
                    placeholder="Filter by Name, ID, or Department..."
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-16 pr-6 text-white font-medium outline-none focus:border-teal-500/50 focus:ring-8 focus:ring-teal-500/5 transition-all placeholder:text-slate-600"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Staff Table */}
            <div className="bg-slate-900/50 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-2xl shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Employee Profile</th>
                            <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Department/Role</th>
                            <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                            <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Security Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase())).map((staff) => (
                            <tr key={staff.id} className="hover:bg-white/[0.03] transition-all group">
                                <td className="px-10 py-7">
                                    <div className="flex items-center space-x-5">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 flex items-center justify-center text-teal-500 font-black text-lg border border-teal-500/20 shadow-inner">
                                            {staff.username ? staff.username[0].toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-lg leading-tight">{staff.first_name} {staff.last_name}</p>
                                            <p className="text-slate-500 text-xs font-medium">@{staff.username}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-7">
                                    <span className="px-4 py-1.5 bg-slate-800/50 text-slate-300 text-[10px] font-black rounded-xl border border-white/10 uppercase tracking-widest">
                                        {staff.designation || 'Staff'}
                                    </span>
                                </td>
                                <td className="px-10 py-7">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse shadow-[0_0_12px_rgba(20,184,166,0.6)]"></div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active Access</span>
                                    </div>
                                </td>
                                <td className="px-10 py-7 text-right">
                                    <div className="flex justify-end space-x-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <button className="p-3 bg-white/5 hover:bg-teal-500/20 rounded-2xl text-slate-400 hover:text-teal-400 transition-all border border-transparent hover:border-teal-500/20">
                                            <ShieldCheck size={20} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(staff.id)}
                                            className="p-3 bg-white/5 hover:bg-red-500/20 rounded-2xl text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                                        >
                                            <UserMinus size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* REGISTRATION MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-950/60 transition-all">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        {/* Modal Ambient Light */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-[80px]"></div>
                        
                        <div className="flex justify-between items-start mb-10 relative">
                            <div>
                                <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">Initialize Staff Profile</h3>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Create secure system credentials</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors p-2 bg-white/5 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-6 relative">
                            <div className="grid grid-cols-2 gap-5">
                                <input 
                                    className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5"
                                    placeholder="First Name"
                                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                    required
                                />
                                <input 
                                    className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5"
                                    placeholder="Last Name"
                                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                    required
                                />
                            </div>
                            <input 
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5"
                                placeholder="Corporate Username"
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                required
                            />
                            <input 
                                type="email"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5"
                                placeholder="Hospital Email Address"
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                required
                            />
                            <select 
                                className="w-full bg-slate-800 border border-white/10 rounded-2xl p-4 text-white outline-none appearance-none focus:border-teal-500"
                                onChange={(e) => setFormData({...formData, designation: e.target.value})}
                            >
                                <option value="ONCOLOGIST">Oncologist</option>
                                <option value="NURSE">Nurse</option>
                                <option value="LAB_TECH">Lab Technician</option>
                                <option value="PHARMACIST">Pharmacist</option>
                                <option value="RECEPTIONIST">Receptionist</option>
                                <option value="BILLING_OFFICER">Billing Officer</option>
                            </select>
                            
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-5 rounded-2xl transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2 active:scale-[0.98]"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <span>Deploy New Profile</span>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;