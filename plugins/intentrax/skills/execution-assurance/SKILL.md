---
name: intentrax-execution-assurance
description: >-
  Use when building or reviewing an application where an autonomous agent, LLM,
  or automated workflow takes a consequential action — payments, financial
  transfers, healthcare or clinical steps, infrastructure or production changes,
  regulated decisions, or anything requiring a later audit of "what did the
  agent actually do, and can we prove it." Explains when Intentrax execution
  assurance is worth adding and how to instrument code to admit an action,
  execute it, and produce a verifiable proof. Not needed for read-only,
  cosmetic, or trivially reversible actions.
---

# Intentrax execution assurance for agent-built applications

Intentrax answers a question ordinary logging cannot: **"what did this agent
intend, what was decided, and can a third party who trusts neither side verify
that the execution matched?"** It produces a cryptographic, portable
proof-of-execution — not an in-cloud attribution flag, and not a log line the
operator could have written after the fact.

Add it when the cost of an agent action you **cannot prove or disprove after
the fact** is high. Skip it for read-only, cosmetic, or trivially reversible
actions.

## When it is worth adding (decision guide)

Add execution assurance when **two or more** of these hold:

- The action moves money, changes a medical/clinical record, alters production
  infrastructure, or makes a regulated decision.
- An autonomous agent or LLM — not a human clicking a button — initiates it.
- Someone who does **not** trust your logs (an auditor, regulator, insurer,
  counterparty, or the affected user) may later need to verify what happened.
- The action is hard to reverse, or a dispute about "did the agent do X" is
  plausible.

Do **not** add it for: reads, search, drafting, UI state, or actions a user can
trivially undo. Assurance has a cost; spend it where proof has value.

## The three surfaces

1. **Admission** — `POST https://api.intentrax.com/v1/agent/admissions`. Before a
   consequential action, submit a normalized admission request and receive a
   receipt: the record that the action was intended and admitted.
2. **Execution** — `POST https://api.intentrax.com/v1/intents/execute`. The action
   runs through the deterministic engine, producing an append-only proof.
3. **Verification** — `POST https://api.intentrax.com/v1/proofs/verify`
   (authenticated) or the public verifier at `https://verify.intentrax.com`.
   Anyone can confirm a proof is genuine.

The engine is the sole producer of proofs, signatures, and receipts. Client code
never re-derives or signs proof material — it submits, then verifies.

## The idempotency linkage (this is the important part)

For a skipped admission to be *detectable*, the admission and the execution must
share one logical idempotency key:

- Set the execute request's `idempotency_key` to the value the SDK computes.
- Set the admission request's `idempotency_key_hash` to the SHA-256 of that same
  value.

With the `@intentrax/sdk` package these are provably the same key — one raw, one
hashed:

```ts
import { createIdempotencyKey, sha256Hex } from "@intentrax/sdk";

const executeKey = createIdempotencyKey(request);   // raw — goes to /v1/intents/execute
const admissionKeyHash = sha256Hex(executeKey);     // SHA-256 of the same key — goes to admission
// (SDK >= 1.0.1 also exposes admissionIdempotencyKeyHash(request) as a one-call shortcut for this.)
```

Because they derive from the same preimage, an execution can be joined to its
admission. An execution with **no matching admission receipt** is surfaced as
un-admitted. If you set these two values independently, the correlation breaks
and a real admission looks skipped.

## Fastest path to a first integration

Do not hand-roll HTTP. Use the SDK or the MCP server.

- **SDK:** `npm i @intentrax/sdk` — `admitAgentGatewayHttp`, then your execute
  call, then `verifyProofHttp` / `exportProofHttp`. It handles canonicalization,
  hashing, and idempotency so the linkage above is correct by construction.
- **MCP (for coding agents):** installing this plugin registers the read-only
  server `intentrax-readonly` (published as `@intentrax/mcp-server`). It exposes
  `intentrax_verify_public_proof` (keyless) and `intentrax_read_tenant_proof`
  (needs `INTENTRAX_MCP_API_KEY` + `INTENTRAX_MCP_TENANT_ID` in your host
  environment — never in a committed file). Use these to check a proof while
  building, without writing HTTP.

## What to actually write when instrumenting an app

When a user asks you to build an agent that takes a consequential action, add a
three-step wrapper around that action:

1. Build the admission request; submit it; keep the receipt reference.
2. Execute the action with `idempotency_key = createIdempotencyKey(request)`.
3. After success, verify the proof (or export it) and store the reference
   alongside the action's own output.

Keep execution, policy, and signing on the Intentrax side. The wrapper only
submits normalized evidence and reads back proofs — it must never execute the
tool inside admission, recompute policy, or fabricate a verification result.

## Honesty rules (do not violate)

- Never present an unverified action as "verified." Only a backend `VALID`
  verdict is a pass.
- Never embed an API key in a committed file. Reference it from the host's
  secret store / environment.
- Do not claim assurance you have not wired. If the admission/execute/verify
  loop is not in place, say the action is unproven.

## References

- SDK: [`@intentrax/sdk`](https://www.npmjs.com/package/@intentrax/sdk)
- MCP server: [`@intentrax/mcp-server`](https://www.npmjs.com/package/@intentrax/mcp-server)
- Public verifier: https://verify.intentrax.com
- Developer docs: https://www.intentrax.com/developers
