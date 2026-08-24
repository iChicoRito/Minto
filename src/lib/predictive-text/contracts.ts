import { z } from "zod";

import { ENHANCEMENT_ERROR_CODES, type EnhancementErrorCode } from "../ai-enhancement/contracts";
import type { HistorySuggestion, PredictiveHistoryEntry } from "./history-ranker";

export const PREDICTIVE_TEXT_API_VERSION = 1 as const;
export const PREDICTIVE_TEXT_REQUEST_KIND = "predictive-text" as const;
export const MIN_AI_PREDICTION_INPUT_CHARACTERS = 12;
export const MAX_AI_PREDICTION_CHARACTERS = 240;
export const MAX_AI_PREDICTION_WORDS = 24;
export const MAX_PREDICTIVE_INPUT_CHARACTERS = 15_000;

export type { HistorySuggestion, PredictiveHistoryEntry };

export type PredictiveTextRequestV1 = {
  kind: "predictive-text";
  version: 1;
  input: string;
};

export type PredictiveTextSuccessV1 = {
  version: 1;
  ok: true;
  requestId: string;
  completion: string;
};

export type PredictiveTextErrorV1 = {
  version: 1;
  ok: false;
  requestId: string;
  error: {
    code: EnhancementErrorCode;
    message: string;
    retryable: boolean;
    retryAfterSeconds?: number;
  };
};

export type PredictiveTextResponseV1 = PredictiveTextSuccessV1 | PredictiveTextErrorV1;

export const PredictiveTextRequestV1Schema = z
  .object({
    kind: z.literal(PREDICTIVE_TEXT_REQUEST_KIND),
    version: z.literal(PREDICTIVE_TEXT_API_VERSION),
    input: z
      .string()
      .min(MIN_AI_PREDICTION_INPUT_CHARACTERS)
      .max(MAX_PREDICTIVE_INPUT_CHARACTERS)
      .refine((input) => input.trim().length > 0, "input must contain non-whitespace text"),
  })
  .strict();

export const PredictiveTextSuccessV1Schema = z
  .object({
    version: z.literal(PREDICTIVE_TEXT_API_VERSION),
    ok: z.literal(true),
    requestId: z.string().min(1),
    completion: z.string().min(1).max(MAX_AI_PREDICTION_CHARACTERS),
  })
  .strict();

export const PredictiveTextErrorV1Schema = z
  .object({
    version: z.literal(PREDICTIVE_TEXT_API_VERSION),
    ok: z.literal(false),
    requestId: z.string().min(1),
    error: z
      .object({
        code: z.enum(ENHANCEMENT_ERROR_CODES),
        message: z.string().min(1),
        retryable: z.boolean(),
        retryAfterSeconds: z.number().int().nonnegative().optional(),
      })
      .strict(),
  })
  .strict();

export const PredictiveTextResponseV1Schema = z.discriminatedUnion("ok", [
  PredictiveTextSuccessV1Schema,
  PredictiveTextErrorV1Schema,
]);

export type PredictiveTextService = {
  complete(request: PredictiveTextRequestV1, options?: { signal?: AbortSignal }): Promise<PredictiveTextSuccessV1>;
};
