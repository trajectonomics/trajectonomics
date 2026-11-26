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
