import './style.css';
import { renderApp, icon } from './ui/components.js';
import { BoardRenderer } from './ui/BoardRenderer.js';
import { GameEngine } from './game/engine.js';
import { AudioManager } from './services/audio.js';
import { LeaderboardUI } from './ui/LeaderboardUI.js';

renderApp(document.querySelector('#app'));
const $ = id => document.getElementById(id);
const audio = new AudioManager();
const renderer = new BoardRenderer($('game'));
const game = new GameEngine({
  onEat: () => { audio.play('eat'); if (game.snake[0]) renderer.burst(game.snake[0]); },
  onEnd: snapshot => { audio.play('end'); online.finish(snapshot); },
});
const online = new LeaderboardUI({ onPause: () => { game.pause(); updateUI(); } });
const pad = n => String(n).padStart(2, '0');
let lastState = null;
let statsCache = '';

function syncAudio() {
  $('sound').innerHTML = icon(audio.enabled ? 'sound' : 'mute');
  $('sound').setAttribute('aria-label', audio.enabled ? 'Turn sound off' : 'Turn sound on');
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}
syncAudio();
function act(action) {
  audio.unlock();
  if (action === 'start') { online.beforePlay(() => { game.start(); updateUI(); }); return; }
  if (action === 'restart') { online.beforePlay(() => { renderer.clearEffects(); game.restart(); updateUI(); }); return; }
  if (action === 'resume') game.resume();
  if (action === 'menu') { renderer.clearEffects(); game.menu(); }
  if (action === 'pause') {
    if (game.state === 'playing') game.pause();
    else if (game.state === 'paused') game.resume();
  }
  updateUI();
}

function updateUI() {
  const cache = [game.score, game.best, game.level, game.speed, Math.floor(game.elapsed), game.foods, game.snake.length].join('|');
  if (cache !== statsCache) {
    statsCache = cache;
    $('score').textContent = String(game.score).padStart(4, '0');
    $('best').textContent = String(game.best).padStart(4, '0');
    $('side-best').innerHTML = `${game.best} <small>PTS</small>`;
    $('level').textContent = pad(game.level);
    $('speed').textContent = `${Number(game.speed.toFixed(1))} CELLS / SEC`;
    $('time').textContent = `${pad(Math.floor(game.elapsed / 60))}:${pad(Math.floor(game.elapsed) % 60)}`;
    $('foods').textContent = pad(game.foods);
    $('length').textContent = pad(game.snake.length);
  }
  if (lastState === game.state) return;
  lastState = game.state;
  const playing = game.state === 'playing', paused = game.state === 'paused';
  $('overlay').hidden = playing;
  $('pause').disabled = !playing && !paused;
  $('pause').innerHTML = `${icon(paused ? 'play' : 'pause')} ${paused ? 'Resume' : 'Pause'}`;
  const labels = {ready:'AWAITING PLAYER',playing:'ARENA ACTIVE',paused:'SESSION PAUSED',over:'SESSION ENDED',won:'GRID CONQUERED'};
  $('state-label').textContent = labels[game.state];
  $('announcer').textContent = `${labels[game.state]}. Score ${game.score}.`;
  $('state-dot').style.background = paused ? '#edce75' : game.state === 'over' ? '#ff7766' : '#39ff14';
  const ready = `<div class="overlay-emblem">${icon('snake')}</div><span class="overlay-kicker">WELCOME TO SNAKE ARENA</span><h2>GAME READY<span class="text-green">.</span></h2><p>A classic instinct. A neon twist.<br>How long can you survive?</p><button class="primary-button" data-action="start">PLAY NOW ${icon('arrow')}</button><div class="overlay-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>OR ARROW KEYS TO MOVE</span></div>`;
  const pause = `<div class="overlay-emblem">${icon('pause')}</div><span class="overlay-kicker">TAKE A BREATHER</span><h2>PAUSED<span class="text-green">.</span></h2><p>Your next move can wait.</p><button class="primary-button" data-action="resume">RESUME ${icon('play')}</button><button class="overlay-secondary" data-action="restart">RESTART RUN</button>`;
  const end = `<div class="overlay-emblem">${icon(game.state === 'won' ? 'trophy' : 'snake')}</div><span class="overlay-kicker">${game.state === 'won' ? 'YOU OWN THE ARENA' : 'EVERY END IS A NEW START'}</span><h2>${game.state === 'won' ? 'GRID CLEARED' : 'GAME OVER'}<span class="text-green">.</span></h2><div class="end-score"><span>FINAL SCORE<strong>${game.score}</strong></span><span>PERSONAL BEST<strong class="text-green">${game.best}</strong></span></div><button class="primary-button" data-action="restart">PLAY AGAIN ${icon('restart')}</button><button class="overlay-secondary" data-action="menu">BACK TO MENU</button>`;
  if (!playing) $('overlay-content').innerHTML = game.state === 'ready' ? ready : paused ? pause : end;
}
$('overlay').addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) act(button.dataset.action);
});
$('pause').addEventListener('click', () => act('pause'));
$('restart').addEventListener('click', () => act('restart'));
$('sound').addEventListener('click', () => { audio.unlock(); audio.setEnabled(!audio.enabled); syncAudio(); });
$('help').addEventListener('click', () => { if (game.state === 'playing') { game.pause(); updateUI(); } $('help-dialog').showModal(); });
for (const id of ['close-help','got-it']) $(id).addEventListener('click', () => $('help-dialog').close());
const directions = { ArrowUp:'up', w:'up', ArrowDown:'down', s:'down', ArrowLeft:'left', a:'left', ArrowRight:'right', d:'right' };
window.addEventListener('keydown', event => {
  if ($('help-dialog').open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (event.code === 'Space' && event.target.closest('button,a')) return;
  if (directions[key]) { event.preventDefault(); if (game.state === 'playing') game.turn(directions[key]); }
  else if (event.code === 'Space' || key === 'Escape') { event.preventDefault(); if (!event.repeat) act('pause'); }
  else if (key === 'r' && !event.repeat) { event.preventDefault(); act('restart'); }
});
document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('pointerdown', event => {
  event.preventDefault(); audio.unlock(); game.turn(button.dataset.direction);
}));
let touchStart = null;
$('board-wrap').addEventListener('pointerdown', event => {
  if (event.target.closest('button') || game.state !== 'playing') return;
  touchStart = {x:event.clientX,y:event.clientY,id:event.pointerId};
  $('board-wrap').setPointerCapture(event.pointerId);
});
$('board-wrap').addEventListener('pointermove', event => {
  if (!touchStart || touchStart.id !== event.pointerId) return;
  const dx = event.clientX-touchStart.x, dy = event.clientY-touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
  game.turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  touchStart = {x:event.clientX,y:event.clientY,id:event.pointerId};
});
for (const event of ['pointerup','pointercancel']) $('board-wrap').addEventListener(event, () => { touchStart = null; });
window.addEventListener('blur', () => { if (game.state === 'playing') {game.pause();updateUI();} });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'playing') {game.pause();updateUI();} });

updateUI();
// One animation loop for the lifetime of the app; start/restart never create loops.
let lastTime = null;
let frameId;
function frame(time) {
  const delta = lastTime === null ? 0 : Math.min(time - lastTime, 100);
  lastTime = time;
  game.update(delta);
  updateUI();
  renderer.draw(game, time, delta);
  frameId = requestAnimationFrame(frame);
}
frameId = requestAnimationFrame(frame);
if (import.meta.hot) import.meta.hot.dispose(() => { cancelAnimationFrame(frameId); renderer.destroy(); });
