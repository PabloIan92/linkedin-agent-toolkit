import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1584px;
      height: 396px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #090d16;
      position: relative;
      color: #ffffff;
    }
    
    /* Background grid and ambient glow */
    .bg-canvas {
      position: absolute;
      inset: 0;
      background: 
        radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.18) 0%, transparent 50%),
        radial-gradient(circle at 45% 85%, rgba(99, 102, 241, 0.15) 0%, transparent 55%),
        radial-gradient(circle at 10% 30%, rgba(16, 185, 129, 0.12) 0%, transparent 45%);
    }

    .grid-lines {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: radial-gradient(ellipse at 60% 50%, black 40%, transparent 85%);
    }

    /* Container leaving avatar zone clean on left */
    .content-wrapper {
      position: relative;
      z-index: 10;
      height: 100%;
      padding-left: 360px; /* Safe margin for avatar */
      padding-right: 80px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .title-group h1 {
      font-size: 46px;
      font-weight: 800;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.1;
    }

    .title-group h2 {
      font-size: 22px;
      font-weight: 600;
      color: #38bdf8;
      letter-spacing: 0.02em;
      margin-top: 4px;
      text-transform: uppercase;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      padding: 8px 18px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
      color: #34d399;
      backdrop-filter: blur(8px);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
    }

    .divider {
      height: 1px;
      width: 100%;
      background: linear-gradient(90deg, rgba(56, 189, 248, 0.4) 0%, rgba(255, 255, 255, 0.05) 100%);
      margin: 18px 0;
    }

    /* Tech Stack Badges Grid */
    .stack-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .stack-pill {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 16px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(12px);
    }

    .stack-pill span.icon {
      font-size: 16px;
    }

    .highlight-pill {
      border-color: rgba(56, 189, 248, 0.35);
      background: rgba(14, 165, 233, 0.12);
      color: #bae6fd;
    }

    /* Footer info */
    .footer-tags {
      margin-top: 14px;
      display: flex;
      gap: 20px;
      font-size: 13px;
      color: #94a3b8;
      font-weight: 500;
    }

    .footer-tags span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  </style>
</head>
<body>
  <div class="bg-canvas"></div>
  <div class="grid-lines"></div>

  <div class="content-wrapper">
    <div class="header-row">
      <div class="title-group">
        <h1>Pablo Ian Laurino</h1>
        <h2>Process Automation & Systems Integration</h2>
      </div>
      <div class="status-badge">
        <div class="status-dot"></div>
        Available for Remote Roles Worldwide
      </div>
    </div>

    <div class="divider"></div>

    <div class="stack-grid">
      <div class="stack-pill highlight-pill">
        <span class="icon">⚡</span> n8n Workflows
      </div>
      <div class="stack-pill highlight-pill">
        <span class="icon">🔌</span> REST APIs & Webhooks
      </div>
      <div class="stack-pill highlight-pill">
        <span class="icon">📊</span> Google Apps Script & Sheets
      </div>
      <div class="stack-pill">
        <span class="icon">💬</span> Chatwoot & Omnichannel Bots
      </div>
      <div class="stack-pill">
        <span class="icon">📡</span> MikroTik & Ubiquiti UniFi
      </div>
      <div class="stack-pill">
        <span class="icon">🤖</span> AI Model Evaluation
      </div>
    </div>

    <div class="footer-tags">
      <span>📍 Rosario, Argentina</span>
      <span>•</span>
      <span>🌐 100% Remote Specialist</span>
      <span>•</span>
      <span>🗣️ Advanced English (C1)</span>
      <span>•</span>
      <span>💼 Tier 2/3 ISP & Network Infrastructure</span>
    </div>
  </div>
</body>
</html>
`;

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1584, height: 396, deviceScaleFactor: 2 });
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const outputPath = 'C:\\Users\\CONECTIA BA\\projects\\linkedin-agent-toolkit\\linkedin_banner.png';
  await page.screenshot({ path: outputPath, type: 'png' });
  console.log('High-resolution banner created at:', outputPath);
  await browser.close();
}

main().catch(console.error);
