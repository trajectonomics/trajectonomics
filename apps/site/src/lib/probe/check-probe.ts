import { declaredLanguage } from "../build/page-language"
import type { ProbeFailure, ProbeFailureCode, ProbeResponse } from "./probes"
import { PROBES } from "./probes"

/** A frozen probe failure, so a caller cannot edit a check's verdict. */
function probeFailure(code: ProbeFailureCode, path: string, message: string): ProbeFailure {
	return Object.freeze({ code, path, message })
}

/** Every probe answers with the status it expects. */
function checkStatus(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe } = response
	if (response.status === probe.status) return []
	return [
		probeFailure(
			"PROBE_STATUS_WRONG",
			probe.path,
			`expected status ${probe.status}, got ${response.status}.`,
		),
	]
}

/** A probe that names a `Location` is answered with that `Location`. */
function checkLocation(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe } = response
	if (probe.location === null || response.location === probe.location) return []
	return [
		probeFailure(
			"ROOT_LOCATION_WRONG",
			probe.path,
			`expected Location ${probe.location}, got ${response.location ?? "none"}.`,
		),
	]
}

/** A probe that names a Language is answered by a page that declares it. */
function checkLanguage(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe } = response
	if (probe.language === null) return []
	const declared = declaredLanguage(response.html)
	if (declared?.toLowerCase() === probe.language) return []
	return [
		probeFailure(
			"PAGE_LANGUAGE_WRONG",
			probe.path,
			`expected the ${probe.language} page, got <html lang="${declared ?? ""}">.`,
		),
	]
}

/** The rules every answer keeps: the Site stores nothing, and sets no content security policy. */
function checkEveryAnswer(response: ProbeResponse): readonly ProbeFailure[] {
	const failures: ProbeFailure[] = []
	if (response.setCookie !== null) {
		failures.push(
			probeFailure(
				"SET_COOKIE_PRESENT",
				response.probe.path,
				`sets Set-Cookie: ${response.setCookie}. The Site stores nothing for the visitor.`,
			),
		)
	}
	if (response.contentSecurityPolicy !== null) {
		failures.push(
			probeFailure(
				"CONTENT_SECURITY_POLICY_PRESENT",
				response.probe.path,
				"sets Content-Security-Policy. The router injects an inline style and script that it would block.",
			),
		)
	}
	return failures
}

/** Every rule the local Worker fails; a probe that was never asked fails too. */
export function checkProbeResponses(responses: readonly ProbeResponse[]): readonly ProbeFailure[] {
	const missing = PROBES.filter(
		(probe) => !responses.some((response) => response.probe === probe),
	).map((probe) =>
		probeFailure("PROBE_NOT_ASKED", probe.path, "the probe never asked for this path."),
	)
	return [
		...missing,
		...responses.flatMap((response) => [
			...checkStatus(response),
			...checkLocation(response),
			...checkLanguage(response),
			...checkEveryAnswer(response),
		]),
	]
}
