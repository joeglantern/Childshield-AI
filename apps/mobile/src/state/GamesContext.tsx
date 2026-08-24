// Local-only game records: high scores, streaks, star ratings.
// SAFEGUARDING: saved on-device only (AsyncStorage), never on a server — no
// accounts, no online leaderboards, no social feature for a child to be
// targeted through. Mirrors AppContext.tsx's exact persistence idiom.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Stars = 1 | 2 | 3;

interface TowerRecord {
  highScore: number;
}

interface SlingshotRecord {
  starsByLevel: Record<string, Stars>;
}

interface TriviaRecord {
  highScore: number;
  bestCombo: number;
  lastPlayedDate: string | null;
}

interface CalmRecord {
  nestStreakDays: number;
  lastNestDate: string | null;
}

interface GamesState {
  tower: TowerRecord;
  slingshot: SlingshotRecord;
  trivia: TriviaRecord;
  calm: CalmRecord;
  recordTowerScore: (floors: number) => void;
  recordSlingshotStars: (levelId: string, stars: Stars) => void;
  recordTriviaRound: (score: number, comboReached: number) => void;
  recordNestToday: () => boolean;
}

const GamesContext = createContext<GamesState | null>(null);

const STORAGE_KEY = 'childshield.games.v1';

interface Persisted {
  tower?: TowerRecord;
  slingshot?: SlingshotRecord;
  trivia?: TriviaRecord;
  calm?: CalmRecord;
}

const defaultTower: TowerRecord = { highScore: 0 };
const defaultSlingshot: SlingshotRecord = { starsByLevel: {} };
const defaultTrivia: TriviaRecord = { highScore: 0, bestCombo: 0, lastPlayedDate: null };
const defaultCalm: CalmRecord = { nestStreakDays: 0, lastNestDate: null };

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GamesProvider({ children }: { children: React.ReactNode }) {
  const [tower, setTower] = useState<TowerRecord>(defaultTower);
  const [slingshot, setSlingshot] = useState<SlingshotRecord>(defaultSlingshot);
  const [trivia, setTrivia] = useState<TriviaRecord>(defaultTrivia);
  const [calm, setCalm] = useState<CalmRecord>(defaultCalm);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Persisted;
        if (saved.tower) setTower(saved.tower);
        if (saved.slingshot) setSlingshot(saved.slingshot);
        if (saved.trivia) setTrivia(saved.trivia);
        if (saved.calm) setCalm(saved.calm);
      } catch {
        // corrupted records are simply reset
      }
    });
  }, []);

  const persist = (patch: Persisted) => {
    void AsyncStorage.mergeItem(STORAGE_KEY, JSON.stringify(patch)).catch(() =>
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(patch)),
    );
  };

  const value = useMemo<GamesState>(
    () => ({
      tower,
      slingshot,
      trivia,
      calm,
      recordTowerScore: (floors) => {
        if (floors <= tower.highScore) return;
        const next = { highScore: floors };
        setTower(next);
        persist({ tower: next });
      },
      recordSlingshotStars: (levelId, stars) => {
        const current = slingshot.starsByLevel[levelId] ?? 0;
        if (stars <= current) return;
        const next = { starsByLevel: { ...slingshot.starsByLevel, [levelId]: stars } };
        setSlingshot(next);
        persist({ slingshot: next });
      },
      recordTriviaRound: (score, comboReached) => {
        const next: TriviaRecord = {
          highScore: Math.max(trivia.highScore, score),
          bestCombo: Math.max(trivia.bestCombo, comboReached),
          lastPlayedDate: todayKey(),
        };
        setTrivia(next);
        persist({ trivia: next });
      },
      recordNestToday: () => {
        const today = todayKey();
        if (calm.lastNestDate === today) return false; // already placed today
        const wasYesterday = calm.lastNestDate === yesterdayKey();
        const next: CalmRecord = {
          nestStreakDays: wasYesterday ? calm.nestStreakDays + 1 : 1,
          lastNestDate: today,
        };
        setCalm(next);
        persist({ calm: next });
        return true;
      },
    }),
    [tower, slingshot, trivia, calm],
  );

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function useGames(): GamesState {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error('useGames must be used inside GamesProvider');
  return ctx;
}
