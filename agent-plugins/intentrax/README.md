# Intentrax Execution Assurance (Agent Plugins package)

The same three skills as the Claude plugin, packaged in the open
[Agent Plugins](https://agent-plugins.org) format for Codex and ChatGPT,
Cursor, Kiro, VS Code, and other hosts that load it.

## Install

- **Codex:** `codex plugin marketplace add Intentrax/intentrax-skills`, then
  install `intentrax-execution-assurance` from the Intentrax marketplace in the
  Plugins Directory.
- **Cursor, Kiro, and other Agent Plugins hosts:** add this folder
  (`agent-plugins/intentrax`) as a plugin, or copy a skill folder into your
  agent's skills directory (for example `.agents/skills/`).

## Try it first

`npx @intentrax/sdk sandbox` (SDK 1.7.0+) runs one action through a signed
decision, the executor's report, an independent read-only outcome check and
offline verification, with no key, no account and no network. Add
`--scenario contradicted` to see a "successful" action whose outcome check
disagrees. Throwaway local keys only: never production assurance.

## What it contains

Skills only. They are instructions; the plugin itself runs nothing, sends
nothing, and fetches nothing.

- `intentrax-execution-assurance` — when assurance is worth adding, and what a
  proof does and does not establish.
- `intentrax-integrate-agent-actions` — find consequential agent actions,
  propose a plan for your approval, then wire fail-closed admit → execute →
  verify; or write a report-only assurance gap assessment.
- `intentrax-verify-proof` — check a proof and report the verdict without
  overstating it.

## Data the skills can lead the agent to send

- **Public proof lookup:** a proof ID you provide, sent to
  `https://verify.intentrax.com` with no credentials.
- **Package download:** `npx @intentrax/sdk …` fetches the SDK from npm.
- **Your own application's calls:** code you write with the integration skill
  sends requests to `https://api.intentrax.com` with your own key, read from
  your own environment, when your application runs. The skill never runs those
  calls itself.

## Limits stated plainly

Production Intentrax proofs are signed decision records. They do not
independently confirm that a real-world effect happened.

Privacy policy: https://www.intentrax.com/legal/privacy ·
Support: https://github.com/Intentrax/intentrax-skills/issues ·
License: Apache-2.0.
