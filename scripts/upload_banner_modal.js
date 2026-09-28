import puppeteer from 'puppeteer-core';
import { sleep } from '../src/browser.js';
import path from 'node:path';

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--user-data-dir=C:\\puppeteer-work\\chrome-temp-default'],
    defaultViewport: null
  });

  const page = (await browser.pages())[0] || (await browser.newPage());
  console.log('Navigating to profile...');
  await page.goto('https://www.linkedin.com/in/pablo-ian-laurino-263aa5145/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);

  // Click camera button
  console.log('Opening camera dropdown...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const r = b.getBoundingClientRect();
      return (aria.includes('background') || aria.includes('cover') || aria.includes('photo')) && r.y < 250 && r.x > 500;
    });
    if (btn) btn.click();
  });
  await sleep(2000);

  console.log('Clicking Add cover image link...');
  await page.evaluate(() => {
    const target = document.querySelector('[aria-label="Add cover image"]') || 
                   Array.from(document.querySelectorAll('a')).find(a => (a.innerText || '').includes('Add cover image'));
    if (target) target.click();
  });
  await sleep(3000);

  const bannerFile = path.resolve('C:\\Users\\CONECTIA BA\\projects\\linkedin-agent-toolkit\\linkedin_banner.png');

  console.log('Waiting for file chooser and clicking Upload single photo...');
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 10000 }),
    page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, div[role="button"], label')).find(el => 
        (el.innerText || '').toLowerCase().includes('upload single photo')
      );
      if (btn) btn.click();
    })
  ]);

  console.log('File chooser intercepted! Uploading...');
  await fileChooser.accept([bannerFile]);
  await sleep(5000);

  // Click "Save changes" button
  console.log('Clicking Save changes button...');
  const saveChangesClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => {
      const t = (b.innerText || '').trim().toLowerCase();
      return t.includes('save changes') || t.includes('guardar cambios');
    });
    const vis = buttons.filter(b => b.getBoundingClientRect().width > 0 && !b.disabled);
    if (vis.length) {
      vis[0].click();
      return true;
    }
    return false;
  });
  console.log('Save changes clicked:', saveChangesClicked);
  await sleep(5000);

  // Check if underlying modal "Save" button is present and clickable
  const finalSave = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => {
      const t = (b.innerText || '').trim().toLowerCase();
      return t === 'save' || t === 'guardar' || t === 'apply' || t === 'aplicar';
    });
    const vis = buttons.filter(b => b.getBoundingClientRect().width > 0 && !b.disabled);
    if (vis.length) {
      vis[vis.length - 1].click();
      return { clicked: true, text: vis[vis.length - 1].innerText };
    }
    return { clicked: false };
  });
  console.log('Final save button result:', finalSave);
  await sleep(8000);

  await page.screenshot({ path: 'C:\\Users\\CONECTIA BA\\projects\\linkedin-agent-toolkit\\banner_applied_final.png' });
  console.log('Banner applied! Screenshot taken.');

  await browser.close();
}

main().catch(console.error);
