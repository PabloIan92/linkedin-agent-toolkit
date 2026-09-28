import { sleep } from '../browser.js';

/**
 * Extracts profile summary and details.
 */
export async function getProfileSummary(page, profileUrl = null) {
  if (profileUrl) {
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
  } else {
    const currentUrl = page.url() || '';
    if (!currentUrl.includes('/in/')) {
      // Navigate to /in/me/
      await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(4000);
    }
  }

  const profileData = await page.evaluate(() => {
    // Expand "see more" if present
    const seeMoreButtons = Array.from(document.querySelectorAll('button, a')).filter((el) => {
      const txt = (el.innerText || '').trim().toLowerCase();
      return txt === 'see more' || txt === 'ver más';
    });
    for (const b of seeMoreButtons) {
      try { b.click(); } catch {}
    }

    let name = document.querySelector('h1')?.innerText?.trim() || '';
    if (!name && document.title.includes('|')) {
      name = document.title.split('|')[0].trim();
    }
    
    // Headline
    let headline = document.querySelector('.text-body-medium')?.innerText?.trim() || '';
    if (!headline) {
      const editBtn = document.querySelector('button[aria-label*="Edit profile"], a[aria-label*="Edit profile"], button[aria-label*="Edit intro"]');
      const introCard = editBtn?.closest('section, div') || document.body;
      const textLines = (introCard.innerText || '').split('\n').map(l => l.trim()).filter(Boolean);
      const nameIdx = textLines.findIndex(l => l.toLowerCase() === name.toLowerCase());
      if (nameIdx >= 0) {
        let nextIdx = nameIdx + 1;
        while (textLines[nextIdx] && textLines[nextIdx].toLowerCase().includes('verify')) {
          nextIdx++;
        }
        headline = textLines[nextIdx] || '';
      }
    }
    
    // Location
    let location = document.querySelector('.text-body-small.inline.t-black--light')?.innerText?.trim() || '';

    // About section
    let about = '';
    const aboutSection = document.querySelector('#about')?.closest('section');
    if (aboutSection) {
      about = aboutSection.innerText.replace(/^About\s+/i, '').replace(/^Acerca de\s+/i, '').trim();
    }

    // Projects summary
    const projects = [];
    const projectSection = document.querySelector('#projects')?.closest('section');
    if (projectSection) {
      const items = projectSection.querySelectorAll('li');
      items.forEach((item) => {
        const title = item.querySelector('.t-bold span')?.innerText?.trim();
        const desc = item.querySelector('.inline-show-more-text')?.innerText?.trim();
        if (title) {
          projects.push({ title, description: desc || '' });
        }
      });
    }

    // Experience summary
    const experience = [];
    const expSection = document.querySelector('#experience')?.closest('section');
    if (expSection) {
      const items = expSection.querySelectorAll('li');
      items.forEach((item) => {
        const title = item.querySelector('.t-bold span')?.innerText?.trim();
        const company = item.querySelector('.t-normal span')?.innerText?.trim();
        if (title) {
          experience.push({ title, company: company || '' });
        }
      });
    }

    return {
      url: window.location.href,
      name,
      headline,
      location,
      about,
      projects,
      experience
    };
  });

  return profileData;
}

/**
 * Updates user headline. Supports specifying language tabs ('en' or 'es').
 */
