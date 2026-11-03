export const DIRECTIONS = Object.freeze({ up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } });
export const sameCell = (a, b) => Boolean(a && b && a.x === b.x && a.y === b.y);
export function hitsWall(cell, cols, rows) { return cell.x < 0 || cell.y < 0 || cell.x >= cols || cell.y >= rows; }
export function hitsSnake(cell, snake, growing = false) { return snake.slice(0, growing ? snake.length : -1).some(segment => sameCell(cell, segment)); }
