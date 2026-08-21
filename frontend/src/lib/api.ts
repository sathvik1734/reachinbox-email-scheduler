import type {
  EmailListResponse,
  ScheduleCampaignInput,
  ScheduleCampaignResponse,
  Stats,
  SystemConfig,
  User,
} from "../types/api";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new ApiError(response.status, body?.error?.message ?? "Request failed");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  loginUrl: `${API_URL}/auth/google`,
  me: () => request<{ user: User }>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  emails: (view: "scheduled" | "sent", page: number) =>
    request<EmailListResponse>(`/api/emails?view=${view}&page=${page}&limit=25`),
  stats: () => request<Stats>("/api/emails/stats"),
  config: () => request<SystemConfig>("/api/config"),
  schedule: (input: ScheduleCampaignInput) =>
    request<ScheduleCampaignResponse>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
