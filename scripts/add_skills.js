import puppeteer from 'puppeteer-core';
import { sleep } from '../src/browser.js';

const SKILLS_TO_ADD = [
  'Webhooks',
  'Chatwoot',
  'Business Process Automation',
  'Google Sheets',
  'Ubiquiti UniFi',
  'Technical Support'
];

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--user-data-dir=C:\\puppeteer-work\\chrome-temp-default'],
    defaultViewport: null
  });

  const page = (await browser.pages())[0] || (await browser.newPage());
  const FORM_URL = 'https://www.linkedin.com/in/pablo-ian-laurino-263aa5145/skills/edit/forms/new/';

  let added = 0;
  for (const skillName of SKILLS_TO_ADD) {
    console.log(`\nAdding skill: "${skillName}"...`);
    await page.goto(FORM_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);

    const inputFound = await page.evaluate(() => {
      const inp = document.querySelector('input[placeholder*="Skill"]') ||
                  document.querySelector('input[aria-label*="Skill"]') ||
                  Array.from(document.querySelectorAll('input[type="text"]'))[0];
      if (inp) {
        inp.id = 'SKILL_INPUT_FIELD';
        return true;
      }
      return false;
    });

    if (!inputFound) {
      console.log('Skill input not found, skipping', skillName);
      continue;
    }

    await page.focus('#SKILL_INPUT_FIELD');
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#SKILL_INPUT_FIELD', skillName, { delay: 15 });
    await sleep(1500);

    // If dropdown appears, select the first matching option if available
    await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('div[role="listbox"] div[role="option"], ul.basic-typeahead__selectable-list li, div.artdeco-typeahead__result'));
      if (options.length) {
        options[0].click();
      }
    });
    await sleep(1000);

    // Click Save
    const saved = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => ['save', 'guardar'].includes((b.innerText || '').trim().toLowerCase()));
      const vis = btns.filter(b => b.getBoundingClientRect().width > 0);
      if (vis.length) {
        vis[vis.length - 1].click();
        return true;
      }
      return false;
    });

    console.log(`Saved "${skillName}":`, saved);
    await sleep(5000);
    added++;
  }

  console.log(`\nTOTAL SKILLS ADDED: ${added}/${SKILLS_TO_ADD.length}`);
  await page.screenshot({ path: 'C:\\Users\\CONECTIA BA\\projects\\linkedin-agent-toolkit\\skills_added.png' });
  await browser.close();
}

main().catch(console.error);
