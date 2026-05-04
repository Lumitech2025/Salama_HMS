import React, { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, UserMinus, Search, Mail, IdCard } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch staff list from your Django backend
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
            setUsers(data);
        } catch (error) {
            console.error("Failed to sync staff records", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Staff Identity Management</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Authorized Personnel Only</p>
                </div>
                <button className="bg-teal-500 hover:bg-teal-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-teal-900/20">
                    <UserPlus size={18} />
                    <span>Register New Staff</span>
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-500 transition-colors" size={20} />
                <input 
                    type="text" 
                    placeholder="Search by Name, Employee ID, or Department..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white font-medium outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Staff Table */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.filter(u => u.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map((staff) => (
                            <tr key={staff.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500 font-bold">
                                            {staff.full_name[0]}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{staff.full_name}</p>
                                            <p className="text-slate-500 text-xs">{staff.employee_id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="px-3 py-1 bg-slate-800 text-slate-300 text-[10px] font-black rounded-lg border border-white/5 uppercase">
                                        {staff.designation}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]"></div>
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-tighter text-[10px]">Active</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex justify-end space-x-2">
                                        <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
                                            <ShieldCheck size={18} />
                                        </button>
                                        <button className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-all">
                                            <UserMinus size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;