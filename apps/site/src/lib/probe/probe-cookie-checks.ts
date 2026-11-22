import { CONSENT_MAX_AGE_SECONDS, consentCookies } from "../analytics/consent"
import { languageChoiceCookie } from "../language/stored-choice"
import { type ProbeFailure, type ProbeResponse, probeFailure } from "./probe"

/** A consent grant's answer, which names the `granted` value and the lifetime exactly. */
const GRANTED_CONSENT = new RegExp(
	`^traj_consent=granted; Path=/; Secure; SameSite=Lax; Max-Age=${CONSENT_MAX_AGE_SECONDS}$`,
)

/** A visitor id the Worker minted: a lowercase UUID, with the same attributes as the answer. */
const MINTED_VISITOR = new RegExp(
	`^traj_vid=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}; Path=/; Secure; SameSite=Lax; Max-Age=${CONSENT_MAX_AGE_SECONDS}$`,
)

/**
 * The consent answer's cookies. A refusal and a reset are exact; a grant writes the answer and a
 * visitor id, which is minted, so only its shape is judged.
 */
function checkConsentCookies(response: ProbeResponse, choice: "granted" | "denied" | "reset") {
	const { probe, setCookies } = response
	const [first, second] = setCookies
	const judged =
		choice === "granted"
			? setCookies.length === 2 &&
				GRANTED_CONSENT.test(first ?? "") &&
				MINTED_VISITOR.test(second ?? "")
			: JSON.stringify(setCookies) === JSON.stringify(consentCookies(choice, ""))
	if (judged) return []
	return [
		probeFailure(
			"PROBE_SET_COOKIE_WRONG",
			probe.path,
			`sets Set-Cookie: ${setCookies.join(" | ") || "none"}, which is not the ${choice} consent pair.`,
		),
	]
}

/** The cookies an answer may set are the Language choice or the consent pair the probe names, and nothing else. */
export function checkSetCookie(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe } = response
	if (probe.setsConsent !== null) return checkConsentCookies(response, probe.setsConsent)
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
