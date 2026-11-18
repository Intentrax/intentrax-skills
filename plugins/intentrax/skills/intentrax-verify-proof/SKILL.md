---
name: intentrax-verify-proof
description: >-
  Use when the user asks to verify, check, inspect, or explain an Intentrax
  proof, proof_id, proof export JSON, verify.intentrax.com link, or
  Verification Mark — or asks "is this agent action proven?". Read-only: shows
  how to check a proof with the keyless public verifier, the read-only MCP
  tools, or fully offline with the SDK CLI and pinned keys, and how to report
  the verdict without overstating it.
license: Apache-2.0
---

# Verify an Intentrax proof (read-only)

This skill only **reads and checks**. It never admits, executes, signs, or
writes anything, and it never needs an execute-capable key.

## Pick the strongest check available

| You have | Do this | What it establishes |
| --- | --- | --- |
| A `proof_id` or verify link | MCP tool `intentrax_verify_public_proof` (keyless), or open `https://verify.intentrax.com/verify/proof/<proof_id>` | Hosted lookup: the record exists, its hashes check out, and Intentrax's verifier checks the signers against the published production key set. You are trusting Intentrax's server to have run that check. |
| A `proof_id` in your own tenant | MCP tool `intentrax_read_tenant_proof` (needs a tenant read key in the host secret store) | The tenant's own proof record. |
| An exported proof JSON | `npx @intentrax/sdk verify-proof <export.json> --json` | **Strongest.** Offline: recomputes hashes, checks every ed25519 signature and the quorum, and checks signers against the pinned production key set bundled in the SDK. No network, no key, and no need to trust Intentrax's server. |
| A local sandbox bundle (`.intentrax/local/runs/*/bundle.json`) | `npx @intentrax/sdk sandbox verify <bundle.json> --keys <local-key-set.json>` | Re-checks a run from the local assurance sandbox. Ephemeral keys from your own machine: **never** production assurance. |

When the user cares about authenticity (an audit, a dispute, a counterparty),
prefer the offline check. Ask for, or help produce, the proof export
(`exportProofHttp` in `@intentrax/sdk/http`).

## Read the result correctly

Hosted and MCP results contain two different things. Report both:

- `verification.verification_status` — e.g. `VALID`. This is the record's
  integrity status.
- `verification_assessment.verdict` — the scoped verdict. For a production
  proof whose signers are in the published key set it is
  `VERIFIED_FOR_SCOPE`: record integrity and signer authenticity were
  verified. "For scope" matters: the effect dimensions (`EFFECT_OBSERVED`,
  `EFFECT_CONFIRMED`) are `NOT_ASSESSED` (`NO_EFFECT_EVIDENCE`), so the verdict
  does not say the real-world effect happened. `INTEGRITY_ONLY` means the
  signer could not be checked against trusted keys. Read `assessments[]` for
  each dimension's `result`, `reasons` and `limitations`.

Offline CLI statuses and exit codes:

| Status | Exit | Meaning |
| --- | --- | --- |
| `PASS` | 0 | Hashes and signatures check, every signer is a published trust-bearing key, and the key set's minimum number of distinct signers signed. |
| `SANDBOX_NON_TRUST_BEARING` | 0 | Every signer is a published sandbox key: the mechanics check out, but it is **not** production assurance. Never present it as production evidence. |
| failed closed | 2 | Tampered or malformed: a hash or signature mismatch. Treat as **not verified**. |
| `UNPINNED_SIGNER` | 3 | Signatures are mathematically valid but a signer is not in any trusted key set — who signed is unproven. Treat as **not verified**. |
| `INSUFFICIENT_TRUSTED_SIGNERS`, `REVOKED_SIGNER`, `MIXED_TRUST` | 3 | Signer trust is incomplete. Treat as **not verified** and quote the status. |

Note that exit 0 covers both `PASS` and `SANDBOX_NON_TRUST_BEARING`; always read
the `status` field from `--json` output, not just the exit code.

Local sandbox (`sandbox verify`) verdicts and exit codes, which are a separate
scale: `LOCAL_NON_TRUST_BEARING` 0 (the best a local run can get) ·
`PENDING_FINALITY` 10 · `INSUFFICIENT_EVIDENCE` 11 · `CONFLICTING_EVIDENCE` 12
(for example, the action reported success but the outcome check disagrees) ·
`INTEGRITY_ONLY` 13 (no `--keys` given) · `VERIFICATION_FAILED` 14. A local
run never returns `VERIFIED_FOR_SCOPE`.

## How to report it

- Quote the verdict and its limitations. For example: "Record integrity
  verified (`VALID`); assessment `VERIFIED_FOR_SCOPE` (integrity and signer
  verified; real-world effect not assessed). Offline check with pinned keys:
  PASS."
- Never say the real-world effect happened. Production proofs are decision
  records; effect confirmation is not part of them today.
- A sandbox proof, a local sandbox bundle, an `UNPINNED_SIGNER`, a
  failed-closed result, or a not-found proof is **not verified** production
  evidence. Say so plainly.
- Never construct, edit, or re-sign proof JSON to make a check pass. If a
  check fails, report the failure and the failing field.

## Never

- Never put an API key in a committed file or paste it into chat output.
- Never call admission or execute endpoints from this skill.
- Never invent a `proof_id` or a verdict; only report what a verifier returned.

## Tools and links

- MCP server: `@intentrax/mcp-server` (read-only, two tools)
- SDK CLI: `npx @intentrax/sdk verify-proof` (pinned production key set in
  `trust/production-key-set.json` inside the package) and
  `npx @intentrax/sdk sandbox verify` (local sandbox bundles; SDK 1.7.0+)
- Public verifier: https://verify.intentrax.com
