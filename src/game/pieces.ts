// Each piece is defined as [row, col] offsets from top-left of bounding box
export interface PieceDef {
  id: string;
  name: string;
  size: number; // number of squares
  cells: ReadonlyArray<readonly [number, number]>;
}

export const PIECES: PieceDef[] = [
  // Monomino
  { id: 'O1', name: 'O1', size: 1, cells: [[0, 0]] },

  // Domino
  { id: 'I2', name: 'I2', size: 2, cells: [[0, 0], [0, 1]] },

  // Trominoes
  { id: 'I3', name: 'I3', size: 3, cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'L3', name: 'L3', size: 3, cells: [[0, 0], [1, 0], [1, 1]] },

  // Tetrominoes
  { id: 'I4', name: 'I4', size: 4, cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'L4', name: 'L4', size: 4, cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: 'T4', name: 'T4', size: 4, cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: 'S4', name: 'S4', size: 4, cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: 'O4', name: 'O4', size: 4, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },

  // Pentominoes
  { id: 'F5', name: 'F',  size: 5, cells: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]] },
  { id: 'I5', name: 'I',  size: 5, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 'L5', name: 'L',  size: 5, cells: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]] },
  { id: 'N5', name: 'N',  size: 5, cells: [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1]] },
  { id: 'P5', name: 'P',  size: 5, cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]] },
  { id: 'T5', name: 'T',  size: 5, cells: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]] },
  { id: 'U5', name: 'U',  size: 5, cells: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]] },
  { id: 'V5', name: 'V',  size: 5, cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
  { id: 'W5', name: 'W',  size: 5, cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]] },
  { id: 'X5', name: 'X',  size: 5, cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
  { id: 'Y5', name: 'Y',  size: 5, cells: [[0, 1], [1, 0], [1, 1], [2, 1], [3, 1]] },
  { id: 'Z5', name: 'Z',  size: 5, cells: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]] },
];

export const PIECE_MAP = new Map<string, PieceDef>(PIECES.map(p => [p.id, p]));

export type Cells = readonly [number, number][];

/** Normalize cells: translate so top-left is (0,0), then sort for stable comparison */
export function normalizeCells(cells: Cells): Cells {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  const shifted = cells.map(([r, c]) => [r - minR, c - minC] as [number, number]);
  return shifted.sort(([r1, c1], [r2, c2]) => r1 - r2 || c1 - c2);
}

/** Rotate 90° clockwise: [r,c] → [c, -r] then normalize */
export function rotateCells(cells: Cells): Cells {
  return normalizeCells(cells.map(([r, c]) => [c, -r]));
}

/** Flip horizontally: [r,c] → [r, -c] then normalize */
export function flipCells(cells: Cells): Cells {
  return normalizeCells(cells.map(([r, c]) => [r, -c]));
}

function cellsKey(cells: Cells): string {
  return normalizeCells(cells).map(([r, c]) => `${r},${c}`).join('|');
}

/** Return all unique orientations (rotation × flip) for a piece */
export function getOrientations(cells: Cells): Cells[] {
  const seen = new Set<string>();
  const result: Cells[] = [];
  let cur: Cells = normalizeCells(cells);
  for (let flip = 0; flip < 2; flip++) {
    for (let rot = 0; rot < 4; rot++) {
      const key = cellsKey(cur);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cur);
      }
      cur = rotateCells(cur);
    }
    cur = flipCells(cur);
  }
  return result;
}

/** Cached orientations keyed by base-cell reference (stable across calls) */
const _orientCache = new Map<Cells, Cells[]>();
export function getOrientationsCached(cells: Cells): Cells[] {
  let v = _orientCache.get(cells);
  if (!v) {
    v = getOrientations(cells);
    _orientCache.set(cells, v);
  }
  return v;
}

/** Apply offset to cells → absolute board positions */
export function placeCells(cells: Cells, row: number, col: number): [number, number][] {
  return cells.map(([r, c]) => [r + row, c + col]);
}
