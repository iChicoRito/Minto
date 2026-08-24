import type { EnhancementRequestV1, EnhancementResultV1 } from "../lib/ai-enhancement/contracts";
import { ENHANCEMENT_ERROR_CODES } from "../lib/ai-enhancement/contracts";
import { createPredictiveTextClient, PredictiveTextClientError } from "../lib/predictive-text/client";
import {
  MAX_AI_PREDICTION_CHARACTERS,
  MAX_PREDICTIVE_INPUT_CHARACTERS,
  MIN_AI_PREDICTION_INPUT_CHARACTERS,
  PREDICTIVE_TEXT_API_VERSION,
  PREDICTIVE_TEXT_REQUEST_KIND,
  PredictiveTextErrorV1Schema,
  PredictiveTextRequestV1Schema,
  PredictiveTextResponseV1Schema,
  PredictiveTextSuccessV1Schema,
} from "../lib/predictive-text/contracts";
import { findHistorySuggestion, type PredictiveHistoryEntry } from "../lib/predictive-text/history-ranker";
import { createAiHttpHandler } from "../server/ai/http-handler";
import { createPredictiveTextOrchestrator } from "../server/ai/predictive-text-orchestrator";
import assert from "node:assert/strict";

type VerificationCase = { name: string; run: () => void | Promise<void> };

const NOW = Date.UTC(2026, 7, 24);

function history(
  id: string,
  originalPrompt: string,
  createdAt = NOW,
  options: Partial<Pick<PredictiveHistoryEntry, "taskType" | "category">> = {},
): PredictiveHistoryEntry {
  return {
    id,
    createdAt,
    originalPrompt,
    taskType: options.taskType ?? "general",
    category: options.category ?? "general",
  };
}

