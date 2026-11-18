# Intentrax read-only MCP server (Claude Code plugin)

Adds the read-only Intentrax MCP server `intentrax-readonly` to Claude Code, so
Claude can verify an Intentrax proof from chat. It has exactly two tools and
never executes, admits, signs, or writes.

## Install

```
/plugin install intentrax-mcp --marketplace Intentrax/intentrax-skills
```

Pair it with the skills plugin `intentrax-execution-assurance` from the same
marketplace.

## What it runs, sends, and fetches

- It runs `node server/intentrax-mcp-server.mjs` locally over stdio. Node.js 20
  or later is required. The file is readable JavaScript, byte-identical to the
  npm release of
  [`@intentrax/mcp-server`](https://www.npmjs.com/package/@intentrax/mcp-server)
  0.1.1. Nothing is downloaded at install or run time.
- `intentrax_verify_public_proof` sends the proof ID you ask about to
  `https://verify.intentrax.com` with no credentials.
- `intentrax_read_tenant_proof` sends the proof ID, your tenant ID, and your
  tenant read API key to `https://api.intentrax.com`. It only runs if you set
  both optional plugin options; otherwise it fails closed and sends nothing.
- The server accepts no other destinations; any other origin fails closed. It
  sends no telemetry.

## Options

Both options are optional. The API key is stored in your system's secure
credential store, not in a settings file. Use a least-privilege, read-only
key; never an execute-capable key.

## Limits stated plainly

Production Intentrax proofs are signed decision records. They do not
independently confirm that a real-world effect happened. Hosted verification
reports record integrity; for signer authenticity, verify offline with
`npx @intentrax/sdk verify-proof`, which bundles the pinned production key set.

Privacy policy: https://www.intentrax.com/legal/privacy ·
Support: https://github.com/Intentrax/intentrax-skills/issues

License: Apache-2.0.
