import React, { createContext, useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const reloadUser = useCallback(async () => {
    const { data } = await API.get('/auth/me');
    setUser(data);
    return data;
  }, []);

  // Refresh token automatiquement avant expiration
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const { data } = await API.post('/auth/refresh-token', { refreshToken });
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      return true;
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      return false;
    }
  }, []);

  // Charger l'utilisateur au montage
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          await reloadUser();
        } catch (error) {
          // Essayer de refresher le token
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            try {
              await reloadUser();
            } catch (err) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
            }
          }
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [refreshAccessToken, reloadUser]);

  // Configurer un intervalle pour refresher le token (chaque 10 min)
  useEffect(() => {
    const interval = setInterval(() => {
      if (localStorage.getItem('refreshToken')) {
        refreshAccessToken();
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshAccessToken]);

  const login = async (email, password) => {
    try {
      const { data } = await API.post('/auth/login', {
        email: String(email || '').trim().toLowerCase(),
        password,
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      await reloadUser();
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshAccessToken, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
};