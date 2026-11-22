/** A fence line: the character that opens it, how many of that character, and its info string. */
interface FenceLine {
	readonly marker: "`" | "~"
	readonly length: number
	readonly info: string
}

/** A closed fenced block: its opening and closing line indexes (0-based) and its body. */
export interface FenceBlock {
	readonly open: FenceLine
	readonly start: number
	readonly end: number
	readonly body: string
}

function fenceOf(line: string): FenceLine | undefined {
	const match = /^\s*(`{3,}|~{3,})(.*)$/.exec(line)
	const spec = match?.[1]
	if (spec === undefined) {
		return undefined
	}
	return {
		marker: spec.startsWith("`") ? "`" : "~",
		length: spec.length,
		info: (match?.[2] ?? "").trim(),
	}
}

function isClosingFence(line: FenceLine, open: FenceLine): boolean {
	return line.info === "" && line.marker === open.marker && line.length >= open.length
}

/** The words on a fence's info string, in order; the first one is its language. */
export function infoWords(info: string): readonly string[] {
	return info.split(/\s+/).filter((word) => word !== "")
}

/** Every closed fenced block in `lines`, in source order. A fence never closed is not a block. */
export function fenceBlocks(lines: readonly string[]): readonly FenceBlock[] {
	const blocks: FenceBlock[] = []
	let open: { readonly fence: FenceLine; readonly start: number } | undefined
	for (const [index, text] of lines.entries()) {
		const fence = fenceOf(text)
		if (open === undefined) {
			if (fence !== undefined) {
				open = { fence, start: index }
			}
			continue
		}
		if (fence === undefined || !isClosingFence(fence, open.fence)) {
			continue
		}
		blocks.push({
			open: open.fence,
			start: open.start,
			end: index,
			body: lines.slice(open.start + 1, index).join("\n"),
		})
		open = undefined
	}
	return blocks
}
