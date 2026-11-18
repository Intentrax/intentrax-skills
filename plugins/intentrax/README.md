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

## Try it first: the local assurance sandbox

No key, no account, no network (beyond downloading the SDK):

```
npx @intentrax/sdk sandbox                          # a sample action; the outcome is confirmed
npx @intentrax/sdk sandbox --scenario contradicted  # ALLOW + "SUCCEEDED", but nothing changed
npx @intentrax/sdk sandbox --check ./my-check.mjs   # check the outcome of your own action
```

Each run goes through the whole flow: a signed decision, the executor's own
report, an independent read-only outcome check, and offline verification.
It uses throwaway keys generated on your machine, so the result is
`LOCAL_NON_TRUST_BEARING`: a way to see the flow, never production
assurance. Ask Claude "show me what Intentrax would catch here" to start.

## What the skills may suggest running

The skills may suggest commands such as `npx @intentrax/sdk sandbox`,
`npx @intentrax/sdk init <adapter>`, `npx @intentrax/sdk check-init`, or
`npx @intentrax/sdk verify-proof`. Claude asks before running them as usual.
Those commands download `@intentrax/sdk` from npm; the sandbox, scaffolding,
and offline verification send nothing else. `sandbox --check` runs a check
module from your own project, which reads whatever that module reads.

Data the skills can lead Claude to send, all of it listed here:

- **Public proof lookup.** `intentrax-verify-proof` may look up a proof ID you
  provide at `https://verify.intentrax.com`, with no credentials. Only the
  proof ID is sent.
- **Package download.** The `npx` commands above fetch `@intentrax/sdk` from
  the npm registry.
- **Your own application's calls.** `intentrax-integrate-agent-actions` helps
  you write code that, when *your* application runs, sends admission and
  execution requests to `https://api.intentrax.com` with *your* API key read
  from *your* environment. The skill never runs those calls itself and never
  asks you to paste a key into chat.

In Claude Code, the companion plugin `intentrax-mcp` (same marketplace) adds a
read-only MCP server for verifying proofs from chat. It is optional and
separate.

## Limits stated plainly

Production Intentrax proofs are signed decision records. They do not
independently confirm that a real-world effect happened. Hosted verification
checks record integrity and checks signers against the published production
key set (verdict `VERIFIED_FOR_SCOPE`, with the effect not assessed). To check
without trusting Intentrax's server, verify offline with the SDK CLI, which
bundles the pinned production key set. The outcome check exists only in the
local sandbox today.

Privacy policy: https://www.intentrax.com/legal/privacy ·
Support: https://github.com/Intentrax/intentrax-skills/issues

License: Apache-2.0.
