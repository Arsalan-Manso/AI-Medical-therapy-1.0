import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./authContextStore";

const STORAGE_KEY = "ai-medical-auth";

const readStoredAuth = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { token: null, user: null };
  try {
    return JSON.parse(raw);
  } catch {
    return { token: null, user: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(readStoredAuth);

  const login = ({ token, user }) => {
    const nextValue = { token, user };
    setAuth(nextValue);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
  };

  const logout = () => {
    setAuth({ token: null, user: null });
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateUser = useCallback((partial) => {
    setAuth((prev) => {
      if (!prev.user) return prev;
      const nextUser = { ...prev.user, ...partial };
      const next = { ...prev, user: nextUser };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      isAuthenticated: Boolean(auth.token && auth.user),
      login,
      logout,
      updateUser,
    }),
    [auth.token, auth.user, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
