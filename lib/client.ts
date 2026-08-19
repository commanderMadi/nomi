export type NameComponent = {
  id: string;
  type: string;
  value: string;
  script: string;
};

export type Identity = {
  id: string;
  context: string;
  label: string;
  isDefault: boolean;
  components: NameComponent[];
};

export type Permission = {
  id: string;
  requester: { id: string; name: string; type: string };
  context: string;
  grantedAt: string;
  revokedAt: string | null;
};

export type AuditRow = {
  id: string;
  action: string;
  result: string;
  requester: string | null;
  requesterType: string | null;
  context: string | null;
  createdAt: string;
};

export type ContextInfo = { name: string; description: string };

export type RequesterInfo = { id: string; name: string; type: string };

export type Session = { token: string; userId: string };

const TOKEN_KEY = "nomi.token";
const USER_KEY = "nomi.userId";

// session helpers to persist auth token + userId in localStorage
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const userId = localStorage.getItem(USER_KEY);
  return token && userId ? { token, userId } : null;
}

export function setSession(session: Session) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, session.userId);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// a fetch wrapper that auto-attaches auth headers and prepends the api base path
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ status: number; body: T }> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const session = getSession();
  if (session && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }
  const res = await fetch(`/api/v1${path}`, { ...options, headers });
  const body = res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  return { status: res.status, body };
}

const UNSPACED_SCRIPTS = new Set(["Jpan", "Hani", "Hans", "Hant"]);

// client-side display name builder, mirrors the server logic in resolve-name.ts
export function displayName(components: NameComponent[]): string {
  const separator =
    components.length > 0 &&
      components.every((c) => UNSPACED_SCRIPTS.has(c.script))
      ? ""
      : " ";
  return components.map((c) => c.value).join(separator);
}
