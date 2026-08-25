export type ModelCompletionInput = {
  systemInstruction: string;
  userContent: string;
  reasoningEffort: "low" | "high" | "max";
  completionBudget: 2048 | 8192 | 32768;
  responseFormat?: "json_object" | "text";
};

export type ModelCompletionMetadata = {
  provider: string;
  model: string;
  generationId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
};

export interface ModelAdapter {
  complete(
    input: ModelCompletionInput,
    options: { signal: AbortSignal; onMetadata?: (metadata: ModelCompletionMetadata) => void },
  ): Promise<string>;
}
