// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase'; // Correct path
import { onAuthStateChanged } from 'firebase/auth'; // Correct import

const AuthContext = createContext(); // Correct capitalization and function call

export function useAuth() { // Correct export of a function
  return useContext(AuthContext);
}

export function AuthProvider({ children }) { // Correct export of a function component
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loadingAuth,
  };

  return (
    <AuthContext.Provider value={value}> {/* Correct usage of AuthContext.Provider */}
      {!loadingAuth && children}
    </AuthContext.Provider>
  );
}