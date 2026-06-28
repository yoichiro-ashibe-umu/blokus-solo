import React, { useEffect, useRef } from 'react';
import { PlayerState } from '../game/gameState';
import { calculateAllScores } from '../game/scoring';
import { launchConfetti } from '../utils/confetti';
import { iconUrl } from '../utils/asset';

interface Props {
  players: PlayerState[];
  onRestart: () => void;
  onClose: () => void;
}

const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6', yellow: '#facc15', red: '#ef4444', green: '#22c55e',
};
const COLOR_NAMES: Record<string, string> = {
  blue: '青（あなた）', yellow: '黄（CPU）', red: '赤（CPU）', green: '緑（CPU）',
};

export const ScoreModal: React.FC<Props> = ({ players, onRestart, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const scores = calculateAllScores(
    players.map(p => ({
      color: p.color,
      remainingPieceIds: p.remainingPieceIds,
      lastPlacedPieceId: p.lastPlacedPieceId,
    })),
    21,
  );

  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const humanScore = sorted.find(s => players.find(p => p.color === s.color && p.isHuman));
  const humanRank = sorted.findIndex(s => players.find(p => p.color === s.color && p.isHuman)) + 1;
  const isWinner = humanRank === 1;

  useEffect(() => {
    if (!canvasRef.current) return;
    let cleanup: (() => void) | undefined;
    if (isWinner) {
      cleanup = launchConfetti(canvasRef.current, 4000);
    }
    return () => cleanup?.();
  }, [isWinner]);

  const RANK_LABELS = ['🥇', '🥈', '🥉', '4位'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="text-center mb-4">
          {isWinner
            ? <img src={iconUrl('trophy.png')} alt="優勝" className="w-20 h-20 mx-auto mb-1" />
            : <div className="text-3xl mb-1">🎮</div>}
          <h2 className="text-xl font-bold text-white">
            {isWinner ? 'おめでとう！' : 'ゲーム終了'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            あなたは <span className="text-white font-medium">{humanRank}位</span>
            （{humanScore?.score ?? 0}点）
          </p>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          {sorted.map((s, i) => {
            const player = players.find(p => p.color === s.color);
            return (
              <div
                key={s.color}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: player?.isHuman ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)',
                  border: player?.isHuman ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                }}
              >
                <span className="text-lg">{RANK_LABELS[i]}</span>
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLOR_HEX[s.color] }} />
                <span className="flex-1 text-sm text-slate-300">{COLOR_NAMES[s.color]}</span>
                <div className="text-right">
                  <div className="text-white font-bold">{s.score}点</div>
                  {s.placedAll && (
                    <div className="text-xs text-green-400">
                      全配置{s.lastPieceWasMono ? '+モノミノ' : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRestart}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            もう一度
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
          >
            記録を見る
          </button>
        </div>
      </div>
    </div>
  );
};
