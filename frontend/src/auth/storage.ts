const TOKEN_KEY = "token";
const AUTH_KEY = "auth";
const USER_KEY = "user"; // legacy fallback for compatibility

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
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

export function getStoredAuth<T = unknown>(): T | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export function getStoredUser<T = unknown>(): T | null {
  const auth = getStoredAuth<{ user?: T }>();
  if (auth?.user) {
    return auth.user as T;
  }

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export function setStoredAuthSession(token: string, auth: unknown): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));

  try {
    const authObject = auth as { user?: unknown };
    if (authObject?.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(authObject.user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearStoredAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}
