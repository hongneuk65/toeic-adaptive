import { createContext, useContext } from 'react';

export interface AuthUser { id: number; email: string; role: 'ADMIN' | 'USER' }

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  login: (token: string) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  return context;
}
