import { getPromptPreset, PROMPT_PRESET_IDS, type PromptPresetId } from "../../lib/prompt-presets";
import { type PromptCategory, type PromptTaskType, resolveTemplate, type SectionId } from "../../prompt-engine";
import { SECTION_TITLES } from "../../prompt-engine/templates/template-types";

export type SectionFormat = "paragraphs" | "bullets";

export type ResolvedSectionPolicy = {
  id: SectionId;
  title: string;
  format: SectionFormat;
  guidance: string;
};

export type PresetAiPolicy = {
  presetId: PromptPresetId;
  purpose: string;
  sections: readonly ResolvedSectionPolicy[];
  sectionGuidance: Readonly<Partial<Record<SectionId, string>>>;
};

export type TaskAiPolicy = {
  taskType: PromptTaskType;
  category: PromptCategory;
  purpose: string;
  sections: readonly ResolvedSectionPolicy[];
  sectionGuidance: Readonly<Partial<Record<SectionId, string>>>;
};

const SECTION_FORMATS: Readonly<Record<SectionId, SectionFormat>> = {
  objective: "paragraphs",
  problem: "paragraphs",
  scope: "paragraphs",
  requirements: "bullets",
  constraints: "bullets",
  verification: "bullets",
  "acceptance-criteria": "bullets",
  context: "paragraphs",
  implementation: "paragraphs",
  "review-scope": "paragraphs",
  "review-areas": "bullets",
  "output-format": "paragraphs",
  "research-scope": "paragraphs",
  "key-questions": "bullets",
  audience: "paragraphs",
  outline: "bullets",
  "source-content": "paragraphs",
  "style-notes": "paragraphs",
  "key-points": "bullets",
  "comparison-scope": "paragraphs",
  criteria: "bullets",
  subject: "paragraphs",
  "style-direction": "paragraphs",
  "technical-requirements": "bullets",
};

const COMMON_SECTION_GUIDANCE: Readonly<Record<SectionId, string>> = {
  objective: "State the desired outcome in one precise, testable sentence.",
  problem: "Describe the relevant problem without inventing facts not present in the source.",
  scope: "Define what is in scope, what is out of scope, and the boundary of the work.",
  requirements: "List concrete requirements and distinguish functional from quality requirements.",
  constraints: "List explicit constraints, compatibility needs, risks, and non-goals.",
  verification: "Describe evidence, checks, or examples that prove the result is correct.",
  "acceptance-criteria": "Turn the requested outcome into observable acceptance checks.",
  context: "Preserve the useful background, actors, dependencies, and operating conditions.",
  implementation: "Describe the implementation shape without prescribing unsupported details.",
  "review-scope": "Identify the artifact, boundaries, and perspective the review must cover.",
  "review-areas": "List the areas to inspect and connect each issue to concrete evidence.",
  "output-format": "Specify the expected response structure, level of detail, and delivery format.",
  "research-scope": "Set the research boundary, timeframe, and relevant evidence scope.",
  "key-questions": "List answerable questions that drive the investigation or analysis.",
  audience: "Name the intended audience and the knowledge level the response should assume.",
  outline: "Arrange the deliverable into a useful sequence of topics and examples.",
  "source-content": "Identify the source material to transform and preserve its relevant meaning.",
  "style-notes": "Specify tone, voice, clarity, and stylistic choices for the output.",
  "key-points": "Capture the important points while avoiding unsupported additions or omissions.",
  "comparison-scope": "Define the options and the comparison boundary before weighing them.",
  criteria: "State the decision criteria and how each option will be assessed.",
  subject: "Describe the subject to depict, including the details that must remain salient.",
  "style-direction": "Set the visual language, medium, mood, and presentation direction.",
  "technical-requirements": "List resolution, aspect, camera, rendering, and other technical constraints.",
};

type SectionGuidance = Partial<Record<SectionId, string>>;

function makeSection(id: SectionId, guidance: string): ResolvedSectionPolicy {
  return { id, title: SECTION_TITLES[id], format: SECTION_FORMATS[id], guidance };
}

