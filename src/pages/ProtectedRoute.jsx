import { Navigate } from 'react-router-dom';
import { getToken } from '../utils/auth';

export const ProtectedRoute = ({ children }) => {
    const token = getToken();
    const user = localStorage.getItem('user');

    // Strict check: bounce to login if token is missing, invalid, or user data doesn't exist
    if (!token || token === 'demo-token' || !user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};