/** One `## ` section of an Answer engine file: the title it states, and the lines under it. */
export interface LlmsSection {
	readonly title: string
	readonly lines: readonly string[]
}

/** One Markdown list item: the words a reader sees, and where they go. */
export function linkLine(text: string, href: string): string {
	return `- [${text}](${href})`
}

/**
 * How many times a Markdown body links one `href`.
 *
 * Counted rather than tested with `toContain`, because a file that must name the Site's address
 * exactly once is not satisfied by naming it twice: two addresses is the ambiguity it forbids.
 */
export function linkCount(markdown: string, href: string): number {
	return markdown.split(`](${href})`).length - 1
}

/** One `## ` section, its lines frozen with it. */
export function section(title: string, lines: readonly string[]): LlmsSection {
	return Object.freeze({ title, lines: Object.freeze([...lines]) })
}

/** One section as Markdown: its `## ` title, a blank line, and its lines. */
function sectionMarkdown(one: LlmsSection): string {
	return `## ${one.title}\n\n${one.lines.join("\n")}`
}

/** A whole Answer engine file: its `# ` title, its `> ` summary, and its sections. */
export function renderLlms(
	title: string,
	summary: string,
	sections: readonly LlmsSection[],
): string {
	const parts = [`# ${title}`, `> ${summary}`, ...sections.map(sectionMarkdown)]
	return `${parts.join("\n\n")}\n`
}
