/* How the human Format prints a tax write's result; JSON ignores both (cli ADR-0075). */

/** The body the human form prints: all but `unclaimed`, which has a block of its own. */
export function taxShownBody(data: Record<string, unknown>): Record<string, unknown> {
	const { unclaimed: _unclaimed, ...body } = data
	return body
}

/** The block for the claims the profile keeps and this write does not claim; none when there are none. */
export function unclaimedBlocks(data: Record<string, unknown>): string[] {
	const found = data["unclaimed"]
	if (!Array.isArray(found) || found.length === 0) return []
	const lines = found.map((sentence) => `- ${String(sentence)}`)
	return [["Claims stored but not claimed on this Return:", ...lines].join("\n")]
}
