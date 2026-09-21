'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  loginApi, 
  refreshTokensApi, 
  logoutApi, 
  fetchCurrentUserApi,
  provisionUserApi 
} from '../services/api';

const AuthContext = createContext(null);

const STORAGE_ACCESS_TOKEN = 'sanjeevani_access_token';
const STORAGE_REFRESH_TOKEN = 'sanjeevani_refresh_token';
const STORAGE_USER = 'sanjeevani_user_profile';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Helper to persist auth state
  const saveTokensAndUser = (access, refresh, userProfile) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    setUser(userProfile);

    if (typeof window !== 'undefined') {
      if (access) localStorage.setItem(STORAGE_ACCESS_TOKEN, access);
      else localStorage.removeItem(STORAGE_ACCESS_TOKEN);

      if (refresh) localStorage.setItem(STORAGE_REFRESH_TOKEN, refresh);
      else localStorage.removeItem(STORAGE_REFRESH_TOKEN);

      if (userProfile) localStorage.setItem(STORAGE_USER, JSON.stringify(userProfile));
      else localStorage.removeItem(STORAGE_USER);
    }
  };

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_USER);
    }
  }, []);

  // Initialize and validate session on mount
  useEffect(() => {
    async function initAuth() {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const storedAccess = localStorage.getItem(STORAGE_ACCESS_TOKEN);
      const storedRefresh = localStorage.getItem(STORAGE_REFRESH_TOKEN);
      const storedUserJson = localStorage.getItem(STORAGE_USER);

      if (!storedAccess || !storedRefresh) {
        setIsLoading(false);
        return;
      }

      try {
        if (storedUserJson) {
          setUser(JSON.parse(storedUserJson));
        }
        setAccessToken(storedAccess);
        setRefreshToken(storedRefresh);

        // Verify access token validity against backend
        const meRes = await fetchCurrentUserApi(storedAccess);
        if (meRes?.status === 'success' && meRes.user) {
          setUser(meRes.user);
          localStorage.setItem(STORAGE_USER, JSON.stringify(meRes.user));
        } else {
          // Access token might be expired; attempt silent refresh
          const refreshRes = await refreshTokensApi(storedRefresh);
          if (refreshRes?.status === 'success' && refreshRes.access_token) {
            saveTokensAndUser(refreshRes.access_token, refreshRes.refresh_token, refreshRes.user);
          } else {
            clearAuth();
          }
        }
      } catch (err) {
        console.warn('[Auth Initialization Check]: Attempting fallback token refresh...');
        try {
          const refreshRes = await refreshTokensApi(storedRefresh);
          if (refreshRes?.status === 'success' && refreshRes.access_token) {
            saveTokensAndUser(refreshRes.access_token, refreshRes.refresh_token, refreshRes.user);
          } else {
            clearAuth();
          }
        } catch {
          clearAuth();
        }
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen for custom token-expired event dispatched by API client interceptor
    const handleAuthExpired = () => {
      clearAuth();
      setIsLoginModalOpen(true);
    };

    window.addEventListener('sanjeevani_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('sanjeevani_auth_expired', handleAuthExpired);
  }, [clearAuth]);

  // Sign In action
  const login = async (email, password) => {
    try {
      const data = await loginApi(email, password);
      if (data?.status === 'success' && data.access_token) {
        saveTokensAndUser(data.access_token, data.refresh_token, data.user);
        setIsLoginModalOpen(false);
        return { success: true, user: data.user };
      }
      return { 
        success: false, 
        error: data?.error || data?.data || data?.detail || 'Invalid credentials. Please verify your email and password.' 
      };
    } catch (err) {
      return { success: false, error: err.message || 'Login request error' };
    }
  };

  // Sign Out action
  const logout = async () => {
    try {
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuth();
    }
  };

  // Rotate / refresh tokens explicitly
  const refreshSession = async () => {
    const activeRefresh = refreshToken || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_REFRESH_TOKEN) : null);
    if (!activeRefresh) {
      clearAuth();
      return null;
    }
    try {
      const data = await refreshTokensApi(activeRefresh);
      if (data?.status === 'success' && data.access_token) {
        saveTokensAndUser(data.access_token, data.refresh_token, data.user);
        return data.access_token;
      }
      clearAuth();
      return null;
    } catch {
      clearAuth();
      return null;
    }
  };

  // Provision email via backend API with Base64 Secret Key
  const provisionUser = async (base64Secret, userData) => {
    return await provisionUserApi(base64Secret, userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated: Boolean(user && accessToken),
        isLoading,
        isLoginModalOpen,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        login,
        logout,
        refreshSession,
        provisionUser
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
