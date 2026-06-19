import { useAuth as useClerkAuth, useUser, useClerk, useSignIn } from "@clerk/clerk-expo";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

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
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  patient: null,
  token: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
  refreshProfile: async () => {},
});

async function fetchPatientProfile(token: string): Promise<PatientUser | null> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/auth/patient/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json?.success || !json?.data) return null;
  const d = json.data;
  return {
    id: d.id,
    userId: d.userId ?? d.id,
    fullName: d.fullName ?? "",
    email: d.email ?? "",
    phone: d.phone ?? null,
    dateOfBirth: d.dateOfBirth ?? null,
    gender: d.gender ?? null,
    avatarUrl: d.avatarUrl ?? null,
    bloodGroup: d.bloodGroup ?? null,
    address: d.address ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [token, setToken] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      setToken(null);
      setPatient(null);
      return;
    }
    getToken().then(setToken).catch(() => setToken(null));
  }, [isSignedIn, getToken, clerkUser?.id]);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setPatient(null);
      return;
    }
    setProfileLoading(true);
    try {
      const profile = await fetchPatientProfile(token);
      setPatient(profile);
    } finally {
      setProfileLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    refreshProfile().catch(() => setPatient(null));
  }, [token, refreshProfile]);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!signInLoaded || !signIn || !setActive) return false;
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        const sessionToken = await getToken();
        setToken(sessionToken);
        if (sessionToken && API_BASE) {
          await fetch(`${API_BASE}/api/auth/sync-me`, {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionToken}` },
          }).catch(() => undefined);
          const profile = await fetchPatientProfile(sessionToken);
          setPatient(profile);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    setToken(null);
    setPatient(null);
    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        patient,
        token,
        isLoggedIn: !!isSignedIn,
        isLoading: !isLoaded || profileLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
