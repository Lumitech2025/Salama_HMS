import axios from 'axios';

const API_URL = 'http://localhost:8000/api'; // Adjust to your Django port

export const registerStaff = async (staffData) => {
    const token = localStorage.getItem('access_token');
    try {
        const response = await axios.post(`${API_URL}/register/`, staffData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error("Network Error");
    }
};