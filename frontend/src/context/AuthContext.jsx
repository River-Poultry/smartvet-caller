import { createContext, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('smartvet_token');
    if (!token) {
      setLoading(false);
      return;
    }
    setAuthToken(token);
    api
      .getMe()
      .then(setUser)
      .catch(() => {
        setAuthToken(null);
        localStorage.removeItem('smartvet_token');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { token, user } = await api.login(email, password);
    localStorage.setItem('smartvet_token', token);
    setAuthToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem('smartvet_token');
    setAuthToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
