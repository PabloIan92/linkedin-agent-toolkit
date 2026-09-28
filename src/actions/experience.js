import { sleep } from '../browser.js';

/**
 * Adds a job / experience position to the LinkedIn profile.
 */
export async function addExperience(page, {
  title,
  companyName,
  location = '',
  description = '',
  profileUrl = null
}) {
  if (!title || !title.trim()) {
    throw new Error('Position title is required');
  }
  if (!companyName || !companyName.trim()) {
    throw new Error('Company name is required');
  }

  let formUrl = 'https://www.linkedin.com/in/me/edit/forms/position/new/';
  if (profileUrl) {
    const base = profileUrl.split('?')[0].replace(/\/+$/, '');
    formUrl = `${base}/edit/forms/position/new/`;
  }

  await page.goto(formUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);

  // Fill Title
  await page.evaluate((posTitle) => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
    const titleInput = inputs.find((inp) => {
      const label = (inp.getAttribute('aria-label') || '').toLowerCase();
      return label.includes('title') || label.includes('cargo') || label.includes('puesto');
    }) || inputs[0];

    if (titleInput) {
      titleInput.value = posTitle;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, title);
  await sleep(500);

  // Fill Company
  await page.evaluate((compName) => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
    const compInput = inputs.find((inp) => {
      const label = (inp.getAttribute('aria-label') || '').toLowerCase();
      return label.includes('company') || label.includes('empresa');
    }) || inputs[1];

    if (compInput) {
      compInput.value = compName;
      compInput.dispatchEvent(new Event('input', { bubbles: true }));
      compInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, companyName);
  await sleep(500);

  // Fill Description if available
  if (description) {
    await page.evaluate((descText) => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = descText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, description);
    await sleep(500);
  }

  // Click Save
  const saved = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((b) => {
      const text = (b.innerText || '').trim().toLowerCase();
      return text === 'save' || text === 'guardar';
    });
    const visibleBtn = buttons.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    if (visibleBtn.length) {
      visibleBtn[visibleBtn.length - 1].click();
      return true;
    }
    return false;
  });

  if (!saved) {
    throw new Error('Save button not found in experience form');
  }

  await sleep(6000);

  return {
    success: true,
    title,
    companyName
  };
}
