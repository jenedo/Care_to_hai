export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem("admin_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || err.error?.message || "Request failed");
  }
  return res.json();
}
