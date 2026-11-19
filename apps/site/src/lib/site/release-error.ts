/** The ways a Release snapshot and a Language's date words can be rejected. One code per rule. */
export type ReleaseErrorCode =
	| "RELEASE_DATE_INVALID"
	| "RELEASE_MONTHS_INCOMPLETE"
	| "RELEASE_LANGUAGE_UNKNOWN"

/** The ways a release feed's answer can be rejected: its own union, apart from the snapshot's. */
export type ReleaseFeedErrorCode = "RELEASE_REGISTRY_UNREADABLE" | "RELEASE_PAYLOAD_UNREADABLE"

/** A rejected release rule: the rule's stable code, and the caller's own field name. */
export interface ReleaseError<Code extends string> extends Error {
	readonly code: Code
	readonly field: string
}

/** The rejection of one release rule; `field` mirrors the caller's input path. */
export function releaseError<Code extends ReleaseErrorCode | ReleaseFeedErrorCode>(
	code: Code,
	field: string,
	message: string,
): ReleaseError<Code> {
	return Object.freeze(Object.assign(new Error(message), { code, field }))
}
