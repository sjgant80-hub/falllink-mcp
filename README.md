# @ai-native-solutions/falllink-mcp

Model Context Protocol server (stdio) wrapping the [FallLink SDK](https://github.com/sjgant80-hub/falllink-sdk). Exposes signaling primitives so agents can broker WebRTC handshakes without a browser session.

## Tools

| Tool | Purpose |
|---|---|
| `mint_peer_id` | Fresh random peer ID (`peer-abc12345`) with optional prefix. |
| `encode_bundle` | Base64-encode a signaling payload (`{ __fl, from, peerId, sdp }`). |
| `decode_bundle` | Decode a base64 bundle back to JSON. |
| `inspect_bundle` | Peek: kind, from, peerId, sdp.type, byte size (no full SDP dump). |
| `get_defaults` | Default STUN servers + signal channel name. |
| `usage_snippet` | Copy-paste browser snippet for a given peer ID. |

## Resources

- `falllink://defaults` — default STUN + signal channel as JSON
- `falllink://api-surface` — the full FallLink method + event surface as markdown

## Install

```bash
npm install -g @ai-native-solutions/falllink-mcp
```

## Wire into Claude Code

```bash
claude mcp add falllink -- npx -y @ai-native-solutions/falllink-mcp
```

Or point directly at a checked-out repo:

```bash
claude mcp add falllink -- node /path/to/falllink-mcp/src/index.js
```

## Wire into Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "falllink": {
      "command": "npx",
      "args": ["-y", "@ai-native-solutions/falllink-mcp"]
    }
  }
}
```

Restart Claude Desktop after editing.

## Smoke test

```bash
npm test
```

## Companion packages

- [`@ai-native-solutions/falllink-sdk`](https://github.com/sjgant80-hub/falllink-sdk) — the underlying WebRTC library
- [`@ai-native-solutions/falllink-api`](https://github.com/sjgant80-hub/falllink-api) — HTTP wrapper

## License

MIT · AI-Native Solutions · 2026.
