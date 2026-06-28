import { describe, it, expect } from 'vitest';
import { createBoard, isValidPlacement, applyPlacement, findAllMoves } from '../game/board';
import { PIECES } from '../game/pieces';
import type { Cells } from '../game/pieces';

const BASE_CELLS_MAP = new Map<string, Cells>(PIECES.map(p => [p.id, p.cells as Cells]));

describe('isValidPlacement', () => {
  it('first move: blue must cover (0,0)', () => {
    const board = createBoard();
    const cells: Cells = [[0, 0]];
    expect(isValidPlacement(board, cells, 0, 0, 'blue', true).valid).toBe(true);
    expect(isValidPlacement(board, cells, 1, 0, 'blue', true).valid).toBe(false);
  });

  it('first move: yellow must cover (0,19)', () => {
    const board = createBoard();
    const cells: Cells = [[0, 0]];
    expect(isValidPlacement(board, cells, 0, 19, 'yellow', true).valid).toBe(true);
    expect(isValidPlacement(board, cells, 0, 0, 'yellow', true).valid).toBe(false);
  });

  it('rejects out-of-bounds placement', () => {
    const board = createBoard();
    const cells: Cells = [[0, 0], [0, 1]];
    expect(isValidPlacement(board, cells, 0, 19, 'blue', true).valid).toBe(false);
  });

  it('rejects placement on occupied cell', () => {
    let board = createBoard();
    board = applyPlacement(board, [[0, 0]] as Cells, 0, 0, 'blue');
    const cells: Cells = [[0, 0]];
    expect(isValidPlacement(board, cells, 0, 0, 'blue', false).valid).toBe(false);
  });

  it('second move must be diagonal (not edge-adjacent) to own color', () => {
    let board = createBoard();
    board = applyPlacement(board, [[0, 0]] as Cells, 0, 0, 'blue');
    const mono: Cells = [[0, 0]];
    // Edge adjacent - invalid
    expect(isValidPlacement(board, mono, 0, 1, 'blue', false).valid).toBe(false);
    expect(isValidPlacement(board, mono, 1, 0, 'blue', false).valid).toBe(false);
    // Diagonal - valid
    expect(isValidPlacement(board, mono, 1, 1, 'blue', false).valid).toBe(true);
  });

  it('allows edge contact with different colors', () => {
    let board = createBoard();
    board = applyPlacement(board, [[0, 0]] as Cells, 0, 0, 'blue');
    board = applyPlacement(board, [[0, 0]] as Cells, 0, 19, 'yellow');
    // Blue diagonal at (1,1) should still be valid
    const mono: Cells = [[0, 0]];
    expect(isValidPlacement(board, mono, 1, 1, 'blue', false).valid).toBe(true);
  });
});

describe('findAllMoves', () => {
  it('blue has moves on first turn (corner)', () => {
    const board = createBoard();
    const moves = findAllMoves(board, ['O1'], BASE_CELLS_MAP, 'blue', true);
    expect(moves.length).toBe(1);
    expect(moves[0].row).toBe(0);
    expect(moves[0].col).toBe(0);
  });

  it('returns 0 moves after player passes', () => {
    const board = createBoard();
    // No pieces
    const moves = findAllMoves(board, [], BASE_CELLS_MAP, 'blue', false);
    expect(moves.length).toBe(0);
  });
});
