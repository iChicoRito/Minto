/**
 * Template registry (roadmap R-10, tracker T-21): every task type maps to
 * exactly one enhancement recipe. Completeness is compile-enforced by the
 * Record<PromptTaskType, PromptTemplate> annotation — a task type added to
 * the union without a recipe fails `tsc`, and an unknown key fails
 * excess-property checking. Entries are declared in PromptTaskType union
 * order for deterministic iteration.
 *
 * Purity: relative imports into the templates/types layers only.
 */

import type { PromptTaskType } from "../types";
import { imagePromptTemplate } from "./design/image-prompt";
import { uiReviewTemplate } from "./design/ui-review";
import { bugFixTemplate } from "./development/bug-fix";
import { codeReviewTemplate } from "./development/code-review";
import { documentationTemplate } from "./development/documentation";
import { featureTemplate } from "./development/feature";
import { refactorTemplate } from "./development/refactor";
import { testingTemplate } from "./development/testing";
import { generalTemplate } from "./general/general";
import { comparisonTemplate } from "./research/comparison";
import { researchTemplate } from "./research/research";
import type { PromptTemplate } from "./template-types";
import { rewriteTemplate } from "./writing/rewrite";
import { summarizeTemplate } from "./writing/summarize";

export const TEMPLATE_REGISTRY: Readonly<Record<PromptTaskType, PromptTemplate>> = {
  "bug-fix": bugFixTemplate,
  feature: featureTemplate,
  "code-review": codeReviewTemplate,
  refactor: refactorTemplate,
  testing: testingTemplate,
  documentation: documentationTemplate,
  rewrite: rewriteTemplate,
  summarize: summarizeTemplate,
  research: researchTemplate,
  comparison: comparisonTemplate,
  "ui-review": uiReviewTemplate,
  "image-prompt": imagePromptTemplate,
  general: generalTemplate,
};
