// AuthContext.js
import React, { createContext, useState } from 'react';

// Создаем контекст
export const AuthContext = createContext();

// Создаем провайдер для использования контекста
export const AuthProvider = ({ children }) => {
  const [authData, setAuthData] = useState({
    email: null,
    password: null,
    person: null,
    personId: null,
  });

  return (
    <AuthContext.Provider value={{ authData, setAuthData }}>
      {children}
    </AuthContext.Provider>
  );
};
