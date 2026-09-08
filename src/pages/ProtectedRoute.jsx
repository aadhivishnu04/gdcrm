import { Navigate } from 'react-router-dom';
import { getToken } from '../utils/auth';

export const ProtectedRoute = ({ children }) => {
    const token = getToken();

    // Redirect to login if no token exists or if it's an unauthenticated default state
    if (!token || token === 'demo-token') {
        return <Navigate to="/login" replace />;
    }

    return children;
};