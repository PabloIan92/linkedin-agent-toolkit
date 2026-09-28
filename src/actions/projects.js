import { sleep } from '../browser.js';

/**
 * Adds a project to the LinkedIn profile.
 */
export async function addProject(page, { name, description = '', url = '', profileUrl = null }) {
  if (!name || !name.trim()) {
    throw new Error('Project name is required');
  }

  let formUrl = 'https://www.linkedin.com/in/me/edit/forms/project/new/';
  if (profileUrl) {
    const base = profileUrl.split('?')[0].replace(/\/+$/, '');
    formUrl = `${base}/edit/forms/project/new/`;
  }

  await page.goto(formUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);

  // Identify Name input and Description textarea
  const fieldsPrepared = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"]')).filter(
      (el) => el.getBoundingClientRect().width > 200
    );
    const textareas = Array.from(document.querySelectorAll('textarea')).filter(
      (el) => el.getBoundingClientRect().width > 200
    );

    if (!inputs.length) return { success: false, error: 'Project name input field not found' };

    inputs[0].id = 'MCP_PJ_NAME';
    if (textareas.length) {
      textareas[0].id = 'MCP_PJ_DESC';
    }

    return { success: true, hasDesc: textareas.length > 0 };
  });

  if (!fieldsPrepared.success) {
    throw new Error(fieldsPrepared.error);
  }

  // Type project name
  await page.focus('#MCP_PJ_NAME');
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type('#MCP_PJ_NAME', name, { delay: 10 });
  await sleep(400);

  // Type description if provided
  if (description && fieldsPrepared.hasDesc) {
    await page.focus('#MCP_PJ_DESC');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#MCP_PJ_DESC', description, { delay: 5 });
    await sleep(400);
  }

  // Type URL if provided
  if (url) {
    await page.evaluate((projectUrl) => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"]'));
      const urlInput = inputs.find((inp) => {
        const label = inp.getAttribute('aria-label') || '';
        return label.toLowerCase().includes('url') || label.toLowerCase().includes('enlace');
      });
      if (urlInput) {
        urlInput.value = projectUrl;
        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
        urlInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, url);
  }

  await sleep(1000);

  // Click Save button
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
    throw new Error('Save button not found in project form');
  }

  await sleep(6000);

  const verification = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const successToast = text.includes('Save was successful') || text.includes('Guardado con éxito');
    return { successToast };
  });

  return {
    success: true,
    name,
    descriptionLength: description.length,
    verified: verification.successToast
  };
}
