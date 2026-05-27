// api.js
import axios from 'axios';

const API = axios.create({
    baseURL: '/api', 
    headers: {
        'Content-Type': 'application/json',
    }
});

// 1. Request Interceptor
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log(`[API Request] Outgoing to: ${config.url}`);
        return config;
    }, 
    (error) => Promise.reject(error)
);

// 2. Response Interceptor (The Error Catcher)
API.interceptors.response.use(
    (response) => response, 
    async (error) => {
        const originalRequest = error.config;
        
        console.warn(`[API Response Error] Intercepted status: ${error.response?.status} for ${originalRequest.url}`);

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; 
            
            const refreshToken = localStorage.getItem('refresh_token');
            console.log(`[API Token Rotation] Found Refresh Token: ${!!refreshToken}`);

            if (refreshToken) {
                try {
                    console.log("[API Token Rotation] Attempting handshake with Django backend...");
                    
                    // Notice the explicit absolute assignment to prevent route loops
                    const response = await axios.post('/api/token/refresh/', {
                        refresh: refreshToken
                    });

                    if (response.status === 200) {
                        const newAccessToken = response.data.access;
                        localStorage.setItem('access_token', newAccessToken);
                        
                        console.log("[API Token Rotation] Handshake successful! Replaying request.");
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        return API(originalRequest);
                    }
                } catch (refreshError) {
                    console.error("[API Critical Fault] Refresh token is fully expired or invalid.", refreshError);
                    
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    
                    // Fall back safely to login page
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            } else {
                console.error("[API Token Rotation] No refresh token present in browser memory.");
            }
        }

        return Promise.reject(error);
    }
);

export default API;