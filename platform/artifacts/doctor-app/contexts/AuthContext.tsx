import { useAuth as useClerkAuth, useUser, useClerk, useSignIn } from "@clerk/clerk-expo";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
export { API_BASE };

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
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  doctor: null,
  token: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
  refreshProfile: async () => {},
});

async function fetchDoctorProfile(token: string): Promise<DoctorUser | null> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/auth/doctor/me`, {
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
    specialty: d.specialty ?? "",
    city: d.city ?? "",
    pmdcNumber: d.pmdcNumber ?? null,
    verificationStatus: d.verificationStatus ?? "PENDING",
    avatarUrl: d.avatarUrl ?? null,
    consultationFee: d.consultationFee != null ? String(d.consultationFee) : null,
    rating: d.rating != null ? String(d.rating) : null,
    appointmentsCompleted: d.appointmentsCompleted ?? 0,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [token, setToken] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<DoctorUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      setToken(null);
      setDoctor(null);
      return;
    }
    getToken().then(setToken).catch(() => setToken(null));
  }, [isSignedIn, getToken, clerkUser?.id]);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setDoctor(null);
      return;
    }
    setProfileLoading(true);
    try {
      const profile = await fetchDoctorProfile(token);
      setDoctor(profile);
    } finally {
      setProfileLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    refreshProfile().catch(() => setDoctor(null));
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
        if (sessionToken) {
          const profile = await fetchDoctorProfile(sessionToken);
          if (!profile) return false;
          setDoctor(profile);
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
    setDoctor(null);
    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        doctor,
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
