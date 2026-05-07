import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);
const SESSION_TIMEOUT = 2 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const sessionLogout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    toast.error('Your session has expired. Sign in to start again.');
    window.location.href = '/login';
  }, []);

  const resetTimer = useCallback(() => {
    if (!localStorage.getItem('accessToken')) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(sessionLogout, SESSION_TIMEOUT);
  }, [sessionLogout]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const meRes = await api.get('/auth/me');
    setUser(meRes.data.user);
    return meRes.data.user;
  }

  async function signup(name, email, password) {
    const { data } = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const meRes = await api.get('/auth/me');
    setUser(meRes.data.user);
    return meRes.data.user;
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
