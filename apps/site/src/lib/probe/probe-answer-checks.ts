import { declaredLanguage } from "../build/page-language"
import { type ProbeFailure, type ProbeResponse, probeFailure } from "./probe"

/** Every probe answers with the status it expects. */
export function checkStatus(response: ProbeResponse): readonly ProbeFailure[] {
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
export function checkLocation(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe } = response
	if (probe.location === null || response.location === probe.location) return []
	return [
		probeFailure(
			"PROBE_LOCATION_WRONG",
			probe.path,
			`expected Location ${probe.location}, got ${response.location ?? "none"}.`,
		),
	]
}

/** A probe that names a Language is answered by a page that declares it. */
export function checkLanguage(response: ProbeResponse): readonly ProbeFailure[] {
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

/** A probe that names media types is answered with one of them, its parameters ignored. */
export function checkMediaType(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe } = response
	const actual = response.contentType?.split(";")[0]?.trim().toLowerCase()
	if (probe.mediaTypes.length === 0 || probe.mediaTypes.includes(actual ?? "")) return []
	return [
		probeFailure(
			"PROBE_CONTENT_TYPE_WRONG",
			probe.path,
			`expected ${probe.mediaTypes.join(" or ")}, got ${actual ?? "no content type"}.`,
		),
	]
}

/** A probe that expects a validator is answered with an `ETag`. */
export function checkEtag(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe } = response
	if (probe.etag !== true || (response.etag ?? "").length > 0) return []
	return [
		probeFailure(
			"PROBE_ETAG_MISSING",
			probe.path,
			"carries no ETag, so no browser can revalidate the page it was answered.",
		),
	]
}

/** The Site sets no content security policy, which the router's own inline script would break. */
export function checkContentSecurityPolicy(response: ProbeResponse): readonly ProbeFailure[] {
	if (response.contentSecurityPolicy === null) return []
	return [
		probeFailure(
			"CONTENT_SECURITY_POLICY_PRESENT",
			response.probe.path,
			"sets Content-Security-Policy. The router injects an inline style and script that it would block.",
		),
	]
}
