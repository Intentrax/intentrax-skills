---
name: intentrax-integrate-agent-actions
description: >-
  Use when the user asks to add Intentrax, add proof or audit evidence to agent
  actions, find the risky or consequential things their agent or LLM tool calls
  do, or wire admission, execution evidence, and verification into an existing
  codebase. Walks through discovering consequential agent actions, proposing an
  integration plan for the user to approve, and implementing admit → execute →
  verify wrappers with the Intentrax SDK — without bypassing policy, signing
  anything, or calling execute without explicit approval.
license: Apache-2.0
---

# Integrate Intentrax into an agent codebase

Work in three phases, with an explicit stop for user approval between
phase 2 and phase 3. Read `intentrax-execution-assurance` first if you have
not already — it defines what a proof does and does not establish.

## Phase 1 — Discover consequential agent actions (read-only)

Find every place where an agent, LLM tool call, or automated workflow causes a
side effect. Search, do not guess. Use the patterns in
[references/discovery-patterns.md](references/discovery-patterns.md).

For each candidate, record:

| Field | Example |
| --- | --- |
| Location | `src/agent/tools/refund.ts:42` |
| Trigger | LLM tool call `issue_refund` (agent-initiated) |
| Effect | Moves money via Stripe `refunds.create` |
| Reversibility | Hard to reverse |
| Who might dispute it | Customer, payment processor, auditor |
| Score | Count of: consequential domain, agent-initiated, untrusted verifier, hard to reverse |

Only actions scoring **2 or more** are candidates. Reads, search, drafting,
UI state, and trivially undoable actions are out of scope — list them as
"excluded" so the user sees you considered them.

### Report-only mode

If the user asks for an assessment, an audit, or "where are we exposed",
stop after phase 1 and write a report instead of changing code. Write it to
`INTENTRAX_ASSURANCE_GAPS.md` (or show it in chat if they prefer) with:

1. **Scope searched** — directories, languages, and the search patterns used,
   and anything skipped (generated code, vendored code, other repositories).
2. **Candidates** — the table above, each marked `UNPROTECTED`,
   `ADMISSION_ONLY`, `ADMITTED_AND_RECORDED`, or `UNKNOWN`, based only on code
   you actually read.
3. **Excluded actions** with one-line reasons.
4. **Coverage statement**, verbatim: "This report lists consequential actions
   found by static search of the scope above. It does not establish that every
   consequential action was found, that wrapped actions are wrapped on every
   code path, or that any real-world effect occurred."

Never call a codebase "covered" or "fully assured". Report-only mode makes no
code changes, needs no key, and sends nothing anywhere.

## Phase 2 — Propose a plan, then stop

Present a short plan and **wait for the user to approve it** before editing
code:

1. The ranked list of candidate actions, with the excluded list.
2. The adapter that matches their stack — one of `claude-code`, `cursor`,
   `mcp`, `langchain`, `langgraph`, `vercel-ai-sdk`, `crewai`, `autogen`,
   `n8n`, `openclaw`, `deepflow`, or `custom-agent`.
3. Where the wrapper goes (one choke point per action, ideally the tool
   dispatcher rather than every call site).
4. What the user must provide later, outside the repo: a tenant ID and API key
   in their secret store. Admission needs a key with the
   `agent.gateway.admit` scope. Execute needs a separately issued,
   execute-capable pilot key and an allowlisted tenant; until then the execute
   lane answers `423`/`403`, which is expected.
5. What the result will and will not prove (decision record; no independent
   effect confirmation today).

## Phase 3 — Implement (after approval)

1. **Scaffold offline.** Run `npx @intentrax/sdk init <adapter>` in the repo,
   then `npx @intentrax/sdk check-init --output-dir .`. Both work with no key
   and no network. Commit the generated `.intentrax/` files; they contain no
   secrets.
2. **Wire admission before the action.** Call the generated hook (or
   `admitAgentGatewayHttp` from `@intentrax/sdk/http`) at the choke point
   *before* the side effect. If admission is denied or errors, the action must
   not run. Fail closed.
3. **Carry one idempotency key.** Use the hook's `execute_idempotency_key`
   (or `createIdempotencyKey`) as the execute `idempotency_key`; admission
   already carries its SHA-256. Never derive them independently.
4. **Record execution evidence.** After the action, call
   `executeIntentHttp` with that key, and store the returned
   `registry_proof_id` beside the action's own result (database row, log
   record, or response metadata).
5. **Add verification.** Add a test or script that exports the proof and runs
   `npx @intentrax/sdk verify-proof <export.json> --json`, and a code path
   that links to `https://verify.intentrax.com/verify/proof/<proof_id>`.
6. **Configure secrets by reference only.** Read `INTENTRAX_API_KEY` and
   `INTENTRAX_TENANT_ID` (or the user's own names) from the environment or a
   secret manager. Never write values into code, config, tests, or fixtures.

Recipes for each step are in
[references/wiring-recipes.md](references/wiring-recipes.md).

## Hard boundaries

- **Never bypass policy.** Do not add flags, retries, or fallbacks that run
  the action when admission is denied, unreachable, or misconfigured.
- **Never sign or fabricate proof material.** Do not generate keys, sign
  payloads, construct proof JSON, or mock a `VALID` verdict outside clearly
  labeled unit-test fixtures. The Intentrax engine is the sole signer.
- **Never call execute or real side effects on the user's behalf** while
  integrating. Running the user's tests that hit live endpoints, or calling
  `/v1/intents/execute`, needs the user's explicit approval for that specific
  run.
- **Never claim effect confirmation.** Describe the result as "admitted and
  recorded in a signed, verifiable proof."
- **Least privilege.** Suggest separate keys for admission, execute, and
  read-only verification, and a read-only key for any MCP tool.

## Done means

- Every candidate action is either wrapped or explicitly excluded by the user.
- `check-init` passes, and a test proves a denied admission blocks the action.
- No secret appears in the diff (`git diff | grep -i "api[_-]key"` shows only
  environment-variable names).
- The README or PR description states what is proven and what is not.
