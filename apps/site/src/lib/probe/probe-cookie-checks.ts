import { languageChoiceCookie } from "../language/stored-choice"
import { type ProbeFailure, type ProbeResponse, probeFailure } from "./probe"

/** The one cookie an answer may set is the Language choice the probe names, and nothing else. */
export function checkSetCookie(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe } = response
	if (probe.storesChoice === null) {
		if (response.setCookies.length === 0) return []
		return [
			probeFailure(
				"PROBE_SET_COOKIE_PRESENT",
				probe.path,
				`sets Set-Cookie: ${response.setCookies.join(" | ")}. The Site stores only the Language choice.`,
			),
		]
	}
	if (response.setCookies.length === 0) {
		return [
			probeFailure(
				"PROBE_SET_COOKIE_MISSING",
				probe.path,
				`stores no ${probe.storesChoice} choice, so the next visit is chosen for again.`,
			),
		]
	}
	if (response.setCookies.length > 1) {
		return [
			probeFailure(
				"PROBE_SET_COOKIE_COUNT_WRONG",
				probe.path,
				`sets ${response.setCookies.length} cookies: ${response.setCookies.join(" | ")}.`,
			),
		]
	}
	const expected = languageChoiceCookie(probe.storesChoice)
	const [set] = response.setCookies
	if (set === expected) return []
	return [
		probeFailure(
			"PROBE_SET_COOKIE_WRONG",
			probe.path,
			`sets Set-Cookie: ${set ?? "none"}, not ${expected}.`,
		),
	]
}
