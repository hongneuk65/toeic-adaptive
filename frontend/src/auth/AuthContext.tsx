import React, { useEffect, useState } from 'react';
import { AuthContext, type AuthUser } from './useAuth';
import { api, getErrorMessage, AUTH_EXPIRED_EVENT } from '../lib/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken'));
  const [identity, setIdentity] = useState<{ token: string; user?: AuthUser; error?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const current = identity?.token === token ? identity : null;
  const user = current?.user ?? null;
  const error = current?.error ?? null;
  useEffect(() => {
    const expired = (event: Event) => {
      const invalid = (event as CustomEvent<{ token: string }>).detail?.token;
      if (invalid !== localStorage.getItem('accessToken')) return;
      localStorage.removeItem('accessToken');
      setToken(null);
      setIdentity(null);
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === 'accessToken') { setToken(event.newValue); setIdentity(null); }
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    window.addEventListener('storage', storageChanged);
    return () => { window.removeEventListener(AUTH_EXPIRED_EVENT, expired); window.removeEventListener('storage', storageChanged); };
  }, []);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    api<AuthUser>('/auth/me', { signal: controller.signal }).then(user => {
      if (!controller.signal.aborted) setIdentity({ token, user });
    }).catch(cause => {
      if (!controller.signal.aborted) setIdentity({ token, error: getErrorMessage(cause, 'Không thể xác minh tài khoản.') });
    });
    return () => controller.abort();
  }, [token, revision]);

  const login = async (newToken: string) => {
    localStorage.setItem('accessToken', newToken);
    try {
      const user = await api<AuthUser>('/auth/me');
      setIdentity({ token: newToken, user });
      setToken(newToken);
      return user;
    } catch (cause) {
      localStorage.removeItem('accessToken');
      setToken(null);
      throw cause;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setIdentity(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading: !!token && !current, error, isAuthenticated: !!token && !!user, retry: () => { setIdentity(null); setRevision(value => value + 1); }, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
