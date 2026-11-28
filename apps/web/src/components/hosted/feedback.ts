/** The three faces a visitor can tap on the hosted Demo, in the order they are shown. */
export const FEEDBACK_CHOICES = [
	{ id: "good", label: "Like it" },
	{ id: "okay", label: "It's okay" },
	{ id: "confusing", label: "Confusing" },
] as const

/**
 * The Demo feedback form on GitHub, prefilled with the tapped face and the page it was tapped on.
 * GitHub fills an issue form's fields from query parameters named by the field's id (`rating`, `page`).
 * Only the pathname goes in, never the query string.
 */
export function feedbackIssueUrl(label: string, pathname: string): string {
	const title = encodeURIComponent(`Demo: ${label} on ${pathname}`)
	const rating = encodeURIComponent(label)
	const page = encodeURIComponent(pathname)
	return `https://github.com/trajectonomics/trajectonomics/issues/new?template=demo-feedback.yml&title=${title}&rating=${rating}&page=${page}`
}
