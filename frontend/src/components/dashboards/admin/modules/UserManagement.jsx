import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Save, X, Edit2, 
  CheckCircle, AlertCircle, RefreshCw, Phone, Mail, IdCard 
} from 'lucide-react';

const ROLE_CHOICES = [
  { value: 'ONCOLOGIST', label: 'Oncologist' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'BILLING', label: 'Billing Officer' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'LAB_TECH', label: 'Lab Technician' },
  { value: 'RADIOLOGIST', label: 'Radiologist' },
  { value: 'ADMIN', label: 'HMS Admin' },
  { value: 'STAFF', label: 'General Staff' },
  { value: 'PATIENT', label: 'Patient' },
  { value: 'FINANCE', label: 'Finance Officer' },
  { value: 'COUNSELING_PSYCHOLOGIST', label: 'Counseling Psychologist' },
  { value: 'MARKETING', label: 'Marketing Officer' },
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const initialFormState = {
    employee_id: '',
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    role: 'RECEPTIONIST',
    password: '',
    is_staff: false,
    is_active: true,
    is_password_change_required: true
  };
  const [formData, setFormData] = useState(initialFormState);

  // Load user directory directly from the system on assembly
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  // Helper utility to construct authenticated header layers safely
  const getAuthHeaders = () => {
  // 1. Ensure the key name matches exactly what your Login.jsx saves (e.g., 'access' or 'token')
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        console.warn("Security Alert: No access token found in localStorage.");
    }

    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    };

// Update fetchUsers to handle missing tokens gracefully
const fetchUsers = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/auth/users/', {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (response.status === 401) {
      throw new Error("Your session has expired. Please log out and back in to authenticate.");
    }
    
    if (!response.ok) {
      throw new Error(`Server status message code: ${response.status}`);
    }
    
    const data = await response.json();
    setUsers(data);
  } catch (err) {
    setAlert({
      show: true,
      type: 'error',
      message: err.message || 'Failed to load system users.'
    });
    setUsers([]);
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditClick = (user) => {
    setIsEditing(true);
    setSelectedUserId(user.id);
    setFormData({
      employee_id: user.employee_id || '',
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      role: user.role || 'RECEPTIONIST',
      password: '', // Kept clean so we don't accidentally overwrite hashed user keys
      is_staff: user.is_staff || false,
      is_active: user.is_active !== undefined ? user.is_active : true,
      is_password_change_required: user.is_password_change_required || false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedUserId(null);
    setFormData(initialFormState);
  };

  // POST / PUT: Direct system mutations matching database field architecture definitions
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    
    const payload = { ...formData };
    // AbstractUser clean verification rules parsing layer
    if (isEditing && !payload.password) {
      delete payload.password; // Strip blank passwords out of update sequences
    }

    // Direct url routes resolving toward explicit standard database keys
    const url = isEditing 
      ? `/api/auth/users/${selectedUserId}/` 
      : '/api/auth/users/';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        // Parse Django dictionary error arrays cleanly to string presentation layers
        const errorMsg = typeof errData === 'object' 
          ? Object.entries(errData).map(([key, val]) => `${key}: ${val}`).join(' | ')
          : "Database verification rules match failure";
        throw new Error(errorMsg);
      }

      setAlert({
        show: true,
        type: 'success',
        message: isEditing ? 'User registry record modified.' : 'User account added.'
      });
      
      handleCancelEdit();
      fetchUsers(); 
    } catch (err) {
      setAlert({
        show: true,
        type: 'error',
        message: `Mutation error encountered: ${err.message}`
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {alert.show && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border ${
          alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {alert.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{alert.message}</span>
        </div>
      )}

      {/* Entry Panel Form System */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <UserPlus size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              {isEditing ? 'Edit User Credentials' : 'Add New Hospital User'}
            </h3>
            
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee ID</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  name="employee_id"
                  required
                  disabled={isEditing}
                  value={formData.employee_id}
                  onChange={handleInputChange}
                  placeholder="e.g. Collins1998"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Username</label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">First Name</label>
              <input
                type="text"
                name="first_name"
                required
                value={formData.first_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role Designation</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700"
              >
                {ROLE_CHOICES.map(choice => (
                  <option key={choice.value} value={choice.value}>{choice.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isEditing ? 'Override Password' : 'Account Password'}
              </label>
              <input
                type="password"
                name="password"
                required={!isEditing}
                value={formData.password}
                onChange={handleInputChange}
                placeholder={isEditing ? 'Leave blank to preserve' : '••••••••'}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="is_staff" 
                checked={formData.is_staff} 
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" 
              />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Staff Status</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="is_active" 
                checked={formData.is_active} 
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" 
              />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Active Status</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="is_password_change_required" 
                checked={formData.is_password_change_required} 
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" 
              />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Require Password Change</span>
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3">
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm transition"
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            )}
            <button
              type="submit"
              disabled={submitLoading}
              className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm shadow-md shadow-blue-600/15 transition"
            >
              {submitLoading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isEditing ? 'Save Edits' : 'Save User'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Real-time Ledger Output Grid Table Component */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">Users</h3>
          </div>
          <button 
            onClick={fetchUsers} 
            disabled={loading}
            className="p-2 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl transition"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100">
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee ID</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Username</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Staff Status</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 uppercase font-bold text-xs tracking-wider">
                    Querying backend authorization tables...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 uppercase font-bold text-xs tracking-wider">
                    No matching user records detected.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const currentRole = ROLE_CHOICES.find(r => r.value === user.role)?.label || user.role;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">{user.employee_id}</td>
                      <td className="py-4 px-6 text-slate-600 font-mono text-xs">{user.username}</td>
                      <td className="py-4 px-6 text-slate-600">{user.email || '-'}</td>
                      <td className="py-4 px-6 font-medium text-slate-700">{currentRole}</td>
                      <td className="py-4 px-6">
                        <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                          user.is_staff ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {user.is_staff ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                          user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {user.is_active ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;