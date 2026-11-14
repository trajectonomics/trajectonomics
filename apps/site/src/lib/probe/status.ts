/** The paths a local Worker must answer, and what each one proves. */
export const PROBE_PATHS = ["/", "/does-not-exist", "/__mf-preload.js"] as const

/** One probed path: the three the probe asks for, and no other. */
export type ProbePath = (typeof PROBE_PATHS)[number]

/** What a local Worker answered for one probed path, reduced to the facts the probe judges. */
export interface ProbeResponse {
	readonly path: ProbePath
	readonly status: number
	readonly setCookie: string | null
	readonly contentSecurityPolicy: string | null
}

/** Stable codes for every way the local Worker's statuses can fail the probe. One code per rule. */
export type ProbeFailureCode =
	| "ROOT_NOT_OK"
	| "UNKNOWN_PATH_NOT_FOUND"
	| "RESERVED_PRELOAD_PATH_NOT_FOUND"
	| "SET_COOKIE_PRESENT"
	| "CONTENT_SECURITY_POLICY_PRESENT"

/** One failed probe rule: the rule's code, the path it concerns and a line a maintainer can act on. */
export interface ProbeFailure {
	readonly code: ProbeFailureCode
	readonly path: string
	readonly message: string
}

/** A frozen probe failure, so a caller cannot edit a check's verdict. */
function probeFailure(code: ProbeFailureCode, path: string, message: string): ProbeFailure {
	return Object.freeze({ code, path, message })
}

const EXPECTED: Readonly<
	Record<ProbePath, { readonly status: number; readonly code: ProbeFailureCode }>
> = {
	"/": { status: 200, code: "ROOT_NOT_OK" },
	"/does-not-exist": { status: 404, code: "UNKNOWN_PATH_NOT_FOUND" },
	"/__mf-preload.js": { status: 404, code: "RESERVED_PRELOAD_PATH_NOT_FOUND" },
}

/** Every rule the local Worker fails; the response body is not judged. */
export function checkProbeResponses(responses: readonly ProbeResponse[]): readonly ProbeFailure[] {
	const failures: ProbeFailure[] = []
	for (const response of responses) {
		const expected = EXPECTED[response.path]
		if (response.status !== expected.status) {
			failures.push(
				probeFailure(
					expected.code,
					response.path,
					`expected status ${expected.status}, got ${response.status}.`,
				),
			)
		}
		if (response.setCookie !== null) {
			failures.push(
				probeFailure(
					"SET_COOKIE_PRESENT",
					response.path,
					`sets Set-Cookie: ${response.setCookie}. The Site stores nothing for the visitor.`,
				),
			)
		}
		if (response.contentSecurityPolicy !== null) {
			failures.push(
				probeFailure(
					"CONTENT_SECURITY_POLICY_PRESENT",
					response.path,
					"sets Content-Security-Policy. The router injects an inline style and script that it would block.",
				),
			)
		}
	}
	return failures
}