export const PREDICTIVE_TEXT_CASES: readonly VerificationCase[] = [
  {
    name: "empty, whitespace, and one-character input are ignored",
    run: () => {
      const entries = [history("one", "A useful continuation")];
      assert.equal(findHistorySuggestion("", entries, NOW), null);
      assert.equal(findHistorySuggestion("   \n", entries, NOW), null);
      assert.equal(findHistorySuggestion("A", entries, NOW), null);
    },
  },
  {
    name: "exact prefix returns the historical suffix",
    run: () => {
      const result = findHistorySuggestion(
        "Create a weekly",
        [history("sales", "Create a weekly sales report for the management team")],
        NOW,
      );
      assert.deepEqual(result?.completion, " sales report for the management team");
      assert.equal(result?.match, "prefix");
    },
  },
  {
    name: "prefix comparison is case insensitive and preserves suffix text",
    run: () => {
      const result = findHistorySuggestion(
        "create a weekly",
        [history("case", "Create a weekly SALES Report\nFor Management")],
        NOW,
      );
      assert.equal(result?.completion, " SALES Report\nFor Management");
    },
  },
  {
    name: "exact candidates outrank contextual candidates",
    run: () => {
      const result = findHistorySuggestion(
        "Create a weekly",
        [
          history("context", "Draft a weekly sales report for the team"),
          history("exact", "Create a weekly product report"),
        ],
        NOW,
      );
      assert.equal(result?.historyId, "exact");
      assert.equal(result?.match, "prefix");
    },
  },
  {
    name: "recent exact candidates beat old equal-frequency candidates",
    run: () => {
      const result = findHistorySuggestion(
        "Plan a launch",
        [
          history("old", "Plan a launch retrospective", NOW - 90 * 24 * 60 * 60 * 1_000),
          history("new", "Plan a launch checklist", NOW - 1_000),
        ],
        NOW,
      );
      assert.equal(result?.historyId, "new");
    },
  },
  {
    name: "repeated continuation can beat a moderately newer candidate",
    run: () => {
      const repeated = Array.from({ length: 5 }, (_, index) =>
        history(`repeat-${index}`, "Write a release note for the team", NOW - (index + 2) * 24 * 60 * 60 * 1_000),
      );
      const result = findHistorySuggestion(
        "Write a",
        [...repeated, history("new", "Write a project brief", NOW - 1_000)],
        NOW,
      );
      assert.equal(result?.historyId.startsWith("repeat-"), true);
      assert.equal(result?.completion, " release note for the team");
    },
  },
  {
    name: "contextual matching uses an append-compatible historical anchor",
    run: () => {
      const result = findHistorySuggestion(
        "Draft a weekly",
        [history("weekly", "Create a weekly sales report for management", NOW, { taskType: "documentation" })],
        NOW,
      );
      assert.equal(result?.match, "contextual");
      assert.equal(result?.completion, " sales report for management");
    },
  },
  {
    name: "weak contextual overlap is rejected",
    run: () => {
      const result = findHistorySuggestion(
        "Need a weekly",
        [history("weak", "Create a monthly sales report for management")],
        NOW,
      );
      assert.equal(result, null);
    },
  },
  {
    name: "boundary whitespace and multiline suffixes are normalized",
    run: () => {
      const result = findHistorySuggestion(
        "Create a weekly ",
        [history("multiline", "Create a weekly\n sales report\nfor management")],
        NOW,
      );
      assert.equal(result?.completion, "sales report\nfor management");
    },
  },
  {
    name: "invalid history candidates and prompt overflow are ignored",
    run: () => {
      const result = findHistorySuggestion(
        "Valid prefix",
        [history("equal", "Valid prefix"), history("blank", ""), history("too-large", `${"x".repeat(15_000)} suffix`)],
        NOW,
      );
      assert.equal(result, null);
    },
  },
  {
    name: "predictive request schema is strict at inclusive bounds",
    run: () => {
      const valid = {
        kind: PREDICTIVE_TEXT_REQUEST_KIND,
        version: PREDICTIVE_TEXT_API_VERSION,
        input: "x".repeat(MIN_AI_PREDICTION_INPUT_CHARACTERS),
      };
      assert.equal(PredictiveTextRequestV1Schema.safeParse(valid).success, true);
      assert.equal(
        PredictiveTextRequestV1Schema.safeParse({ ...valid, input: "x".repeat(MAX_PREDICTIVE_INPUT_CHARACTERS) })
          .success,
        true,
      );
      assert.equal(PredictiveTextRequestV1Schema.safeParse({ ...valid, input: "  " }).success, false);
      assert.equal(PredictiveTextRequestV1Schema.safeParse({ ...valid, extra: true }).success, false);
      assert.equal(PredictiveTextRequestV1Schema.safeParse({ ...valid, kind: "enhance" }).success, false);
      assert.equal(PredictiveTextRequestV1Schema.safeParse({ ...valid, version: 2 }).success, false);
    },
  },
  {
    name: "predictive success and shared error schemas reject malformed payloads",
    run: () => {
      assert.equal(
        PredictiveTextSuccessV1Schema.safeParse({
          version: 1,
          ok: true,
          requestId: "req-1",
          completion: "x".repeat(MAX_AI_PREDICTION_CHARACTERS),
        }).success,
        true,
      );
      assert.equal(
        PredictiveTextSuccessV1Schema.safeParse({
          version: 1,
          ok: true,
          requestId: "req-1",
          completion: "x".repeat(MAX_AI_PREDICTION_CHARACTERS + 1),
        }).success,
        false,
      );
      for (const code of ENHANCEMENT_ERROR_CODES) {
        assert.equal(
          PredictiveTextErrorV1Schema.safeParse({
            version: 1,
            ok: false,
            requestId: `req-${code}`,
            error: { code, message: "safe", retryable: true, retryAfterSeconds: 3 },
          }).success,
          true,
        );
      }
      assert.equal(
        PredictiveTextResponseV1Schema.safeParse({ version: 1, ok: true, completion: "missing id" }).success,
        false,
      );
      assert.equal(
        PredictiveTextResponseV1Schema.safeParse({
          version: 1,
          ok: false,
          requestId: "req-1",
          error: { code: "not-a-code", message: "bad", retryable: false },
        }).success,
        false,
      );
    },
  },
  {
    name: "predictive client sends only the public request and validates endpoints",
    run: async () => {
      let received: { url: string; init: RequestInit } | undefined;
      const fetchImpl = (async (url, init) => {
        received = { url: String(url), init: init ?? {} };
        return new Response(JSON.stringify({ version: 1, ok: true, requestId: "req-client", completion: " suffix" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;
      const client = createPredictiveTextClient({ endpoint: "https://api.example/predict", fetchImpl });
      const result = await client.complete({ kind: "predictive-text", version: 1, input: "Create a report" });
      assert.equal(result.completion, " suffix");
      assert.equal(received?.url, "https://api.example/predict");
      assert.equal(received?.init.credentials, "omit");
      assert.equal(received?.init.cache, "no-store");
      assert.deepEqual(JSON.parse(String(received?.init.body)), {
        kind: "predictive-text",
        version: 1,
        input: "Create a report",
      });
      createPredictiveTextClient({ endpoint: "/api/enhance", fetchImpl });
      assert.throws(() => createPredictiveTextClient({ endpoint: "http://api.example/predict", fetchImpl }));
      assert.throws(() => createPredictiveTextClient({ endpoint: "//external.example/path", fetchImpl }));
      createPredictiveTextClient({
        endpoint: "http://localhost:3000/api/enhance",
        fetchImpl,
        allowLocalHttpForTests: true,
      });
    },
  },
  {
    name: "predictive client distinguishes abort timeout network and malformed responses safely",
    run: async () => {
      const errorOf = async (client: ReturnType<typeof createPredictiveTextClient>) => {
        try {
          await client.complete({ kind: "predictive-text", version: 1, input: "Create a report" });
        } catch (error) {
          return error;
        }
        return null;
      };
      const network = await errorOf(
        createPredictiveTextClient({
          endpoint: "https://api.example/predict",
          fetchImpl: (async () => {
            throw new Error("provider secret body");
          }) as typeof fetch,
        }),
      );
      assert.ok(network instanceof PredictiveTextClientError);
      assert.equal(network.code, "network");
      assert.equal(network.message.includes("provider secret"), false);

      const malformed = await errorOf(
        createPredictiveTextClient({
          endpoint: "https://api.example/predict",
          fetchImpl: (async () => new Response("provider secret body", { status: 200 })) as typeof fetch,
        }),
      );
      assert.ok(malformed instanceof PredictiveTextClientError);
      assert.equal(malformed.code, "invalid_response");
      assert.equal(malformed.message.includes("provider secret"), false);

      const abortController = new AbortController();
      const callerAbort = createPredictiveTextClient({
        endpoint: "https://api.example/predict",
        fetchImpl: (async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), {
              once: true,
            });
          })) as typeof fetch,
      }).complete(
        { kind: "predictive-text", version: 1, input: "Create a report" },
        { signal: abortController.signal },
      );
      abortController.abort();
      await assert.rejects(callerAbort, (error: PredictiveTextClientError) => error.code === "aborted");

      const timedOut = createPredictiveTextClient({
        endpoint: "https://api.example/predict",
        timeoutMs: 1,
        fetchImpl: (async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("timeout", "AbortError")), {
              once: true,
            });
          })) as typeof fetch,
      }).complete({ kind: "predictive-text", version: 1, input: "Create a report" });
      await assert.rejects(timedOut, (error: PredictiveTextClientError) => error.code === "timeout");
    },
  },
  {
    name: "predictive orchestrator acquires admission and returns a bounded suffix",
    run: async () => {
      const order: string[] = [];
      let modelInput:
        | {
            systemInstruction: string;
            userContent: string;
            reasoningEffort: string;
            completionBudget: number;
            responseFormat?: string;
          }
        | undefined;
      const orchestrator = createPredictiveTextOrchestrator({
        admission: {
          acquire: async () => {
            order.push("acquire");
            return {
              status: "admitted",
              leaseId: "predictive-lease",
              retryAfterMs: 0,
              retryAfterSeconds: 0,
              activeCount: 1,
              prunedCount: 0,
            };
          },
          release: async () => {
            order.push("release");
          },
        },
        model: {
          complete: async (input) => {
            order.push("model");
            modelInput = input;
            return JSON.stringify({ completion: " sales report" });
          },
        },
        requestId: () => "req-predictive",
      });
      const result = await orchestrator.complete(
        { kind: "predictive-text", version: 1, input: "Create a weekly" },
        { signal: new AbortController().signal },
      );
      assert.deepEqual(order, ["acquire", "model", "release"]);
      assert.equal(result.completion, " sales report");
      assert.equal(modelInput?.reasoningEffort, "low");
      assert.equal(modelInput?.completionBudget, 2048);
      assert.equal(modelInput?.responseFormat, "json_object");
      assert.equal(modelInput?.systemInstruction.includes("Create a weekly"), false);
      assert.deepEqual(JSON.parse(modelInput?.userContent ?? "{}"), { sourcePrefix: "Create a weekly" });
    },
  },
  {
    name: "predictive orchestrator normalizes repeated prefixes and releases on failures",
    run: async () => {
      const released: string[] = [];
      const create = (output: string) =>
        createPredictiveTextOrchestrator({
          admission: {
            acquire: async () => ({
              status: "admitted",
              leaseId: "lease",
              retryAfterMs: 0,
              retryAfterSeconds: 0,
              activeCount: 1,
              prunedCount: 0,
            }),
            release: async (leaseId) => {
              released.push(leaseId);
            },
          },
          model: { complete: async () => output },
          requestId: () => "req-normalize",
        });
      const normalized = await create(JSON.stringify({ completion: "Create a weekly\r\n sales report   " })).complete(
        { kind: "predictive-text", version: 1, input: "Create a weekly" },
        { signal: new AbortController().signal },
      );
      assert.equal(normalized.completion, "\n sales report");
      await assert.rejects(
        create(JSON.stringify({ completion: "" })).complete(
          { kind: "predictive-text", version: 1, input: "Create a weekly" },
          { signal: new AbortController().signal },
        ),
      );
      assert.equal(released.length, 2);
      await assert.rejects(
        create(JSON.stringify({ completion: "x".repeat(MAX_AI_PREDICTION_CHARACTERS + 1) })).complete(
          { kind: "predictive-text", version: 1, input: "Create a weekly" },
          { signal: new AbortController().signal },
        ),
        (error: { code?: string }) => error.code === "output_too_large",
      );
    },
  },
  {
    name: "shared handler routes predictive and enhancement requests independently",
    run: async () => {
      let predictorCalls = 0;
      let enhancementCalls = 0;
      const handler = createAiHttpHandler({
        allowedOrigin: "https://test.example",
        predictor: {
          complete: async () => {
            predictorCalls += 1;
            return { version: 1, ok: true, requestId: "predictor", completion: " suffix" };
          },
        },
        orchestrator: {
          enhance: async () => {
            enhancementCalls += 1;
            return { version: 1, ok: true, requestId: "enhancer", result: validEnhancementResult() };
          },
        },
        requestId: () => "req-handler",
      });
      const headers = { Origin: "https://test.example", "Content-Type": "application/json" };
      const predictive = await handler(
        new Request("https://api.example/enhance", {
          method: "POST",
          headers,
          body: JSON.stringify({ kind: "predictive-text", version: 1, input: "Create a report" }),
        }),
      );
      const predictivePayload = await predictive.json();
      assert.equal(predictive.status, 200);
      assert.equal(predictivePayload.completion, " suffix");
      const enhancement = await handler(
        new Request("https://api.example/enhance", {
          method: "POST",
          headers,
          body: JSON.stringify(validEnhancementRequest()),
        }),
      );
      assert.equal(enhancement.status, 200);
      assert.equal(predictorCalls, 1);
      assert.equal(enhancementCalls, 1);
    },
  },
  {
    name: "shared handler preserves common rejection and response behavior",
    run: async () => {
      let predictorCalls = 0;
      const handler = createAiHttpHandler({
        allowedOrigin: "https://test.example",
        predictor: {
          complete: async () => {
            predictorCalls += 1;
            return { version: 1, ok: true, requestId: "predictor", completion: " suffix" };
          },
        },
        orchestrator: {
          enhance: async () => ({ version: 1, ok: true, requestId: "x", result: validEnhancementResult() }),
        },
        requestId: () => "req-rejections",
      });
      const base = { Origin: "https://test.example", "Content-Type": "application/json" };
      const malformed = await handler(
        new Request("https://api.example/enhance", {
          method: "POST",
          headers: base,
          body: JSON.stringify({ kind: "predictive-text", version: 1, input: "   " }),
        }),
      );
      assert.equal(malformed.status, 400);
      assert.equal((await malformed.json()).error.code, "invalid_request");
      const unknownKind = await handler(
        new Request("https://api.example/enhance", {
          method: "POST",
          headers: base,
          body: JSON.stringify({ kind: "unknown", version: 1, input: "Create a report" }),
        }),
      );
      assert.equal(unknownKind.status, 400);
      assert.equal((await unknownKind.json()).error.code, "invalid_request");
      const wrongMethod = await handler(
        new Request("https://api.example/enhance", {
          method: "GET",
          headers: { Origin: "https://test.example" },
        }),
      );
      assert.equal(wrongMethod.status, 405);
      assert.equal(wrongMethod.headers.get("Access-Control-Allow-Origin"), "https://test.example");
      assert.equal(predictorCalls, 0);
    },
  },
];

