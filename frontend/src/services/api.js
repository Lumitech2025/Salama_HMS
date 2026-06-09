// api.js
import axios from 'axios';

const BASE_DOMAIN = "http://localhost:8000";
export const API_URL = `${BASE_DOMAIN}/api`; 
export const LOGIN_URL = `${BASE_DOMAIN}/api/auth/login/`;

// Create and export the default instance with dynamic CSRF injection
const API = axios.create({
    baseURL: API_URL,
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
    withCredentials: true, // Allows your browser to share secure tokens across localhost ports safely
});

// Automatically inject the Bearer token into every request if it exists
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default API;
export const registerStaff = async (staffData) => {
    try {
        const response = await API.post('/register/', staffData, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error("Network Error");
    }
};

export const submitRadiologyRequisition = async (patientId, visitId, selectedScans) => {
    try {
        const payload = {
            patient: patientId, 
            visit: visitId,     
            imaging_skus: selectedScans.map(scan => scan.id), 
            requested_procedures: selectedScans.map(scan => ({
                scan_id: scan.id,
                label: scan.label,
                cost: scan.price || 0
            })),
            billing: {
                total_amount: selectedScans.reduce((sum, scan) => sum + (scan.price || 0), 0),
                status: "CHARGED_TO_ACCOUNT"
            },
            queue_routing: {
                target_department: "RADIOLOGY_DESK",
                status: "PENDING",
                entered_at: new Date().toISOString()
            }
        };

        const response = await API.post('/imaging-orders/', payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error("Failed to process radiology requisition");
    }
};