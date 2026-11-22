/**
 * The Pack: every file of the built Dashboard in one JSON document, keyed by its path from the root
 * ("/index.html") with its bytes in base64. One file is what `traj dashboard` embeds in the compiled
 * binary ([ADR 0007](../docs/adr/0007-traj-dashboard-serves-the-dashboard-on-loopback.md)).
 */
export type Pack = ReadonlyMap<string, Uint8Array<ArrayBuffer>>

/** The Pack's document, with its keys sorted so the same build packs to the same bytes. */
export function encodePack(files: Iterable<readonly [string, Uint8Array]>): string {
	const sorted = [...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
	const entries = sorted.map(([key, bytes]) => [key, Buffer.from(bytes).toString("base64")])
	return JSON.stringify({ packVersion: 1, files: Object.fromEntries(entries) })
}

/** Reads a Pack's document; null when it is not one. */
export function decodePack(text: string): Pack | null {
	let parsed: unknown
	try {
		parsed = JSON.parse(text)
	} catch {
		return null
	}
	if (typeof parsed !== "object" || parsed === null) return null
	const { packVersion, files } = parsed as { packVersion?: unknown; files?: unknown }
	if (packVersion !== 1 || typeof files !== "object" || files === null) return null
	const pack = new Map<string, Uint8Array<ArrayBuffer>>()
	for (const [key, value] of Object.entries(files)) {
		if (typeof value !== "string") return null
		pack.set(key, new Uint8Array(Buffer.from(value, "base64")))
	}
	return pack
}
