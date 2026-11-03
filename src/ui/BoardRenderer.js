/** Canvas-only renderer. Rendering never mutates gameplay state. */
export class BoardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }
  resize() {
    const size = this.canvas.clientWidth;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(size * ratio);
    this.canvas.height = Math.round(size * ratio);
    this.size = size;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  burst(position) {
    if (this.reducedMotion) return;
    for (let i = 0; i < 16; i++) {
      const angle = Math.PI * 2 * i / 16;
      this.particles.push({ x: position.x + .5, y: position.y + .5, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3, life: 1 });
    }
  }
  clearEffects() { this.particles = []; }
  draw(game, time, delta = 16) {
    const { ctx: c, size: s } = this;
    if (!s) return;
    const cell = s / game.cols;
    c.clearRect(0, 0, s, s);
    c.fillStyle = '#09130c'; c.fillRect(0, 0, s, s);
    c.strokeStyle = '#1b342164'; c.lineWidth = .5;
    c.beginPath();
    for (let i = 1; i < game.cols; i++) { c.moveTo(i * cell, 0); c.lineTo(i * cell, s); }
    for (let i = 1; i < game.rows; i++) { c.moveTo(0, i * cell); c.lineTo(s, i * cell); }
    c.stroke();
    // Subtle, fixed arena coordinates are decorative rather than gameplay cells.
    c.fillStyle = '#345b3d';
    for (let x = 4; x < game.cols; x += 4) for (let y = 4; y < game.rows; y += 4) c.fillRect(x * cell - 1, y * cell - 1, 2, 2);
    if (game.food) {
      const x = (game.food.x + .5) * cell, y = (game.food.y + .5) * cell;
      const pulse = this.reducedMotion ? 1 : 1 + Math.sin(time / 240) * .12;
      c.save(); c.translate(x,y); c.rotate(Math.PI / 4);
      c.shadowColor = '#39ff14'; c.shadowBlur = cell * 1.1;
      c.fillStyle = '#9dff62';
      c.beginPath(); c.roundRect(-cell * .25 * pulse, -cell * .25 * pulse, cell * .5 * pulse, cell * .5 * pulse, 2); c.fill();
      c.shadowBlur = 0; c.strokeStyle = '#39ff1435'; c.strokeRect(-cell * .46,-cell * .46,cell * .92,cell * .92); c.restore();
    }
    const preview = game.state === 'ready';
    // A single fixed-step engine supplies interpolation; the renderer owns no timers.
    const progress = this.reducedMotion || preview || game.state !== 'playing' ? 1 : Math.min(1, Math.max(0, game.progress ?? 1));
    const points = game.snake.map((part, i) => {
      const previous = game.previousSnake?.[i] || part;
      return {x: (previous.x + (part.x - previous.x) * progress + .5) * cell, y: (previous.y + (part.y - previous.y) * progress + .5) * cell};
    });
    c.save(); c.globalAlpha = preview ? .34 : 1;
    c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = cell * .77;
    c.shadowColor = '#39ff14'; c.shadowBlur = preview ? 9 : 12;
    for (let i = points.length - 1; i > 0; i--) {
      c.strokeStyle = i < 3 ? '#39ef25' : `hsl(${118 + Math.min(i,15)},78%,${Math.max(24,48 - i * 1.2)}%)`;
      c.beginPath();c.moveTo(points[i].x,points[i].y);c.lineTo(points[i-1].x,points[i-1].y);c.stroke();
    }
    const head = points[0];
    if (head) {
      c.fillStyle = '#7aff46'; c.beginPath(); c.roundRect(head.x-cell*.4,head.y-cell*.4,cell*.8,cell*.8,cell*.25); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#0b2c0a';
      const next = points[1] || { x: head.x-cell, y:head.y };
      const dx = head.x - next.x, dy = head.y - next.y;
      const horizontal = Math.abs(dx) >= Math.abs(dy), sign = horizontal ? Math.sign(dx) || 1 : Math.sign(dy) || 1;
      for (const side of [-1, 1]) { c.beginPath(); c.arc(head.x+(horizontal?sign*.17:side*.21)*cell,head.y+(horizontal?side*.21:sign*.17)*cell,cell*.065,0,Math.PI*2);c.fill(); }
    }
    c.restore();
    const dt = Math.min(delta, 50) / 1000;
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.life -= dt * 2.2; p.x += p.vx * dt; p.y += p.vy * dt;
      c.globalAlpha = Math.max(0, p.life); c.fillStyle = '#9dff62';c.fillRect(p.x*cell,p.y*cell,Math.max(1,cell*.13*p.life),Math.max(1,cell*.13*p.life));
    }
    c.globalAlpha = 1;
  }
  destroy() { this.observer.disconnect(); }
}
