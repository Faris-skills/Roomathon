// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../lib/firebase'; // Correct path
import { onAuthStateChanged } from 'firebase/auth'; // Correct import
import PropTypes from 'prop-types';
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

  const value = useMemo(() => ({
    currentUser,
    loadingAuth,
  }), [currentUser, loadingAuth]);

  AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
  };

return (
  <AuthContext.Provider value={value}> {/* Correct usage of AuthContext.Provider */}
    {!loadingAuth && children}
  </AuthContext.Provider>
);
}