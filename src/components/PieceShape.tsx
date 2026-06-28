import React from 'react';
import type { Cells } from '../game/pieces';

interface Props {
  cells: Cells;
  color: string;
  cellSize?: number;
  opacity?: number;
}

const COLOR_MAP: Record<string, string> = {
  blue:   '#3b82f6',
  yellow: '#facc15',
  red:    '#ef4444',
  green:  '#22c55e',
  preview_valid:   'rgba(34,197,94,0.5)',
  preview_invalid: 'rgba(239,68,68,0.5)',
};

export const PieceShape: React.FC<Props> = ({ cells, color, cellSize = 20, opacity = 1 }) => {
  if (cells.length === 0) return null;
  const maxR = Math.max(...cells.map(([r]) => r));
  const maxC = Math.max(...cells.map(([, c]) => c));
  const w = (maxC + 1) * cellSize;
  const h = (maxR + 1) * cellSize;
  const fill = COLOR_MAP[color] ?? color;

  return (
    <svg width={w} height={h} style={{ opacity }}>
      {cells.map(([r, c]) => (
        <rect
          key={`${r}-${c}`}
          x={c * cellSize + 1}
          y={r * cellSize + 1}
          width={cellSize - 2}
          height={cellSize - 2}
          fill={fill}
          rx={2}
        />
      ))}
    </svg>
  );
};
