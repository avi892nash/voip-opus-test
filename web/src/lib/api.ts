// Thin fetch wrapper that injects the JWT auth header and points at VITE_API_URL.
// In dev, Vite proxies /api → backend, so the default empty base works.

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function authHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token ?? null),
      ...(headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  signup: (body: { username: string; email: string; password: string }) =>
    request<AuthResponse>('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { username_or_email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: (token: string) => request<User>('/api/auth/me', { token }),

  onlineUsers: (token: string) =>
    request<User[]>('/api/users/online', { token }),
};
