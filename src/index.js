#!/usr/bin/env node
// FallLink MCP · stdio server exposing FallLink signaling primitives to agents.
// MIT · AI-Native Solutions.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { encodeBundle, decodeBundle, DEFAULTS } from '@ai-native-solutions/falllink-sdk';

function randId(prefix = 'peer') {
  return prefix + '-' + Math.random().toString(36).slice(2, 10);
}

const server = new Server(
  { name: 'falllink-mcp', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

// ---- tools ----
const tools = [
  {
    name: 'mint_peer_id',
    description: 'Mint a fresh random peer ID with an optional prefix. Useful for agents brokering signaling between two nodes.',
    inputSchema: {
      type: 'object',
      properties: { prefix: { type: 'string', description: 'ID prefix, default "peer"' } }
    }
  },
  {
    name: 'encode_bundle',
    description: 'Base64-encode a FallLink signaling payload (offer or answer). Payload must include __fl:"offer"|"answer", from, peerId, sdp.',
    inputSchema: {
      type: 'object',
      required: ['payload'],
      properties: {
        payload: {
          type: 'object',
          description: 'Signaling payload to encode',
          properties: {
            __fl: { type: 'string', enum: ['offer', 'answer'] },
            from: { type: 'string' },
            peerId: { type: 'string' },
            sdp: { type: 'object' }
          }
        }
      }
    }
  },
  {
    name: 'decode_bundle',
    description: 'Decode a base64 FallLink offer/answer bundle back into its JSON payload.',
    inputSchema: {
      type: 'object',
      required: ['bundle'],
      properties: {
        bundle: { type: 'string', description: 'Base64 bundle string as produced by createOffer/acceptOffer' }
      }
    }
  },
  {
    name: 'inspect_bundle',
    description: 'Peek at a bundle without exposing full SDP — returns kind (offer|answer), from, peerId, sdp.type, and byte size.',
    inputSchema: {
      type: 'object',
      required: ['bundle'],
      properties: {
        bundle: { type: 'string' }
      }
    }
  },
  {
    name: 'get_defaults',
    description: 'Return the FallLink default STUN server list and default signal channel name.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'usage_snippet',
    description: 'Return a copy-paste browser code snippet showing how to instantiate FallLink, start discovery, and broadcast.',
    inputSchema: {
      type: 'object',
      properties: {
        ownId: { type: 'string', description: 'Own peer ID to embed in the snippet' }
      }
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    if (name === 'mint_peer_id') {
      const id = randId(args.prefix || 'peer');
      return { content: [{ type: 'text', text: id }] };
    }
    if (name === 'encode_bundle') {
      if (!args.payload || typeof args.payload !== 'object') throw new Error('payload required');
      const bundle = encodeBundle(args.payload);
      return { content: [{ type: 'text', text: bundle }] };
    }
    if (name === 'decode_bundle') {
      if (!args.bundle) throw new Error('bundle required');
      const payload = decodeBundle(args.bundle);
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    }
    if (name === 'inspect_bundle') {
      if (!args.bundle) throw new Error('bundle required');
      const payload = decodeBundle(args.bundle);
      const summary = {
        kind: payload.__fl,
        from: payload.from,
        peerId: payload.peerId,
        sdpType: payload.sdp && payload.sdp.type,
        byteSize: args.bundle.length
      };
      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    }
    if (name === 'get_defaults') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ stunServers: DEFAULTS.STUN, signalChannel: DEFAULTS.SIGNAL_CHANNEL }, null, 2)
        }]
      };
    }
    if (name === 'usage_snippet') {
      const ownId = args.ownId || 'my-node';
      const snippet =
`import { FallLink } from '@ai-native-solutions/falllink-sdk';

const link = new FallLink({ ownId: '${ownId}' });
link.startBroadcast();
link.on('peer',    ({ peerId })       => console.log('peer up', peerId));
link.on('message', ({ peerId, data }) => console.log(peerId, data));
link.broadcast({ type: 'hello', from: '${ownId}' });`;
      return { content: [{ type: 'text', text: snippet }] };
    }
    throw new Error('Unknown tool: ' + name);
  } catch (e) {
    return { isError: true, content: [{ type: 'text', text: 'Error: ' + e.message }] };
  }
});

// ---- resources ----
const resources = [
  { uri: 'falllink://defaults',    name: 'FallLink defaults',    mimeType: 'application/json', description: 'Default STUN + signal channel.' },
  { uri: 'falllink://api-surface', name: 'FallLink API surface', mimeType: 'text/markdown',    description: 'Full method + event surface.' }
];

server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources }));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const { uri } = req.params;
  if (uri === 'falllink://defaults') {
    return {
      contents: [{
        uri, mimeType: 'application/json',
        text: JSON.stringify({ stunServers: DEFAULTS.STUN, signalChannel: DEFAULTS.SIGNAL_CHANNEL }, null, 2)
      }]
    };
  }
  if (uri === 'falllink://api-surface') {
    const md =
`# FallLink API surface

## discovery
- \`link.startBroadcast()\` — same-origin auto-discovery via BroadcastChannel
- \`link.stopBroadcast()\`

## manual signaling (cross-network paste)
- \`await link.createOffer()\` → \`{ bundle, peerId, wrapper }\`
- \`await link.acceptOffer(offerBundle)\` → \`{ bundle, peerId, wrapper }\`
- \`await link.acceptAnswer(answerBundle)\`

## direct control
- \`await link.connect(peerId, offer?)\`
- \`link.broadcast(msg)\` — returns number of peers reached
- \`link.getPeers()\` — array of peer snapshots
- \`await link.ping(peerId)\` — latency in ms
- \`link.destroy()\`

## events
- \`peer\`, \`message\`, \`disconnect\`, \`latency\`, \`broadcast\`, \`error\`

## bundle format
Base64-encoded JSON: \`{ __fl: 'offer'|'answer', from, peerId, sdp }\`.
`;
    return { contents: [{ uri, mimeType: 'text/markdown', text: md }] };
  }
  throw new Error('Unknown resource: ' + uri);
});

// ---- start ----
const transport = new StdioServerTransport();
await server.connect(transport);
