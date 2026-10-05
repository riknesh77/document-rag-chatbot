import { createContext, useContext, useEffect, useState } from 'react';
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth', { signal: controller.signal }).then(r => r.json()).then(data => setUser(data.user || null)).catch(() => {}).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  return <AuthContext.Provider value={{ user, setUser, loading }}>{children}</AuthContext.Provider>;
}
export default function useAuth() { return useContext(AuthContext); }
