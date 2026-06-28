import React, { useCallback, useMemo } from 'react';
import { BOARD_SIZE, isValidPlacement, findAllMoves } from '../game/board';
import { GameState, getCurrentCells, BASE_CELLS_MAP } from '../game/gameState';
import { placeCells } from '../game/pieces';

const COLOR_BG: Record<string, string> = {
  blue:   '#3b82f6',
  yellow: '#facc15',
  red:    '#ef4444',
  green:  '#22c55e',
};

const CORNER_MARKER: Record<string, [number, number]> = {
  blue:   [0, 0],
  yellow: [0, 19],
  red:    [19, 19],
  green:  [19, 0],
};

interface Props {
  state: GameState;
  onCellClick: (row: number, col: number) => void;   // mouse click → place
  onCellTap: (row: number, col: number) => void;      // touch tap → set pending target
  onCellHover: (row: number, col: number) => void;
  onBoardLeave: () => void;
}

export const Board: React.FC<Props> = ({ state, onCellClick, onCellTap, onCellHover, onBoardLeave }) => {
  const { board, players, currentPlayerIndex, selectedPieceId, hoverCell, pendingCell, showHints, lastPlacedCells, phase } = state;
  const currentPlayer = players[currentPlayerIndex];
  const isHumanTurn = currentPlayer?.isHuman && phase === 'playing';

  const currentCells = useMemo(() => getCurrentCells(state), [state]);

  // Target cell: a tapped (pending) cell takes priority over mouse hover
  const targetCell = pendingCell ?? hoverCell;

  // Preview cells at the target position
  const previewCells = useMemo<[number, number][] | null>(() => {
    if (!isHumanTurn || !selectedPieceId || !targetCell) return null;
    const [hr, hc] = targetCell;
    return placeCells(currentCells, hr, hc);
  }, [isHumanTurn, selectedPieceId, targetCell, currentCells]);

  const previewValid = useMemo<boolean>(() => {
    if (!isHumanTurn || !selectedPieceId || !targetCell) return false;
    const [hr, hc] = targetCell;
    return isValidPlacement(board, currentCells, hr, hc, currentPlayer.color, !currentPlayer.hasPlaced).valid;
  }, [isHumanTurn, selectedPieceId, targetCell, board, currentCells, currentPlayer]);

  // Hint cells: every cell that any legal placement could cover (anchor-based, fast)
  const hintCells = useMemo<Set<string>>(() => {
    if (!showHints || !isHumanTurn) return new Set();
    const set = new Set<string>();
    const moves = findAllMoves(
      board,
      currentPlayer.remainingPieceIds,
      BASE_CELLS_MAP,
      currentPlayer.color,
      !currentPlayer.hasPlaced,
    );
    for (const m of moves) {
      for (const [pr, pc] of m.absoluteCells) set.add(`${pr},${pc}`);
    }
    return set;
  }, [showHints, isHumanTurn, currentPlayer, board]);

  const previewSet = useMemo(() => new Set(previewCells?.map(([r, c]) => `${r},${c}`) ?? []), [previewCells]);
  const lastPlacedSet = useMemo(() => new Set(lastPlacedCells?.map(([r, c]) => `${r},${c}`) ?? []), [lastPlacedCells]);

  const getCellStyle = useCallback((r: number, c: number): React.CSSProperties => {
    const key = `${r},${c}`;
    const boardColor = board[r][c];

    if (previewSet.has(key)) {
      return {
        backgroundColor: previewValid ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.5)',
        border: '1px solid rgba(255,255,255,0.3)',
        transition: 'background-color 0.1s',
      };
    }
    if (boardColor) {
      const isRecent = lastPlacedSet.has(key);
      return {
        backgroundColor: COLOR_BG[boardColor],
        border: '1px solid rgba(0,0,0,0.15)',
        opacity: isRecent ? 1 : 0.85,
        transform: isRecent ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.3s, opacity 0.3s',
      };
    }
    if (hintCells.has(key)) {
      return {
        backgroundColor: 'rgba(250,204,21,0.25)',
        border: '1px solid rgba(250,204,21,0.4)',
      };
    }

    // Corner markers for empty board
    for (const [, [cr, cc]] of Object.entries(CORNER_MARKER)) {
      if (r === cr && c === cc && !board[r][c]) {
        return {
          backgroundColor: 'rgba(200,200,200,0.15)',
          border: '1px solid rgba(200,200,200,0.4)',
        };
      }
    }

    return { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' };
  }, [board, previewSet, previewValid, hintCells, lastPlacedSet]);

  return (
    <div
      className="relative select-none"
      onMouseLeave={onBoardLeave}
      style={{ touchAction: 'none' }}
    >
      <div
        className="board-grid"
        style={{
          backgroundColor: '#1e293b',
          border: '2px solid #334155',
          borderRadius: 4,
          cursor: isHumanTurn && selectedPieceId ? 'crosshair' : 'default',
        }}
      >
        {Array.from({ length: BOARD_SIZE }, (_, r) =>
          Array.from({ length: BOARD_SIZE }, (_, c) => (
            <div
              key={`${r}-${c}`}
              style={getCellStyle(r, c)}
              onMouseEnter={() => onCellHover(r, c)}
              onClick={() => onCellClick(r, c)}
              onTouchEnd={(e) => {
                e.preventDefault(); // suppress the synthetic click that follows
                onCellTap(r, c);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};
