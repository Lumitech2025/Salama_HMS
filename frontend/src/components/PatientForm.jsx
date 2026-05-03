import React, { useState } from 'react';
import api from '../api/api';

const PatientForm = ({ onPatientAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    registry_no: '',
    dob: '',
    gender: 'M',
    cancer_type: '',
    ecog_status: 0,
    // Note: Staging and Biomarkers are JSONFields in Django
    staging: { T: '', N: '', M: '' },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/patients/', formData);
      alert("Patient Registered Successfully");
      onPatientAdded(); // Refresh the list
    } catch (err) {
      console.error("Error saving patient:", err);
      alert("Check console for errors. Ensure Registry No is unique.");
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 mb-8">
      <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">New Oncology Registration</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <label className="block">
            <span className="text-slate-700 font-medium">Full Name</span>
            <input type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-200 p-2 border" 
              onChange={e => setFormData({...formData, name: e.target.value})} required />
          </label>
          <label className="block">
            <span className="text-slate-700 font-medium">Cancer Registry Number</span>
            <input type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-200 p-2 border" 
              onChange={e => setFormData({...formData, registry_no: e.target.value})} required />
          </label>
        </div>

        {/* Clinical Info */}
        <div className="space-y-4">
          <label className="block">
            <span className="text-slate-700 font-medium">Primary Diagnosis (Cancer Type)</span>
            <input type="text" placeholder="e.g. Adenocarcinoma of the Colon" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-200 p-2 border" 
              onChange={e => setFormData({...formData, cancer_type: e.target.value})} required />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-slate-700 font-medium">Date of Birth</span>
              <input type="date" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-200 p-2 border" 
                onChange={e => setFormData({...formData, dob: e.target.value})} required />
            </label>
            <label className="block">
              <span className="text-slate-700 font-medium">ECOG Performance</span>
              <select className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
                onChange={e => setFormData({...formData, ecog_status: parseInt(e.target.value)})}>
                <option value="0">0 - Fully Active</option>
                <option value="1">1 - Restricted Strenuous</option>
                <option value="2">2 - Capable of Selfcare</option>
                <option value="3">3 - Limited Selfcare</option>
                <option value="4">4 - Completely Disabled</option>
              </select>
            </label>
          </div>
        </div>

        <button type="submit" className="md:col-span-2 bg-sky-600 text-white font-bold py-3 rounded-lg hover:bg-sky-700 transition duration-200 shadow-md">
          Register Patient in System
        </button>
      </form>
    </div>
  );
};

export default PatientForm;