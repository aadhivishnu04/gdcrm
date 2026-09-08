// src/utils/auth.js
import { setToken, clearToken } from './api';

export const getToken = () => {
    return localStorage.getItem('token');
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
};

export const loginUser = (employeeId, role = 'AGENT', name = 'User', token = 'demo-token') => {
    setToken(token);
    const user = {
        employeeId: String(employeeId),
        name,
        role: role.toUpperCase(),
    };
    localStorage.setItem('user', JSON.stringify(user));
    return user;
};

export const logoutUser = () => {
    clearToken();
    localStorage.removeItem('user');
};