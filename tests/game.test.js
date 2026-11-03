import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/game/engine.js';
import { createFood } from '../src/game/food.js';
import { SnakeController } from '../src/game/snake.js';
import { StorageManager } from '../src/services/storage.js';
import { LeaderboardService } from '../src/services/leaderboard.js';
import { AudioManager } from '../src/services/audio.js';
const game = (options = {}) => new GameEngine({ storage: new StorageManager(null), random: () => 0, ...options });
const step = engine => engine.update(1000 / engine.speed + 0.0001);

test('lifecycle, fixed timestep and pause preserve game', () => {
  const engine = game();
  assert.equal(engine.state, 'ready');
  engine.update(1000); assert.equal(engine.snake[0].x, 11);
  engine.start(); engine.update(50); assert.equal(engine.snake[0].x, 11);
  engine.update(100); assert.equal(engine.snake[0].x, 12);
  engine.pause(); const before = engine.snapshot(); engine.update(5000); assert.deepEqual(engine.snapshot(), before);
  engine.resume(); assert.equal(engine.state, 'playing');
  engine.restart(); assert.equal(engine.score, 0); assert.equal(engine.elapsed, 0); assert.equal(engine.state, 'playing');
  engine.menu(); assert.equal(engine.state, 'ready');
});
test('turn queue is bounded and disallows reversals against queued directions', () => {
  const controller = new SnakeController();
  assert.equal(controller.turn('left'), false); assert.equal(controller.turn('up'), true);
  assert.equal(controller.turn('down'), false); assert.equal(controller.turn('left'), true);
  assert.equal(controller.turn('down'), false);
  assert.deepEqual(controller.next({ x: 4, y: 4 }), { x: 4, y: 3 });
  assert.deepEqual(controller.next({ x: 4, y: 3 }), { x: 3, y: 3 });
});
test('food increases score, persists best, and never respawns on snake', () => {
  let eats = 0;
  const engine = game({ onEat: () => eats++ }); engine.food = { x: 12, y: 12 }; engine.start(); step(engine);
  assert.equal(engine.score, 10); assert.equal(engine.best, 10); assert.equal(engine.storage.getBest(), 10);
  assert.equal(engine.snake.length, 4); assert.equal(eats, 1);
  assert.ok(!engine.snake.some(cell => cell.x === engine.food.x && cell.y === engine.food.y));
});
test('wall collision ends only once and catch-up is capped', () => {
  let ends = 0; const engine = game({ onEnd: () => ends++ }); engine.start();
  engine.update(1e8); assert.ok(engine.snake[0].x <= 13); assert.equal(engine.elapsed, 0.25);
  for (let i = 0; i < 30; i++) step(engine);
  assert.equal(engine.state, 'over'); assert.equal(ends, 1);
});
test('tail cell is available when not growing but body collision ends play', () => {
  const engine = game(); engine.start(); engine.controller.direction = 'up';
  engine.snake = [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 1 }, { x: 2, y: 1 }];
  engine.food = { x: 9, y: 9 }; step(engine); assert.equal(engine.state, 'playing');
  engine.controller.direction = 'down'; step(engine); assert.equal(engine.state, 'over');
});
test('full board produces win and no food', () => {
  const engine = game(); engine.cols = 2; engine.rows = 2;
  engine.snake = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
  engine.food = { x: 1, y: 0 }; engine.start(); step(engine);
  assert.equal(engine.state, 'won'); assert.equal(engine.food, null);
  assert.equal(createFood(engine.snake, 2, 2), null);
});
test('snapshot does not leak mutable state and invalid deltas are ignored', () => {
  const engine = game(); const snapshot = engine.snapshot(); snapshot.snake[0].x = 500;
  assert.equal(engine.snake[0].x, 11); engine.start(); engine.update(NaN); engine.update(-1); engine.update(Infinity); assert.equal(engine.elapsed, 0);
});
test('difficulty ramps and maximum speed is bounded', () => {
  const engine = game(); engine.start();
  for (let i = 0; i < 10; i++) { engine.food = { x: engine.snake[0].x + 1, y: 12 }; step(engine); }
  assert.equal(engine.level, 3); assert.ok(engine.speed > 7); assert.equal(engine.score, 100);
});
test('storage handles corrupt values, blocked writes and missing storage', () => {
  const bad = new StorageManager({ getItem: () => '{oops', setItem: () => { throw new Error('blocked'); } });
  assert.equal(bad.getBest(), 0); assert.equal(bad.set('test', true), false);
  const memory = new StorageManager(null); memory.setBest(70); assert.equal(memory.getBest(), 70);
  memory.set('best', 'invalid'); assert.equal(memory.getBest(), 0);
});
test('leaderboard is explicitly demo, async, sorted and limited to five', async () => {
  const storage = new StorageManager(null); const service = new LeaderboardService(storage);
  assert.equal(service.isDemo, true); const top = await service.submit(900);
  assert.equal(top.length, 5); assert.equal(top[0].name, 'YOU'); assert.equal(top[0].rank, 1);
  top[0].name = 'changed'; assert.equal((await service.getTop())[0].name, 'YOU');
});
test('audio is safe without WebAudio and toggles persist', () => {
  const storage = new StorageManager(null); const audio = new AudioManager(storage);
  audio.unlock(); audio.play('eat'); audio.setEnabled(false); assert.equal(new AudioManager(storage).enabled, false);
});


test('one hundred restarts reset transient state without losing the best score', () => {
  const engine = game(); engine.start(); engine.food = {x:12,y:12}; step(engine);
  for (let i = 0; i < 100; i++) {
    engine.turn('up'); engine.restart();
    assert.equal(engine.state, 'playing'); assert.equal(engine.score, 0);
    assert.equal(engine.elapsed, 0); assert.equal(engine.foods, 0);
    assert.equal(engine.best, 10); assert.equal(engine.snake.length, 3);
    assert.equal(engine.controller.queue.length, 0);
  }
});
