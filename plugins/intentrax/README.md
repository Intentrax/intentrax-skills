# Intentrax Execution Assurance (Claude plugin)

Helps a coding agent decide when an AI agent's action deserves a verifiable
proof, find those actions in a codebase, wire Intentrax admission → execution →
verification with the official SDK, and check proofs read-only.

## Install

```
/plugin install intentrax-execution-assurance --marketplace Intentrax/intentrax-skills
```

On Claude Code versions before 2.1.275, run
`/plugin marketplace add Intentrax/intentrax-skills` first, then
`/plugin install intentrax-execution-assurance@intentrax`.

## What it contains

- **Skills** (instructions only; they run nothing by themselves):
  - `intentrax-execution-assurance` — when assurance is worth adding, what a
    proof does and does not establish, and the one idempotency-key rule.
  - `intentrax-integrate-agent-actions` — discover consequential agent
    actions, propose a plan for your approval, then implement fail-closed
    wrappers.
  - `intentrax-verify-proof` — check a proof and report the verdict without
    overstating it.
- **MCP server** `intentrax-readonly` — the read-only server published as
  [`@intentrax/mcp-server`](https://www.npmjs.com/package/@intentrax/mcp-server)
  0.1.1, bundled here as readable JavaScript in `server/` (byte-identical to
  the npm release). It has exactly two tools and never executes, admits, signs,
  or writes.

## What it runs, sends, and fetches

- It runs `node server/intentrax-mcp-server.mjs` locally over stdio. Node.js 20
  or later is required. Nothing is downloaded at install or run time.
- `intentrax_verify_public_proof` sends the proof ID you ask about to
  `https://verify.intentrax.com` with no credentials.
- `intentrax_read_tenant_proof` sends the proof ID, your tenant ID, and your
  tenant read API key to `https://api.intentrax.com`. It only runs if you set
  both optional plugin options; otherwise it fails closed and sends nothing.
- The server accepts no other destinations; any other origin fails closed. It
  sends no telemetry.
- The skills may suggest commands such as `npx @intentrax/sdk init <adapter>`
  or `npx @intentrax/sdk verify-proof`. Your agent asks before running them as
  usual. Those commands download `@intentrax/sdk` from npm.

## Options

Both options are optional. The API key is stored in your system's secure
credential store, not in a settings file. Use a least-privilege, read-only
key; never an execute-capable key.

## Limits stated plainly

Production Intentrax proofs are signed decision records. They do not
independently confirm that a real-world effect happened. Hosted verification
reports record integrity; for signer authenticity, verify offline with the SDK
CLI, which bundles the pinned production key set.

Privacy policy: https://www.intentrax.com/legal/privacy ·
Support: https://github.com/Intentrax/intentrax-skills/issues

License: Apache-2.0.
