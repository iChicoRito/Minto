const MAX_PROMPT_CHARACTERS = 15_000;
const DAY_MS = 24 * 60 * 60 * 1_000;
const RECENCY_HALF_LIFE_DAYS = 30;

export type PromptTaskType =
  | "bug-fix"
  | "feature"
  | "code-review"
  | "refactor"
  | "testing"
  | "documentation"
  | "rewrite"
  | "summarize"
  | "research"
  | "comparison"
  | "ui-review"
  | "image-prompt"
  | "general";

export type PromptCategory = "development" | "writing" | "research" | "design" | "general";

export type PredictiveHistoryEntry = {
  id: string;
  createdAt: number;
  originalPrompt: string;
  taskType: PromptTaskType;
  category: PromptCategory;
};

export type HistorySuggestion = {
  source: "history";
  match: "prefix" | "contextual";
  completion: string;
  historyId: string;
  score: number;
};

type Token = { key: string; start: number; end: number };
type Candidate = HistorySuggestion & { createdAt: number };

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
]);

const TASK_KEYWORDS: Readonly<Record<Exclude<PromptTaskType, "general">, readonly string[]>> = {
  "bug-fix": ["bug", "fix", "error", "issue", "broken", "debug"],
  feature: ["build", "create", "implement", "feature", "add", "develop"],
  "code-review": ["review", "audit", "inspect"],
  refactor: ["refactor", "simplify", "reorganize", "cleanup"],
  testing: ["test", "testing", "verify", "coverage", "spec"],
  documentation: ["document", "documentation", "draft", "write", "report", "guide", "readme"],
  rewrite: ["rewrite", "rephrase", "edit", "polish"],
  summarize: ["summarize", "summary", "condense", "shorten"],
  research: ["research", "investigate", "explore", "analyze"],
  comparison: ["compare", "comparison", "versus", "options"],
  "ui-review": ["interface", "layout", "ux", "usability", "accessibility"],
  "image-prompt": ["image", "illustration", "visual", "render"],
};

const TASK_CATEGORIES: Readonly<Record<PromptTaskType, PromptCategory>> = {
  "bug-fix": "development",
  feature: "development",
  "code-review": "development",
  refactor: "development",
  testing: "development",
  documentation: "development",
  rewrite: "writing",
  summarize: "writing",
  research: "research",
  comparison: "research",
  "ui-review": "design",
  "image-prompt": "design",
  general: "general",
};

const TOKEN_PATTERN = /[\p{L}\p{N}]/u;

export function findHistorySuggestion(
  input: string,
  history: readonly PredictiveHistoryEntry[],
  now: number,
): HistorySuggestion | null {
  const trimmedInput = input.trim();
  if (trimmedInput.length < 2) return null;

  const usableHistory = history.filter(
    (entry) =>
      typeof entry.originalPrompt === "string" &&
      entry.originalPrompt.trim().length > 0 &&
      entry.originalPrompt.length <= MAX_PROMPT_CHARACTERS,
  );
  if (usableHistory.length === 0) return null;

  const frequency = createFrequencyMaps(usableHistory);
  const exact = usableHistory
    .map((entry) => createExactCandidate(input, entry, now, frequency))
    .filter((candidate): candidate is Candidate => candidate !== null);
  if (exact.length > 0) return toPublicSuggestion(selectBest(exact));

  if (trimmedInput.length < 8) return null;
  const currentTokens = tokenize(input);
  const currentMeaningful = meaningfulTokens(currentTokens);
  if (currentMeaningful.length < 2) return null;
  const currentIntent = inferIntent(currentMeaningful);
  const contextual = usableHistory
    .map((entry) =>
      createContextualCandidate(input, currentTokens, currentMeaningful, currentIntent, entry, now, frequency),
    )
    .filter((candidate): candidate is Candidate => candidate !== null);
  if (contextual.length === 0) return null;
  return toPublicSuggestion(selectBest(contextual));
}

function createExactCandidate(
  input: string,
  entry: PredictiveHistoryEntry,
  now: number,
  frequency: FrequencyMaps,
): Candidate | null {
  if (!startsWithComparison(entry.originalPrompt, input)) return null;
  const rawCompletion = entry.originalPrompt.slice(input.length);
  const completion = normalizeBoundary(input, rawCompletion);
  if (completion.trim().length === 0 || exceedsPromptLimit(input, completion)) return null;

  const recency = recencyScore(entry.createdAt, now);
  const candidateFrequency = frequencyScore(entry, completion, frequency);
  return {
    source: "history",
    match: "prefix",
    completion,
    historyId: entry.id,
    score: 0.55 * recency + 0.45 * candidateFrequency,
    createdAt: entry.createdAt,
  };
}

