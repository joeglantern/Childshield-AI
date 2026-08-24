// Realtime smoke test against a running dev API + Redis:
//   pnpm --filter @childshield/api exec tsx scripts/ws-smoke.ts
// Logs in as the seeded officer, opens a WS with a ticket, subscribes to the
// queue room, files an anonymous report, transitions it, and asserts that
// case.created and case.transitioned frames arrive.

import WebSocket from 'ws';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000';
const WS_BASE = BASE.replace(/^http/, 'ws');

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.url} -> ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

const login = await json<{ accessToken: string }>(
  await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'officer@childshield.local', password: 'childshield-dev-password' }),
  }),
);
const auth = { authorization: `Bearer ${login.accessToken}` };

const { ticket } = await json<{ ticket: string }>(
  await fetch(`${BASE}/ws/ticket`, { method: 'POST', headers: auth }),
);

const received: Array<Record<string, unknown>> = [];
const ws = new WebSocket(`${WS_BASE}/ws?ticket=${ticket}`);

const done = new Promise<void>((resolvePromise, reject) => {
  const timer = setTimeout(() => reject(new Error(`timeout; frames so far: ${JSON.stringify(received)}`)), 15000);
  ws.on('message', (buf) => {
    const frame = JSON.parse(String(buf)) as Record<string, unknown>;
    received.push(frame);
    const events = received.map((f) => f.event);
    if (events.includes('case.created') && events.includes('case.transitioned')) {
      clearTimeout(timer);
      resolvePromise();
    }
  });
  ws.on('error', reject);
});

await new Promise<void>((r) => ws.on('open', () => r()));
ws.send(JSON.stringify({ type: 'subscribe', room: 'queue' }));
await new Promise((r) => setTimeout(r, 300));

const created = await json<{ caseCode: string }>(
  await fetch(`${BASE}/cases`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      reporterType: 'CHILD_SELF',
      ageBand: 'AGE_13_15',
      channel: 'WEB',
      incidentType: 'BULLYING',
      description: 'Wananicheka kwenye group chat kila siku.',
      county: 'Kisumu',
      consentVersion: 'v1-sw',
    }),
  }),
);

const queue = await json<Array<{ id: string; caseCode: string }>>(
  await fetch(`${BASE}/cases`, { headers: auth }),
);
const mine = queue.find((c) => c.caseCode === created.caseCode);
if (!mine) throw new Error('created case not in queue');

await json(
  await fetch(`${BASE}/cases/${mine.id}/transition`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ toStatus: 'TRIAGED', note: 'ws smoke' }),
  }),
);

await done;
ws.close();
process.stdout.write(
  `WS smoke OK — case ${created.caseCode}; frames: ${received.map((f) => String(f.event)).join(', ')}\n`,
);
