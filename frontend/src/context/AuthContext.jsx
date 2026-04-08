import { useMemo, useState } from "react";
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

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      isAuthenticated: Boolean(auth.token && auth.user),
      login,
      logout,
    }),
    [auth.token, auth.user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
