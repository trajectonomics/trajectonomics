import { describe, expect, it } from "bun:test"
import { consentCookies } from "../analytics/consent"
import { languageChoiceCookie } from "../language/stored-choice"
import { checkProbeResponses } from "./check-probe"
import { PROBES, type Probe, type ProbeResponse } from "./probes"

/** The visitor id a healthy Worker mints for a grant that carries none. */
const MINTED = "11111111-2222-4333-8444-555555555555"

/** The cookies a healthy Worker sets for one probe: a Language choice, or a consent answer. */
function cookiesOf(probe: Probe): readonly string[] {
	if (probe.setsConsent !== null) {
		return consentCookies(probe.setsConsent, probe.setsConsent === "granted" ? MINTED : "")
	}
	return probe.storesChoice === null ? [] : [languageChoiceCookie(probe.storesChoice)]
}

/** What a healthy local Worker answers for one probe. */
function healthy(probe: Probe): ProbeResponse {
	return {
		probe,
		status: probe.status,
		location: probe.location,
		setCookies: cookiesOf(probe),
		vary: probe.vary.length === 0 ? null : probe.vary.join(", "),
		cacheControl: probe.cacheControl.length === 0 ? null : probe.cacheControl.join(", "),
		etag: probe.etag === true ? '"etag"' : null,
		contentSecurityPolicy: null,
		contentType: probe.mediaTypes[0] ?? null,
		html: [
			probe.language === null ? "" : `<html lang="${probe.language}">`,
			...probe.contains,
		].join(" "),
	}
}

function clean(): readonly ProbeResponse[] {
	return PROBES.map(healthy)
}

function codes(responses: readonly ProbeResponse[]): readonly string[] {
	return checkProbeResponses(responses).map((failure) => failure.code)
}

/** The probe each test means, by the answer it judges. */
const ROOT_ENGLISH = 0
const ROOT_THAI = 1
const ROOT_STORED_THAI = 3
const ROOT_HOSTILE_COOKIE = 5
const CHOICE_THAI = 7
const CHOICE_UNKNOWN = 9
const MOVED_PREFIX = 10
const MOVED_DEEP_PREFIX = 12
const ENGLISH_MISS = 16
const RESERVED_PRELOAD = 17
const SITEMAP = 18
const ROBOTS = 19

/** The clean answers with the answer at `index` replaced by `answer`. */
function withAnswer(index: number, answer: Partial<ProbeResponse>): readonly ProbeResponse[] {
	return clean().map((response, at) => (at === index ? { ...response, ...answer } : response))
}

