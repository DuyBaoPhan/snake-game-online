import { sameCell } from './collision.js';
export function createFood(snake, cols, rows, random = Math.random) {
  const empty = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const cell = { x, y };
    if (!snake.some(segment => sameCell(segment, cell))) empty.push(cell);
  }
  return empty.length ? empty[Math.min(empty.length - 1, Math.max(0, Math.floor(random() * empty.length)))] : null;
}
