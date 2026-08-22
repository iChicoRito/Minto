import type { PromptTaskType } from "../prompt-engine/types";

type DatasetSeed = { taskType: PromptTaskType; prompt: string };

const SEEDS: readonly DatasetSeed[] = [
  { taskType: "bug-fix", prompt: "Fix the broken login bug" },
  { taskType: "feature", prompt: "Add and implement a new export capability" },
  { taskType: "code-review", prompt: "Review the API code for quality" },
  { taskType: "refactor", prompt: "Refactor the service and simplify the structure" },
  { taskType: "testing", prompt: "Add test coverage and a regression spec" },
  { taskType: "documentation", prompt: "Document the setup guide in the README" },
  { taskType: "rewrite", prompt: "Rewrite the announcement with a clearer tone" },
  { taskType: "summarize", prompt: "Summarize the report into a short brief" },
  { taskType: "research", prompt: "Research the options and analyze the findings" },
  { taskType: "comparison", prompt: "Compare the options and explain the trade-off" },
  { taskType: "ui-review", prompt: "Run a design-review for usability and layout" },
  { taskType: "image-prompt", prompt: "Create a Midjourney illustration render" },
  { taskType: "general", prompt: "Please help with a personal request" },
];

const VARIATIONS = [
  "for a small team",
  "for the next release",
  "with clear steps",
  "without changing existing behavior",
  "and keep the result concise",
  "for a production application",
  "using the supplied context",
  "with a practical example",
  "and state the final outcome",
] as const;

export type EngineDatasetCase = {
  id: string;
  input: string;
  expectedTaskType: PromptTaskType;
};

export const ENGINE_DATASET: readonly EngineDatasetCase[] = SEEDS.flatMap((seed) =>
  VARIATIONS.map((variation, index) => ({
    id: `${seed.taskType}-${String(index + 1).padStart(2, "0")}`,
    input: `${seed.prompt} ${variation}.`,
    expectedTaskType: seed.taskType,
  })),
).concat([
  { id: "general-10", input: "fix it", expectedTaskType: "general" },
  { id: "general-11", input: "Please help me", expectedTaskType: "general" },
  { id: "general-12", input: "Review this code and fix the bugs", expectedTaskType: "bug-fix" },
]);
