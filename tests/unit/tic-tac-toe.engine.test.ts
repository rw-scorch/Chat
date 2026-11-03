import { describe, expect, it } from 'vitest';
import { applyMove, createBoard, getWinner, isDraw, type Board } from '../../src/games/tic-tac-toe/engine';

describe('tic-tac-toe engine', () => {
  it('creates an empty board', () => {
    expect(createBoard()).toEqual([null, null, null, null, null, null, null, null, null]);
  });

  it('applies valid moves', () => {
    const board = applyMove(createBoard(), 0, 'X');
    expect(board[0]).toBe('X');
  });

  it('ignores invalid moves', () => {
    const board = applyMove(createBoard(), 0, 'X');
    const again = applyMove(board, 0, 'O');
    expect(again).toBe(board);
  });

  it('detects winner and draw', () => {
    const winnerBoard: Board = ['X', 'X', 'X', null, 'O', null, 'O', null, null];
    expect(getWinner(winnerBoard)).toBe('X');

    const drawBoard: Board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    expect(isDraw(drawBoard)).toBe(true);
  });
});
