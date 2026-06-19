import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AdminUser = {
  id: string;
  adminId: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
};

type AuthContextType = {
  user: AdminUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.message || data.error?.message || "Login failed" };
      setUser(data.user);
      sessionStorage.setItem("admin_user", JSON.stringify(data.user));
      sessionStorage.setItem("admin_token", data.token);
      return { error: null };
    } catch {
      return { error: "Network error. Is the API server running?" };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    sessionStorage.removeItem("admin_user");
    sessionStorage.removeItem("admin_token");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
