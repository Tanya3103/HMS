import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('carepulse_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('carepulse_token'));
  const [loading, setLoading] = useState(true);

  // Sync session on mount
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('carepulse_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.success && res.data.user) {
          setUser(res.data.user);
          localStorage.setItem('carepulse_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        console.warn('[AuthContext] Session expired or invalid');
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    // Listen for forced logout events from api interceptor
    const handleForcedLogout = () => logout();
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      const { accessToken, refreshToken, user: authUser } = res.data;
      localStorage.setItem('carepulse_token', accessToken);
      localStorage.setItem('carepulse_refresh', refreshToken);
      localStorage.setItem('carepulse_user', JSON.stringify(authUser));
      setToken(accessToken);
      setUser(authUser);
      return authUser;
    }
    throw new Error('Authentication failed');
  };

  const registerPatient = async (formData) => {
    const res = await api.post('/auth/register', formData);
    if (res.success && res.data) {
      const { accessToken, refreshToken, user: authUser } = res.data;
      localStorage.setItem('carepulse_token', accessToken);
      localStorage.setItem('carepulse_refresh', refreshToken);
      localStorage.setItem('carepulse_user', JSON.stringify(authUser));
      setToken(accessToken);
      setUser(authUser);
      return authUser;
    }
    throw new Error('Registration failed');
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('carepulse_refresh');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (e) {
        // Silent fail
      }
    }
    localStorage.removeItem('carepulse_token');
    localStorage.removeItem('carepulse_refresh');
    localStorage.removeItem('carepulse_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        registerPatient,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
