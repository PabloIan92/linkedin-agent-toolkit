import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export const DEFAULT_CDP_PORT = parseInt(process.env.LINKEDIN_CDP_PORT || '9222', 10);
export const DEFAULT_CDP_URL = process.env.LINKEDIN_CDP_URL || `http://127.0.0.1:${DEFAULT_CDP_PORT}`;

const existingProfile = 'C:\\puppeteer-work\\chrome-temp-default';
export const DEFAULT_USER_DATA_DIR = process.env.LINKEDIN_CHROME_DATA_DIR || 
  (fs.existsSync(existingProfile) ? existingProfile : path.join(os.homedir(), '.linkedin-agent-chrome-profile'));

/**
 * Detect the default Chrome executable path based on current operating system.
 */
export function getChromeExecutablePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const platform = os.platform();

  if (platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } else if (platform === 'darwin') {
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(macPath)) return macPath;
  } else {
    const linuxCandidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];
    for (const c of linuxCandidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  return null;
}
