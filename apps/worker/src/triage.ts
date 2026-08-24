// Advisory ML triage (Milestone B3).
// SAFEGUARDING INVARIANT 2 (HUMAN-IN-THE-LOOP): the ONLY thing this module
// ever does with a model output is write CaseEvent(AI_ASSESSMENT) and emit
// the advisory ai.assessed WS event. It never transitions a case, never
// creates a referral, never sends a notification. Keep it that way.

export interface ClassifyResponse {
  labels: string[];
  scores: Record<string, number>;
  model: string;
}

export interface SeverityResponse {
  severity: string;
  confidence: number;
  explanation: string[];
  model: string;
}

export interface Assessment {
  labels: string[];
  suggestedSeverity: string;
  confidence: number;
  explanation: string[];
  models: { classifier: string; severity: string };
}

/// Pure: shapes the two ML responses into the persisted assessment payload.
export function buildAssessment(classify: ClassifyResponse, severity: SeverityResponse): Assessment {
  return {
    labels: classify.labels,
    suggestedSeverity: severity.severity,
    confidence: Math.max(0, Math.min(1, severity.confidence)),
    explanation: severity.explanation,
    models: { classifier: classify.model, severity: severity.model },
  };
}

export interface MlClient {
  classify(text: string): Promise<ClassifyResponse>;
  severity(text: string, labels: string[], incidentType: string): Promise<SeverityResponse>;
}

export function createMlClient(baseUrl: string, apiKey: string): MlClient {
  const headers = {
    'content-type': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
  };
  const post = async <T>(path: string, body: unknown): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`ML ${path} responded ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  };
  return {
    classify: (text) => post<ClassifyResponse>('/classify', { text }),
    severity: (text, labels, incidentType) =>
      post<SeverityResponse>('/severity', { text, labels, incident_type: incidentType }),
  };
}
