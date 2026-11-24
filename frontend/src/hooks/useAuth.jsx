import { createContext, useContext, useEffect, useState } from 'react';
import { get, post } from '../services/api';
import { clearToken, getToken, setToken } from '../services/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function onUnauthorized() {
      setUser(null);
    }
    window.addEventListener('sa:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sa:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => { clearToken(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const d = await post('/auth/login', { email, password });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }

  async function register(name, email, password) {
    const d = await post('/auth/register', { name, email, password });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }

  function logout() {
    post('/auth/logout').catch(() => {});
    clearToken();
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
