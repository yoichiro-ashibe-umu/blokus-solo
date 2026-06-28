import { describe, it, expect } from 'vitest';
import { calculateScore } from '../game/scoring';

describe('calculateScore', () => {
  it('all pieces placed: +15 bonus', () => {
    expect(calculateScore([], 21, 'I2')).toBe(15);
  });

  it('all pieces placed ending with mono: +20 bonus', () => {
    expect(calculateScore([], 21, 'O1')).toBe(20);
  });

  it('remaining pieces deduct squares', () => {
    // I5 (5 squares) + O1 (1 square) = -6
    expect(calculateScore(['I5', 'O1'], 21, null)).toBe(-6);
  });

  it('worst case: all 89 squares remaining', () => {
    const allIds = [
      'O1','I2','I3','L3',
      'I4','L4','T4','S4','O4',
      'F5','I5','L5','N5','P5','T5','U5','V5','W5','X5','Y5','Z5',
    ];
    expect(calculateScore(allIds, 21, null)).toBe(-89);
  });
});
