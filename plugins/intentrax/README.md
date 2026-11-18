# Intentrax Execution Assurance (Claude plugin)

Helps Claude decide when an AI agent's action deserves a verifiable proof, find
those actions in a codebase, wire Intentrax admission → execution →
verification with the official SDK, and check proofs without overstating what
they show.

## Install

```
/plugin install intentrax-execution-assurance --marketplace Intentrax/intentrax-skills
```

On Claude Code versions before 2.1.275, run
`/plugin marketplace add Intentrax/intentrax-skills` first, then
`/plugin install intentrax-execution-assurance@intentrax`.

## What it contains

Three skills. They are instructions only; the plugin itself runs nothing,
sends nothing, and fetches nothing.

- `intentrax-execution-assurance` — when assurance is worth adding, what a
  proof does and does not establish, and the one idempotency-key rule.
- `intentrax-integrate-agent-actions` — discover consequential agent
  actions, propose a plan for your approval, then implement fail-closed
  wrappers. Also a report-only mode that writes an assurance gap report
  without changing code.
- `intentrax-verify-proof` — check a proof and report the verdict without
  overstating it.

## What the skills may suggest running

The skills may suggest commands such as `npx @intentrax/sdk init <adapter>`,
`npx @intentrax/sdk check-init`, or `npx @intentrax/sdk verify-proof`. Claude
asks before running them as usual. Those commands download `@intentrax/sdk`
from npm; scaffolding and verification run offline.

In Claude Code, the companion plugin `intentrax-mcp` (same marketplace) adds a
read-only MCP server for verifying proofs from chat. It is optional and
separate.

## Limits stated plainly

Production Intentrax proofs are signed decision records. They do not
independently confirm that a real-world effect happened. Hosted verification
reports record integrity; for signer authenticity, verify offline with the SDK
CLI, which bundles the pinned production key set.

Privacy policy: https://www.intentrax.com/legal/privacy ·
Support: https://github.com/Intentrax/intentrax-skills/issues

License: Apache-2.0.
