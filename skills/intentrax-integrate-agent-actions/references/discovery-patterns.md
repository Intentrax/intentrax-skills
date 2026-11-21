# Discovery patterns for consequential agent actions

Run `npx @intentrax/sdk scan --json` first (SDK 1.8.0+; static, local, no
key). It applies most of these anchors and classifies what it finds. Then use
these searches (ripgrep syntax) to check its findings and catch what a static
scan misses. They find *candidates*; read each hit to confirm an agent or LLM
can trigger it.

## 1. Where agents call tools

| Stack | Search |
| --- | --- |
| MCP servers | `server\.tool\(|registerTool\(|@mcp\.tool|tools/call` |
| Vercel AI SDK | `tool\(\{|tools:\s*\{|generateText\(|streamText\(` |
| LangChain / LangGraph | `@tool|StructuredTool|DynamicTool|ToolNode|bind_tools` |
| OpenAI / Anthropic tool use | `tool_choice|tool_calls|tool_use|function_call` |
| CrewAI / AutoGen | `@tool|BaseTool|register_function|FunctionTool` |
| Claude Code / Cursor hooks | `PreToolUse|PostToolUse|hooks\.json|beforeShellExecution` |
| n8n / workflow | `"type":\s*"n8n-nodes-base\.(httpRequest|code)"` |

## 2. Side effects by domain

| Domain | Search |
| --- | --- |
| Payments | `stripe\.|refunds\.create|charges\.create|transfers\.create|payouts|adyen|braintree|plaid` |
| Banking / ledgers | `ledger|journal_entry|wire|ach|iban|settle` |
| Infrastructure | `terraform apply|kubectl (apply|delete)|aws\s|boto3|@aws-sdk|gcloud|az\s|helm (install|upgrade)` |
| Databases (writes) | `DELETE FROM|DROP TABLE|UPDATE .* SET|\.delete\(|\.destroy\(|truncate` |
| Healthcare | `fhir|hl7|Patient|MedicationRequest|Observation|ehr` |
| Identity / access | `createUser|grantRole|addMember|iam\.|setPermissions|revoke` |
| Messaging on behalf of users | `sendEmail|sendgrid|ses\.send|twilio|slack\.chat\.postMessage` |
| Deploys / releases | `deploy|release|publish|git push|npm publish` |
| Shell / code execution | `child_process|exec\(|spawn\(|subprocess|os\.system|eval\(` |

## 3. Scoring

Score one point for each:

- consequential domain (money, health, infrastructure, regulated decision,
  identity, external communication);
- agent- or LLM-initiated (not a human click);
- someone who does not trust the operator's logs may need to check it;
- hard to reverse, or a dispute is plausible.

Score ≥ 2 → candidate. Score ≤ 1 → list as excluded with a one-line reason.

## 4. Pick the choke point

Prefer the narrowest place that every invocation passes through:

1. the tool dispatcher or registry (one wrapper covers every tool);
2. the tool's own handler;
3. the service client method that performs the effect.

Avoid wrapping in UI code or in prompts: the wrapper must sit where the side
effect actually happens, so a model cannot route around it.
