import { Board, Color, COLORS, createBoard, applyPlacement, hasAnyMove, cloneBoard } from './board';
import { Cells, PIECES, rotateCells, flipCells, normalizeCells } from './pieces';
import { Difficulty } from './ai';

export type { Difficulty };

export const ALL_PIECE_IDS = PIECES.map(p => p.id);
export const BASE_CELLS_MAP = new Map<string, Cells>(PIECES.map(p => [p.id, p.cells as Cells]));

export interface PlayerState {
  color: Color;
  isHuman: boolean;
  remainingPieceIds: string[];
  hasPlaced: boolean;
  lastPlacedPieceId: string | null;
  canPlay: boolean;
  passed: boolean;
}

export interface HistoryEntry {
  board: Board;
  players: PlayerState[];
  currentPlayerIndex: number;
}

export interface GameState {
  phase: 'setup' | 'playing' | 'ended';
  difficulty: Difficulty;
  board: Board;
  players: PlayerState[];
  currentPlayerIndex: number;
  turnId: number;   // increments every turn; ensures the CPU effect re-fires even when the same player plays consecutively
  selectedPieceId: string | null;
  rotation: number;   // 0-3, number of 90° clockwise rotations
  flipped: boolean;   // horizontal mirror applied after rotation
  hoverCell: [number, number] | null;   // desktop: cell under the mouse
  pendingCell: [number, number] | null; // mobile: tapped target awaiting confirm
  history: HistoryEntry[];
  showHints: boolean;
  soundEnabled: boolean;
  lastPlacedCells: [number, number][] | null;
  cpuThinking: boolean;
}

export type GameAction =
  | { type: 'START_GAME'; difficulty: Difficulty }
  | { type: 'SELECT_PIECE'; pieceId: string }
  | { type: 'SET_HOVER'; cell: [number, number] | null }
  | { type: 'SET_PENDING'; cell: [number, number] | null }
  | { type: 'ROTATE' }       // rotate 90° clockwise
  | { type: 'ROTATE_CCW' }   // rotate 90° counter-clockwise
  | { type: 'FLIP' }         // mirror horizontally
  | { type: 'PLACE_PIECE'; row: number; col: number }
  | { type: 'PASS' }
  | { type: 'UNDO' }
  | { type: 'TOGGLE_HINTS' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'CPU_PLACE'; pieceId: string; cells: Cells; row: number; col: number }
  | { type: 'CPU_PASS' }
  | { type: 'SET_CPU_THINKING'; value: boolean }
  | { type: 'RESET' };

function makeInitialPlayers(): PlayerState[] {
  return COLORS.map((color, i) => ({
    color,
    isHuman: i === 0, // blue is human
    remainingPieceIds: [...ALL_PIECE_IDS],
    hasPlaced: false,
    lastPlacedPieceId: null,
    canPlay: true,
    passed: false,
  }));
}

export const initialState: GameState = {
  phase: 'setup',
  difficulty: 'medium',
  board: createBoard(),
  players: makeInitialPlayers(),
  currentPlayerIndex: 0,
  turnId: 0,
  selectedPieceId: null,
  rotation: 0,
  flipped: false,
  hoverCell: null,
  pendingCell: null,
  history: [],
  showHints: false,
  soundEnabled: true,
  lastPlacedCells: null,
  cpuThinking: false,
};

function advanceTurn(state: GameState): GameState {
  let nextIndex = (state.currentPlayerIndex + 1) % 4;
  // Skip players who cannot play
  let loops = 0;
  while (!state.players[nextIndex].canPlay && loops < 4) {
    nextIndex = (nextIndex + 1) % 4;
    loops++;
  }

  // Check if game is over (all players passed/can't play)
  const allDone = state.players.every(p => !p.canPlay);
  if (allDone) {
    return { ...state, phase: 'ended', currentPlayerIndex: nextIndex };
  }

  return {
    ...state,
    currentPlayerIndex: nextIndex,
    turnId: state.turnId + 1,
    selectedPieceId: null,
    rotation: 0,
    flipped: false,
    hoverCell: null,
    pendingCell: null,
  };
}

