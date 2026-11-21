# Intentrax skills & plugin marketplace

Coding-agent knowledge and tools for building applications that use
[Intentrax](https://www.intentrax.com) execution assurance: signed, offline-
verifiable proof records of what an autonomous agent was admitted to do.

This repository is both a **skill source** (portable `SKILL.md` folders) and a
**Claude Code plugin marketplace**. Everything here describes the public
Intentrax API surface only — no engine internals and no signing material.

## Try it first, no key

```
npx @intentrax/sdk sandbox --scenario contradicted
```

The local assurance sandbox (SDK 1.7.0+) runs one action through a signed
decision, the executor's report, an independent read-only outcome check, and
offline verification, with no key, no account and no network. In this
scenario the action is allowed and reports success, but the outcome check
shows nothing changed. Throwaway local keys only: never production assurance.

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

## Install in Codex (CLI, IDE, ChatGPT desktop)

```
codex plugin marketplace add Intentrax/intentrax-skills
```

Then install **Intentrax Execution Assurance** from the Intentrax marketplace
in the Plugins Directory. The package lives in `agent-plugins/intentrax/` in
the open [Agent Plugins](https://agent-plugins.org) format, so Cursor, Kiro, and
other Agent Plugins hosts can load the same folder.

## Install in Gemini CLI

```
gemini extensions install https://github.com/Intentrax/intentrax-skills
```

The extension (`gemini-extension.json` at the repository root) adds the same
three skills and the read-only MCP server. Gemini asks for the optional tenant
read key at install and keeps it in the system keychain.

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
.claude-plugin/marketplace.json        # Claude Code marketplace (two plugins)
plugins/intentrax/                     # Claude: intentrax-execution-assurance (skills only)
plugins/intentrax-mcp/                 # Claude: intentrax-mcp (read-only MCP server)
.agents/plugins/marketplace.json       # Codex marketplace
.cursor-plugin/marketplace.json        # Cursor marketplace (points at agent-plugins/intentrax)
agent-plugins/intentrax/               # Agent Plugins package (Codex/ChatGPT, Cursor, Kiro)
  plugin.json, assets/icon.png, skills/
gemini-extension.json                  # Gemini CLI extension (repository root)
skills/, server/                       # Gemini extension's skills and MCP server
```

Every copy of a skill and of the server is generated from one source and
checked byte-for-byte before release.

## Related

- SDK and CLI: [`@intentrax/sdk`](https://www.npmjs.com/package/@intentrax/sdk)
- Public verifier: https://verify.intentrax.com
- Developer docs: https://www.intentrax.com/developers

## License

Apache-2.0.
