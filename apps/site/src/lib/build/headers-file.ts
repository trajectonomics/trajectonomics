/** One block of a `_headers` file: the path pattern it matches, and the headers it sets. */
export interface HeadersBlock {
	readonly pattern: string
	/** Header names lower-cased, because a header name is case-insensitive. */
	readonly headers: ReadonlyMap<string, string>
}

/** Whether a line is indented, which makes it a header line rather than a pattern. */
function isIndented(line: string): boolean {
	return line.startsWith(" ") || line.startsWith("\t")
}

/** One `Name: value` header line, or `undefined` when the line carries no separator. */
function headerOf(line: string): readonly [string, string] | undefined {
	const separator = line.indexOf(":")
	if (separator <= 0) return undefined
	return [line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim()]
}

/** A block being read, before it is returned as a read-only one. */
interface MutableBlock {
	readonly pattern: string
	readonly headers: Map<string, string>
}

/**
 * The blocks of a Cloudflare `_headers` file ([Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/headers/)):
 * a non-indented line names the pattern a block applies to, the indented lines below it set
 * `Name: value`, and a line that starts with `#` is a comment.
 */
export function parseHeadersFile(content: string): readonly HeadersBlock[] {
	const blocks: MutableBlock[] = []
	for (const raw of content.split(/\r?\n/)) {
		const line = raw.trim()
		if (line.length === 0 || line.startsWith("#")) continue
		const current = blocks.at(-1)
		if (isIndented(raw)) {
			const header = headerOf(line)
			if (header !== undefined && current !== undefined) {
				current.headers.set(header[0], header[1])
			}
			continue
		}
		blocks.push({ pattern: line, headers: new Map() })
	}
	return blocks
}

/** The headers one block sets, or `undefined` when no block matches the pattern. */
export function headersFor(
	blocks: readonly HeadersBlock[],
	pattern: string,
): ReadonlyMap<string, string> | undefined {
	return blocks.find((block) => block.pattern === pattern)?.headers
}
