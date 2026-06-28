import React, { useReducer, useCallback, useEffect, useRef } from 'react';
import { gameReducer, initialState, getCurrentCells } from './game/gameState';
import type { Difficulty } from './game/gameState';
import { isValidPlacement } from './game/board';
import { pickMove } from './game/ai';
import { Board } from './components/Board';
import { PiecePanel } from './components/PiecePanel';
import { GameControls } from './components/GameControls';
import { ScoreModal } from './components/ScoreModal';
import { SetupScreen } from './components/SetupScreen';
import { HistoryPanel } from './components/HistoryPanel';
import { useSound } from './hooks/useSound';
import { useGameHistory } from './hooks/useHistory';
import { calculateAllScores } from './game/scoring';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const play = useSound(state.soundEnabled);
  const { addRecord } = useGameHistory();
  const [showHistory, setShowHistory] = React.useState(false);
  const [showScoreModal, setShowScoreModal] = React.useState(false);
  const endedRecorded = useRef(false);

  // CPU turn logic.
  // NOTE: cpuThinking is deliberately NOT in the deps. If it were, dispatching
  // SET_CPU_THINKING would re-run this effect and the cleanup would clear the
  // pending timer before it fires — leaving the CPU permanently stuck.
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const current = state.players[state.currentPlayerIndex];
    if (current.isHuman) return;

    let cancelled = false;
    dispatch({ type: 'SET_CPU_THINKING', value: true });

    // Two-step timeout: first let the "thinking" indicator paint, then compute.
    const delay = state.difficulty === 'expert' ? 450 : 250;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const playersInfo = state.players.map(p => ({
        color: p.color,
        remainingPieceIds: p.remainingPieceIds,
        hasPlaced: p.hasPlaced,
      }));
      const move = pickMove(state.board, current.color, state.difficulty, playersInfo);
      if (cancelled) return;
      if (move) {
        play('place');
        dispatch({ type: 'CPU_PLACE', pieceId: move.pieceId, cells: move.cells, row: move.row, col: move.col });
      } else {
        play('pass');
        dispatch({ type: 'CPU_PASS' });
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentPlayerIndex, state.turnId, state.difficulty]);

  // Game end: record score
  useEffect(() => {
    if (state.phase !== 'ended' || endedRecorded.current) return;
    endedRecorded.current = true;

    const scores = calculateAllScores(
      state.players.map(p => ({
        color: p.color,
        remainingPieceIds: p.remainingPieceIds,
        lastPlacedPieceId: p.lastPlacedPieceId,
      })),
      21,
    );
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const humanScore = scores.find(s => state.players.find(p => p.color === s.color && p.isHuman));
    const rank = sorted.findIndex(s => state.players.find(p => p.color === s.color && p.isHuman)) + 1;

    if (humanScore) {
      const now = new Date();
      addRecord({
        date: `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
        difficulty: state.difficulty,
        score: humanScore.score,
        rank,
        totalPlayers: 4,
        placedAll: humanScore.placedAll,
      });
    }

    play('win');
    setTimeout(() => setShowScoreModal(true), 500);
  }, [state.phase]);

  // Reset endedRecorded on new game
  useEffect(() => {
    if (state.phase === 'playing') {
      endedRecorded.current = false;
      setShowScoreModal(false);
    }
  }, [state.phase]);

  // Try to place at a specific cell; returns true if placed
  const tryPlace = useCallback((row: number, col: number): boolean => {
    if (!state.selectedPieceId) return false;
    const current = state.players[state.currentPlayerIndex];
    if (!current.isHuman || state.phase !== 'playing') return false;
    const cells = getCurrentCells(state);
    const ok = isValidPlacement(state.board, cells, row, col, current.color, !current.hasPlaced).valid;
    if (ok) {
      play('place');
      dispatch({ type: 'PLACE_PIECE', row, col });
      return true;
    }
    play('error');
    return false;
  }, [state, play]);

  // Keyboard: arrow keys rotate (cycle all orientations), Enter places at target
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      const current = state.players[state.currentPlayerIndex];
      if (!current?.isHuman || state.phase !== 'playing') return;

      // 十字キーで全8向きを巡回（上/右=次、下/左=前）
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        dispatch({ type: 'ROTATE' });
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        dispatch({ type: 'ROTATE_CCW' });
      } else if (e.key === 'r' || e.key === 'R') {
        dispatch({ type: 'ROTATE' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = state.pendingCell ?? state.hoverCell;
        if (target) tryPlace(target[0], target[1]);
      } else if (e.key === 'Escape') {
        if (state.selectedPieceId) dispatch({ type: 'SELECT_PIECE', pieceId: state.selectedPieceId });
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, tryPlace]);

  // Mouse click on a cell → place immediately (desktop)
  const handleCellClick = useCallback((row: number, col: number) => {
    tryPlace(row, col);
  }, [tryPlace]);

  // Touch tap on a cell → set it as the pending target (preview), confirm separately (mobile)
  const handleCellTap = useCallback((row: number, col: number) => {
    if (!state.selectedPieceId) return;
    const current = state.players[state.currentPlayerIndex];
    if (!current.isHuman || state.phase !== 'playing') return;
    dispatch({ type: 'SET_PENDING', cell: [row, col] });
  }, [state]);

  const handleConfirm = useCallback(() => {
    const target = state.pendingCell ?? state.hoverCell;
    if (target) tryPlace(target[0], target[1]);
  }, [state, tryPlace]);

  const handleCancel = useCallback(() => {
    if (state.selectedPieceId) dispatch({ type: 'SELECT_PIECE', pieceId: state.selectedPieceId });
  }, [state.selectedPieceId]);

  const handleCellHover = useCallback((row: number, col: number) => {
    dispatch({ type: 'SET_HOVER', cell: [row, col] });
  }, []);

  const handleBoardLeave = useCallback(() => {
    dispatch({ type: 'SET_HOVER', cell: null });
  }, []);

  const handlePass = useCallback(() => {
    play('pass');
    dispatch({ type: 'PASS' });
  }, [play]);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleStart = useCallback((difficulty: Difficulty) => {
    dispatch({ type: 'START_GAME', difficulty });
  }, []);

  if (state.phase === 'setup') {
    return (
      <>
        <SetupScreen onStart={handleStart} onShowHistory={() => setShowHistory(true)} />
        {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
      </>
    );
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <h1 className="font-bold text-lg tracking-tight">🟦 Blokus Solo</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
          >
            📊 履歴
          </button>
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
          >
            🏠 メニュー
          </button>
        </div>
      </header>

      {/* Main layout: stacked on mobile, side-by-side on desktop */}
      {/* 3 columns on desktop: pieces (left) · board (center) · controls (right).
          On mobile they stack: board → controls → pieces. */}
      <main className="flex flex-col lg:flex-row flex-1 gap-2 p-2 min-h-0 overflow-x-hidden overflow-y-auto lg:overflow-hidden">
        {/* Remaining pieces */}
        {state.players.filter(p => p.isHuman).map(p => (
          <div
            key={p.color}
            className="order-3 lg:order-1 w-full lg:w-60 flex-shrink-0 bg-slate-900 rounded-lg p-2 lg:overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-blue-400">あなたのピース</span>
              <span className="text-xs text-slate-400">残り {p.remainingPieceIds.length}</span>
            </div>
            <PiecePanel
              color={p.color}
              remainingPieceIds={p.remainingPieceIds}
              selectedPieceId={state.selectedPieceId}
              onSelectPiece={(id) => dispatch({ type: 'SELECT_PIECE', pieceId: id })}
              isActive={currentPlayer?.isHuman && state.phase === 'playing'}
            />
          </div>
        ))}

        {/* Board */}
        <div className="order-1 lg:order-2 flex-1 min-w-0 flex items-start justify-center">
          <Board
            state={state}
            onCellClick={handleCellClick}
            onCellTap={handleCellTap}
            onCellHover={handleCellHover}
            onBoardLeave={handleBoardLeave}
          />
        </div>

        {/* Controls */}
        <div className="order-2 lg:order-3 w-full lg:w-52 flex-shrink-0 flex flex-col gap-2 lg:overflow-y-auto">
          <GameControls
            state={state}
            onRotate={() => dispatch({ type: 'ROTATE' })}
            onRotateCcw={() => dispatch({ type: 'ROTATE_CCW' })}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onPass={handlePass}
            onUndo={handleUndo}
            onToggleHints={() => dispatch({ type: 'TOGGLE_HINTS' })}
            onToggleSound={() => dispatch({ type: 'TOGGLE_SOUND' })}
          />
        </div>
      </main>

      {/* Modals */}
      {showScoreModal && state.phase === 'ended' && (
        <ScoreModal
          players={state.players}
          onRestart={() => handleStart(state.difficulty)}
          onClose={() => { setShowScoreModal(false); setShowHistory(true); }}
        />
      )}
      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
    </div>
  );
}
