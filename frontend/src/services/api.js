import axios from 'axios';

// Consolidate onto a single base server domain to avoid dynamic IP breakages
const BASE_DOMAIN = "http://localhost:8000";

export const API_URL = `${BASE_DOMAIN}/api`; 
export const LOGIN_URL = `${BASE_DOMAIN}/api/auth/login/`;

// Create and export the default instance that Registration.jsx is looking for
const API = axios.create({
    baseURL: API_URL,
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

// Fixed endpoint duplication issue
export const registerStaff = async (staffData) => {
    try {
        // Because your default 'API' instance has interceptors and a baseURL config,
        // you do NOT need to pass the raw token or full API_URL string manually here!
        const response = await API.post('/register/', staffData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error("Network Error");
    }
};