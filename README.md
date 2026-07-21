# Intentrax skills & plugin marketplace

Coding-agent knowledge and tools for building applications that use
[Intentrax](https://www.intentrax.com) execution assurance — cryptographic,
third-party-verifiable proof of what an autonomous agent actually did.

This repository is both a **skill source** and a **Claude Code plugin
marketplace**. Everything here describes the public Intentrax API surface only —
no engine internals or signing material.

## Install with Claude Code

```
/plugin marketplace add Adelodun-Adejare/intentrax-skills
/plugin install intentrax-execution-assurance@intentrax
```

Installing the plugin gives your agent:

- the **execution-assurance skill** — when proof-of-execution is worth adding and
  how to instrument admission → execution → verification, and
- the **read-only MCP server** `intentrax-readonly` (via
  [`@intentrax/mcp-server`](https://www.npmjs.com/package/@intentrax/mcp-server)) —
  two safe tools to verify a public proof and read a tenant-scoped proof.

To enable the tenant-scoped read tool, set `INTENTRAX_MCP_API_KEY` and
`INTENTRAX_MCP_TENANT_ID` in your environment. The public verification tool needs
no credentials. **Never put a key in a committed file.**

## Use with Cursor, VS Code, Windsurf, Gemini CLI, Qwen Code, Zed, Codex, or any MCP host

The command is `npx -y @intentrax/mcp-server` everywhere — only the config file
and (for a few hosts) the format differ. **Never commit a key**; the tenant tool
reads `INTENTRAX_MCP_API_KEY` / `INTENTRAX_MCP_TENANT_ID` from your environment,
and the public verify tool needs none.

Most hosts take the same `mcpServers` JSON block — only the file location differs:

```json
{
  "mcpServers": {
    "intentrax-readonly": {
      "command": "npx",
      "args": ["-y", "@intentrax/mcp-server"],
      "env": {
        "INTENTRAX_MCP_API_KEY": "${INTENTRAX_MCP_API_KEY}",
        "INTENTRAX_MCP_TENANT_ID": "${INTENTRAX_MCP_TENANT_ID}"
      }
    }
  }
}
```

| Host | Config file |
| --- | --- |
| Claude Desktop | mac `~/Library/Application Support/Claude/claude_desktop_config.json` · Win `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` |
| Kiro | `.kiro/settings/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Gemini CLI | `~/.gemini/settings.json` |
| Qwen Code | `~/.qwen/settings.json` |

A few hosts use a different key or format — **VS Code** (`servers` + `inputs` in
`.vscode/mcp.json`), **Zed** (`context_servers`), **Codex** (TOML in
`~/.codex/config.toml`), and **AgentScope** (registered in Python code). Full
per-host blocks are in the
[`@intentrax/mcp-server` README](https://www.npmjs.com/package/@intentrax/mcp-server).

## Layout

```
.claude-plugin/marketplace.json          # marketplace catalog
plugins/intentrax/
  .claude-plugin/plugin.json             # plugin manifest (bundles the MCP server)
  skills/execution-assurance/SKILL.md    # the skill
```

## Related

- SDK: [`@intentrax/sdk`](https://www.npmjs.com/package/@intentrax/sdk)
- Public verifier: https://verify.intentrax.com
- Developer docs: https://www.intentrax.com/developers

## License

Apache-2.0.
