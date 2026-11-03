import { OnlineLeaderboardService, LeaderboardService } from '../services/leaderboard.js';

/** Online integration is optional: failure never prevents a local game. */
export class LeaderboardUI {
  constructor({ onPause, onReady }) {
    this.api = new OnlineLeaderboardService(); this.demo = new LeaderboardService();
    this.onPause = onPause; this.onReady = onReady; this.mode = 'loading'; this.name = ''; this.pending = null;
    const panel = document.querySelector('.leaderboard');
    panel.insertAdjacentHTML('beforeend', `<div class="online-player"><span id="guest-label">Connecting…</span><button id="edit-name" class="secondary-button" type="button">Set name</button></div><p id="score-sync" role="status"></p><button id="retry-score" class="secondary-button" type="button" hidden>Retry saving score</button>`);
    document.body.insertAdjacentHTML('beforeend', `<dialog id="guest-dialog"><form id="guest-form"><div class="dialog-heading"><span class="eyebrow">YOUR ARENA IDENTITY</span><button class="icon-button" type="button" id="cancel-guest" aria-label="Close name form">×</button></div><h2>Make a name.</h2><label for="guest-name">Tên hiển thị</label><input id="guest-name" name="name" maxlength="24" minlength="1" required autocomplete="nickname" placeholder="Neon Viper"/><p>Tên này sẽ hiển thị công khai cùng điểm cao nhất. Không nhập thông tin riêng tư. Danh tính khách chỉ thuộc trình duyệt này.</p><p id="guest-error" role="alert"></p><button class="primary-button" id="save-guest" type="submit">SAVE NAME</button><button id="play-offline" class="overlay-secondary" type="button">PLAY WITHOUT ONLINE SCORE</button></form></dialog>`);
    this.dialog = document.getElementById('guest-dialog');
    document.getElementById('edit-name').onclick = () => { this.onPause(); this.open(); };
    document.getElementById('cancel-guest').onclick = () => this.dialog.close();
    document.getElementById('play-offline').onclick = () => { const next = this.next; this.next = null; this.dialog.close(); next?.(); };
    this.dialog.addEventListener('close', () => { this.next = null; });
    document.getElementById('guest-form').onsubmit = event => this.saveName(event);
    document.getElementById('retry-score').onclick = () => this.flush();
    this.initializing = this.init();
  }
  status(text) { document.getElementById('score-sync').textContent = text; }
  async init() {
    try {
      const entries = await this.api.getTop(); this.mode = 'online'; this.render(entries);
      try { this.name = (await this.api.getGuest()).name || ''; } catch { /* New or expired guest must enter a name. */ }
    } catch (error) {
      if (import.meta.env.DEV && error.status === 404) { this.mode = 'demo'; this.render(await this.demo.getTop()); }
      else { this.mode = 'offline'; this.render([]); this.status('Leaderboard unavailable. Local play still works.'); }
    }
    this.updateLabels();
  }
  updateLabels() {
    document.querySelector('.demo-pill').textContent = this.mode === 'online' ? 'ONLINE' : this.mode === 'demo' ? 'DEMO' : 'OFFLINE';
    document.querySelector('.leader-note').textContent = this.mode === 'online' ? 'Global guest ranking · personal best per guest' : this.mode === 'demo' ? 'Sample scores — not an online ranking' : 'Online scores are not available right now';
    document.getElementById('guest-label').textContent = this.mode === 'demo' ? 'Local demo mode' : this.name ? `Playing as ${this.name}` : 'Guest · no name set';
    document.getElementById('edit-name').hidden = this.mode === 'demo';
  }
  async beforePlay(next) {
    await this.initializing;
    if (this.mode !== 'demo' && !this.name) { this.next = next; this.open(); }
    else next();
  }
  open() {
    document.getElementById('guest-name').value = this.name;
    document.getElementById('guest-error').textContent = '';
    if (!this.dialog.open) this.dialog.showModal();
    document.getElementById('guest-name').focus();
  }
  async saveName(event) {
    event.preventDefault();
    const button = document.getElementById('save-guest'); button.disabled = true;
    try {
      const name = document.getElementById('guest-name').value.trim();
      if (!name || [...name].length > 24) throw new Error('Nhập tên từ 1 đến 24 ký tự.');
      this.name = (await this.api.setGuest(name)).name; this.mode = 'online'; this.updateLabels();
      const next = this.next; this.next = null; this.dialog.close(); next?.();
    } catch { document.getElementById('guest-error').textContent = 'Không lưu được tên. Kiểm tra kết nối hoặc chọn chơi không lưu điểm online.'; }
    finally { button.disabled = false; }
  }
  async finish(snapshot) {
    if (this.mode === 'demo') { this.render(await this.demo.getTop()); return; }
    if (!this.name) { this.status('Điểm chỉ được lưu trên thiết bị. Đặt tên trước lượt chơi để gửi điểm online.'); return; }
    // Retain an immutable result in memory, never submit whatever a later run contains.
    if (!this.pending || snapshot.score > this.pending.score) this.pending = { score:snapshot.score, elapsed:snapshot.elapsed };
    await this.flush();
  }
  async flush() {
    if (!this.pending || this.saving) return;
    this.saving = true; const result = this.pending;
    this.status('Đang gửi điểm…'); document.getElementById('retry-score').hidden = true;
    try {
      await this.api.submit(result.score, Math.round(result.elapsed * 1000));
      if (this.pending === result) this.pending = null;
      this.status('Đã lưu kỷ lục online.');
      try { this.render(await this.api.getTop()); this.mode = 'online'; this.updateLabels(); }
      catch { this.status('Điểm đã lưu. Chưa tải lại được Top 5.'); }
    } catch { this.status('Chưa lưu được điểm online. Bạn có thể thử lại trong phiên này.'); }
    finally {
      this.saving = false; document.getElementById('retry-score').hidden = !this.pending;
    }
  }
  render(entries) {
    const list = document.getElementById('leader-list'); const fragment = document.createDocumentFragment();
    for (const [i,entry] of entries.slice(0,5).entries()) {
      const row = document.createElement('li'); row.className = 'leader-row';
      for (const [cls,text] of [['rank',String(i+1).padStart(2,'0')],['avatar',entry.name.slice(0,2).toUpperCase()],['player-name',entry.name],['player-score',entry.score.toLocaleString('en-US')]]) {
        const span = document.createElement('span'); span.className = cls; span.textContent = text; row.append(span);
      }
      fragment.append(row);
    }
    if (!entries.length) { const item = document.createElement('li'); item.className='leader-empty'; item.textContent=this.mode === 'online' ? 'Chưa có điểm. Hãy là người đầu tiên!' : 'Chưa có dữ liệu xếp hạng.'; fragment.append(item); }
    list.replaceChildren(fragment);
  }
}


