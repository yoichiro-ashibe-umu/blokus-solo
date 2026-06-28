import React, { useMemo } from 'react';
import { GameState, getCurrentCells } from '../game/gameState';
import { isValidPlacement } from '../game/board';
import { PieceShape } from './PieceShape';
import { iconUrl } from '../utils/asset';

interface Props {
  state: GameState;
  onRotate: () => void;
  onRotateCcw: () => void;
  onFlip: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onPass: () => void;
  onUndo: () => void;
  onToggleHints: () => void;
  onToggleSound: () => void;
}

const COLOR_NAMES: Record<string, string> = {
  blue: '青（あなた）', yellow: '黄（CPU）', red: '赤（CPU）', green: '緑（CPU）',
};
const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6', yellow: '#facc15', red: '#ef4444', green: '#22c55e',
};

export const GameControls: React.FC<Props> = ({
  state,
  onRotate,
  onRotateCcw,
  onFlip,
  onConfirm,
  onCancel,
  onPass,
  onUndo,
  onToggleHints,
  onToggleSound,
}) => {
  const { players, currentPlayerIndex, selectedPieceId, hoverCell, pendingCell, flipped, history, showHints, soundEnabled, cpuThinking, phase } = state;
  const currentPlayer = players[currentPlayerIndex];
  const isHumanTurn = currentPlayer?.isHuman && phase === 'playing';
  const currentCells = getCurrentCells(state);

  const targetCell = pendingCell ?? hoverCell;
  const canConfirm = useMemo(() => {
    if (!isHumanTurn || !selectedPieceId || !targetCell) return false;
    const [r, c] = targetCell;
    return isValidPlacement(state.board, currentCells, r, c, currentPlayer.color, !currentPlayer.hasPlaced).valid;
  }, [isHumanTurn, selectedPieceId, targetCell, currentCells, state.board, currentPlayer]);

  // Step-by-step guidance
  let guide = '';
  if (isHumanTurn) {
    if (!selectedPieceId) guide = '① 下のピースを1つ選びましょう';
    else if (!pendingCell && !canConfirm) guide = '② 盤面をクリック／タップして置く場所を決めます';
    else if (canConfirm) guide = '③ クリックまたは「確定」で配置！';
    else guide = '置けない場所です。別の場所か向きを試してください';
  } else if (phase === 'playing') {
    guide = 'CPU の番です…';
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Turn indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800">
        <div
          className="w-4 h-4 rounded-sm flex-shrink-0"
          style={{ backgroundColor: COLOR_HEX[currentPlayer?.color] ?? '#888' }}
        />
        <span className="text-sm font-medium text-white">
          {cpuThinking ? 'CPU 思考中…' : COLOR_NAMES[currentPlayer?.color] ?? ''}
        </span>
        {cpuThinking && <span className="ml-1 animate-spin text-slate-400 text-xs">⟳</span>}
      </div>

      {/* Guidance line */}
      {guide && (
        <div className="text-xs text-blue-200 bg-blue-950/40 border border-blue-900/50 rounded-lg px-3 py-2 leading-relaxed">
          {guide}
        </div>
      )}

      {/* Selected piece preview + rotation / flip */}
      {isHumanTurn && selectedPieceId && currentCells.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">選択中のピース</span>
            {flipped && <span className="text-xs text-pink-300">⇌ 反転中</span>}
          </div>
          <div className="bg-slate-800 rounded-lg p-2 flex items-center justify-center min-h-[64px]">
            <PieceShape cells={currentCells} color={currentPlayer.color} cellSize={18} />
          </div>
          {/* Rotate buttons (↑↓ keys) */}
          <div className="flex gap-2">
            <button
              onClick={onRotateCcw}
              className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95 text-white text-sm font-medium transition-all"
              title="左回転 (↓キー)"
            >
              ↺ 回転
            </button>
            <button
              onClick={onRotate}
              className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95 text-white text-sm font-medium transition-all"
              title="右回転 (↑キー)"
            >
              回転 ↻
            </button>
          </div>
          {/* Flip button (←→ keys) */}
          <button
            onClick={onFlip}
            className={`w-full py-2.5 rounded-lg active:scale-95 text-sm font-medium transition-all ${
              flipped ? 'bg-pink-700 hover:bg-pink-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
            title="左右反転 (←→キー)"
          >
            ⇌ 左右反転
          </button>
          <p className="text-[10px] text-slate-500 text-center -mt-1 leading-relaxed">
            キー操作：↑↓=回転 / ←→=反転 / Enter=配置
          </p>
        </div>
      )}

      {/* Confirm / Cancel placement */}
      {isHumanTurn && selectedPieceId && (
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-[2] py-3 rounded-lg bg-green-600 hover:bg-green-500 active:scale-95 disabled:opacity-30 disabled:active:scale-100 text-white font-bold transition-all"
          >
            ✓ 確定
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 text-sm font-medium transition-all"
          >
            選択解除
          </button>
        </div>
      )}

      {/* Pass / Undo */}
      <div className="flex gap-2">
        <button
          onClick={onPass}
          disabled={!isHumanTurn}
          className="flex-1 py-2 rounded-lg bg-orange-700 hover:bg-orange-600 active:scale-95 disabled:opacity-30 text-white text-sm font-medium transition-all"
        >
          パス
        </button>
        <button
          onClick={onUndo}
          disabled={history.length === 0}
          className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95 disabled:opacity-30 text-white text-sm font-medium transition-all"
          title="1手戻す"
        >
          ↩ 待った
        </button>
      </div>

      {/* Hints / Sound toggles */}
      <div className="flex gap-2">
        <button
          onClick={onToggleHints}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showHints ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {showHints ? '💡 ヒントON' : '💡 ヒント'}
        </button>
        <button
          onClick={onToggleSound}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            soundEnabled ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          {soundEnabled ? '🔊 音ON' : '🔇 音OFF'}
        </button>
      </div>

      {/* Player status */}
      <div className="flex flex-col gap-1 mt-1">
        {players.map(p => (
          <div key={p.color} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLOR_HEX[p.color] }} />
            {p.isHuman
              ? <img src={iconUrl('avatar-you.png')} alt="あなた" className="w-5 h-5 flex-shrink-0" />
              : <span>🤖</span>}
            <span className={p.color === currentPlayer?.color ? 'text-white font-medium' : 'text-slate-400'}>
              残り{p.remainingPieceIds.length}
            </span>
            {!p.canPlay && <span className="text-slate-500">（終了）</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