describe("the answers the local Worker gives", () => {
	it("passes a Worker that answers the address, the choice link and the old prefixes", () => {
		expect(codes(clean())).toEqual([])
	})

	it("fails when the address does not answer 200", () => {
		expect(codes(withAnswer(ROOT_ENGLISH, { status: 500 }))).toEqual(["PROBE_STATUS_WRONG"])
	})

	it("fails when the address answers in another Language", () => {
		expect(codes(withAnswer(ROOT_THAI, { html: '<html lang="xx">' }))).toEqual([
			"PAGE_LANGUAGE_WRONG",
		])
	})

	it("fails when the stored choice does not choose the Language", () => {
		expect(codes(withAnswer(ROOT_STORED_THAI, { html: '<html lang="en">' }))).toEqual([
			"PAGE_LANGUAGE_WRONG",
		])
	})

	it("fails when a hostile stored value is not ignored", () => {
		expect(codes(withAnswer(ROOT_HOSTILE_COOKIE, { html: '<html lang="th">' }))).toEqual([
			"PAGE_LANGUAGE_WRONG",
		])
	})

	it("fails when the address names none of the signals it depends on", () => {
		expect(codes(withAnswer(ROOT_ENGLISH, { vary: null }))).toEqual(["PROBE_VARY_WRONG"])
	})

	it("fails when the address names only part of what it depends on", () => {
		expect(codes(withAnswer(ROOT_ENGLISH, { vary: "Accept-Language, CF-IPCountry" }))).toEqual([
			"PROBE_VARY_WRONG",
		])
	})

	it("fails when the address may be stored by a shared cache", () => {
		expect(
			codes(withAnswer(ROOT_ENGLISH, { cacheControl: "public, max-age=0, must-revalidate" })),
		).toEqual(["PROBE_CACHE_CONTROL_WRONG"])
	})

	it("fails when the address carries no validator", () => {
		expect(codes(withAnswer(ROOT_ENGLISH, { etag: null }))).toEqual(["PROBE_ETAG_MISSING"])
	})

	it("fails when the address sets a cookie of its own", () => {
		expect(codes(withAnswer(ROOT_ENGLISH, { setCookies: ["seen=1"] }))).toEqual([
			"PROBE_SET_COOKIE_PRESENT",
		])
	})

	it("fails when the choice link stores no choice", () => {
		expect(codes(withAnswer(CHOICE_THAI, { setCookies: [] }))).toEqual(["PROBE_SET_COOKIE_MISSING"])
	})

	it("fails when the choice link stores more than one cookie", () => {
		expect(codes(withAnswer(CHOICE_THAI, { setCookies: ["traj_lang=th", "seen=1"] }))).toEqual([
			"PROBE_SET_COOKIE_COUNT_WRONG",
		])
	})

	it("fails when the choice cookie carries the wrong attributes", () => {
		expect(codes(withAnswer(CHOICE_THAI, { setCookies: ["traj_lang=th; Path=/"] }))).toEqual([
			"PROBE_SET_COOKIE_WRONG",
		])
	})

	it("fails when an unknown Language still stores a cookie", () => {
		expect(codes(withAnswer(CHOICE_UNKNOWN, { setCookies: ["traj_lang=zz"] }))).toEqual([
			"PROBE_SET_COOKIE_PRESENT",
		])
	})

	it("fails when the choice link is cached", () => {
		expect(codes(withAnswer(CHOICE_THAI, { cacheControl: null }))).toEqual([
			"PROBE_CACHE_CONTROL_WRONG",
		])
	})

	it("fails when an old prefix does not answer 301 to the address", () => {
		expect(codes(withAnswer(MOVED_PREFIX, { status: 302 }))).toEqual(["PROBE_STATUS_WRONG"])
		expect(codes(withAnswer(MOVED_PREFIX, { location: "/th/" }))).toEqual(["PROBE_LOCATION_WRONG"])
	})

	it("fails when a deep path under an old prefix is not moved", () => {
		expect(codes(withAnswer(MOVED_DEEP_PREFIX, { status: 200 }))).toEqual(["PROBE_STATUS_WRONG"])
	})

	it("fails when a miss is not a 404", () => {
		expect(codes(withAnswer(ENGLISH_MISS, { status: 200 }))).toEqual(["PROBE_STATUS_WRONG"])
	})

	it("fails when a miss answers in a Language that is not the fallback", () => {
		expect(codes(withAnswer(ENGLISH_MISS, { html: '<html lang="xx">' }))).toEqual([
			"PAGE_LANGUAGE_WRONG",
		])
	})

	it("fails when the Reserved preload path is served instead of missing", () => {
		expect(codes(withAnswer(RESERVED_PRELOAD, { status: 200 }))).toEqual(["PROBE_STATUS_WRONG"])
	})

	it("fails a response that carries a content security policy", () => {
		expect(
			codes(withAnswer(ENGLISH_MISS, { contentSecurityPolicy: "default-src 'self'" })),
		).toEqual(["CONTENT_SECURITY_POLICY_PRESENT"])
	})

	it("fails a Sitemap the Worker answers as a page", () => {
		expect(codes(withAnswer(SITEMAP, { contentType: "text/html" }))).toEqual([
			"PROBE_CONTENT_TYPE_WRONG",
		])
	})

	it("fails a Robots file the Worker answers with no content type", () => {
		expect(codes(withAnswer(ROBOTS, { contentType: null }))).toEqual(["PROBE_CONTENT_TYPE_WRONG"])
	})

	it("passes a media type that carries a parameter", () => {
		expect(codes(withAnswer(ROBOTS, { contentType: "text/plain; charset=utf-8" }))).toEqual([])
	})

	it("judges no content type on an answer that carries no body", () => {
		expect(codes(withAnswer(ROOT_ENGLISH, { contentType: "text/html" }))).toEqual([])
	})

	it("fails a probe the Worker never answered", () => {
		expect(codes(clean().slice(1))).toEqual(["PROBE_NOT_ASKED"])
	})
})
