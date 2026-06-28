import React from 'react';
import { useGameHistory } from '../hooks/useHistory';

const DIFF_LABELS: Record<string, string> = {
  easy: '弱', medium: '中', hard: '強', expert: '鬼',
};

interface Props {
  onClose: () => void;
}

export const HistoryPanel: React.FC<Props> = ({ onClose }) => {
  const { records, clearHistory, bestByDifficulty } = useGameHistory();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">対戦履歴</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Best scores */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {(['easy', 'medium', 'hard', 'expert'] as const).map(d => {
            const best = bestByDifficulty(d);
            return (
              <div key={d} className="bg-slate-800 rounded p-2 text-center">
                <div className="text-xs text-slate-400">{DIFF_LABELS[d]}</div>
                <div className="text-white font-bold text-sm">{best !== null ? `${best}点` : '-'}</div>
              </div>
            );
          })}
        </div>

        {/* History list */}
        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto mb-4">
          {records.length === 0 && (
            <div className="text-slate-500 text-sm text-center py-4">対戦履歴なし</div>
          )}
          {records.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded bg-slate-800 text-sm">
              <span className="text-slate-400 text-xs flex-shrink-0">{r.date}</span>
              <span className="text-slate-300">{DIFF_LABELS[r.difficulty] ?? r.difficulty}</span>
              <span className="font-bold text-white">{r.score}点</span>
              <span className="text-slate-400">{r.rank}位/{r.totalPlayers}</span>
              {r.placedAll && <span className="text-green-400 text-xs">全配置</span>}
            </div>
          ))}
        </div>

        <button
          onClick={clearHistory}
          className="w-full py-2 rounded bg-red-900/50 hover:bg-red-800/50 text-red-300 text-sm transition-colors"
        >
          履歴をクリア
        </button>
      </div>
    </div>
  );
};
