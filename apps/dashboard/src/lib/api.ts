// Typed API client (browser). Types + runtime constants from @childshield/shared.
import type {
  AuditListResponse,
  CaseDetailDto,
  CaseEventDto,
  CaseStatus,
  CaseSummaryDto,
  LoginRequest,
  Severity,
  TokenPair,
  WsTicketResponse,
} from '@childshield/shared';

export const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...rest } = init ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let code = 'ERROR';
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { code?: string; message?: string };
      code = body.code ?? code;
      message = body.message ?? message;
    } catch {
      /* non-JSON body */
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}

export const api = {
  login: (body: LoginRequest) =>
    request<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  refresh: (refreshToken: string) =>
    request<TokenPair>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  listCases: (token: string) => request<CaseSummaryDto[]>('/cases', { token }),
  caseDetail: (token: string, id: string) => request<CaseDetailDto>(`/cases/${id}`, { token }),
  transition: (token: string, id: string, toStatus: CaseStatus, note?: string) =>
    request<CaseSummaryDto>(`/cases/${id}/transition`, {
      method: 'POST',
      token,
      body: JSON.stringify({ toStatus, ...(note ? { note } : {}) }),
    }),
  addNote: (token: string, id: string, text: string, tag?: string) =>
    request<CaseEventDto>(`/cases/${id}/notes`, {
      method: 'POST',
      token,
      body: JSON.stringify({ text, ...(tag ? { tag } : {}) }),
    }),
  wsTicket: (token: string) => request<WsTicketResponse>('/ws/ticket', { method: 'POST', token }),
  listAudit: (token: string, opts?: { limit?: number; before?: string }) => {
    const qs = new URLSearchParams();
    if (opts?.limit) qs.set('limit', String(opts.limit));
    if (opts?.before) qs.set('before', opts.before);
    const suffix = qs.size > 0 ? `?${qs.toString()}` : '';
    return request<AuditListResponse>(`/audit${suffix}`, { token });
  },
};

export type { CaseDetailDto, CaseSummaryDto, CaseStatus, Severity, AuditListResponse };
