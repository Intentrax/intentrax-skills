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
| A `proof_id` or verify link | MCP tool `intentrax_verify_public_proof` (keyless), or open `https://verify.intentrax.com/verify/proof/<proof_id>` | Hosted lookup: the record exists and its hashes check out. Signer **not** checked against pinned keys. |
| A `proof_id` in your own tenant | MCP tool `intentrax_read_tenant_proof` (needs a tenant read key in the host secret store) | The tenant's own proof record. |
| An exported proof JSON | `npx @intentrax/sdk verify-proof <export.json> --json` | **Strongest.** Offline: recomputes hashes, checks every ed25519 signature and the quorum, and checks signers against the pinned production key set bundled in the SDK. No network, no key. |

When the user cares about authenticity (an audit, a dispute, a counterparty),
prefer the offline check. Ask for, or help produce, the proof export
(`exportProofHttp` in `@intentrax/sdk/http`).

## Read the result correctly

Hosted and MCP results contain two different things. Report both:

- `verification.verification_status` — e.g. `VALID`. This is the record's
  integrity status.
- `verification_assessment.verdict` — the scoped verdict. For production
  proofs today it is usually `INTEGRITY_ONLY`: record integrity was verified,
  but signer authenticity was `NOT_ASSESSED` (`NO_TRUSTED_KEY_SET`) because the
  hosted path does not pin keys. Read `assessments[]` for each dimension
  (`RECORD_INTEGRITY`, `SIGNER_AUTHENTICITY`, `AUTHORIZATION`,
  `EXECUTION_REPORTED`, `EXECUTION_ATTESTED`, …) with its `reasons` and
  `limitations`.

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

## How to report it

- Quote the verdict and its limitations. For example: "Record integrity
  verified (`VALID`); assessment `INTEGRITY_ONLY` — signer not checked against
  pinned keys on the hosted path. Offline check with pinned keys: PASS."
- Never say the real-world effect happened. Production proofs are decision
  records; effect confirmation is not part of them today.
- A sandbox proof, an `UNPINNED_SIGNER`, a failed-closed result, or a
  not-found proof is **not verified**. Say so plainly.
- Never construct, edit, or re-sign proof JSON to make a check pass. If a
  check fails, report the failure and the failing field.

## Never

- Never put an API key in a committed file or paste it into chat output.
- Never call admission or execute endpoints from this skill.
- Never invent a `proof_id` or a verdict; only report what a verifier returned.

## Tools and links

- MCP server: `@intentrax/mcp-server` (read-only, two tools)
- SDK CLI: `npx @intentrax/sdk verify-proof` (pinned production key set in
  `trust/production-key-set.json` inside the package)
- Public verifier: https://verify.intentrax.com
