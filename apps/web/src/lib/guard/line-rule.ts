/** One thing a component must not contain: what it is called, where it is, and what to write instead. */
export interface LineRule {
	/** The rule's name, such as "legacy/export-let". Printed with each issue. */
	readonly rule: string
	/** Matched line by line. A line that matches is an issue on that line. */
	readonly pattern: RegExp
	/** Says the Svelte 5 form to write instead. */
	readonly message: string
	/** Whether the rule applies to a file, by its path from apps/web. Every file when left out. */
	readonly applies?: (file: string) => boolean
}

/** A problem with one Svelte file: the rule it breaks, the line, and the form to write instead. */
export interface GuardIssue {
	readonly rule: string
	readonly line: number
	readonly message: string
}

/** The issues of one pattern over a source text, one per line that matches it. */
export function matchLines(source: string, rule: LineRule): GuardIssue[] {
	const issues: GuardIssue[] = []
	source.split("\n").forEach((text, index) => {
		if (rule.pattern.test(text)) {
			issues.push({ rule: rule.rule, line: index + 1, message: rule.message })
		}
	})
	return issues
}
