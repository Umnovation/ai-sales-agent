import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken, getToken, setToken } from "@/api/client";
import * as authApi from "@/api/endpoints/auth";
import type { LoginRequest } from "@/api/types/auth";
import { create } from "zustand";

interface AuthState {
  token: string | null;
  setAuth: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getToken(),
  setAuth: (token: string) => {
    setToken(token);
    set({ token });
  },
  logout: () => {
    clearToken();
    set({ token: null });
  },
}));

export function useAuth(): {
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => void;
} {
  const { token, setAuth, logout: storeLogout } = useAuthStore();
  const navigate = useNavigate();

  const isAuthenticated: boolean = useMemo(() => token !== null, [token]);

  const login = useCallback(
    async (payload: LoginRequest): Promise<void> => {
      const response = await authApi.login(payload);
      if (response.data) {
        setAuth(response.data.token);
        navigate("/");
      }
    },
    [setAuth, navigate],
  );

  const logout = useCallback((): void => {
    storeLogout();
    navigate("/login");
  }, [storeLogout, navigate]);

  return { isAuthenticated, login, logout };
}
