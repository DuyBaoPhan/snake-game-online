import { sameCell, hitsWall, hitsSnake } from './collision.js';
import { createFood } from './food.js';
import { SnakeController } from './snake.js';
import { STATES, scoreFor, levelFor, speedFor } from './state.js';
import { storage as defaultStorage } from '../services/storage.js';

export class GameEngine {
  constructor({ onChange, onEat, onEnd, storage = defaultStorage, random = Math.random } = {}) {
    this.cols = 24; this.rows = 24;
    this.onChange = onChange; this.onEat = onEat; this.onEnd = onEnd;
    this.storage = storage; this.random = random; this.controller = new SnakeController();
    this.best = storage.getBest();
    this.reset(STATES.READY);
  }
  reset(state) {
    this.state = state; this.snake = [{ x: 11, y: 12 }, { x: 10, y: 12 }, { x: 9, y: 12 }];
    this.previousSnake = this.snake.map(cell => ({ ...cell }));
    this.controller.reset(); this.score = 0; this.foods = 0; this.level = 1;
    this.speed = speedFor(1); this.elapsed = 0; this.accumulator = 0; this.progress = 0;
    this.food = createFood(this.snake, this.cols, this.rows, this.random);
    this.notify();
  }
  start() { if (this.state === STATES.READY) { this.state = STATES.PLAYING; this.notify(); } }
  pause() { if (this.state === STATES.PLAYING) { this.state = STATES.PAUSED; this.notify(); } }
  resume() { if (this.state === STATES.PAUSED) { this.state = STATES.PLAYING; this.notify(); } }
  restart() { this.reset(STATES.PLAYING); }
  menu() { this.reset(STATES.READY); }
  turn(direction) { return (this.state === STATES.PLAYING || this.state === STATES.READY) && this.controller.turn(direction); }
  update(deltaMs) {
    if (this.state !== STATES.PLAYING || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
    // Cap suspended-tab catch-up, and perform at most five simulation steps per frame.
    const delta = Math.min(deltaMs, 250);
    this.elapsed += delta / 1000; this.accumulator += delta;
    let steps = 0;
    while (this.state === STATES.PLAYING && this.accumulator >= 1000 / this.speed && steps < 5) {
      this.accumulator -= 1000 / this.speed; this.tick(); steps++;
    }
    if (steps === 5) this.accumulator %= 1000 / this.speed;
    this.progress = this.state === STATES.PLAYING ? Math.min(1, this.accumulator / (1000 / this.speed)) : 0;
  }
  tick() {
    const head = this.controller.next(this.snake[0]);
    const growing = sameCell(head, this.food);
    if (hitsWall(head, this.cols, this.rows) || hitsSnake(head, this.snake, growing)) { this.end(STATES.OVER); return; }
    this.previousSnake = this.snake.map(cell => ({ ...cell }));
    this.snake.unshift(head);
    if (!growing) this.snake.pop();
    else {
      this.foods++; this.score = scoreFor(this.foods); this.level = levelFor(this.foods); this.speed = speedFor(this.level);
      if (this.score > this.best) { this.best = this.score; this.storage.setBest(this.best); }
      this.food = createFood(this.snake, this.cols, this.rows, this.random);
      this.onEat?.(this.snapshot());
      if (!this.food) { this.end(STATES.WON); return; }
    }
    this.notify();
  }
  end(state) { this.state = state; this.progress = 0; this.notify(); this.onEnd?.(this.snapshot()); }
  notify() { this.onChange?.(this.snapshot()); }
  snapshot() {
    return { state: this.state, snake: this.snake.map(cell => ({ ...cell })), previousSnake: this.previousSnake.map(cell => ({ ...cell })), food: this.food ? { ...this.food } : null, score: this.score, best: this.best, level: this.level, speed: this.speed, elapsed: this.elapsed, foods: this.foods, cols: this.cols, rows: this.rows, progress: this.progress, direction: this.controller.direction };
  }
}
export default GameEngine;
