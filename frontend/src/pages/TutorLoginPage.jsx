import React from 'react';
import { Navigate } from 'react-router-dom';
import TutorLogin from '../components/login/TutorLogin';
import { getTutorTokenFromLocalStorage } from '../services/api';

const TutorLoginPage = () => {
    const tutorToken = getTutorTokenFromLocalStorage();
    
    // If already logged in, redirect to admin page
    if (tutorToken) {
        return <Navigate to="/admin/calendar-links" replace />;
    }

    const handleSuccess = () => {
        // Navigate to admin page after successful login
        window.location.href = '/admin/calendar-links';
    };

    return (
        <div className="login-page">
            <TutorLogin onSuccess={handleSuccess} />
        </div>
    );
};

export default TutorLoginPage;