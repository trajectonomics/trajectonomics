/** A Markdown link whose target is a site path on this host, its title kept. */
const MARKDOWN_LINK = /(\]\(\s*)(\/(?!\/)[^)\s]*)/g

/** `content` with every Markdown link on this host rewritten to its absolute URL; other links are untouched. */
export function absoluteDocsLinks(content: string, origin: string): string {
	return content.replace(
		MARKDOWN_LINK,
		(_match, prefix: string, path: string) => `${prefix}${origin}${path}`,
	)
}
