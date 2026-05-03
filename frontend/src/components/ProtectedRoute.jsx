import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const location = useLocation();
    
    // 1. Retrieve auth data from localStorage
    const token = localStorage.getItem('access_token');
    const rawRole = localStorage.getItem('user_role');

    // 2. Security Check: No token means they are logged out
    if (!token) {
        // Redirect to login but save the current location so they can return after auth
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. Role Normalization: 
    // We trim and uppercase to prevent "Lab_Tech" vs "LAB_TECH" mismatches
    const userRole = rawRole ? rawRole.toUpperCase().trim() : null;

    // 4. Authorization Gate
    // If we have no role stored, or the role isn't in our allowed list, block access
    const isAuthorized = userRole && allowedRoles.some(
        (role) => role.toUpperCase().trim() === userRole
    );

    if (!isAuthorized) {
        console.warn(`Access Denied: Role [${userRole}] not in allowed list [${allowedRoles}]`);
        return <Navigate to="/unauthorized" replace />;
    }

    // 5. Success: Render the requested component (e.g., Dashboard)
    return children;
};

export default ProtectedRoute;