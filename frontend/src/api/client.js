import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
});

// Response interceptor to format errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Return friendly error messages if possible
        const message = error.response?.data?.error || error.message || 'Eroare de rețea';
        return Promise.reject(new Error(message));
    }
);

export default api;
