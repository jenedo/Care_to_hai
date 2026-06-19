import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { signIn, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
      <div style={{ background: "white", padding: "2rem", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#0ea5e9" }}>AsaanCare</h1>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>Admin Panel</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "1rem", boxSizing: "border-box", outline: "none" }}
              placeholder="superadmin@asaancare.pk"
              required
            />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "1rem", boxSizing: "border-box", outline: "none" }}
              placeholder="????????"
              required
            />
          </div>
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            style={{ width: "100%", padding: "0.75rem", background: isLoading ? "#93c5fd" : "#0ea5e9", color: "white", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: "600", cursor: isLoading ? "not-allowed" : "pointer" }}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