function validEnhancementRequest(): EnhancementRequestV1 {
  return {
    version: 1,
    prompt: "fix the login flow",
    selection: { kind: "manual", taskType: "bug-fix" },
    level: "standard",
    sections: ["objective"],
  };
}

function validEnhancementResult(): EnhancementResultV1 {
  return {
    analysis: {
      original: "fix the login flow",
      category: "development",
      taskType: "bug-fix",
      confidence: 90,
      action: "fix",
      subject: "login flow",
      technologies: [],
      constraints: [],
      requirements: [],
      enhancementLevel: "standard",
    },
    classification: {
      taskType: "bug-fix",
      category: "development",
      confidence: 90,
      band: "high",
      scores: {
        "bug-fix": 1,
        feature: 0,
        "code-review": 0,
        refactor: 0,
        testing: 0,
        documentation: 0,
        rewrite: 0,
        summarize: 0,
        research: 0,
        comparison: 0,
        "ui-review": 0,
        "image-prompt": 0,
        general: 0,
      },
      fallbackToGeneral: false,
      topMatches: ["bug-fix"],
    },
    resolved: {
      presetId: null,
      taskType: "bug-fix",
      category: "development",
      level: "standard",
      sections: ["objective"],
      reasoningEffort: "high",
    },
    markdown: "# Objective\n\nFix the login flow.",
    generation: { kind: "ai", provider: "openrouter", model: "stealth/ox-alpha" },
  };
}
