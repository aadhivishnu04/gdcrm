// src/utils/api.js
// src/utils/api.js
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://gdcrmbackend.onrender.com/api';
// --- Token Helpers ---
export const setToken = (token) => {
    localStorage.setItem('token', token);
};

export const getToken = () => {
    return localStorage.getItem('token');
};

export const clearToken = () => {
    localStorage.removeItem('token');
};

// --- Custom Error Class ---
export class ApiError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

// --- Fetch Utility ---
export const apiFetch = async (endpoint, options = {}) => {
    const token = getToken();
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(
                errorData.message || errorData.error || `HTTP ${response.status}`,
                response.status
            );
        }

        return await response.json();
    } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(err.message || 'Network request failed', 0);
    }
};