import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../api/client';
import { AdminUser } from '../types';

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  sendOtp: (phone: string) => Promise<string>;
  verifyOtp: (phone: string, sessionId: string, otp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const allowedRoles = ['ADMIN', 'admin', 'SUPERVISOR', 'supervisor'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe().finally(() => setLoading(false));
  }, [token]);

  const isAllowedAdminRole = (role?: string) => role ? allowedRoles.includes(role) : false;

  const fetchMe = async () => {
    try {
      const response = await api.get('/v1/auth/me');
      const currentUser = unwrap<AdminUser>(response);
      if (!isAllowedAdminRole(currentUser.role)) {
        logout();
        throw new Error('Only admin/supervisor users can access this dashboard.');
      }
      setUser(currentUser);
    } catch (error) {
      logout();
      throw error;
    }
  };

  const sendOtp = async (phone: string) => {
    const response = await api.post('/v1/auth/otp/send', { phone });
    const data = unwrap<{ session_id: string }>(response);
    return data.session_id;
  };

  const verifyOtp = async (phone: string, sessionId: string, otp: string) => {
    const response = await api.post('/v1/auth/otp/verify', {
      phone,
      session_id: sessionId,
      otp,
    });
    const data = unwrap<{ access_token: string }>(response);
    localStorage.setItem('admin_token', data.access_token);

    try {
      const meResponse = await api.get('/v1/auth/me');
      const currentUser = unwrap<AdminUser>(meResponse);

      if (!isAllowedAdminRole(currentUser.role)) {
        localStorage.removeItem('admin_token');
        throw new Error(`Access denied. This phone is registered as ${currentUser.role || 'unknown'}, not ADMIN/SUPERVISOR.`);
      }

      setUser(currentUser);
    } catch (error) {
      localStorage.removeItem('admin_token');
      throw error;
    }

    setToken(data.access_token);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, loading, sendOtp, verifyOtp, logout }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
