# 🌐 LinkedIn Agent Toolkit (MCP + CLI)
> **Safe, Zero-Credential Model Context Protocol (MCP) Server & CLI for Autonomous AI Agents and Developers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Protocol%20Compliant-purple.svg)](https://modelcontextprotocol.io/)
[![Audited by](https://img.shields.io/badge/Audited%20by-AI%20Grand%20Council-gold.svg)](https://github.com/PabloIan92/ai-grand-council)

---

## 💡 The Problem

Every AI coding assistant (Claude Code, Google Antigravity, OpenCode, Codex, Cursor) struggles when asked to update or inspect LinkedIn:
1. **No Public API:** LinkedIn provides **zero public REST endpoints** to update personal profile sections (Headline, About, Projects, Experience).
2. **Aggressive Bot & Fingerprint Detection:** Stock headless browsers (Selenium, stock Puppeteer) trigger instant anti-bot checkpoints, CAPTCHAs, or account suspensions.
3. **Session & 2FA Invalidation:** Automated login scripts fail when challenged with two-factor SMS/email authentication.
4. **Obfuscated, Volatile DOM:** Profile editors use nested React/Ember microfrontends, `div[role="textbox"]`, dynamic modals, and multilingual tabs that cause AI scripts to waste hours guessing selectors.

---

## ⚡ The Solution

**`linkedin-agent-toolkit`** bridges AI agents directly to LinkedIn using the **Chrome DevTools Protocol (CDP)** attached to an authentic, user-controlled browser session:

```
┌────────────────────────────────────────────────────────┐
│  AI Agents (Claude Code, Antigravity, OpenCode, etc.) │
└───────────────────────────┬────────────────────────────┘
                            │ Model Context Protocol (stdio)
┌───────────────────────────▼────────────────────────────┐
│               linkedin-agent-toolkit (MCP)             │
│   (Tools: get_profile, update_headline, add_project)   │
├────────────────────────────────────────────────────────┤
│                 linkedin CLI Tool                      │
│   (Direct terminal commands: linkedin status, add...) │
└───────────────────────────┬────────────────────────────┘
                            │ Chrome DevTools Protocol (:9222)
┌───────────────────────────▼────────────────────────────┐
│      Google Chrome (Local authenticated session)       │
└────────────────────────────────────────────────────────┘
```

### 🔒 100% Zero-Credential Security (Audited by AI Grand Council)
* **No stored passwords or tokens:** Your credentials never leave your browser.
* **No scraping proxy dependencies:** Works entirely locally on your machine.
* **Ban-proof:** Uses your real browser fingerprint, real IP, and authentic cookies.
* **Non-destructive:** Disconnects cleanly (`browser.disconnect()`) without closing your browser windows.

---

## 🚀 Quickstart

### 1. Installation

Clone this repository and install dependencies:
```bash
git clone https://github.com/PabloIan92/linkedin-agent-toolkit.git
cd linkedin-agent-toolkit
npm install
npm link # (Optional: makes 'linkedin' and 'linkedin-mcp' available globally)
```

### 2. Launch the Chrome Bridge

Run the built-in launcher to start Chrome with remote debugging on port `9222`:
```bash
npm run start:browser
# Or via CLI:
node bin/cli.js start-browser
```
> *Note:* If it is your first time, simply log into LinkedIn in the opened Chrome window. That session remains saved locally in your isolated user profile directory.

### 3. Check Connection Status

Verify that the bridge is ready:
```bash
node bin/cli.js status
```
Output:
```json
{
  "connected": true,
  "cdpUrl": "http://127.0.0.1:9222",
  "hasLinkedInTab": true,
  "authenticated": true
}
```

---

## 🤖 MCP Server Setup for AI Agents

Add `linkedin-agent-toolkit` to your AI assistant configuration:

### For Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["<PATH_TO_LINKEDIN_AGENT_TOOLKIT>/bin/mcp-server.js"]
    }
  }
}
```

### For Antigravity / OpenCode (`mcp_config.json`)
```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["<PATH_TO_LINKEDIN_AGENT_TOOLKIT>/bin/mcp-server.js"]
    }
  }
}
```

---

## 🛠️ MCP Tools Reference

AI agents receive access to the following tools via JSON-RPC:

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `linkedin_status` | `cdpUrl?` | Diagnoses CDP connection and LinkedIn authentication status. |
| `linkedin_launch_browser` | `port?`, `userDataDir?` | Spawns dedicated Chrome browser with remote debugging port. |
| `linkedin_get_profile` | `profileUrl?` | Extracts profile data (Name, Headline, About, Projects, Experience). |
| `linkedin_update_headline` | `headline`, `language?` (`en`\|`es`) | Updates the professional headline, with multilingual tab support. |
| `linkedin_update_about` | `about`, `language?` (`en`\|`es`) | Updates the About / Summary section. |
| `linkedin_add_project` | `name`, `description?`, `url?` | Adds a project to the profile via canonical form routes. |
| `linkedin_add_experience` | `title`, `companyName`, `location?`, `description?` | Adds a job position / work experience item. |
| `linkedin_create_post` | `text`, `draftOnly?` | Publishes or drafts a status update in the feed. |
| `linkedin_screenshot` | `outputPath?`, `fullPage?` | Takes a screenshot for agent visual verification and debugging. |

---

## 💻 CLI Usage

You can also execute all commands directly from your terminal:

```bash
# Get profile overview
node bin/cli.js profile get

# Update headline in English
node bin/cli.js profile set-headline "Automation Specialist | APIs | n8n | Remote" --lang en

# Update headline in Spanish
node bin/cli.js profile set-headline "Especialista en Automatización | APIs | n8n | Remoto" --lang es

# Update About section
node bin/cli.js profile set-about "Automation specialist with expertise in cloud integrations..." --lang en

# Add a project
node bin/cli.js project add --name "Chatbot n8n + Chatwoot" --desc "Omnichannel bot for WhatsApp & Web" --url "https://github.com/..."

# Add work experience
node bin/cli.js experience add --title "Automation Developer" --company "Independent" --location "Remote" --desc "Built end-to-end API integrations."

# Draft a post for review
node bin/cli.js post "Excited to share our new open source LinkedIn Agent Toolkit!" --draft

# Capture page screenshot
node bin/cli.js screenshot --output ./screenshots/current_profile.png
```

---

## 🏛️ Audited by the AI Grand Council

This architecture was designed and vetted in session with the **AI Grand Council** ([`PabloIan92/ai-grand-council`](https://github.com/PabloIan92/ai-grand-council)):
* **Security Auditor:** Enforced strict credential isolation, local CDP attachment, and sanitized `.gitignore`.
* **Logician & Systems Engineer:** Created selector resiliency, verified toasts, and eliminated `browser.close()` process-killing hazards.
* **Protocol Architect:** Implemented official `@modelcontextprotocol/sdk` schemas and dual MCP/CLI capability.
* **Developer Experience Minimalist:** Reduced setup to a single command with auto-discovery.

---

## 📄 License

MIT © [Pablo Ian Laurino](https://github.com/PabloIan92)
