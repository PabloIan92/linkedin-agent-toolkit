import fs from 'node:fs';
import path from 'node:path';

/**
 * Captures a screenshot of the current page for agent visual verification.
 */
export async function takeScreenshot(page, { outputPath = null, fullPage = false } = {}) {
  const targetPath = outputPath || path.join(process.cwd(), 'screenshots', `linkedin-${Date.now()}.png`);
  
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const buffer = await page.screenshot({ path: targetPath, fullPage });
  const base64 = buffer.toString('base64');

  return {
    savedPath: targetPath,
    fullPage,
    base64Data: `data:image/png;base64,${base64}`
  };
}
