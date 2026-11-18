#!/usr/bin/env node

// index.ts
var MCP_PROTOCOL_VERSION = "2024-11-05";
var MCP_SERVER_NAME = "intentrax-readonly";
var MCP_SERVER_VERSION = "0.1.0";
var PUBLIC_VERIFY_ORIGIN = "https://verify.intentrax.com";
var RUNTIME_API_ORIGIN = "https://api.intentrax.com";
var DEFAULT_TIMEOUT_MS = 1e4;
var MAX_TIMEOUT_MS = 15e3;
var MIN_TIMEOUT_MS = 1e3;
var MAX_RESPONSE_BYTES = 1048576;
var MAX_REQUEST_BYTES = MAX_RESPONSE_BYTES;
var MAX_PENDING_REQUESTS = 32;
var MAX_INPUT_CHUNK_BYTES = MAX_REQUEST_BYTES;
var RESUME_PENDING_REQUESTS = Math.max(1, Math.floor(MAX_PENDING_REQUESTS / 2));
var McpSafeError = class extends Error {
  safe;
  constructor(code, message, rpcCode = -32602) {
    super(message);
    this.safe = { code, message, rpcCode };
  }
};
var PROOF_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
var TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
var SENSITIVE_KEY_PATTERN = /(?:api[-_]?key|authorization|cookie|password|private[-_]?key|secret|token|credential(?:s)?|session(?:[-_]?id)?|refresh[-_]?token|bearer(?:[-_]?token)?|access[-_]?token)/i;
var SUPPORTED_PROTOCOL_VERSIONS = /* @__PURE__ */ new Set([MCP_PROTOCOL_VERSION, "2025-03-26", "2025-06-18"]);
var TOOLS = Object.freeze([
  Object.freeze({
    name: "intentrax_verify_public_proof",
    title: "Verify a public Intentrax proof",
    description: "Read a published proof verdict from Intentrax's public verifier. This tool is read-only and never creates, signs, replays, executes, or admits work.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["proof_id"],
      properties: {
        proof_id: {
          type: "string",
          minLength: 1,
          maxLength: 128,
          pattern: "^[A-Za-z0-9_.-]+$",
          description: "Published Intentrax proof identifier."
        }
      }
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }),
  Object.freeze({
    name: "intentrax_read_tenant_proof",
    title: "Read a tenant-scoped Intentrax proof",
    description: "Read one proof record for the configured tenant. This tool is read-only and requires a least-privilege runtime API key and tenant ID in the server environment.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["proof_id"],
      properties: {
        proof_id: {
          type: "string",
          minLength: 1,
          maxLength: 128,
          pattern: "^[A-Za-z0-9_.-]+$",
          description: "Proof identifier within the configured tenant."
        }
      }
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  })
]);
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
function isJsonRpcId(value) {
  return value === null || typeof value === "string" || typeof value === "number";
}
function requestID(value) {
  return hasOwn(value, "id") && isJsonRpcId(value.id) ? value.id : null;
}
function isNotification(value) {
  return !hasOwn(value, "id");
}
function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id, error) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: error.rpcCode,
      message: error.message,
      data: { code: error.code }
    }
  };
}
function asSafeError(error) {
  if (error instanceof McpSafeError) return error.safe;
  return {
    code: "INTX_MCP_INTERNAL_ERROR",
    message: "The read-only MCP server could not complete the request.",
    rpcCode: -32603
  };
}
function toolError(error) {
  return {
    content: [{ type: "text", text: `${error.code}: ${error.message}` }],
    isError: true
  };
}
function toolResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value
  };
}
function parseAllowedOrigin(value, allowedOrigin, environmentName) {
  if (value === void 0 || value === "") return allowedOrigin;
  try {
    const parsed = new URL(value);
    if (parsed.origin !== allowedOrigin || parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "" || parsed.username !== "" || parsed.password !== "") {
      throw new Error("outside allowlist");
    }
  } catch {
    throw new McpSafeError(
      "INTX_MCP_CONFIGURATION_ERROR",
      `${environmentName} must be the approved Intentrax origin.`
    );
  }
  return allowedOrigin;
}
function parseTimeout(value) {
  if (value === void 0 || value === "") return DEFAULT_TIMEOUT_MS;
  if (!/^[0-9]+$/.test(value)) {
    throw new McpSafeError("INTX_MCP_CONFIGURATION_ERROR", "INTENTRAX_MCP_TIMEOUT_MS must be a bounded integer.");
  }
  const timeout = Number(value);
  if (!Number.isSafeInteger(timeout) || timeout < MIN_TIMEOUT_MS || timeout > MAX_TIMEOUT_MS) {
    throw new McpSafeError("INTX_MCP_CONFIGURATION_ERROR", `INTENTRAX_MCP_TIMEOUT_MS must be between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS}.`);
  }
  return timeout;
}
var UNEXPANDED_ENV_REFERENCE = /^(?:\$\{[A-Za-z_][A-Za-z0-9_]*\}|\$[A-Za-z_][A-Za-z0-9_]*|%[A-Za-z_][A-Za-z0-9_]*%)$/;
function normalizeEnvValue(value) {
  if (value === void 0 || value === "") return void 0;
  return UNEXPANDED_ENV_REFERENCE.test(value.trim()) ? void 0 : value;
}
function parseApiKey(rawValue) {
  const value = normalizeEnvValue(rawValue);
  if (value === void 0) return void 0;
  if (value.length > 4096 || /[\u0000-\u001F\u007F]/.test(value) || value.trim() !== value) {
    throw new McpSafeError("INTX_MCP_CONFIGURATION_ERROR", "INTENTRAX_MCP_API_KEY is malformed.");
  }
  return value;
}
function parseTenantId(rawValue) {
  const value = normalizeEnvValue(rawValue);
  if (value === void 0) return void 0;
  if (!TENANT_ID_PATTERN.test(value)) {
    throw new McpSafeError("INTX_MCP_CONFIGURATION_ERROR", "INTENTRAX_MCP_TENANT_ID is malformed.");
  }
  return value;
}
function loadRuntimeConfig(env) {
  const shared = {
    publicVerifyOrigin: parseAllowedOrigin(env.INTENTRAX_MCP_VERIFY_ORIGIN, PUBLIC_VERIFY_ORIGIN, "INTENTRAX_MCP_VERIFY_ORIGIN"),
    runtimeApiOrigin: parseAllowedOrigin(env.INTENTRAX_MCP_API_ORIGIN, RUNTIME_API_ORIGIN, "INTENTRAX_MCP_API_ORIGIN"),
    timeoutMs: parseTimeout(env.INTENTRAX_MCP_TIMEOUT_MS)
  };
  try {
    return { ...shared, apiKey: parseApiKey(env.INTENTRAX_MCP_API_KEY), tenantId: parseTenantId(env.INTENTRAX_MCP_TENANT_ID) };
  } catch (error) {
    return { ...shared, tenantCredentialError: asSafeError(error) };
  }
}
function validateProofID(argumentsValue) {
  if (!isRecord(argumentsValue) || Object.keys(argumentsValue).length !== 1 || !hasOwn(argumentsValue, "proof_id")) {
    throw new McpSafeError("INTX_MCP_INPUT_INVALID", "Tool arguments must contain only proof_id.");
  }
  const proofID = argumentsValue.proof_id;
  if (typeof proofID !== "string" || !PROOF_ID_PATTERN.test(proofID) || proofID.includes("..")) {
    throw new McpSafeError("INTX_MCP_INPUT_INVALID", "proof_id is malformed.");
  }
  return proofID;
}
function redactSensitiveFields(value, depth = 0) {
  if (depth > 32) return "[TRUNCATED]";
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : "[INVALID_NUMBER]";
  if (Array.isArray(value)) return value.map((entry) => redactSensitiveFields(entry, depth + 1));
  if (isRecord(value)) {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : redactSensitiveFields(entry, depth + 1);
    }
    return output;
  }
  return "[UNSUPPORTED_VALUE]";
}
async function cancelResponseBody(response) {
  try {
    await response.body?.cancel();
  } catch {
  }
}
async function readBoundedResponseText(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let bytesRead = 0;
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_RESPONSE_BYTES) {
        try {
          await reader.cancel();
        } catch {
        }
        throw new McpSafeError("INTX_MCP_UPSTREAM_RESPONSE_INVALID", "The upstream response exceeded the read-only response limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), bytesRead).toString("utf8");
}
async function readJsonResponse(response) {
  const contentLength = response.headers.get("content-length");
  if (contentLength && (!/^[0-9]+$/.test(contentLength) || Number(contentLength) > MAX_RESPONSE_BYTES)) {
    await cancelResponseBody(response);
    throw new McpSafeError("INTX_MCP_UPSTREAM_RESPONSE_INVALID", "The upstream response exceeded the read-only response limit.");
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    await cancelResponseBody(response);
    throw new McpSafeError("INTX_MCP_UPSTREAM_RESPONSE_INVALID", "The upstream service did not return JSON.");
  }
  const text = await readBoundedResponseText(response);
  try {
    const parsed = JSON.parse(text);
    if (!isRecord(parsed)) {
      throw new Error("response must be an object");
    }
    return redactSensitiveFields(parsed);
  } catch (error) {
    if (error instanceof McpSafeError) throw error;
    throw new McpSafeError("INTX_MCP_UPSTREAM_RESPONSE_INVALID", "The upstream service returned invalid JSON.");
  }
}
function validateTenantScopedProofResponse(value, tenantID) {
  if (!isRecord(value) || value.tenant_id !== tenantID) {
    throw new McpSafeError(
      "INTX_MCP_TENANT_BOUNDARY_VIOLATION",
      "The runtime response did not preserve the configured tenant boundary."
    );
  }
  return value;
}
function statusError(status) {
  if (status === 404) return new McpSafeError("INTX_MCP_NOT_FOUND", "The requested proof was not found.");
  if (status === 401 || status === 403) return new McpSafeError("INTX_MCP_UPSTREAM_AUTHORIZATION_FAILED", "The runtime did not authorize this read-only request.");
  if (status === 408 || status === 429 || status >= 500) {
    return new McpSafeError("INTX_MCP_UPSTREAM_UNAVAILABLE", "The upstream service is temporarily unavailable.");
  }
  return new McpSafeError("INTX_MCP_UPSTREAM_REJECTED", "The upstream service rejected the read-only request.");
}
async function fetchReadOnlyJson(fetchImpl, url, headers, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { method: "GET", headers, signal: controller.signal, redirect: "error" });
    if (!response.ok) throw statusError(response.status);
    return await readJsonResponse(response);
  } catch (error) {
    if (error instanceof McpSafeError) throw error;
    if (controller.signal.aborted) {
      throw new McpSafeError("INTX_MCP_TIMEOUT", "The upstream read-only request timed out.");
    }
    throw new McpSafeError("INTX_MCP_NETWORK_FAILURE", "The upstream read-only service could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}
function configurationErrorForTool(error) {
  const safe = asSafeError(error);
  return toolError({ code: safe.code === "INTX_MCP_INTERNAL_ERROR" ? "INTX_MCP_CONFIGURATION_ERROR" : safe.code, message: safe.message, rpcCode: safe.rpcCode });
}
function createReadonlyMcpServer(options = {}) {
  let configuration;
  let configurationError;
  try {
    configuration = loadRuntimeConfig(options.env ?? process.env);
  } catch (error) {
    configurationError = asSafeError(error);
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  let initializeSeen = false;
  let initialized = false;
  function requireInitialized() {
    if (!initializeSeen || !initialized) {
      throw new McpSafeError("INTX_MCP_LIFECYCLE_ERROR", "Send initialize and notifications/initialized before using tools.");
    }
  }
  async function callTool(params) {
    if (!isRecord(params) || typeof params.name !== "string") {
      return toolError({ code: "INTX_MCP_INPUT_INVALID", message: "tools/call requires a tool name and arguments.", rpcCode: -32602 });
    }
    if (params.name !== "intentrax_verify_public_proof" && params.name !== "intentrax_read_tenant_proof") {
      return toolError({ code: "INTX_MCP_TOOL_NOT_FOUND", message: "This read-only MCP server does not expose that tool.", rpcCode: -32601 });
    }
    if (configurationError || !configuration || typeof fetchImpl !== "function") {
      if (configurationError) return toolError(configurationError);
      return configurationErrorForTool(new McpSafeError("INTX_MCP_CONFIGURATION_ERROR", "A fetch implementation is required."));
    }
    try {
      const proofID = validateProofID(params.arguments);
      if (params.name === "intentrax_verify_public_proof") {
        const headers2 = new Headers({ Accept: "application/json" });
        const data2 = await fetchReadOnlyJson(
          fetchImpl,
          `${configuration.publicVerifyOrigin}/api/public/verify/proof/${encodeURIComponent(proofID)}`,
          headers2,
          configuration.timeoutMs
        );
        return toolResult(data2);
      }
      if (configuration.tenantCredentialError) return toolError(configuration.tenantCredentialError);
      if (!configuration.apiKey || !configuration.tenantId) {
        return toolError({
          code: "INTX_MCP_CONFIGURATION_ERROR",
          message: "The tenant proof tool requires INTENTRAX_MCP_API_KEY and INTENTRAX_MCP_TENANT_ID.",
          rpcCode: -32602
        });
      }
      const headers = new Headers({
        Accept: "application/json",
        "X-Intentrax-Api-Key": configuration.apiKey,
        "X-Intentrax-Tenant-Id": configuration.tenantId,
        "intentrax-api-version": "v1"
      });
      const data = await fetchReadOnlyJson(
        fetchImpl,
        `${configuration.runtimeApiOrigin}/v1/proofs/${encodeURIComponent(proofID)}`,
        headers,
        configuration.timeoutMs
      );
      return toolResult(validateTenantScopedProofResponse(data, configuration.tenantId));
    } catch (error) {
      return toolError(asSafeError(error));
    }
  }
  async function handle(message) {
    if (!isRecord(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      return rpcError(null, { code: "INTX_MCP_INVALID_REQUEST", message: "Invalid JSON-RPC request.", rpcCode: -32600 });
    }
    const notification = isNotification(message);
    const id = requestID(message);
    try {
      switch (message.method) {
        case "initialize": {
          if (!isRecord(message.params)) throw new McpSafeError("INTX_MCP_INPUT_INVALID", "initialize requires an object params value.");
          initializeSeen = true;
          initialized = false;
          const requestedVersion = typeof message.params.protocolVersion === "string" ? message.params.protocolVersion : MCP_PROTOCOL_VERSION;
          const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requestedVersion) ? requestedVersion : MCP_PROTOCOL_VERSION;
          return notification ? void 0 : rpcResult(id, {
            protocolVersion,
            capabilities: { tools: {} },
            serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
            instructions: "Intentrax MCP exposes only public proof verification and tenant-scoped proof reads. It never executes, admits, signs, writes, or claims proof authority."
          });
        }
        case "notifications/initialized":
          if (!initializeSeen) throw new McpSafeError("INTX_MCP_LIFECYCLE_ERROR", "initialize must be sent before notifications/initialized.");
          initialized = true;
          return void 0;
        case "tools/list":
          requireInitialized();
          return notification ? void 0 : rpcResult(id, { tools: TOOLS });
        case "tools/call":
          requireInitialized();
          return notification ? void 0 : rpcResult(id, await callTool(message.params));
        case "ping":
          return notification ? void 0 : rpcResult(id, {});
        default:
          throw new McpSafeError("INTX_MCP_METHOD_NOT_FOUND", "The MCP method is not supported.", -32601);
      }
    } catch (error) {
      if (notification) return void 0;
      return rpcError(id, asSafeError(error));
    }
  }
  return { handle };
}
function startReadonlyMcpStdioServer(options = {}) {
  const server = createReadonlyMcpServer(options);
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  let queue = Promise.resolve();
  let outputQueue = Promise.resolve();
  let pendingRequests = 0;
  let inputFinished = false;
  let inputAborted = false;
  let inputPaused = false;
  let outputUnavailable = false;
  let lineChunks = [];
  let lineBytes = 0;
  let discardingOversizedLine = false;
  let capacityWaiter;
  let outputDrainWaiter;
  let finishPromise;
  let resolveDone = () => {
  };
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });
  function pauseInput() {
    if (inputPaused || inputFinished) return;
    inputPaused = true;
    input.pause();
  }
  function resumeInput() {
    if (!inputPaused || inputFinished || inputAborted) return;
    inputPaused = false;
    input.resume();
  }
  function stopInput() {
    if (inputAborted) return;
    inputAborted = true;
    pauseInput();
    const releaseCapacityWaiter = capacityWaiter;
    capacityWaiter = void 0;
    releaseCapacityWaiter?.();
    if (typeof input.destroy === "function") input.destroy();
  }
  function markOutputUnavailable() {
    if (outputUnavailable) return;
    outputUnavailable = true;
    const releaseDrainWaiter = outputDrainWaiter;
    outputDrainWaiter = void 0;
    releaseDrainWaiter?.();
    stopInput();
  }
  output.on("error", markOutputUnavailable);
  output.on("close", markOutputUnavailable);
  function releaseIngressCapacity() {
    if (!capacityWaiter || pendingRequests > RESUME_PENDING_REQUESTS || inputAborted) return;
    const releaseCapacityWaiter = capacityWaiter;
    capacityWaiter = void 0;
    resumeInput();
    releaseCapacityWaiter();
  }
  async function waitForIngressCapacity() {
    if (inputAborted) return false;
    if (pendingRequests < MAX_PENDING_REQUESTS) return true;
    pauseInput();
    await new Promise((resolve) => {
      capacityWaiter = resolve;
    });
    return !inputAborted;
  }
  function writeOneResponse(payload) {
    if (outputUnavailable) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        output.removeListener("drain", settle);
        if (outputDrainWaiter === settle) outputDrainWaiter = void 0;
        resolve();
      };
      outputDrainWaiter = settle;
      output.once("drain", settle);
      try {
        if (output.write(payload)) settle();
      } catch {
        markOutputUnavailable();
        settle();
      }
    });
  }
  function writeResponse(response) {
    let payload;
    try {
      payload = `${JSON.stringify(response)}
`;
    } catch {
      payload = `${JSON.stringify(rpcError(null, { code: "INTX_MCP_INTERNAL_ERROR", message: "The read-only MCP server could not complete the request.", rpcCode: -32603 }))}
`;
    }
    const written = outputQueue.then(() => writeOneResponse(payload));
    outputQueue = written.then(() => void 0, () => void 0);
    return written;
  }
  function queueLine(line) {
    pendingRequests += 1;
    queue = queue.then(async () => {
      try {
        let message;
        try {
          message = JSON.parse(line.toString("utf8"));
        } catch {
          await writeResponse(rpcError(null, { code: "INTX_MCP_PARSE_ERROR", message: "Invalid JSON-RPC message.", rpcCode: -32700 }));
          return;
        }
        const response = await server.handle(message);
        if (response !== void 0) await writeResponse(response);
      } catch {
        await writeResponse(rpcError(null, { code: "INTX_MCP_INTERNAL_ERROR", message: "The read-only MCP server could not complete the request.", rpcCode: -32603 }));
      } finally {
        pendingRequests -= 1;
        releaseIngressCapacity();
      }
    });
  }
  function resetLine() {
    lineChunks = [];
    lineBytes = 0;
    discardingOversizedLine = false;
  }
  function finishLine() {
    if (discardingOversizedLine) {
      resetLine();
      return;
    }
    let line = Buffer.concat(lineChunks, lineBytes);
    if (line.length > 0 && line[line.length - 1] === 13) line = line.subarray(0, line.length - 1);
    resetLine();
    queueLine(line);
  }
  async function appendLineSegment(segment) {
    if (discardingOversizedLine || segment.length === 0) return;
    if (lineBytes + segment.length > MAX_REQUEST_BYTES) {
      lineChunks = [];
      lineBytes = 0;
      discardingOversizedLine = true;
      await writeResponse(rpcError(null, { code: "INTX_MCP_REQUEST_TOO_LARGE", message: "The JSON-RPC request exceeded the size limit.", rpcCode: -32600 }));
      return;
    }
    lineChunks.push(segment);
    lineBytes += segment.length;
  }
  async function consumeChunk(bytes) {
    let offset = 0;
    for (; ; ) {
      if (!await waitForIngressCapacity()) return false;
      const newline = bytes.indexOf(10, offset);
      if (newline < 0) {
        await appendLineSegment(bytes.subarray(offset));
        return true;
      }
      await appendLineSegment(bytes.subarray(offset, newline));
      finishLine();
      offset = newline + 1;
      if (pendingRequests >= MAX_PENDING_REQUESTS && !await waitForIngressCapacity()) return false;
      if (offset === bytes.length) return true;
    }
  }
  function inputChunkExceedsLimit(chunk) {
    return (typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.byteLength) > MAX_INPUT_CHUNK_BYTES;
  }
  function toInputBuffer(chunk) {
    return Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  }
  function finishInput() {
    if (finishPromise) return finishPromise;
    finishPromise = (async () => {
      inputFinished = true;
      if (!inputAborted && (lineBytes > 0 || discardingOversizedLine) && await waitForIngressCapacity()) finishLine();
      await queue;
      await outputQueue;
      resolveDone();
    })();
    return finishPromise;
  }
  async function consumeInput() {
    try {
      for await (const chunk of input) {
        if (inputAborted) break;
        if (inputChunkExceedsLimit(chunk)) {
          void writeResponse(rpcError(null, { code: "INTX_MCP_REQUEST_TOO_LARGE", message: "The JSON-RPC input exceeded the size limit.", rpcCode: -32600 }));
          stopInput();
          break;
        }
        if (!await consumeChunk(toInputBuffer(chunk))) break;
      }
    } catch {
      if (!inputAborted) await writeResponse(rpcError(null, { code: "INTX_MCP_INTERNAL_ERROR", message: "The read-only MCP server could not complete the request.", rpcCode: -32603 }));
    } finally {
      await finishInput();
    }
  }
  void consumeInput();
  return {
    done,
    close: () => {
      stopInput();
      void finishInput();
    }
  };
}

// stdio.ts
startReadonlyMcpStdioServer();
