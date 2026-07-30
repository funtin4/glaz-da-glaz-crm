import type { Answers, Prescription, RecommendationSet, SessionRecord, Tier } from './types';
import { emptyAnswers, emptyRx } from './types';
import { recommend } from './recommend';

const STORAGE_KEY = 'gdz_lens_sessions_v1';

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function loadAll(): Record<string, SessionRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, SessionRecord>;
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, SessionRecord>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function createSession(input: {
  prescription?: Prescription;
  answers?: Partial<Answers>;
  channel?: SessionRecord['channel'];
  agentNote?: string;
  clientName?: string;
  clientPhone?: string;
  budgetPair?: number | null;
}): SessionRecord {
  const map = loadAll();
  let code = randomCode();
  while (map[code]) code = randomCode();

  const answers = { ...emptyAnswers(), ...input.answers };
  if (input.budgetPair !== undefined) answers.budgetPair = input.budgetPair;

  const session: SessionRecord = {
    code,
    createdAt: new Date().toISOString(),
    channel: input.channel ?? 'web',
    agentNote: input.agentNote ?? '',
    prescription: input.prescription ?? emptyRx(),
    answers,
    recommendation: null,
    chosen: null,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
  };
  map[code] = session;
  saveAll(map);
  return session;
}

export function getSession(code: string): SessionRecord | null {
  const map = loadAll();
  return map[code.toUpperCase()] ?? null;
}

export function updateSession(code: string, patch: Partial<SessionRecord>): SessionRecord | null {
  const map = loadAll();
  const key = code.toUpperCase();
  const cur = map[key];
  if (!cur) return null;
  const next = { ...cur, ...patch, code: key };
  map[key] = next;
  saveAll(map);
  return next;
}

export function saveAnswers(code: string, answers: Answers): SessionRecord | null {
  return updateSession(code, { answers });
}

export function savePrescription(code: string, prescription: Prescription): SessionRecord | null {
  return updateSession(code, { prescription });
}

export function runRecommend(code: string): SessionRecord | null {
  const cur = getSession(code);
  if (!cur) return null;
  const recommendation: RecommendationSet = recommend(cur.prescription, cur.answers);
  return updateSession(code, { recommendation });
}

export function chooseTier(code: string, tier: Tier, skuId: string): SessionRecord | null {
  return updateSession(code, { chosen: { tier, skuId } });
}

export function listSessions(): SessionRecord[] {
  return Object.values(loadAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Demo session for empty /select without code */
export function ensureDemoSession(): SessionRecord {
  const existing = getSession('DEMO');
  if (existing) return existing;
  const map = loadAll();
  const session: SessionRecord = {
    code: 'DEMO',
    createdAt: new Date().toISOString(),
    channel: 'web',
    agentNote: 'Демо-сессия',
    prescription: {
      od: { sph: -3.5, cyl: -0.75, ax: 180, add: null },
      os: { sph: -3.25, cyl: -0.5, ax: 10, add: null },
      pd: 62,
      age: 32,
    },
    answers: emptyAnswers(),
    recommendation: null,
    chosen: null,
  };
  map.DEMO = session;
  saveAll(map);
  return session;
}
