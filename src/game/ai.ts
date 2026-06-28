import { Board, BOARD_SIZE, Color, ValidMove, findAllMoves, applyPlacement, getAnchors } from './board';
import { Cells, PIECES } from './pieces';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

const BASE_CELLS_MAP = new Map<string, Cells>(PIECES.map(p => [p.id, p.cells as Cells]));
const CENTER = (BOARD_SIZE - 1) / 2;

export interface AIPlayerInfo {
  color: Color;
  remainingPieceIds: string[];
  hasPlaced: boolean;
}

// ---------------------------------------------------------------------------
// Board metrics
// ---------------------------------------------------------------------------

function countColor(board: Board, color: Color): number {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === color) n++;
    }
  }
  return n;
}

/** 8-directional BFS distance from all of `color`'s cells across the whole board. */
function distanceGrid(board: Board, color: Color): number[][] {
  const dist: number[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(Infinity));
  const queue: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === color) {
        dist[r][c] = 0;
        queue.push([r, c]);
      }
    }
  }
  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    const d = dist[r][c] + 1;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
        if (d < dist[nr][nc]) {
          dist[nr][nc] = d;
          queue.push([nr, nc]);
        }
      }
    }
  }
  return dist;
}

/** Count empty cells that `me` reaches strictly sooner than every opponent (Voronoi territory). */
function territoryCount(board: Board, me: Color, colors: Color[]): number {
  const myDist = distanceGrid(board, me);
  const oppDists = colors.filter(c => c !== me).map(c => distanceGrid(board, c));
  let owned = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) continue;
      const mine = myDist[r][c];
      if (mine === Infinity) continue;
      let best = true;
      for (const od of oppDists) {
        if (od[r][c] <= mine) { best = false; break; }
      }
      if (best) owned++;
    }
  }
  return owned;
}

// ---------------------------------------------------------------------------
// Evaluation (from `me`'s perspective)
// ---------------------------------------------------------------------------

/** Fast static eval: material played + own mobility − opponents' mobility. */
function staticEval(board: Board, me: Color, colors: Color[]): number {
  const material = countColor(board, me);
  const myCorners = getAnchors(board, me, false).length;
  let oppCorners = 0;
  for (const c of colors) {
    if (c !== me) oppCorners += getAnchors(board, c, false).length;
  }
  return material * 5 + myCorners * 4 - oppCorners * 3;
}

/** Self-focused eval: own material + own mobility only (NO opponent blocking).
 *  Used by 強(hard) so it develops its own position without ganging up on the player. */
function selfEval(board: Board, me: Color): number {
  const material = countColor(board, me);
  const myCorners = getAnchors(board, me, false).length;
  return material * 5 + myCorners * 4;
}

/** Full eval: static + territory control (more expensive). */
function fullEval(board: Board, me: Color, colors: Color[]): number {
  return staticEval(board, me, colors) + territoryCount(board, me, colors) * 1.2;
}

function centerDist(m: ValidMove): number {
  let s = 0;
  for (const [r, c] of m.absoluteCells) s += Math.abs(r - CENTER) + Math.abs(c - CENTER);
  return s / m.absoluteCells.length;
}

// ---------------------------------------------------------------------------
// Move selection
// ---------------------------------------------------------------------------

export function pickMove(
  board: Board,
  color: Color,
  difficulty: Difficulty,
  players: AIPlayerInfo[],
): ValidMove | null {
  const me = players.find(p => p.color === color);
  if (!me) return null;
  const colors = players.map(p => p.color);
  const moves = findAllMoves(board, me.remainingPieceIds, BASE_CELLS_MAP, color, !me.hasPlaced);
  if (moves.length === 0) return null;

  switch (difficulty) {
    case 'easy':
      return pickEasy(moves);
    case 'medium':
      return pickMedium(moves);
    case 'hard':
      return pickHard(board, moves, color);
    case 'expert':
      return pickExpert(board, moves, color, colors, players);
  }
}

function pickEasy(moves: ValidMove[]): ValidMove {
  // Half the time play a sensibly large piece, half the time wander a bit.
  if (Math.random() < 0.5) {
    const maxSize = Math.max(...moves.map(m => m.cells.length));
    const big = moves.filter(m => m.cells.length >= maxSize - 1); // top two sizes
    return big[Math.floor(Math.random() * big.length)];
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

function pickMedium(moves: ValidMove[]): ValidMove {
  // Greedy: largest piece, tie-break toward the centre (expansion).
  const maxSize = Math.max(...moves.map(m => m.cells.length));
  const best = moves.filter(m => m.cells.length === maxSize);
  best.sort((a, b) => centerDist(a) - centerDist(b));
  // small randomness among the few most central
  const pool = best.slice(0, Math.min(3, best.length));
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickHard(board: Board, moves: ValidMove[], color: Color): ValidMove {
  // Self-development only: big pieces + keep own options open. No active blocking
  // of opponents (that "3 CPUs gang up on you" feel is reserved for 鬼/expert).
  let bestScore = -Infinity;
  let best: ValidMove[] = [];
  for (const m of moves) {
    const nb = applyPlacement(board, m.cells, m.row, m.col, color);
    const score = selfEval(nb, color) - centerDist(m) * 0.3; // mild pull toward centre
    if (score > bestScore) {
      bestScore = score;
      best = [m];
    } else if (score === bestScore) {
      best.push(m);
    }
  }
  return best[Math.floor(Math.random() * best.length)];
}

/** Greedy single move for opponent simulation: biggest piece, most central. */
function greedyMove(board: Board, info: AIPlayerInfo): ValidMove | null {
  const moves = findAllMoves(board, info.remainingPieceIds, BASE_CELLS_MAP, info.color, !info.hasPlaced);
  if (moves.length === 0) return null;
  const maxSize = Math.max(...moves.map(m => m.cells.length));
  const big = moves.filter(m => m.cells.length === maxSize);
  big.sort((a, b) => centerDist(a) - centerDist(b));
  return big[0];
}

function pickExpert(
  board: Board,
  moves: ValidMove[],
  color: Color,
  colors: Color[],
  players: AIPlayerInfo[],
): ValidMove {
  // Rank candidates with the fast static eval, keep the strongest handful.
  const ranked = moves
    .map(m => ({ m, s: staticEval(applyPlacement(board, m.cells, m.row, m.col, color), color, colors) }))
    .sort((a, b) => b.s - a.s);
  const candidates = ranked.slice(0, Math.min(14, ranked.length)).map(x => x.m);

  const myIdx = players.findIndex(p => p.color === color);

  let bestScore = -Infinity;
  let best: ValidMove[] = [];

  for (const m of candidates) {
    // Apply my move, then let each opponent greedily take their best reply this round.
    let sim = applyPlacement(board, m.cells, m.row, m.col, color);
    for (let step = 1; step < players.length; step++) {
      const opp = players[(myIdx + step) % players.length];
      const oppMove = greedyMove(sim, opp);
      if (oppMove) sim = applyPlacement(sim, oppMove.cells, oppMove.row, oppMove.col, opp.color);
    }
    // Evaluate the resulting position: did I keep material, mobility and territory
    // despite opponents responding?
    const score = fullEval(sim, color, colors);
    if (score > bestScore) {
      bestScore = score;
      best = [m];
    } else if (score === bestScore) {
      best.push(m);
    }
  }

  return best[Math.floor(Math.random() * best.length)];
}
