import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://sahatghar-api.replit.app";

export type PatientUser = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  avatarUrl: string | null;
  bloodGroup: string | null;
  address: string | null;
};

type AuthContextType = {
  patient: PatientUser | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  patient: null,
  token: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
});

const SESSION_KEY = "sahatghar_patient_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<PatientUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_KEY);
        if (stored) {
          const res = await fetch(`${API_BASE}/api/auth/patient/me`, {
            headers: { Authorization: `Bearer ${stored}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.data) {
              setPatient(data.data);
              setToken(stored);
            } else {
              await AsyncStorage.removeItem(SESSION_KEY);
            }
          } else {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/patient/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.data?.token) return false;
      await AsyncStorage.setItem(SESSION_KEY, data.data.token);
      setToken(data.data.token);
      setPatient(data.data.patient);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/api/auth/patient/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    await AsyncStorage.removeItem(SESSION_KEY);
    setPatient(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ patient, token, isLoggedIn: !!patient, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