function recomputeCanPlay(players: PlayerState[], board: Board): PlayerState[] {
  return players.map(p => {
    if (!p.canPlay) return p; // already out
    if (p.remainingPieceIds.length === 0) return { ...p, canPlay: false };
    const canPlay = hasAnyMove(board, p.remainingPieceIds, BASE_CELLS_MAP, p.color, !p.hasPlaced);
    return { ...p, canPlay };
  });
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const players = makeInitialPlayers();
      // Mitigate first-move advantage on the harder levels: randomise who starts.
      const startIndex = (action.difficulty === 'hard' || action.difficulty === 'expert')
        ? Math.floor(Math.random() * 4)
        : 0;
      return {
        ...initialState,
        phase: 'playing',
        difficulty: action.difficulty,
        board: createBoard(),
        players,
        currentPlayerIndex: startIndex,
        soundEnabled: state.soundEnabled,
      };
    }

    case 'SELECT_PIECE': {
      if (action.pieceId === state.selectedPieceId) {
        return { ...state, selectedPieceId: null, pendingCell: null };
      }
      return { ...state, selectedPieceId: action.pieceId, rotation: 0, flipped: false, pendingCell: null };
    }

    case 'SET_HOVER':
      return { ...state, hoverCell: action.cell };

    case 'SET_PENDING':
      return { ...state, pendingCell: action.cell };

    case 'ROTATE':
      return { ...state, rotation: (state.rotation + 1) % 4 };

    case 'ROTATE_CCW':
      return { ...state, rotation: (state.rotation + 3) % 4 };

    case 'FLIP':
      return { ...state, flipped: !state.flipped };

    case 'PLACE_PIECE': {
      const { row, col } = action;
      if (!state.selectedPieceId) return state;

      const player = state.players[state.currentPlayerIndex];
      if (!player.isHuman) return state;

      // Save history
      const histEntry: HistoryEntry = {
        board: cloneBoard(state.board),
        players: state.players.map(p => ({ ...p, remainingPieceIds: [...p.remainingPieceIds] })),
        currentPlayerIndex: state.currentPlayerIndex,
      };

      const pieceId = state.selectedPieceId;
      const newBoard = applyPlacement(state.board, getCurrentCells(state), row, col, player.color);
      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? {
              ...p,
              remainingPieceIds: p.remainingPieceIds.filter(id => id !== pieceId),
              hasPlaced: true,
              lastPlacedPieceId: pieceId,
            }
          : p,
      );

      const recomputed = recomputeCanPlay(newPlayers, newBoard);
      const allDone = recomputed.every(p => !p.canPlay);

      const placed: [number, number][] = getCurrentCells(state).map(([r, c]) => [r + row, c + col]);

      const next: GameState = {
        ...state,
        board: newBoard,
        players: recomputed,
        history: [...state.history, histEntry],
        lastPlacedCells: placed,
        selectedPieceId: null,
        rotation: 0,
        flipped: false,
        hoverCell: null,
        pendingCell: null,
        phase: allDone ? 'ended' : 'playing',
      };
      return allDone ? next : advanceTurn(next);
    }

    case 'PASS': {
      const player = state.players[state.currentPlayerIndex];
      if (!player.isHuman) return state;
      const histEntry: HistoryEntry = {
        board: cloneBoard(state.board),
        players: state.players.map(p => ({ ...p, remainingPieceIds: [...p.remainingPieceIds] })),
        currentPlayerIndex: state.currentPlayerIndex,
      };
      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, canPlay: false, passed: true } : p,
      );
      const allDone = newPlayers.every(p => !p.canPlay);
      const next: GameState = {
        ...state,
        players: newPlayers,
        history: [...state.history, histEntry],
        lastPlacedCells: null,
        phase: allDone ? 'ended' : 'playing',
      };
      return allDone ? next : advanceTurn(next);
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      return {
        ...state,
        board: prev.board,
        players: prev.players,
        currentPlayerIndex: prev.currentPlayerIndex,
        history: state.history.slice(0, -1),
        selectedPieceId: null,
        rotation: 0,
        flipped: false,
        hoverCell: null,
        pendingCell: null,
        lastPlacedCells: null,
        phase: 'playing',
      };
    }

    case 'CPU_PLACE': {
      const player = state.players[state.currentPlayerIndex];
      const newBoard = applyPlacement(state.board, action.cells, action.row, action.col, player.color);
      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? {
              ...p,
              remainingPieceIds: p.remainingPieceIds.filter(id => id !== action.pieceId),
              hasPlaced: true,
              lastPlacedPieceId: action.pieceId,
            }
          : p,
      );
      const recomputed = recomputeCanPlay(newPlayers, newBoard);
      const allDone = recomputed.every(p => !p.canPlay);
      const placed: [number, number][] = action.cells.map(([r, c]) => [r + action.row, c + action.col]);

      const next: GameState = {
        ...state,
        board: newBoard,
        players: recomputed,
        lastPlacedCells: placed,
        cpuThinking: false,
        phase: allDone ? 'ended' : 'playing',
      };
      return allDone ? next : advanceTurn(next);
    }

    case 'CPU_PASS': {
      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, canPlay: false, passed: true } : p,
      );
      const allDone = newPlayers.every(p => !p.canPlay);
      const next: GameState = {
        ...state,
        players: newPlayers,
        lastPlacedCells: null,
        cpuThinking: false,
        phase: allDone ? 'ended' : 'playing',
      };
      return allDone ? next : advanceTurn(next);
    }

    case 'SET_CPU_THINKING':
      return { ...state, cpuThinking: action.value };

    case 'TOGGLE_HINTS':
      return { ...state, showHints: !state.showHints };

    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };

    case 'RESET':
      return { ...initialState, soundEnabled: state.soundEnabled };

    default:
      return state;
  }
}

export function getCurrentCells(state: Pick<GameState, 'selectedPieceId' | 'rotation' | 'flipped'>): Cells {
  if (!state.selectedPieceId) return [];
  const base = BASE_CELLS_MAP.get(state.selectedPieceId);
  if (!base) return [];
  let cells: Cells = base;
  for (let i = 0; i < state.rotation; i++) cells = rotateCells(cells);
  if (state.flipped) cells = flipCells(cells);
  return normalizeCells(cells);
}
