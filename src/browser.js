import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { DEFAULT_CDP_URL, DEFAULT_CDP_PORT, DEFAULT_USER_DATA_DIR, getChromeExecutablePath } from './config.js';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect to an already running Chrome instance via CDP.
 * Never closes the browser; always disconnects cleanly.
 */
export async function connectBrowser(options = {}) {
  const cdpUrl = options.cdpUrl || DEFAULT_CDP_URL;

  try {
    const browser = await puppeteer.connect({
      browserURL: cdpUrl,
      defaultViewport: null
    });

    const pages = await browser.pages();
    let page = pages.find((p) => {
      const url = p.url() || '';
      return url.includes('linkedin.com');
    });

    if (!page) {
      if (pages.length > 0) {
        page = pages[0];
      } else {
        page = await browser.newPage();
      }
    }

    return { browser, page };
  } catch (err) {
    throw new Error(
      `Failed to connect to Chrome at ${cdpUrl}.\n` +
      `Ensure Chrome is running with remote debugging enabled.\n` +
      `You can start it with: 'linkedin start-browser' or by launching Chrome with flag: --remote-debugging-port=${DEFAULT_CDP_PORT}\n` +
      `Details: ${err.message}`
    );
  }
}

/**
 * Safely disconnects the Puppeteer controller without closing the user's browser.
 */
export async function disconnectBrowser(browser) {
  if (!browser) return;
  try {
    await browser.disconnect();
  } catch {
    // Ignore already disconnected errors
  }
}

/**
 * Spawns a dedicated Chrome instance with remote debugging enabled and an isolated profile.
 */
export async function launchChrome(options = {}) {
  const port = options.port || DEFAULT_CDP_PORT;
  const userDataDir = options.userDataDir || DEFAULT_USER_DATA_DIR;
  const chromePath = options.chromePath || getChromeExecutablePath();

  if (!chromePath) {
    throw new Error(
      'Could not automatically locate Google Chrome on this machine.\n' +
      'Please specify the Chrome executable path via CHROME_PATH environment variable.'
    );
  }

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://www.linkedin.com'
  ];

  const child = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore'
  });

  child.unref();

  // Wait a moment for Chrome to start listening
  for (let i = 0; i < 15; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        return { success: true, port, userDataDir, chromePath };
      }
    } catch {
      // Continue polling until timeout
    }
  }

  return { success: true, port, userDataDir, chromePath, note: 'Process launched; verifying listener...' };
}

/**
 * Checks connection and authentication status with LinkedIn.
 */
export async function checkStatus(options = {}) {
  const cdpUrl = options.cdpUrl || DEFAULT_CDP_URL;

  let browser;
  try {
    const conn = await connectBrowser({ cdpUrl });
    browser = conn.browser;
    const page = conn.page;

    const currentUrl = page.url() || '';
    const hasLinkedIn = currentUrl.includes('linkedin.com');

    let isAuthenticated = false;
    let userDetails = null;

    if (hasLinkedIn) {
      isAuthenticated = await page.evaluate(() => {
        // Authenticated users have the main global navigation bar or feed search
        const nav = document.querySelector('.global-nav') || 
                    document.querySelector('#global-nav') || 
                    document.querySelector('header.nav') ||
                    document.querySelector('button[aria-label*="Me"]') ||
                    document.querySelector('img[alt*="photo"]');
        return Boolean(nav);
      });

      if (isAuthenticated) {
        userDetails = await page.evaluate(() => {
          const profileLink = document.querySelector('a[href*="/in/"]');
          const meBtn = document.querySelector('button[aria-label*="Me"]');
          return {
            detectedProfileHref: profileLink ? profileLink.getAttribute('href') : null,
            meButtonText: meBtn ? meBtn.innerText.replace(/\n/g, ' ').trim() : null
          };
        });
      }
    }

    await disconnectBrowser(browser);

    return {
      connected: true,
      cdpUrl,
      currentUrl,
      hasLinkedInTab: hasLinkedIn,
      authenticated: isAuthenticated,
      userDetails
    };
  } catch (err) {
    if (browser) await disconnectBrowser(browser);
    return {
      connected: false,
      cdpUrl,
      error: err.message
    };
  }
}
