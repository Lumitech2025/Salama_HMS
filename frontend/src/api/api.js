// api.js
import axios from 'axios';

const API = axios.create({
    // Use '/api' so it hits the Vite proxy we set up earlier
    baseURL: '/api', 
});

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