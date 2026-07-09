#!/usr/bin/env node
// falllink-mcp · MCP stdio server wrapping falllink-sdk · MIT · AI-Native Solutions
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({ name: 'falllink-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'falllink_log',
    description: 'log · from falllink-sdk',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const { log } = await import('@ai-native-solutions/falllink-sdk');
      return typeof log === 'function' ? await log(args) : { error: 'log not callable' };
    }
  },
  {
    name: 'falllink_escape_html',
    description: 'escapeHtml · from falllink-sdk',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const { escapeHtml } = await import('@ai-native-solutions/falllink-sdk');
      return typeof escapeHtml === 'function' ? await escapeHtml(args) : { error: 'escapeHtml not callable' };
    }
  },
  {
    name: 'falllink_short_id',
    description: 'shortId · from falllink-sdk',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const { shortId } = await import('@ai-native-solutions/falllink-sdk');
      return typeof shortId === 'function' ? await shortId(args) : { error: 'shortId not callable' };
    }
  },
  {
    name: 'falllink_render_all',
    description: 'renderAll · from falllink-sdk',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const { renderAll } = await import('@ai-native-solutions/falllink-sdk');
      return typeof renderAll === 'function' ? await renderAll(args) : { error: 'renderAll not callable' };
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ handler, ...rest }) => rest)
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const t = TOOLS.find(x => x.name === req.params.name);
  if (!t) throw new Error('unknown tool: ' + req.params.name);
  const result = await t.handler(req.params.arguments || {});
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});

await server.connect(new StdioServerTransport());
console.error('falllink-mcp v1.0.0 · stdio ready');