function createContextualCandidate(
  input: string,
  currentTokens: readonly Token[],
  currentMeaningful: readonly Token[],
  currentIntent: Intent,
  entry: PredictiveHistoryEntry,
  now: number,
  frequency: FrequencyMaps,
): Candidate | null {
  if (startsWithComparison(entry.originalPrompt, input)) return null;
  const historicalTokens = tokenize(entry.originalPrompt);
  const anchor = findAnchor(currentTokens, historicalTokens);
  if (anchor === null) return null;

  const rawCompletion = entry.originalPrompt.slice(anchor.end);
  const completion = normalizeBoundary(input, rawCompletion);
  if (completion.trim().length === 0 || exceedsPromptLimit(input, completion)) return null;

  const historicalThroughAnchor = historicalTokens.slice(0, anchor.tokenIndex + 1);
  const historicalMeaningful = meaningfulTokens(historicalThroughAnchor);
  const overlap = currentMeaningful.filter((token) =>
    historicalMeaningful.some((other) => other.key === token.key),
  ).length;
  const coverage = overlap / currentMeaningful.length;
  const anchorStrength = Math.min(1, anchor.tokenCount / 3);
  const intent = intentScore(currentIntent, entry);
  const relevance = 0.55 * coverage + 0.3 * anchorStrength + 0.15 * intent;
  if (relevance < 0.45) return null;

  const recency = recencyScore(entry.createdAt, now);
  const candidateFrequency = frequencyScore(entry, completion, frequency);
  return {
    source: "history",
    match: "contextual",
    completion,
    historyId: entry.id,
    score: 0.7 * relevance + 0.2 * recency + 0.1 * candidateFrequency,
    createdAt: entry.createdAt,
  };
}

function findAnchor(
  currentTokens: readonly Token[],
  historicalTokens: readonly Token[],
): {
  tokenIndex: number;
  tokenCount: number;
  end: number;
} | null {
  for (let tokenCount = Math.min(4, currentTokens.length); tokenCount >= 1; tokenCount -= 1) {
    const suffix = currentTokens.slice(currentTokens.length - tokenCount);
    if (meaningfulTokens(suffix).length === 0) continue;
    for (let historicalIndex = 0; historicalIndex <= historicalTokens.length - tokenCount; historicalIndex += 1) {
      const matches = suffix.every(
        (token, suffixIndex) => historicalTokens[historicalIndex + suffixIndex]?.key === token.key,
      );
      if (matches) {
        const finalIndex = historicalIndex + tokenCount - 1;
        const finalToken = historicalTokens[finalIndex];
        if (finalToken !== undefined) return { tokenIndex: finalIndex, tokenCount, end: finalToken.end };
      }
    }
  }
  return null;
}

type FrequencyMaps = {
  fullPromptCounts: ReadonlyMap<string, number>;
  phraseCounts: ReadonlyMap<string, number>;
  taskCounts: ReadonlyMap<PromptTaskType, number>;
  corpusSize: number;
};

function createFrequencyMaps(history: readonly PredictiveHistoryEntry[]): FrequencyMaps {
  const fullPromptCounts = new Map<string, number>();
  const phraseCounts = new Map<string, number>();
  const taskCounts = new Map<PromptTaskType, number>();

  for (const entry of history) {
    const promptKey = comparisonKey(entry.originalPrompt);
    fullPromptCounts.set(promptKey, (fullPromptCounts.get(promptKey) ?? 0) + 1);
    const tokens = meaningfulTokens(tokenize(entry.originalPrompt));
    const recordPhrases = new Set<string>();
    for (let size = 1; size <= 3; size += 1) {
      for (let start = 0; start + size <= tokens.length; start += 1) {
        const phrase = tokens
          .slice(start, start + size)
          .map((token) => token.key)
          .join(" ");
        recordPhrases.add(phrase);
      }
    }
    for (const phrase of recordPhrases) phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
    if (entry.taskType !== "general") taskCounts.set(entry.taskType, (taskCounts.get(entry.taskType) ?? 0) + 1);
  }

  return { fullPromptCounts, phraseCounts, taskCounts, corpusSize: Math.max(1, history.length) };
}

