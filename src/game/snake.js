import { DIRECTIONS } from './collision.js';
export class SnakeController {
  constructor() { this.reset(); }
  reset() { this.direction = 'right'; this.queue = []; }
  turn(direction) {
    if (!DIRECTIONS[direction] || this.queue.length >= 2) return false;
    const current = DIRECTIONS[this.queue.at(-1) || this.direction];
    const next = DIRECTIONS[direction];
    if ((current.x === next.x && current.y === next.y) || (current.x + next.x === 0 && current.y + next.y === 0)) return false;
    this.queue.push(direction);
    return true;
  }
  next(head) {
    this.direction = this.queue.shift() || this.direction;
    const vector = DIRECTIONS[this.direction];
    return { x: head.x + vector.x, y: head.y + vector.y };
  }
}
