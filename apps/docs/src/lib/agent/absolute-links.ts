import { withDocsBase } from "../docs-links"

/** A Markdown link whose target is a site path on this host, its title kept. */
const MARKDOWN_LINK = /(\]\(\s*)(\/(?!\/)[^)\s]*)/g

/**
 * `content` with every Markdown link into the Portal made absolute under the Site's `/docs` mount;
 * a link to the Site Home, the blog or the data site is made absolute at the root, and an external
 * link is untouched (ADR 0017).
 */
export function absoluteDocsLinks(content: string, origin: string): string {
	return content.replace(
		MARKDOWN_LINK,
		(_match, prefix: string, path: string) => `${prefix}${origin}${withDocsBase(path)}`,
	)
}
