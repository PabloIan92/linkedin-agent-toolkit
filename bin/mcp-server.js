#!/usr/bin/env node

import { runMcpServer } from '../src/mcp-server.js';

runMcpServer().catch((err) => {
  console.error('Fatal MCP Server Error:', err);
  process.exit(1);
});
