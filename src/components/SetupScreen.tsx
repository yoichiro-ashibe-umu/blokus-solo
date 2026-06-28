import React, { useState } from 'react';
import type { Difficulty } from '../game/gameState';
import { iconUrl } from '../utils/asset';

interface Props {
  onStart: (difficulty: Difficulty) => void;
  onShowHistory: () => void;
}

const DIFFICULTIES: { id: Difficulty; label: string; desc: string; icon: string }[] = [
  { id: 'easy',   label: '弱',  icon: 'diff-easy.png',   desc: 'ランダム寄り。初心者向け' },
  { id: 'medium', label: '中',  icon: 'diff-medium.png', desc: '大きいピース優先の貪欲法' },
  { id: 'hard',   label: '強',  icon: 'diff-hard.png',   desc: '盤面を評価して着実に展開' },
  { id: 'expert', label: '鬼',  icon: 'diff-oni.png',    desc: '先読み＋3体で妨害。本気' },
];

export const SetupScreen: React.FC<Props> = ({ onStart, onShowHistory }) => {
  const [selected, setSelected] = useState<Difficulty>('medium');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={iconUrl('app-icon.png')} alt="Blokus Solo" className="w-20 h-20 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Blokus Solo</h1>
          <p className="text-slate-400 mt-2 text-sm">1人でブロックスを練習しよう</p>
        </div>

        <div className="mb-6">
          <div className="text-sm font-medium text-slate-300 mb-3">CPU の強さを選択</div>
          <div className="flex flex-col gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d.id}
                onClick={() => setSelected(d.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  selected === d.id
                    ? 'bg-blue-600 border-2 border-blue-400 text-white'
                    : 'bg-slate-800 border-2 border-transparent text-slate-300 hover:bg-slate-700'
                }`}
              >
                <img src={iconUrl(d.icon)} alt={d.label} className="w-12 h-12 flex-shrink-0" />
                <div>
                  <div className="font-bold">{d.label}</div>
                  <div className={`text-xs ${selected === d.id ? 'text-blue-200' : 'text-slate-400'}`}>{d.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(selected)}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-lg transition-all mb-3"
        >
          ゲーム開始
        </button>

        <button
          onClick={onShowHistory}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
        >
          📊 対戦履歴を見る
        </button>

        <div className="mt-6 text-xs text-slate-500 text-center leading-relaxed">
          <p>青=あなた、黄・赤・緑=CPU（3体）</p>
          <p className="mt-1">遊び方：ピースを選ぶ → 矢印キーで回転 → 置く場所をクリック</p>
          <p>（スマホ：マスをタップ → 「確定」ボタンで配置）</p>
        </div>
      </div>
    </div>
  );
};
