/**
 * The rendered markup with every Details disclosure and its contents taken out, so a test can prove a
 * figure is not shown at full weight. The scan follows the tags in order and keeps a nesting depth, so a
 * disclosure inside a disclosure is removed with its parent.
 */
export function outsideDetails(html: string): string {
	let outside = ""
	let depth = 0
	let last = 0
	for (const match of html.matchAll(/<\/?details\b[^>]*>/gi)) {
		if (depth === 0) outside += html.slice(last, match.index)
		last = match.index + match[0].length
		depth = match[0].startsWith("</") ? Math.max(0, depth - 1) : depth + 1
	}
	if (depth === 0) outside += html.slice(last)
	return outside
}

/** The contents of every Details disclosure, so a test can prove a raw figure is kept there. */
export function insideDetails(html: string): string {
	let inside = ""
	let depth = 0
	let start = 0
	for (const match of html.matchAll(/<\/?details\b[^>]*>/gi)) {
		if (!match[0].startsWith("</") && depth === 0) start = match.index + match[0].length
		else if (match[0].startsWith("</") && depth === 1) {
			inside += html.slice(start, match.index)
		}
		depth = match[0].startsWith("</") ? Math.max(0, depth - 1) : depth + 1
	}
	return inside
}

/** One `<section>` of the rendered markup, named by its first heading, and the Details summaries it holds. */
export interface SectionDetails {
	readonly label: string
	readonly count: number
}

interface SectionSpan {
	readonly inner: number
	readonly end: number
	count: number
}

/** Every section's span, innermost last, from the section tags in document order. */
function sectionSpans(html: string): SectionSpan[] {
	const spans: SectionSpan[] = []
	const open: number[] = []
	for (const match of html.matchAll(/<(\/?)section\b[^>]*>/gi)) {
		if (match[1] === "") {
			open.push(match.index + match[0].length)
			continue
		}
		const inner = open.pop()
		if (inner !== undefined) spans.push({ inner, end: match.index, count: 0 })
	}
	return spans.sort((a, b) => a.inner - b.inner)
}

/** The index of every summary whose visible text is "Details". */
function detailsAt(html: string): number[] {
	const found: number[] = []
	for (const match of html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)) {
		const text = (match[1] ?? "").replace(/<[^>]+>/g, "").trim()
		if (text === "Details") found.push(match.index)
	}
	return found
}

/** The innermost section that holds `at`, which is the last span to have opened before it. */
function innermostAt(sections: readonly SectionSpan[], at: number): SectionSpan | undefined {
	for (let index = sections.length - 1; index >= 0; index--) {
		const section = sections[index]
		if (section !== undefined && section.inner <= at && at < section.end) return section
	}
	return undefined
}

/**
 * The guard counts per section, not per result: two Details of one result in different sections would pass.
 * Results are not marked in the markup, and Home cards legitimately repeat commands, so a section is the unit.
 *
 * The "Details" summaries of each `<section>`, counted in the innermost section that holds them, so a card
 * inside a page counts on its own. A result is one section, and it shows one Details, never two.
 */
export function detailsPerSection(html: string): SectionDetails[] {
	const sections = sectionSpans(html)
	let loose = 0
	for (const at of detailsAt(html)) {
		const section = innermostAt(sections, at)
		if (section === undefined) loose++
		else section.count++
	}
	const counted = sections.map((section) => ({
		label: labelOf(html, section),
		count: section.count,
	}))
	if (loose > 0) counted.push({ label: "outside a section", count: loose })
	return counted
}

/** A section's label: the first heading it holds itself, before any section nested in it. */
function labelOf(html: string, section: SectionSpan): string {
	const nested = html.indexOf("<section", section.inner)
	const own = html.slice(
		section.inner,
		nested === -1 || nested > section.end ? section.end : nested,
	)
	const heading = /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(own)
	return heading?.[1]?.replace(/<[^>]+>/g, "").trim() ?? `section at ${section.inner}`
}