function frequencyScore(entry: PredictiveHistoryEntry, completion: string, frequency: FrequencyMaps): number {
  const fullCount = frequency.fullPromptCounts.get(comparisonKey(entry.originalPrompt)) ?? 0;
  const completionTokens = meaningfulTokens(tokenize(completion));
  const phraseCounts = [];
  for (let size = 1; size <= Math.min(3, completionTokens.length); size += 1) {
    const phrase = completionTokens
      .slice(0, size)
      .map((token) => token.key)
      .join(" ");
    phraseCounts.push(frequency.phraseCounts.get(phrase) ?? 0);
  }
  const phraseCount = Math.max(fullCount, ...phraseCounts, 0);
  const normalizedPhrase = normalizeCount(phraseCount, frequency.corpusSize);
  const normalizedTask =
    entry.taskType === "general"
      ? 0
      : normalizeCount(frequency.taskCounts.get(entry.taskType) ?? 0, frequency.corpusSize);
  return 0.75 * normalizedPhrase + 0.25 * normalizedTask;
}

function normalizeCount(count: number, corpusSize: number): number {
  return Math.log2(count + 1) / Math.log2(corpusSize + 1);
}

type Intent = { taskType: PromptTaskType; category: PromptCategory };

function inferIntent(tokens: readonly Token[]): Intent {
  let taskType: PromptTaskType = "general";
  let bestMatches = 0;
  for (const [candidate, keywords] of Object.entries(TASK_KEYWORDS) as [
    Exclude<PromptTaskType, "general">,
    readonly string[],
  ][]) {
    const matches = tokens.filter((token) => keywords.includes(token.key)).length;
    if (matches > bestMatches) {
      taskType = candidate;
      bestMatches = matches;
    }
  }
  return { taskType, category: TASK_CATEGORIES[taskType] };
}

function intentScore(current: Intent, entry: PredictiveHistoryEntry): number {
  if (current.taskType !== "general" && current.taskType === entry.taskType) return 1;
  if (current.category !== "general" && current.category === entry.category) return 0.5;
  return 0;
}

function selectBest(candidates: readonly Candidate[]): Candidate {
  return [...candidates].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.createdAt !== left.createdAt) return right.createdAt - left.createdAt;
    return left.historyId.localeCompare(right.historyId);
  })[0] as Candidate;
}

function toPublicSuggestion(candidate: Candidate): HistorySuggestion {
  const { createdAt: _createdAt, ...suggestion } = candidate;
  return suggestion;
}

function tokenize(value: string): Token[] {
  const tokens: Token[] = [];
  let start = -1;
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    const char = codePoint === undefined ? "" : String.fromCodePoint(codePoint);
    const isTokenChar = char.length > 0 && TOKEN_PATTERN.test(char);
    if (isTokenChar && start === -1) start = index;
    if (!isTokenChar && start !== -1) {
      const raw = value.slice(start, index);
      tokens.push({ key: comparisonKey(raw), start, end: index });
      start = -1;
    }
    index += char.length > 0 ? char.length : 1;
  }
  if (start !== -1) tokens.push({ key: comparisonKey(value.slice(start)), start, end: value.length });
  return tokens;
}

function meaningfulTokens(tokens: readonly Token[]): Token[] {
  return tokens.filter((token) => token.key.length >= 3 && !STOP_WORDS.has(token.key));
}

function comparisonKey(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function startsWithComparison(value: string, prefix: string): boolean {
  if (prefix.length > value.length) return false;
  return comparisonKey(value.slice(0, prefix.length)) === comparisonKey(prefix);
}

function normalizeBoundary(input: string, completion: string): string {
  if (!/\s/.test(input.slice(-1))) return completion;
  return completion.replace(/^\s+/, "");
}

function exceedsPromptLimit(input: string, completion: string): boolean {
  return input.length + completion.length > MAX_PROMPT_CHARACTERS;
}

function recencyScore(createdAt: number, now: number): number {
  const ageInDays =
    Number.isFinite(createdAt) && Number.isFinite(now) ? Math.max(0, now - createdAt) / DAY_MS : Infinity;
  return Math.exp((-Math.log(2) * ageInDays) / RECENCY_HALF_LIFE_DAYS);
}