export async function updateHeadline(page, { headline, language = 'en', profileUrl = null }) {
  if (!headline || !headline.trim()) {
    throw new Error('Headline text cannot be empty');
  }

  if (profileUrl) {
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
  }

  // Click "Edit profile" pencil button
  const opened = await page.evaluate(() => {
    const editBtn = document.querySelector('a[aria-label="Edit profile"]') ||
                    document.querySelector('button[aria-label="Edit profile"]') ||
                    document.querySelector('a[aria-label*="Edit intro"]') ||
                    document.querySelector('button[aria-label*="Edit intro"]') ||
                    document.querySelector('a[href*="/edit/forms/intro/"]');
    if (editBtn) {
      editBtn.click();
      return true;
    }
    return false;
  });

  if (!opened) {
    // Direct form fallback
    const current = page.url();
    if (current.includes('/in/')) {
      const base = current.split('?')[0].replace(/\/+$/, '');
      await page.goto(`${base}/edit/forms/intro/new/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
  }

  await sleep(4000);

  // Switch language tab if requested
  if (language) {
    await page.evaluate((lang) => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const targetLang = lang.toLowerCase();
      let targetTab = null;

      if (targetLang === 'en') {
        targetTab = tabs.find((b) => (b.innerText || '').toLowerCase().includes('english'));
      } else if (targetLang === 'es') {
        targetTab = tabs.find((b) => (b.innerText || '').toLowerCase().includes('español') || 
                                      (b.innerText || '').toLowerCase().includes('spanish'));
      }

      if (targetTab) targetTab.click();
    }, language);
    await sleep(2000);
  }

  // Find Headline editor
  const editorFound = await page.evaluate((newHeadline) => {
    // The headline field is a div[role="textbox"] or textarea beneath the Headline label
    const textboxes = Array.from(document.querySelectorAll('div[role="textbox"], textarea'));
    
    // Check for element with label "Headline" or "Titular"
    let target = textboxes.find((el) => {
      const label = el.getAttribute('aria-label') || '';
      return label.toLowerCase().includes('headline') || label.toLowerCase().includes('titular');
    });

    if (!target) {
      // Find the label text on page
      const labels = Array.from(document.querySelectorAll('label, span, div'));
      const hLabel = labels.find((l) => {
        const t = (l.innerText || '').trim().toLowerCase();
        return t === 'headline' || t === 'titular';
      });
      if (hLabel) {
        // Nearest textbox inside parent container
        const container = hLabel.closest('div[class*="form"], div[class*="field"], .artdeco-text-input--container') || hLabel.parentElement;
        target = container?.querySelector('div[role="textbox"], textarea, input[type="text"]');
      }
    }

    if (!target) {
      // Fallback: the large textbox that is not name (name is short input)
      target = textboxes.find((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 250 && r.height >= 40;
      });
    }

    if (!target) return { success: false, error: 'Headline input element not found in modal' };

    target.focus();
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
      target.value = newHeadline;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, newHeadline);
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return { success: true };
  }, headline);

  if (!editorFound.success) {
    throw new Error(editorFound.error);
  }

  await sleep(1500);

  // Click Save
  const saved = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((b) => {
      const text = (b.innerText || '').trim().toLowerCase();
      return text === 'save' || text === 'guardar';
    });
    const visibleBtn = buttons.find((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    if (visibleBtn) {
      visibleBtn.click();
      return true;
    }
    return false;
  });

  if (!saved) {
    throw new Error('Could not find visible Save button in modal');
  }

  await sleep(5000);

  return {
    success: true,
    headline,
    language
  };
}

/**
 * Updates user About / Summary section.
 */
export async function updateAbout(page, { about, language = 'en', profileUrl = null }) {
  if (!about || !about.trim()) {
    throw new Error('About text cannot be empty');
  }

  if (profileUrl) {
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
  }

  // Click "Edit about" pencil
  const opened = await page.evaluate(() => {
    const editBtn = document.querySelector('a[aria-label="Edit about"]') ||
                    document.querySelector('button[aria-label="Edit about"]') ||
                    document.querySelector('a[aria-label*="Edit summary"]') ||
                    document.querySelector('button[aria-label*="Edit summary"]') ||
                    document.querySelector('a[href*="/edit/forms/summary/"]');
    if (editBtn) {
      editBtn.click();
      return true;
    }
    return false;
  });

  if (!opened) {
    const current = page.url();
    if (current.includes('/in/')) {
      const base = current.split('?')[0].replace(/\/+$/, '');
      await page.goto(`${base}/edit/forms/summary/new/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
  }

  await sleep(4000);

  // Switch language tab if present
  if (language) {
    await page.evaluate((lang) => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const targetLang = lang.toLowerCase();
      let targetTab = null;

      if (targetLang === 'en') {
        targetTab = tabs.find((b) => (b.innerText || '').toLowerCase().includes('english'));
      } else if (targetLang === 'es') {
        targetTab = tabs.find((b) => (b.innerText || '').toLowerCase().includes('español') || 
                                      (b.innerText || '').toLowerCase().includes('spanish'));
      }

      if (targetTab) targetTab.click();
    }, language);
    await sleep(2000);
  }

  // Locate About textarea or div[role="textbox"]
  const editorFound = await page.evaluate((newAbout) => {
    const editors = Array.from(document.querySelectorAll('textarea, div[role="textbox"]')).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 250 && r.height > 60;
    });

    if (!editors.length) return { success: false, error: 'About textarea not found in modal' };

    const target = editors[0];
    target.focus();

    if (target.tagName === 'TEXTAREA') {
      target.value = newAbout;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, newAbout);
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return { success: true };
  }, about);

  if (!editorFound.success) {
    throw new Error(editorFound.error);
  }

  await sleep(1500);

  // Click Save
  const saved = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((b) => {
      const text = (b.innerText || '').trim().toLowerCase();
      return text === 'save' || text === 'guardar';
    });
    const visibleBtn = buttons.find((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    if (visibleBtn) {
      visibleBtn.click();
      return true;
    }
    return false;
  });

  if (!saved) {
    throw new Error('Could not find visible Save button in About modal');
  }

  await sleep(5000);

  return {
    success: true,
    length: about.length,
    language
  };
}
