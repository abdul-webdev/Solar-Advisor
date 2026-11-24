import { createContext, useContext, useEffect, useState } from 'react';
import { get, post } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('sa_token');
    if (!t) { setLoading(false); return; }
    get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => { localStorage.removeItem('sa_token'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const d = await post('/auth/login', { email, password });
    localStorage.setItem('sa_token', d.token);
    setUser(d.user);
    return d.user;
  }

  async function register(name, email, password) {
    const d = await post('/auth/register', { name, email, password });
    localStorage.setItem('sa_token', d.token);
    setUser(d.user);
    return d.user;
  }

  function logout() {
    localStorage.removeItem('sa_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
