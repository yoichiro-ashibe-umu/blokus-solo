import { useState, useCallback } from 'react';

export interface HistoryRecord {
  date: string;
  difficulty: string;
  score: number;
  rank: number;
  totalPlayers: number;
  placedAll: boolean;
}

const STORAGE_KEY = 'blokus_solo_history';

function load(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryRecord[]) : [];
  } catch {
    return [];
  }
}

function save(records: HistoryRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 50)));
  } catch {
    // ignore
  }
}

export function useGameHistory() {
  const [records, setRecords] = useState<HistoryRecord[]>(load);

  const addRecord = useCallback((rec: HistoryRecord) => {
    setRecords(prev => {
      const next = [rec, ...prev].slice(0, 50);
      save(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRecords([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const bestByDifficulty = useCallback((difficulty: string): number | null => {
    const filtered = records.filter(r => r.difficulty === difficulty);
    if (filtered.length === 0) return null;
    return Math.max(...filtered.map(r => r.score));
  }, [records]);

  return { records, addRecord, clearHistory, bestByDifficulty };
}
