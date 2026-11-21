/** The digits a content hash names, shortened to twelve characters, without its algorithm prefix. */
export function shortHash(contentHash: string): string {
	const digest = contentHash.slice(contentHash.lastIndexOf(":") + 1)
	return digest.slice(0, 12)
}