function guidanceFor(overrides: SectionGuidance): Readonly<Record<SectionId, string>> {
  return { ...COMMON_SECTION_GUIDANCE, ...overrides };
}

function standardSections(taskType: PromptTaskType): readonly SectionId[] {
  return resolveTemplate(taskType).sections.standard;
}

function makeTaskPolicy(
  taskType: PromptTaskType,
  category: PromptCategory,
  purpose: string,
  overrides: SectionGuidance,
): TaskAiPolicy {
  const sectionGuidance = guidanceFor(overrides);
  return {
    taskType,
    category,
    purpose,
    sections: standardSections(taskType).map((id) => makeSection(id, sectionGuidance[id])),
    sectionGuidance,
  };
}

function makePresetPolicy(presetId: PromptPresetId, purpose: string, overrides: SectionGuidance): PresetAiPolicy {
  const sectionGuidance = guidanceFor(overrides);
  const preset = getPromptPreset(presetId);
  if (preset === undefined) throw new Error(`Missing trusted preset: ${presetId}`);

  return {
    presetId,
    purpose,
    sections: preset.sections.map((id) => makeSection(id, sectionGuidance[id])),
    sectionGuidance,
  };
}

export const MANUAL_TASK_POLICIES = {
  "bug-fix": makeTaskPolicy(
    "bug-fix",
    "development",
    "Turn a bug report into a bounded fix with evidence that the regression is resolved.",
    {
      objective: "State the intended fix and the expected user-visible outcome.",
      problem: "Contrast the actual behavior with the expected behavior and capture reproduction context.",
      scope: "Bound the affected system, reproduction path, and work that is explicitly out of scope.",
      requirements: "List the reproduction details and functional requirements for the correction.",
      constraints: "Preserve compatibility, identify constraints, and record relevant non-goals.",
      verification: "Require regression proof, focused checks, and evidence that the expected behavior holds.",
    },
  ),
  feature: makeTaskPolicy(
    "feature",
    "development",
    "Turn a feature idea into an implementable request with clear value, boundaries, requirements, and acceptance.",
    {
      objective: "State the user value and the outcome the feature should create.",
      context: "Capture the users, workflow, dependencies, and product context behind the feature.",
      scope: "Define the feature boundary, non-goals, and the scope of the first useful increment.",
      requirements: "Separate functional behavior from nonfunctional requirements and quality attributes.",
      constraints: "Record technical, product, compatibility, and delivery constraints.",
      implementation: "Describe integration points and implementation concerns without inventing architecture.",
      verification: "Specify checks and evidence that demonstrate the feature works as intended.",
      "acceptance-criteria": "Express acceptance as observable scenarios that confirm user value and completeness.",
    },
  ),
  "code-review": makeTaskPolicy(
    "code-review",
    "development",
    "Turn a code review request into a bounded inspection with evidence-based, prioritized findings.",
    {
      objective: "State what the review should establish about correctness, risk, or maintainability.",
      "review-scope": "Name the code, change boundary, execution context, and risks included in the review.",
      "review-areas": "Prioritize actionable findings by severity and support each with concrete evidence.",
      constraints: "Record compatibility, style, security, and scope constraints for the review.",
      "output-format": "Return prioritized findings with severity, evidence, impact, and a practical remedy.",
    },
  ),
  refactor: makeTaskPolicy(
    "refactor",
    "development",
    "Turn a refactoring goal into a safe change that preserves behavior and proves the boundaries remain intact.",
    {
      objective: "State the structural improvement while making behavior preservation explicit.",
      context: "Capture the current design, dependencies, and reason the refactor is needed.",
      scope: "Define the refactoring boundary, non-goals, and behavior that must not change.",
      requirements: "List the desired structural and maintainability outcomes.",
      constraints: "Protect public contracts, compatibility, performance, and other invariants.",
      verification: "Require regression evidence showing behavior is preserved after the change.",
    },
  ),
  testing: makeTaskPolicy(
    "testing",
    "development",
    "Turn a testing goal into reproducible scenarios with assertions, edge cases, and evidence.",
    {
      objective: "State the behavior or risk the test work must establish.",
      scope: "Define the system boundary and the scenarios included in the test effort.",
      requirements: "Specify setup, scenarios, assertions, edge cases, and required test coverage.",
      verification: "Require test evidence, failure diagnostics, and confidence that the risk is covered.",
    },
  ),
  documentation: makeTaskPolicy(
    "documentation",
    "development",
    "Turn a documentation request into an accurate deliverable for a defined audience and use case.",
    {
      objective: "State what the documentation should enable the reader to understand or do.",
      audience: "Identify the audience, prior knowledge, and reader questions.",
      requirements: "List source-of-truth facts, topics, examples, voice, and the required deliverable.",
      outline: "Order the topics into a useful path with examples where they clarify the source material.",
      "output-format": "Specify the documentation format, navigation, examples, and delivery constraints.",
    },
  ),
  rewrite: makeTaskPolicy(
    "rewrite",
    "writing",
    "Turn source text into a clearer rewrite while preserving its meaning for the intended audience.",
    {
      objective: "State the rewrite outcome, audience, and intended communication effect.",
      "source-content": "Identify the source text and preserve its factual meaning and important qualifications.",
      requirements: "Specify audience, tone, clarity, grammar, flow, and the required deliverable.",
      "style-notes": "Set the voice, tone, register, and stylistic changes without changing intent.",
      "output-format": "Describe the final form and any structural or length requirements.",
    },
  ),
  summarize: makeTaskPolicy(
    "summarize",
    "writing",
    "Turn source material into a faithful summary with controlled scope, audience, length, and omissions.",
    {
      objective: "State the summary purpose and what the reader must understand afterward.",
      "source-content": "Define the source scope and preserve the source's important qualifications.",
      "key-points": "Select key points with fidelity to the source and make omissions or uncertainty visible.",
      audience: "Set the reader's context and the level of explanation needed.",
      "output-format": "Set the target length, structure, and summary deliverable.",
    },
  ),
  research: makeTaskPolicy(
    "research",
    "research",
    "Turn a research request into a scoped investigation with quality evidence and an explicit synthesis.",
    {
      objective: "State the research goal and the decision or understanding it should support.",
      "research-scope": "Define the topic scope, timeframe, recency needs, and evidence boundary.",
      "key-questions": "List the questions that must be answered by the research.",
      requirements: "Require source quality, evidence, synthesis, uncertainty, and citations.",
      "output-format": "Specify how evidence, synthesis, limitations, and citations should be delivered.",
    },
  ),
  comparison: makeTaskPolicy(
    "comparison",
    "research",
    "Turn an options question into a fair comparison grounded in criteria, evidence, trade-offs, and constraints.",
    {
      objective: "State the decision the comparison should support and the recommendation standard.",
      "comparison-scope": "Name the options and comparison boundary, including excluded alternatives.",
      criteria: "Define the criteria and their relative importance before weighing options.",
      requirements: "Require evidence, trade-offs, constraints, and a reasoned recommendation.",
      "output-format": "Present comparable evidence, caveats, trade-offs, and the recommendation clearly.",
    },
  ),
  "ui-review": makeTaskPolicy(
    "ui-review",
    "design",
    "Turn an interface review into evidence-based, prioritized improvements across the user journey.",
    {
      objective: "State the user outcome and experience quality the review should evaluate.",
      "review-scope": "Define the journey, screens, flows, and user context included in the review.",
      "review-areas": "Inspect heuristics, accessibility, evidence, severity, and prioritized usability issues.",
      constraints: "Record design-system, platform, accessibility, and implementation constraints.",
      "output-format": "Return prioritized issues with evidence, severity, impact, and actionable recommendations.",
    },
  ),
  "image-prompt": makeTaskPolicy(
    "image-prompt",
    "design",
    "Turn a visual idea into a precise image-generation brief covering subject, composition, style, and constraints.",
    {
      objective: "State the intended image result and the visual communication goal.",
      subject: "Describe the subject, action, setting, and salient details to depict.",
      "style-direction": "Specify composition, style, lighting, color, camera, and rendering direction.",
      "technical-requirements": "List medium, aspect, resolution, negative constraints, and other technical limits.",
      "output-format": "Return a clean image prompt with positive and negative constraints separated clearly.",
    },
  ),
  general: makeTaskPolicy(
    "general",
    "general",
    "Turn an open-ended request into a clear objective, useful requirements, and a verifiable outcome.",
    {
      objective: "State the useful outcome without assuming a specialized task that the source does not establish.",
      requirements: "List the explicit request, useful context, and any concrete deliverable requirements.",
      verification: "State how the response can be checked against the request and its constraints.",
    },
  ),
} as const satisfies Record<PromptTaskType, TaskAiPolicy>;

