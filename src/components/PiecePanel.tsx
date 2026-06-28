import React from 'react';
import { PIECES } from '../game/pieces';
import { PieceShape } from './PieceShape';
import type { Cells } from '../game/pieces';

const COLOR_BG: Record<string, string> = {
  blue:   '#1e3a5f',
  yellow: '#422006',
  red:    '#450a0a',
  green:  '#052e16',
};
const COLOR_BORDER_SELECTED: Record<string, string> = {
  blue:   '#3b82f6',
  yellow: '#facc15',
  red:    '#ef4444',
  green:  '#22c55e',
};

interface Props {
  color: string;
  remainingPieceIds: string[];
  selectedPieceId: string | null;
  onSelectPiece: (id: string) => void;
  isActive: boolean;
}

export const PiecePanel: React.FC<Props> = ({ color, remainingPieceIds, selectedPieceId, onSelectPiece, isActive }) => {
  const remaining = new Set(remainingPieceIds);

  return (
    <div className="grid grid-cols-4 lg:grid-cols-3 gap-1.5">
      {PIECES.map(piece => {
        const isRemaining = remaining.has(piece.id);
        const isSelected = piece.id === selectedPieceId;
        if (!isRemaining) {
          // keep a faint placeholder so the grid doesn't reflow as pieces are used
          return (
            <div
              key={piece.id}
              className="rounded-md"
              style={{ minHeight: 52, backgroundColor: 'rgba(255,255,255,0.02)' }}
            />
          );
        }
        return (
          <button
            key={piece.id}
            disabled={!isActive}
            onClick={() => isActive && onSelectPiece(piece.id)}
            className="relative flex items-center justify-center rounded-md p-1 transition-all"
            style={{
              backgroundColor: isSelected ? COLOR_BG[color] : 'rgba(255,255,255,0.05)',
              border: isSelected
                ? `2px solid ${COLOR_BORDER_SELECTED[color]}`
                : '2px solid rgba(255,255,255,0.08)',
              minHeight: 52,
              cursor: isActive ? 'pointer' : 'default',
              transform: isSelected ? 'scale(1.08)' : 'scale(1)',
              boxShadow: isSelected ? `0 0 12px ${COLOR_BORDER_SELECTED[color]}66` : 'none',
            }}
            title={piece.name}
          >
            <PieceShape cells={piece.cells as Cells} color={color} cellSize={11} />
          </button>
        );
      })}
    </div>
  );
};
