export const icons = {
 snake: '<path d="M5 19h11a4 4 0 0 0 0-8H8a3 3 0 0 1 0-6h11"/><path d="M17 3h3v4"/>',
 sound: '<path d="m11 5-6 4H2v6h3l6 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute: '<path d="m11 5-6 4H2v6h3l6 4zM16 9l6 6m0-6-6 6"/>',
 help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1-1.5 3m0 3h.01"/>',
 play: '<path d="m9 5 11 7-11 7z"/>',
 pause: '<path d="M8 5v14M16 5v14"/>',
 restart: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
 trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0zM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v6m-4 2h8"/>',
 bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
 target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
 clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
export const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`;

export function renderApp(root) {
 root.innerHTML = `
 <header class="site-header"><a class="brand" href="./" aria-label="Snake Arena home"><span class="brand-mark">${icon('snake')}</span><span>SNAKE<span class="text-green">ARENA</span><small>THE CLASSIC. REWIRED.</small></span></a>
 <div class="header-right"><span class="system-status"><i></i> SYSTEM ONLINE</span><span class="header-divider"></span><button class="icon-button" id="sound" aria-label="Turn sound off" title="Toggle sound">${icon('sound')}</button><button class="icon-button" id="help" aria-label="How to play" title="How to play">${icon('help')}</button></div></header>
 <main class="page"><section class="intro"><div><div class="eyebrow"><span></span> YOUR NEXT HIGH SCORE STARTS HERE</div><h1>Enter the <em>grid.</em></h1><p>Stay sharp. Grow longer. Own the arena.</p></div><div class="mode-badge"><span class="mode-icon">${icon('bolt')}</span><span>CLASSIC MODE<small>NO LIMITS. JUST INSTINCT.</small></span></div></section>
 <div class="arena-layout"><section class="game-column" aria-label="Snake game">
 <div class="stats-grid"><div class="stat-card"><span>${icon('target')} SCORE</span><strong id="score">0000</strong><small>MAKE EVERY BITE COUNT</small></div><div class="stat-card"><span>${icon('trophy')} PERSONAL BEST</span><strong id="best" class="text-green">0000</strong><small>STORED ON THIS DEVICE</small></div><div class="stat-card compact-stat"><span>${icon('bolt')} LEVEL</span><strong id="level">01</strong><small id="speed">8 CELLS / SEC</small></div></div>
 <div class="board-shell"><div class="board-toolbar"><span class="board-label"><i id="state-dot"></i><span id="state-label">AWAITING PLAYER</span></span><span class="grid-label">24 × 24 GRID <span> / </span> CLASSIC</span></div>
 <div class="board-wrap" id="board-wrap"><canvas id="game" width="720" height="720" role="img" aria-label="Snake game board. Use arrow keys or WASD to move."></canvas><div class="board-vignette"></div>
 <div class="game-overlay" id="overlay"><div class="overlay-content" id="overlay-content"></div></div>
 <span class="corner top-left"></span><span class="corner top-right"></span><span class="corner bottom-left"></span><span class="corner bottom-right"></span></div>
 <div class="board-bottom"><span>${icon('bolt')} EAT. GROW. REPEAT.</span><span><i></i> LOCAL SESSION</span></div></div>
 <div class="game-actions"><p><kbd>SPACE</kbd> to pause <span>·</span> <kbd>R</kbd> to restart</p><div><button class="secondary-button" id="restart">${icon('restart')} Restart</button><button class="secondary-button" id="pause" disabled>${icon('pause')} Pause</button></div></div>
 <div class="mobile-controls" aria-label="Touch direction controls"><button data-direction="up" aria-label="Move up">↑</button><button data-direction="left" aria-label="Move left">←</button><button data-direction="down" aria-label="Move down">↓</button><button data-direction="right" aria-label="Move right">→</button></div>
 <div class="arena-note"><span class="note-line"></span><span>A LITTLE NOSTALGIA. A NEW KIND OF RUSH.</span><span class="note-line"></span></div>
 </section>
 <aside class="sidebar"><section class="panel leaderboard"><div class="panel-heading"><h2>${icon('trophy')} THE LEADERBOARD</h2><span class="demo-pill">DEMO</span></div><p class="panel-description">Legends of the grid. Can you keep up?</p><div class="leader-table"><div class="table-heading"><span>RANK / PLAYER</span><span>SCORE</span></div><ol id="leader-list"></ol></div><div class="leader-note"><i></i> Sample scores — not an online ranking</div><div class="your-best"><span>YOUR PERSONAL BEST</span><strong id="side-best">0 <small>PTS</small></strong></div></section>
 <section class="panel controls-panel"><div class="panel-heading"><h2>${icon('target')} HOW TO PLAY</h2><span class="tiny-label">01 — 03</span></div><div class="control-row"><div class="key-cluster"><div><kbd>W</kbd></div><div><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div></div><span>Move your snake<small>or use arrow keys / swipe</small></span></div><div class="rule"><span class="food-symbol"></span><p>Chase the glow<small>Every bite earns you <b>+10 points</b></small></p></div><div class="rule"><span class="danger-symbol">×</span><p>Keep your distance<small>Walls and your own tail are lethal.</small></p></div><div class="control-footer">${icon('bolt')} THE LONGER YOU LAST, THE FASTER IT GETS.</div></section>
 <section class="panel session-panel"><div class="panel-heading"><h2>${icon('clock')} THIS SESSION</h2><span class="session-dot"></span></div><div class="session-data"><div><span>TIME ALIVE</span><strong id="time">00:00</strong></div><div><span>FOOD EATEN</span><strong id="foods">00</strong></div><div><span>SNAKE LENGTH</span><strong id="length">04</strong></div></div><div class="session-caption">One more run. You know you want to.</div></section>
 <div class="sidebar-foot"><span class="mini-cross">+</span> BUILT FOR THE LOVE OF THE GAME <span class="mini-cross">+</span></div>
 </aside></div></main>
 <footer class="site-footer"><span>SNAKE ARENA <span class="footer-slash">/</span> <span class="muted">LESS SCROLLING. MORE PLAYING.</span></span><span class="muted">LOCAL ARCADE <span class="version">v1.0</span></span></footer>
 <dialog id="help-dialog"><div class="dialog-heading"><span class="eyebrow">FIELD MANUAL</span><button id="close-help" class="icon-button" aria-label="Close instructions">${icon('close')}</button></div><h2>Welcome to the arena.</h2><p>Use <b>WASD / arrow keys</b>, swipe on the board, or use the touch D-pad. Collect green food for <b>10 points</b>. Every 50 points increases your level and speed.</p><p>Avoid walls and your body. You cannot reverse direction. Press <b>Space</b> or <b>Escape</b> to pause, and <b>R</b> to restart.</p><p>Your best is saved only on this browser when storage is available. Online mode shows shared guest scores; local demo mode is explicitly labeled. Guest scores are for casual play, not verified competition.</p><button class="primary-button" id="got-it">GOT IT ${icon('arrow')}</button></dialog><div id="announcer" class="sr-only" role="status" aria-live="polite"></div>`;
}
