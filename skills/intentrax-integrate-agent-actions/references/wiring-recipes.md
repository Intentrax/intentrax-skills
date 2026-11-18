# Wiring recipes (TypeScript, `@intentrax/sdk` ≥ 1.6.0)

These are patterns, not drop-in code: adapt names to the codebase. Values in
`ALL_CAPS` come from the environment or a secret manager, never from source.

## 1. Scaffold and check offline

```bash
npx @intentrax/sdk init vercel-ai-sdk --tenant-id "$INTENTRAX_TENANT_ID"  # or claude-code, cursor, mcp, …
npx @intentrax/sdk check-init --output-dir .  # offline; no key, no network
```

Do not add `--json` to `init` when you mean to write files: `--json` behaves
as a dry run and only prints the plan. Use `--dry-run` deliberately to preview.

This writes `.intentrax/` with a hook starter, a sample admission request, a
host wiring guide, and an action receipt. Read
`.intentrax/wiring/<adapter>-host-wiring.md` before wiring.

## 2. Admission before the side effect (fail closed)

Using the generated hook (recommended — it already applies the one
idempotency-key rule):

```ts
import { beforeClaudeCodeToolUse } from "./.intentrax/hooks/claude-code-pre-tool-use.mjs";

export async function guardedToolCall(event, runTool) {
  // Throws if admission is not ADMITTED (denied, error, or unreachable).
  const admission = await beforeClaudeCodeToolUse(event, {
    submit: true,
    baseUrl: process.env.INTENTRAX_BASE_URL, // https://api.intentrax.com
    apiKey: process.env.INTENTRAX_API_KEY,   // scope: agent.gateway.admit
  });
  const result = await runTool();             // the real side effect, only after admission
  return { result, executeIdempotencyKey: admission.execute_idempotency_key };
}
```

Never catch the admission error and continue. A test should assert that a
denied admission means `runTool` is never called.

## 3. Execution evidence with the same key

```ts
import { executeIntentHttp } from "@intentrax/sdk/http";

const transport = async (req) => {
  const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const executed = await executeIntentHttp(
  {
    schema_version: "intentrax.runtime.intent_execute.request/1.0",
    intent_id,                          // your stable ID for this action
    tenant_id: process.env.INTENTRAX_TENANT_ID,
    action,                             // UPPER_SNAKE action name agreed at onboarding
    idempotency_key: executeIdempotencyKey, // from admission step — the raw key K
    proof_chain_fixture_ref,            // issued with pilot onboarding; never invent it
  },
  transport,
  { base_url: process.env.INTENTRAX_BASE_URL, api_key: process.env.INTENTRAX_EXECUTE_API_KEY },
);
// executed.output.response is returned verbatim from the engine.
// Store response.body.registry_proof_id next to the action's own record.
```

Expect `423` (live execution disabled) or `403` (tenant not allowlisted) until
an execute-capable pilot key is issued. Treat both as "not recorded", not as
success, and never retry around them.

## 4. Verification

```ts
import { exportProofHttp } from "@intentrax/sdk/http";
// Export the proof JSON, write it to a file, then verify offline:
//   npx @intentrax/sdk verify-proof proof-export.json --json
// Read `status` from the JSON report: PASS is trust-bearing;
// SANDBOX_NON_TRUST_BEARING, UNPINNED_SIGNER, and any exit 2 or 3 are not.
```

For a human-facing link: `https://verify.intentrax.com/verify/proof/<proof_id>`.

## 5. Secrets and keys

| Purpose | Variable (suggested) | Scope |
| --- | --- | --- |
| Admission | `INTENTRAX_API_KEY` | `agent.gateway.admit` |
| Execute | `INTENTRAX_EXECUTE_API_KEY` | execute-capable, pilot-issued |
| MCP tenant read | `INTENTRAX_MCP_API_KEY` | read-only proof read |
| Tenant | `INTENTRAX_TENANT_ID` | — |

Use separate keys so a leaked read key cannot admit or execute. Add the
variable *names* to `.env.example`; never add values.
