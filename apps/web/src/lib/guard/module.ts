import { BROWSER_RULES, FRAMEWORK_RULE, MONEY_RULE } from "./boundary-rules"
import { type GuardIssue, type LineRule, matchLines } from "./line-rule"
import { STORE_RULE } from "./syntax-rules"

/** The rules a plain `.ts` module keeps wherever it is: no store, no React or Astro, no browser call. */
const MODULE_RULES: readonly LineRule[] = [STORE_RULE, FRAMEWORK_RULE, ...BROWSER_RULES]

/** Whether a module sits beside components, where a money string must not become a number either. */
function isComponentHelper(file: string): boolean {
	return file.startsWith("src/components/")
}

const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/

/** The source with each comment line blanked, so prose that names `document` or `localStorage` is not code. */
function withoutCommentLines(source: string): string {
	return source
		.split("\n")
		.map((text) => (COMMENT_LINE.test(text) ? "" : text))
		.join("\n")
}

/**
 * The issues of one plain TypeScript module, by its path from apps/web. A helper is held to the same
 * boundaries as a component, so a forbidden call cannot hide in a `.ts` file beside one. The Svelte
 * syntax rules do not apply: `export let` is ordinary TypeScript here.
 */
export function checkModule(source: string, file: string): GuardIssue[] {
	const rules = isComponentHelper(file) ? [...MODULE_RULES, MONEY_RULE] : MODULE_RULES
	const code = withoutCommentLines(source)
	return rules
		.filter((rule) => rule.applies?.(file) ?? true)
		.flatMap((rule) => matchLines(code, rule))
		.sort((a, b) => a.line - b.line)
}
