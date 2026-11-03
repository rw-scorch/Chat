export type Cell = 'X' | 'O' | null;
export type Board = Cell[];

export const createBoard = (): Board => Array.from({ length: 9 }, () => null);

export function applyMove(board: Board, index: number, mark: 'X' | 'O'): Board {
  if (index < 0 || index >= 9 || board[index] !== null) {
    return board;
  }

  const next = [...board];
  next[index] = mark;
  return next;
}

export function getWinner(board: Board): Cell {
  const lines: [number, number, number][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (const [a, b, c] of lines) {
    const mark = board[a];
    if (mark && mark === board[b] && mark === board[c]) {
      return mark;
    }
  }

  return null;
}

export const isDraw = (board: Board): boolean => board.every((cell) => cell !== null) && getWinner(board) === null;
