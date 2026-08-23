/**
 * Light-strength polisher (roadmap R-09, tracker T-19): collapses a parsed
 * prompt into ONE bare sentence — the material's definition-of-done for
 * light output is exactly that single polished sentence (L497).
 *
 * AUTHORED HEURISTIC (decision D7): the material gives NO algorithm for
 * producing this sentence; every branch, phrase, and clause below is
 * authored copywriting logic kept dependency-free and data-adjacent so it
 * can be tuned without touching the rest of the engine.
 *
 * Branches (first match wins):
 *   1. fix-class action with a subject → "Investigate and resolve the …"
 *      plus a domain-aware preservation clause ("while preserving existing
 *      <domain> behavior."), honoring the material's fix example.
 *   2. any other action+subject → capitalized "<Action> <subject>", plus an
 *      ", honoring: …" clause before the final period when constraints were
 *      parsed.
 *   3. subject without an action → capitalized subject sentence. Unreachable
 *      from parsePrompt today (it only extracts a subject after an action
 *      verb) but kept total for hand-built ParsedPrompt values.
 *   4. otherwise → trimmed raw with first char capitalized and a trailing
 *      period ensured; empty raw yields the empty string.
 *
 * The ", honoring: a; b" suffix applies to every branch that composes a new
 * sentence from slots (2 and 3); branches 1 and 4 pass through their own
 * fixed wording / user text untouched.
 *
 * Determinism: charAt/toUpperCase only — no locale APIs, clock, or
 * randomness. Purity: relative import into the parser types layer only;
 * never React, Next.js, DOM APIs, or storage.
 */
import type { ParsedPrompt } from "../parser/parse-prompt";

/** Uppercases only the first character; leaves the rest untouched. */
function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** ", honoring: a; b" suffix, or "" when no constraint was parsed. */
function honoringSuffix(constraints: readonly string[]): string {
  return constraints.length === 0 ? "" : `, honoring: ${constraints.join("; ")}`;
}

/**
 * Polishes a parsed prompt into the bare light-strength sentence. Pure and
 * deterministic: same inputs → same output, no side effects.
 */
export function polishLight(parsed: ParsedPrompt, raw: string): string {
  if (parsed.action === "fix" && parsed.subject !== undefined) {
    const base = `Investigate and resolve the ${parsed.subject}`;
    const preservationClause =
      parsed.domain === undefined
        ? " while preserving existing behavior."
        : ` while preserving existing ${parsed.domain} behavior.`;
    return base + preservationClause;
  }

  if (parsed.action !== undefined && parsed.subject !== undefined) {
    return `${capitalizeFirst(parsed.action)} ${parsed.subject}${honoringSuffix(parsed.constraints)}.`;
  }

  if (parsed.subject !== undefined) {
    return `${capitalizeFirst(parsed.subject)}${honoringSuffix(parsed.constraints)}.`;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return "";
  }
  const sentence = capitalizeFirst(trimmed);
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

/**
 * Grammar-only correction: fixes spelling, spacing, capitalization and
 * punctuation while preserving the original intent. No preset, no markdown,
 * just plain corrected text. Used when no sections are selected.
 */
export function correctGrammarOnly(raw: string): string {
  let text = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\u2019/g, "'");
  if (text.length === 0) return "";

  const typoMap: Record<string, string> = {
    writting: "writing",
    writen: "written",
    gramar: "grammar",
    grammer: "grammar",
    teh: "the",
    adn: "and",
    becuase: "because",
    recieve: "receive",
    seperate: "separate",
    occured: "occurred",
    occassion: "occasion",
    accomodate: "accommodate",
    definately: "definitely",
    neccessary: "necessary",
    occassionally: "occasionally",
    beleive: "believe",
    freind: "friend",
    alot: "a lot",
    thier: "their",
    thereis: "there is",
    cant: "can't",
    dont: "don't",
    doesnt: "doesn't",
    didnt: "didn't",
    wont: "won't",
    isnt: "isn't",
    arent: "aren't",
    wasnt: "wasn't",
    werent: "weren't",
    hasnt: "hasn't",
    havent: "haven't",
    hadnt: "hadn't",
    im: "I'm",
    ive: "I've",
    id: "I'd",
    ill: "I'll",
    youre: "you're",
    theyre: "they're",
    weare: "we are",
    its: "its", // handled contextually below
  };

  for (const [wrong, correct] of Object.entries(typoMap)) {
    const regex = new RegExp(`\\b${wrong}\\b`, "gi");
    text = text.replace(regex, (match) => {
      const isCapitalized = match[0] === match[0].toUpperCase();
      const isAllCaps = match === match.toUpperCase();
      if (isAllCaps) return correct.toUpperCase();
      if (isCapitalized) return correct.charAt(0).toUpperCase() + correct.slice(1);
      return correct;
    });
  }

  // Contextual fix: "its very|really|so|quite" -> "it's very..."
  text = text.replace(/\bits\s+(very|really|so|quite|just|always|never|still|already)\b/gi, (m, w) => {
    const isCap = m[0] === m[0].toUpperCase();
    return `${isCap ? "It's" : "it's"} ${w}`;
  });

  // Fix standalone "i" -> "I"
  text = text.replace(/(^|\s)i(\s|$|[.,!?])/g, "$1I$2");

  // Normalize spacing around punctuation
  text = text.replace(/\s+([.,!?;:])/g, "$1");
  text = text.replace(/([.,!?;:])([^\s"')\]])/g, "$1 $2");

  // Split into sentences, capitalize each, ensure ending punctuation
  const sentences = text.split(/(?<=[.!?])\s+/);
  const corrected = sentences
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => {
      let c = s.charAt(0).toUpperCase() + s.slice(1);
      if (!/[.!?]$/.test(c)) c += ".";
      return c;
    })
    .join(" ");

  return corrected.replace(/\s+/g, " ").trim();
}
