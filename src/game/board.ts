import { Cells, getOrientationsCached, placeCells } from './pieces';

export const BOARD_SIZE = 20;

export type Color = 'blue' | 'yellow' | 'red' | 'green';
export const COLORS: Color[] = ['blue', 'yellow', 'red', 'green'];

// Starting corner for each color
export const START_CORNERS: Record<Color, [number, number]> = {
  blue:   [0, 0],
  yellow: [0, BOARD_SIZE - 1],
  red:    [BOARD_SIZE - 1, BOARD_SIZE - 1],
  green:  [BOARD_SIZE - 1, 0],
};

export type Board = (Color | null)[][];

export function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

const EDGE_DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG_DIRS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export interface PlacementResult {
  valid: boolean;
  reason?: string;
}

/**
 * Check if placing `cells` (relative offsets) at (originRow, originCol) is legal for `color`.
 * `isFirstMove` = true means this is the color's first piece.
 */
export function isValidPlacement(
  board: Board,
  cells: Cells,
  originRow: number,
  originCol: number,
  color: Color,
  isFirstMove: boolean,
): PlacementResult {
  const placed = placeCells(cells, originRow, originCol);
  const placedSet = new Set(placed.map(([r, c]) => `${r},${c}`));

  // 1. All cells must be in bounds and empty
  for (const [r, c] of placed) {
    if (!inBounds(r, c)) return { valid: false, reason: 'out of bounds' };
    if (board[r][c] !== null) return { valid: false, reason: 'occupied' };
  }

  if (isFirstMove) {
    // Must cover the starting corner
    const [cr, cc] = START_CORNERS[color];
    if (!placedSet.has(`${cr},${cc}`)) {
      return { valid: false, reason: 'first move must cover corner' };
    }
    return { valid: true };
  }

  // 2. No edge-adjacent same-color cell
  for (const [r, c] of placed) {
    for (const [dr, dc] of EDGE_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === color && !placedSet.has(`${nr},${nc}`)) {
        return { valid: false, reason: 'edge-adjacent to own piece' };
      }
    }
  }

  // 3. At least one diagonal touch with same-color cell
  let hasDiagTouch = false;
  for (const [r, c] of placed) {
    for (const [dr, dc] of DIAG_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === color) {
        hasDiagTouch = true;
        break;
      }
    }
    if (hasDiagTouch) break;
  }
  if (!hasDiagTouch) return { valid: false, reason: 'no diagonal touch with own piece' };

  return { valid: true };
}

/** Place piece on board (mutates a clone). Returns new board or null if invalid. */
export function applyPlacement(
  board: Board,
  cells: Cells,
  originRow: number,
  originCol: number,
  color: Color,
): Board {
  const next = cloneBoard(board);
  for (const [r, c] of placeCells(cells, originRow, originCol)) {
    next[r][c] = color;
  }
  return next;
}

export interface ValidMove {
  cells: Cells;       // orientation
  row: number;
  col: number;
  pieceId: string;
  absoluteCells: [number, number][];
}

/**
 * Anchor cells = the only spots where this color may legally extend.
 * For the first move that is the assigned start corner; otherwise every empty
 * cell that touches own color diagonally but NOT by an edge.
 * Every legal placement must cover at least one anchor, so we only search around them.
 */
export function getAnchors(board: Board, color: Color, isFirstMove: boolean): [number, number][] {
  if (isFirstMove) {
    const [cr, cc] = START_CORNERS[color];
    return board[cr][cc] === null ? [[cr, cc]] : [];
  }
  const anchors: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) continue;
      let edgeAdj = false;
      for (const [dr, dc] of EDGE_DIRS) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc] === color) { edgeAdj = true; break; }
      }
      if (edgeAdj) continue;
      let diag = false;
      for (const [dr, dc] of DIAG_DIRS) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc] === color) { diag = true; break; }
      }
      if (diag) anchors.push([r, c]);
    }
  }
  return anchors;
}

/** Find all legal placements for a given color, searching only around anchors. */
export function findAllMoves(
  board: Board,
  remainingPieceIds: string[],
  baseCellsMap: Map<string, Cells>,
  color: Color,
  isFirstMove: boolean,
): ValidMove[] {
  const anchors = getAnchors(board, color, isFirstMove);
  if (anchors.length === 0) return [];

  const moves: ValidMove[] = [];
  const seen = new Set<string>();

  for (const id of remainingPieceIds) {
    const base = baseCellsMap.get(id);
    if (!base) continue;
    for (const cells of getOrientationsCached(base)) {
      for (const [ar, ac] of anchors) {
        // Align each cell of the piece onto the anchor in turn.
        for (const [pr, pc] of cells) {
          const row = ar - pr;
          const col = ac - pc;
          if (!isValidPlacement(board, cells, row, col, color, isFirstMove).valid) continue;
          const abs = placeCells(cells, row, col);
          const key = id + '|' + abs.map(([r, c]) => `${r},${c}`).sort().join(';');
          if (seen.has(key)) continue;
          seen.add(key);
          moves.push({ cells, row, col, pieceId: id, absoluteCells: abs });
        }
      }
    }
  }
  return moves;
}

/** Fast check: does this color have ANY legal move? (early-exit, no full enumeration) */
export function hasAnyMove(
  board: Board,
  remainingPieceIds: string[],
  baseCellsMap: Map<string, Cells>,
  color: Color,
  isFirstMove: boolean,
): boolean {
  const anchors = getAnchors(board, color, isFirstMove);
  if (anchors.length === 0) return false;
  for (const id of remainingPieceIds) {
    const base = baseCellsMap.get(id);
    if (!base) continue;
    for (const cells of getOrientationsCached(base)) {
      for (const [ar, ac] of anchors) {
        for (const [pr, pc] of cells) {
          if (isValidPlacement(board, cells, ar - pr, ac - pc, color, isFirstMove).valid) return true;
        }
      }
    }
  }
  return false;
}

/** Number of legal corner anchors (proxy for future placement flexibility) */
export function countAccessibleCorners(board: Board, color: Color): number {
  return getAnchors(board, color, false).length;
}
