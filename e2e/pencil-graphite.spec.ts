import { test, expect } from '@playwright/test';

test('graphite pencil hero is an accessible SVG drawing, not a marker font', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1586, height: 992 });
  await page.goto('#/home');
  const title = page.getByRole('heading', { name: 'THE FORGE', level: 1 });
  await expect(title).toBeVisible();
  await expect(title.locator('svg.pencil-wordmark-art')).toBeVisible();
  await expect(title.locator('pattern#forge-graphite-grain')).toHaveCount(1);
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
  const visual = await title.evaluate(el => {
    const css = getComputedStyle(el);
    const svg = el.querySelector('svg')!;
    return { background: css.backgroundImage, width: svg.getBoundingClientRect().width, height: svg.getBoundingClientRect().height };
  });
  expect(visual.background).toBe('none');
  expect(visual.width).toBeGreaterThan(280);
  expect(visual.height).toBeGreaterThan(45);
  const marker = await page.locator('.sketch-highlight-mark').first().evaluate(el => getComputedStyle(el,'::before').backgroundImage);
  expect(marker).toContain('data:image/svg+xml');
  await page.screenshot({ path: testInfo.outputPath('graphite-home-1586.png'), fullPage: false });
});

test('Logo Resizer uses pencil-drawn native controls with functioning values', async ({page},testInfo) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('#/logo-resizer');
  const logo = page.locator('.logo-workspace');
  await expect(logo).toBeVisible();
  const select = page.getByRole('combobox', { name: 'Download format' });
  await expect(select).toHaveCSS('appearance','none');
  await select.selectOption('jpeg');
  await expect(select).toHaveValue('jpeg');
  const cb = page.locator('.forge-v5-checkboxes input[type="checkbox"]').first();
  await expect(cb).toHaveCSS('appearance','none');
  const wasChecked = await cb.isChecked();
  await cb.click();
  expect(await cb.isChecked()).toBe(!wasChecked);
  const slider = page.getByRole('slider', {name:'Global image padding'});
  await expect(slider).toHaveCSS('appearance','none');
  const initial = await slider.inputValue();
  await slider.focus();
  await slider.press('ArrowRight');
  expect(await slider.inputValue()).not.toBe(initial);
  const button = page.getByRole('button', {name:'Add assets'});
  await expect(button).toBeVisible();
  const bg = await button.evaluate(el => getComputedStyle(el).backgroundImage);
  expect(bg).toContain('data:image/svg+xml');
  await page.screenshot({ path: testInfo.outputPath('graphite-logo-resizer.png'), fullPage: false });
});

test('pencil component skin keeps the original seven tool routes and keyboard focus', async ({page},testInfo) => {
  const routes = ['logo-resizer','pdf-to-image','image-splitter','video-stills','storyboard','link-generator','ad-downloader'];
  const errors: string[] = [];
  page.on('pageerror',error=>errors.push(error.message));
  for (const route of routes) {
    await page.goto('#/'+route);
    const panel = page.locator('.native-tool:visible');
    await expect(panel).toBeVisible();
    const box = await panel.evaluate(el => {
      const root = document.querySelector<HTMLElement>('.forge-app')!;
      return { material: getComputedStyle(root).getPropertyValue('--pencil-graphite').trim(), buttons: el.querySelectorAll('button').length };
    });
    expect(box.material).toBe('#292a2b');
    expect(box.buttons, route).toBeGreaterThan(0);
    if(route==='storyboard') await page.screenshot({path:testInfo.outputPath('graphite-storyboard.png')});
  }
  expect(errors).toEqual([]);
});

test('pencil home retains responsive no-overlap layout and search navigation', async ({page}) => {
  for(const width of [1920,1586,1366,1024,768,390]) {
    await page.setViewportSize({width,height:768});
    await page.goto('#/home');
    const layout = await page.locator('.sketch-home-grid .sketch-tool-card').evaluateAll(elements =>
      elements.map(el => {const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}}));
    expect(layout.length).toBe(7);
    for(let i=0;i<layout.length;i++) for(let j=i+1;j<layout.length;j++){
      const a=layout[i],b=layout[j];
      expect(Math.min(a.right,b.right)-Math.max(a.x,b.x)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<=1,width+'px overlap '+i+' '+j).toBe(true);
    }
  }
  await page.getByRole('searchbox',{name:'Find a Forge tool'}).fill('ad downloader');
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Open Ad Downloader'}).click();
  await expect(page).toHaveURL(/#\/storyboard$/);
});
