import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://sahatghar-api.replit.app";

export type DoctorUser = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  specialty: string;
  city: string;
  pmdcNumber: string | null;
  verificationStatus: string;
  avatarUrl: string | null;
  consultationFee: string | null;
  rating: string | null;
  appointmentsCompleted: number;
};

type AuthContextType = {
  doctor: DoctorUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  doctor: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
});

const SESSION_KEY = "sahatghar_doctor_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [doctor, setDoctor] = useState<DoctorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(SESSION_KEY);
        if (token) {
          const res = await fetch(`${API_BASE}/api/auth/doctor/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.data) setDoctor(data.data);
            else await AsyncStorage.removeItem(SESSION_KEY);
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
      const res = await fetch(`${API_BASE}/api/auth/doctor/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.data?.token) return false;
      await AsyncStorage.setItem(SESSION_KEY, data.data.token);
      setDoctor(data.data.doctor);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setDoctor(null);
  };

  return (
    <AuthContext.Provider value={{ doctor, isLoggedIn: !!doctor, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
