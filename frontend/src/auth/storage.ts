const TOKEN_KEY = "token";
const USER_KEY = "user";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthHeaders(
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const token = getStoredToken();

  return token
    ? {
        ...extraHeaders,
        Authorization: `Bearer ${token}`,
      }
    : extraHeaders;
}

export function getStoredUser<T = unknown>(): T | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export function setStoredAuthSession(token: string, user: unknown): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
