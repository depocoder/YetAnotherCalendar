import React from 'react';
import { Navigate } from 'react-router-dom';
import { getTutorTokenFromLocalStorage } from '../services/api';

const TutorPrivateRoute = ({ children }) => {
    const tutorToken = getTutorTokenFromLocalStorage();
    
    if (!tutorToken) {
        return <Navigate to="/admin/login" replace />;
    }
    
    return children;
};

export default TutorPrivateRoute;