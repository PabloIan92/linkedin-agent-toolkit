import { sleep } from '../browser.js';

/**
 * Creates or drafts a post on the user's LinkedIn feed.
 */
export async function createPost(page, { text, draftOnly = false }) {
  if (!text || !text.trim()) {
    throw new Error('Post content cannot be empty');
  }

  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);

  // Click "Start a post"
  const clicked = await page.evaluate(() => {
    const trigger = document.querySelector('button.share-box-feed-entry__trigger') ||
                    document.querySelector('button[aria-label*="Start a post"]') ||
                    document.querySelector('button[aria-label*="Crear publicación"]') ||
                    Array.from(document.querySelectorAll('button')).find((b) => {
                      const t = (b.innerText || '').toLowerCase();
                      return t.includes('start a post') || t.includes('crear publicación');
                    });

    if (trigger) {
      trigger.click();
      return true;
    }
    return false;
  });

  if (!clicked) {
    throw new Error('Could not find "Start a post" button on feed page');
  }

  await sleep(3000);

  // Type into the post editor
  const typed = await page.evaluate((content) => {
    const editor = document.querySelector('div.editor-content div[role="textbox"]') ||
                   document.querySelector('div.ql-editor') ||
                   document.querySelector('div[role="textbox"][aria-label*="What do you want to talk about"]') ||
                   document.querySelector('div[role="textbox"][aria-label*="De qué quieres hablar"]');

    if (!editor) return { success: false, error: 'Post text editor not found' };

    editor.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, content);
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    return { success: true };
  }, text);

  if (!typed.success) {
    throw new Error(typed.error);
  }

  await sleep(1500);

  if (draftOnly) {
    return {
      success: true,
      draftOnly: true,
      message: 'Post text typed into editor. Kept open for human review.'
    };
  }

  // Click Post
  const posted = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').trim().toLowerCase();
      return t === 'post' || t === 'publicar';
    });
    const postBtn = buttons.find((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !b.disabled;
    });

    if (postBtn) {
      postBtn.click();
      return true;
    }
    return false;
  });

  if (!posted) {
    throw new Error('Post button was not clickable or disabled');
  }

  await sleep(5000);

  return {
    success: true,
    published: true,
    textLength: text.length
  };
}
