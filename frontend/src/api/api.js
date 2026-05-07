import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:8000', 
});

// This interceptor grabs the token from localStorage before every request
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