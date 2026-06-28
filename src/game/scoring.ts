import { PIECE_MAP } from './pieces';

export interface PlayerScore {
  color: string;
  remainingPieceIds: string[];
  placedAll: boolean;
  lastPieceWasMono: boolean;
  score: number;
}

export function calculateScore(
  remainingPieceIds: string[],
  _totalPieces: number,
  lastPlacedPieceId: string | null,
): number {
  const remainingSquares = remainingPieceIds.reduce((sum, id) => {
    const piece = PIECE_MAP.get(id);
    return sum + (piece?.size ?? 0);
  }, 0);

  const placedAll = remainingPieceIds.length === 0;
  const lastWasMono = placedAll && lastPlacedPieceId === 'O1';

  let score = -remainingSquares;
  if (placedAll) {
    score += 15;
    if (lastWasMono) score += 5;
  }
  return score;
}

export function calculateAllScores(
  players: Array<{
    color: string;
    remainingPieceIds: string[];
    lastPlacedPieceId: string | null;
  }>,
  totalPieces: number,
): PlayerScore[] {
  return players.map(p => {
    const placedAll = p.remainingPieceIds.length === 0;
    const lastPieceWasMono = placedAll && p.lastPlacedPieceId === 'O1';
    const score = calculateScore(p.remainingPieceIds, totalPieces, p.lastPlacedPieceId);
    return {
      color: p.color,
      remainingPieceIds: p.remainingPieceIds,
      placedAll,
      lastPieceWasMono,
      score,
    };
  });
}
