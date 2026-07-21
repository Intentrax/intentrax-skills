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

## Use with Cursor, Kiro, Codex, or any MCP host

The command is `npx -y @intentrax/mcp-server` everywhere — only the config file
and (for Codex) the format differ. **Never commit a key**; the tenant tool reads
`INTENTRAX_MCP_API_KEY` / `INTENTRAX_MCP_TENANT_ID` from your environment, and the
public verify tool needs none. Full per-host details are in the
[`@intentrax/mcp-server` README](https://www.npmjs.com/package/@intentrax/mcp-server).

**Cursor** (`.cursor/mcp.json`) and **Kiro** (`.kiro/settings/mcp.json`) use the
JSON `mcpServers` shape:

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

**Codex** (`~/.codex/config.toml`) uses TOML with `env_vars` passthrough:

```toml
[mcp_servers.intentrax-readonly]
command = "npx"
args = ["-y", "@intentrax/mcp-server"]
env_vars = ["INTENTRAX_MCP_API_KEY", "INTENTRAX_MCP_TENANT_ID"]
```

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
