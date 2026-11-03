import { test, expect } from '@playwright/test';

test('desktop lifecycle, controls and demo leaderboard have no runtime errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#overlay-content h2')).toContainText('GAME READY');
  await expect(page.locator('#leader-list li')).toHaveCount(5);
  await page.getByRole('button', { name: 'PLAY NOW' }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await page.keyboard.press('Space');
  await expect(page.locator('#overlay-content h2')).toContainText('PAUSED');
  const pausedTime = await page.locator('#time').innerText();
  await page.waitForTimeout(350);
  await expect(page.locator('#time')).toHaveText(pausedTime);
  await page.getByRole('button', { name: 'RESUME', exact: true }).click();
  await expect(page.locator('#state-label')).toHaveText('ARENA ACTIVE');
  // Heading right into the wall should end a run without input.
  await expect(page.locator('#overlay-content h2')).toContainText('GAME OVER', { timeout: 6000 });
  await page.getByRole('button', { name: 'BACK TO MENU' }).click();
  await expect(page.locator('#overlay-content h2')).toContainText('GAME READY');
  for (let i = 0; i < 8; i++) await page.locator('#restart').click();
  await expect(page.locator('#score')).toHaveText('0000');
  await page.locator('#pause').click();
  await page.locator('#help').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'GOT IT' }).click();
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-label', 'Turn sound on');
  await page.reload();
  await expect(page.locator('#sound')).toHaveAttribute('aria-label', 'Turn sound on');
  expect(errors).toEqual([]);
});

test('mobile board fits viewport and touch controls work', async ({ browser }) => {
  const context = await browser.newContext({ viewport:{width:375,height:812}, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
  const page = await context.newPage();
  await page.goto('/');
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  await expect(page.locator('.mobile-controls')).toBeVisible();
  const board = await page.locator('#game').boundingBox();
  expect(board.width).toBeLessThanOrEqual(375);
  await page.getByRole('button', { name:'PLAY NOW' }).tap();
  await page.getByRole('button', { name:'Move down', exact:true }).tap();
  await expect(page.locator('#overlay')).toBeHidden();
  await page.locator('#pause').tap();
  await expect(page.locator('#overlay-content h2')).toContainText('PAUSED');
  await context.close();
});

test('storage denied is handled without breaking startup', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', {get() {throw new Error('Storage blocked');}}); });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', {name:'PLAY NOW'}).click();
  await expect(page.locator('#overlay')).toBeHidden();
  expect(errors).toEqual([]);
});

test('responsive layouts fit narrow and wide screens', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 480, 768, 1024, 1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`).toBe(true);
    const board = await page.locator('#game').boundingBox();
    expect(Math.abs(board.width-board.height)).toBeLessThan(2);
  }
});

test('online guest enters name, saves score and sees shared ranking', async ({ page }) => {
  let named = false; let submissions = 0;
  await page.route('**/api/leaderboard', route => route.fulfill({json:{entries:[{rank:1,name:'REAL PLAYER',score:120}],mode:'online'}}));
  await page.route('**/api/guest', route => {
    if (route.request().method() === 'POST') { named=true; return route.fulfill({json:{name:'Guest One'}}); }
    return route.fulfill({status:named?200:401,json:named?{name:'Guest One'}:{error:'No session'}});
  });
  await page.route('**/api/scores', route => { submissions++; return route.fulfill({json:{saved:true,bestScore:0}}); });
  await page.goto('/');
  await expect(page.locator('.demo-pill')).toHaveText('ONLINE');
  await expect(page.locator('#leader-list')).toContainText('REAL PLAYER');
  await page.getByRole('button',{name:'PLAY NOW'}).click();
  await expect(page.locator('#guest-dialog')).toBeVisible();
  await page.locator('#guest-name').fill('Guest One');
  await page.getByRole('button',{name:'SAVE NAME'}).click();
  await expect(page.locator('#guest-dialog')).not.toBeVisible();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#overlay-content h2')).toContainText('GAME OVER',{timeout:6000});
  await expect(page.locator('#score-sync')).toContainText('Đã lưu');
  expect(submissions).toBe(1);
});

test('failed score submission can be retried without blocking play', async ({page}) => {
  let attempts=0;
  await page.route('**/api/leaderboard', r=>r.fulfill({json:{entries:[],mode:'online'}}));
  await page.route('**/api/guest',r=>r.fulfill({json:{name:'Existing Guest'}}));
  await page.route('**/api/scores',r=> {attempts++;return r.fulfill({status:attempts===1?503:200,json:attempts===1?{error:'Unavailable'}:{saved:true,bestScore:0}});});
  await page.goto('/');
  await page.getByRole('button',{name:'PLAY NOW'}).click();
  await expect(page.locator('#retry-score')).toBeVisible({timeout:7000});
  await page.locator('#retry-score').click();
  await expect(page.locator('#score-sync')).toContainText('Đã lưu');
  expect(attempts).toBe(2);
});
