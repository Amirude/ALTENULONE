import { createContext, useContext, useState } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ooru_user');
    return stored ? JSON.parse(stored) : null;
  });

  async function register({ name, phone, email, password, role }) {
    await apiClient.post('/auth/register', { name, phone, email, password, role });
  }

  async function verifyOtp({ phone, otp }) {
    await apiClient.post('/auth/verify-otp', { phone, otp });
  }

  async function login({ phone, password }) {
    const res = await apiClient.post('/auth/login', { phone, password });
    const { token, userId, name, role } = res.data;
    localStorage.setItem('ooru_token', token);
    const userData = { userId, name, role };
    localStorage.setItem('ooru_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }

  function logout() {
    localStorage.removeItem('ooru_token');
    localStorage.removeItem('ooru_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, register, verifyOtp, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