export const PRESET_AI_POLICIES = {
  "bug-fix": makePresetPolicy("bug-fix", MANUAL_TASK_POLICIES["bug-fix"].purpose, {
    objective: "State the concrete fix and expected behavior for the reported defect.",
    requirements: "Capture actual versus expected behavior, reproduction/context, and functional requirements.",
    verification: "Require regression proof that the defect no longer reproduces.",
  }),
  "build-feature": makePresetPolicy("build-feature", MANUAL_TASK_POLICIES.feature.purpose, {
    objective: "State the user value and outcome of the feature to build.",
    requirements: "Separate functional behavior, nonfunctional requirements, and delivery constraints.",
    verification: "Define acceptance evidence for the completed feature.",
  }),
  "code-review": makePresetPolicy("code-review", MANUAL_TASK_POLICIES["code-review"].purpose, {
    objective: "State the correctness, risk, or maintainability question the review must answer.",
    "review-scope": "Define the code boundary and review scope before examining findings.",
    "output-format": "Return actionable findings ordered by severity and backed by evidence.",
  }),
  refactor: makePresetPolicy("refactor", MANUAL_TASK_POLICIES.refactor.purpose, {
    objective: "State the structural improvement and the behavior that must be preserved.",
    requirements: "Define the desired boundary and maintainability outcomes without changing behavior.",
    verification: "Require regression evidence for the preserved behavior.",
  }),
  testing: makePresetPolicy("testing", MANUAL_TASK_POLICIES.testing.purpose, {
    objective: "State the system behavior and risk the tests must establish.",
    requirements: "Specify setup, scenarios, assertions, edge cases, and coverage evidence.",
    verification: "Require reproducible test results and useful failure evidence.",
  }),
  documentation: makePresetPolicy("documentation", MANUAL_TASK_POLICIES.documentation.purpose, {
    objective: "State the documentation deliverable and what its audience should be able to do.",
    requirements: "Capture source truth, topics, examples, voice, and deliverable requirements.",
    "output-format": "Set the document structure, navigation, and delivery format.",
  }),
  "api-design": makePresetPolicy(
    "api-design",
    "Design an API contract around its consumers, validation, errors, auth, versioning, and compatibility.",
    {
      objective: "State the consumer outcome and the API contract the design must make reliable.",
      requirements:
        "Define consumers, contracts, validation, errors, auth, versioning, compatibility, and contract tests.",
      verification: "Require contract tests and compatibility evidence for representative consumers.",
    },
  ),
  database: makePresetPolicy(
    "database",
    "Design a database change around entities, schema integrity, queries, migrations, performance, and rollback.",
    {
      objective: "State the data outcome and operational guarantees the database design must provide.",
      requirements:
        "Define entities, schema, integrity, queries, migration, performance, rollback, and data verification.",
      verification: "Require migration, query, rollback, performance, and data verification evidence.",
    },
  ),
  rewrite: makePresetPolicy("rewrite", MANUAL_TASK_POLICIES.rewrite.purpose, {
    objective: "State the audience-facing rewrite outcome while preserving the source meaning.",
    requirements: "Define source, audience, tone, clarity, flow, voice, intent, and deliverable.",
    "output-format": "Describe the final rewrite form and length or structure constraints.",
  }),
  summarize: makePresetPolicy("summarize", MANUAL_TASK_POLICIES.summarize.purpose, {
    objective: "State the summary purpose, audience, and desired level of compression.",
    "key-points": "Preserve key-point fidelity and make important omissions or uncertainty clear.",
    "output-format": "Set source scope, target length, audience, and summary structure.",
  }),
  "improve-writing": makePresetPolicy(
    "improve-writing",
    "Improve prose clarity, grammar, flow, voice, and audience fit while preserving intent and factual meaning.",
    {
      objective: "State the writing improvement outcome and the audience it should serve.",
      requirements: "Focus on clarity, grammar, flow, voice, intent, audience, and factual meaning.",
      "output-format": "Return the improved writing in the requested form without adding unsupported facts.",
    },
  ),
  "research-topic": makePresetPolicy(
    "research-topic",
    "Research a topic through scoped questions, quality and recent sources, evidence, synthesis, uncertainty, and citations.",
    {
      objective: "State the topic, research purpose, and decision or understanding sought.",
      "key-questions": "Turn the topic into answerable research questions with explicit scope.",
      "output-format": "Deliver evidence, synthesis, recency, uncertainty, and citations in a traceable structure.",
    },
  ),
  "compare-options": makePresetPolicy("compare-options", MANUAL_TASK_POLICIES.comparison.purpose, {
    objective: "State the decision and recommendation the options comparison should support.",
    criteria: "Define options, criteria, evidence, trade-offs, constraints, and recommendation logic.",
    "output-format": "Make the options comparable and show the recommendation with its caveats.",
  }),
  "analyze-information": makePresetPolicy(
    "analyze-information",
    "Analyze supplied information through explicit questions, assumptions, evidence, limitations, and conclusions.",
    {
      objective: "State the analytical outcome and the decision or conclusion the source should support.",
      "key-questions": "Set analytical questions, assumptions, evidence standards, and relevant limitations.",
      "output-format": "Separate evidence, reasoning, limitations, and conclusions without inventing source facts.",
    },
  ),
  "ui-design": makePresetPolicy(
    "ui-design",
    "Design an interface around users, flows, hierarchy, states, responsiveness, accessibility, and the design system.",
    {
      objective: "State the user outcome and interface experience the design should enable.",
      "review-areas": "Define users, flows, hierarchy, states, responsiveness, accessibility, and design-system use.",
      "output-format": "Describe the interface direction and its key states in a handoff-ready structure.",
    },
  ),
  "ux-review": makePresetPolicy(
    "ux-review",
    "Review a user experience through the journey, heuristics, accessibility, evidence, severity, and prioritized issues.",
    {
      objective: "State the user journey outcome and experience risks the review must surface.",
      "review-areas": "Evaluate journey, heuristics, accessibility, evidence, severity, and prioritized issues.",
      "output-format": "Return prioritized, evidence-based UX issues with actionable recommendations.",
    },
  ),
  "image-prompt": makePresetPolicy("image-prompt", MANUAL_TASK_POLICIES["image-prompt"].purpose, {
    objective: "State the visual result and communication goal for the generated image.",
    "style-direction": "Specify subject, composition, style, lighting, color, camera, and render direction.",
    "output-format": "Separate the positive image prompt from negative constraints and technical limits.",
  }),
  "grammar-correction": makePresetPolicy(
    "grammar-correction",
    "Correct grammar, spelling, punctuation, and structure while preserving the original meaning and intent; return only the corrected plain text without extra sections, headings, or formatting.",
    {},
  ),
} as const satisfies Record<PromptPresetId, PresetAiPolicy>;

export function sectionPolicyFor(policy: PresetAiPolicy | TaskAiPolicy, sectionId: SectionId): ResolvedSectionPolicy {
  const configured = policy.sections.find((section) => section.id === sectionId);
  return configured ?? makeSection(sectionId, policy.sectionGuidance[sectionId] ?? COMMON_SECTION_GUIDANCE[sectionId]);
}

export function allowedSectionIds(taskType: PromptTaskType): readonly SectionId[] {
  const sections = resolveTemplate(taskType).sections;
  return [...new Set([...sections.standard, ...sections.light, ...sections.detailed])];
}

export { PROMPT_PRESET_IDS };
