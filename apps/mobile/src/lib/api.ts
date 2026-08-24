// Typed API client over the real backend (types from @childshield/shared).
// SAFEGUARDING: intake carries zero PII by construction (IntakeDto).
import type {
  CaseDetailDto,
  CaseEventDto,
  CasePublicStatusDto,
  CaseStatus,
  CaseSummaryDto,
  CreateCaseResponse,
  IntakeDto,
  LoginRequest,
  Severity,
  TokenPair,
  WsTicketResponse,
} from '@childshield/shared';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...rest } = init ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
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
      // non-JSON error body
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}

export const api = {
  baseUrl: BASE,

  createCase: (intake: IntakeDto) =>
    request<CreateCaseResponse>('/cases', { method: 'POST', body: JSON.stringify(intake) }),

  caseStatus: (caseCode: string) =>
    request<CasePublicStatusDto>(`/case-status/${encodeURIComponent(caseCode)}`),

  login: (body: LoginRequest) =>
    request<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  refresh: (refreshToken: string) =>
    request<TokenPair>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  listCases: (token: string, filters?: { status?: CaseStatus; severity?: Severity }) => {
    const qs = new URLSearchParams();
    if (filters?.status) qs.set('status', filters.status);
    if (filters?.severity) qs.set('severity', filters.severity);
    const suffix = qs.size > 0 ? `?${qs.toString()}` : '';
    return request<CaseSummaryDto[]>(`/cases${suffix}`, { token });
  },

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
};
