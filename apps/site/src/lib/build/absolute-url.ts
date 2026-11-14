/** A scheme, or a protocol-relative `//`, which makes a URL name a host instead of a path. */
const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i

/** Whether a URL is absolute or protocol-relative, so it names a host rather than the Site's path. */
export function isAbsoluteUrl(url: string): boolean {
	return ABSOLUTE.test(url.trim())
}
