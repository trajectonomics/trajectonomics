import { SNAPSHOT_VERSION, type Snapshot, snapshot } from "../contract"

/** The outcome of reading a Snapshot's text: the parsed Snapshot, or the reason it is not one. */
export type ParseResult =
	| { readonly ok: true; readonly snapshot: Snapshot }
	| { readonly ok: false; readonly reason: string; readonly details: readonly string[] }

const MAX_DETAILS = 8

/**
 * Parses the text of a Snapshot file against the contract. The version is checked first, so a
 * newer Snapshot is named as such rather than reported as a list of field errors.
 */
export function parseSnapshotText(text: string): ParseResult {
	let json: unknown
	try {
		json = JSON.parse(text)
	} catch (error) {
		return refused(`is not JSON (${errorMessage(error)})`)
	}
	const version = versionOf(json)
	if (version !== undefined && version !== SNAPSHOT_VERSION) {
		return refused(
			`is Snapshot version ${String(version)}; this Dashboard reads version ${SNAPSHOT_VERSION}`,
		)
	}
	const result = snapshot.safeParse(json)
	if (result.success) return { ok: true, snapshot: result.data }
	const details = result.error.issues
		.slice(0, MAX_DETAILS)
		.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
	return refused("does not match the Snapshot contract", details)
}

function refused(reason: string, details: readonly string[] = []): ParseResult {
	return { ok: false, reason, details }
}

function versionOf(json: unknown): unknown {
	if (typeof json !== "object" || json === null || !("snapshotVersion" in json)) return undefined
	return json.snapshotVersion
}

/** The message of a thrown value, or its text when it is not an Error. */
export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}
