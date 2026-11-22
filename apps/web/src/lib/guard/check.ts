import { BROWSER_RULES, FRAMEWORK_RULE, HTML_RULE, MONEY_RULE } from "./boundary-rules"
import { type GuardIssue, type LineRule, matchLines } from "./line-rule"
import { SYNTAX_RULES } from "./syntax-rules"

/** The most non-blank lines one component may hold. The same ceiling as a source file in apps/web. */
export const MAX_COMPONENT_LINES = 100

const LINE_RULES: readonly LineRule[] = [
	...SYNTAX_RULES,
	MONEY_RULE,
	FRAMEWORK_RULE,
	HTML_RULE,
	...BROWSER_RULES,
]

/**
 * The issues of one Svelte file's source: each rule that applies to its path, with the line it breaks
 * and the form to write instead. `file` is the path from apps/web, such as "src/components/ui/Money.svelte".
 * An empty list means the file passes.
 */
export function checkComponent(source: string, file: string): GuardIssue[] {
	const lineIssues = LINE_RULES.filter((rule) => rule.applies?.(file) ?? true).flatMap((rule) =>
		matchLines(source, rule),
	)
	return [...lineIssues, ...fileIssues(source, file)].sort((a, b) => a.line - b.line)
}

/** The rules about a whole `.svelte` file: its script is TypeScript, and it stays short. */
function fileIssues(source: string, file: string): GuardIssue[] {
	if (!file.endsWith(".svelte")) return []
	return [...scriptIssues(source), ...lengthIssues(source)]
}

const SCRIPT_TAG = /<script\b[^>]*>/
const TS_LANG = /\blang=["']ts["']/

function scriptIssues(source: string): GuardIssue[] {
	const issues: GuardIssue[] = []
	source.split("\n").forEach((text, index) => {
		if (SCRIPT_TAG.test(text) && !TS_LANG.test(text)) {
			issues.push({
				rule: "script/lang-ts",
				line: index + 1,
				message: 'A component script is TypeScript: write `<script lang="ts">`.',
			})
		}
	})
	return issues
}

function lengthIssues(source: string): GuardIssue[] {
	const lines = source.split("\n").filter((text) => text.trim() !== "").length
	if (lines <= MAX_COMPONENT_LINES) return []
	return [
		{
			rule: "size/component-lines",
			line: 1,
			message: `This component has ${lines} non-blank lines; the limit is ${MAX_COMPONENT_LINES}. Split it into components.`,
		},
	]
}
