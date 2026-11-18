# Intentrax skills & plugin marketplace

Coding-agent knowledge and tools for building applications that use
[Intentrax](https://www.intentrax.com) execution assurance: signed, offline-
verifiable proof records of what an autonomous agent was admitted to do.

This repository is both a **skill source** (portable `SKILL.md` folders) and a
**Claude Code plugin marketplace**. Everything here describes the public
Intentrax API surface only — no engine internals and no signing material.

## Install in Claude Code

```
/plugin install intentrax-execution-assurance --marketplace Intentrax/intentrax-skills
/plugin install intentrax-mcp --marketplace Intentrax/intentrax-skills
```

(On Claude Code before 2.1.275: `/plugin marketplace add Intentrax/intentrax-skills`,
then `/plugin install intentrax-execution-assurance@intentrax` and
`/plugin install intentrax-mcp@intentrax`.)

This marketplace has two plugins:

- **`intentrax-execution-assurance`** — three skills:
  `intentrax-execution-assurance` (when and why),
  `intentrax-integrate-agent-actions` (find consequential agent actions and
  wire admit → execute → verify after you approve a plan, or write a
  report-only gap assessment), and `intentrax-verify-proof` (read-only proof
  checks, honestly reported). Instructions only; it runs nothing.
- **`intentrax-mcp`** (optional, Claude Code) — the read-only MCP server
  `intentrax-readonly`, bundled as readable JavaScript (identical to
  [`@intentrax/mcp-server`](https://www.npmjs.com/package/@intentrax/mcp-server)
  0.1.1): keyless public proof verification, plus an optional tenant-scoped
  proof read. It never executes, admits, signs, or writes. Claude Code asks
  for a read-only tenant key and tenant ID as plugin options and stores the
  key in your system credential store. **Never put a key in a committed file.**

## Use the skills in other agents

The skills follow the open [Agent Skills](https://agentskills.io/specification)
format. Copy a folder from `plugins/intentrax/skills/` into the skills
directory your agent reads (for example `.agents/skills/`, `.claude/skills/`,
`.cursor/skills/`, or `.github/skills/`).

## Use the MCP server in other hosts

Pin the version; never commit a key.

```json
{
  "mcpServers": {
    "intentrax-readonly": {
      "command": "npx",
      "args": ["-y", "@intentrax/mcp-server@0.1.1"]
    }
  }
}
```

Per-host files and formats (VS Code `servers` + `inputs`, Zed
`context_servers`, Codex TOML, and others) are in the
[`@intentrax/mcp-server` README](https://www.npmjs.com/package/@intentrax/mcp-server).

## Layout

```
.claude-plugin/marketplace.json              # marketplace catalog (two plugins)
plugins/intentrax/                           # intentrax-execution-assurance (skills only)
  .claude-plugin/plugin.json, icon.png
  README.md, LICENSE
  skills/<name>/SKILL.md
plugins/intentrax-mcp/                       # intentrax-mcp (read-only MCP server)
  .claude-plugin/plugin.json, icon.png       # userConfig + bundled server
  README.md, LICENSE                         # what it runs, sends, and fetches
  server/intentrax-mcp-server.mjs            # readable bundle
```

## Related

- SDK and CLI: [`@intentrax/sdk`](https://www.npmjs.com/package/@intentrax/sdk)
- Public verifier: https://verify.intentrax.com
- Developer docs: https://www.intentrax.com/developers

## License

Apache-2.0.
