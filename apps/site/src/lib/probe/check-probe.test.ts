import { describe, expect, it } from "bun:test"
import { checkProbeResponses } from "./check-probe"
import { PROBES, type Probe, type ProbeResponse } from "./probes"

/** What a healthy local Worker answers for one probe. */
function healthy(probe: Probe): ProbeResponse {
	return {
		probe,
		status: probe.status,
		location: probe.location,
		setCookie: null,
		contentSecurityPolicy: null,
		html: probe.language === null ? "" : `<html lang="${probe.language}">`,
	}
}

function clean(): readonly ProbeResponse[] {
	return PROBES.map(healthy)
}

function codes(responses: readonly ProbeResponse[]): readonly string[] {
	return checkProbeResponses(responses).map((failure) => failure.code)
}

/** The probes that share a path or a Language, so a test can point at the one it means. */
const ROOT_DEFAULT = 2
const ROOT_THAI = 0
const THAI_HOME = 4
const THAI_HOME_WITHOUT_SLASH = 6
const THAI_MISS = 7
const UNPREFIXED_MISS = 8
const RESERVED_PRELOAD = 9

/** The clean answers with the answer at `index` replaced by `answer`. */
function withAnswer(index: number, answer: Partial<ProbeResponse>): readonly ProbeResponse[] {
	return clean().map((response, at) => (at === index ? { ...response, ...answer } : response))
}

describe("the answers the local Worker gives", () => {
	it("passes a Worker that redirects /, serves both homes and misses in the right Language", () => {
		expect(codes(clean())).toEqual([])
	})

	it("fails when / serves a page instead of redirecting", () => {
		expect(codes(withAnswer(ROOT_DEFAULT, { status: 200 }))).toEqual(["PROBE_STATUS_WRONG"])
	})

	it("fails when / redirects to the wrong Locale URL", () => {
		expect(codes(withAnswer(ROOT_THAI, { location: "/en/" }))).toEqual(["ROOT_LOCATION_WRONG"])
	})

	it("fails when a Locale URL does not answer 200", () => {
		expect(codes(withAnswer(THAI_HOME, { status: 500 }))).toEqual(["PROBE_STATUS_WRONG"])
	})

	it("fails when a Locale URL answers in another Language", () => {
		expect(codes(withAnswer(THAI_HOME, { html: '<html lang="xx">' }))).toEqual([
			"PAGE_LANGUAGE_WRONG",
		])
	})

	it("fails when /th without a slash does not reach the Thai home", () => {
		expect(codes(withAnswer(THAI_HOME_WITHOUT_SLASH, { status: 307 }))).toEqual([
			"PROBE_STATUS_WRONG",
		])
	})

	it("fails when a miss under /th/ is not the Thai Not-found page", () => {
		expect(codes(withAnswer(THAI_MISS, { status: 200 }))).toEqual(["PROBE_STATUS_WRONG"])
	})

	it("fails when an unprefixed miss is not a 404", () => {
		expect(codes(withAnswer(UNPREFIXED_MISS, { status: 200 }))).toEqual(["PROBE_STATUS_WRONG"])
	})

	it("fails when an unprefixed miss answers in a Language that is not the fallback", () => {
		expect(codes(withAnswer(UNPREFIXED_MISS, { html: '<html lang="xx">' }))).toEqual([
			"PAGE_LANGUAGE_WRONG",
		])
	})

	it("fails when the Reserved preload path is served instead of missing", () => {
		expect(codes(withAnswer(RESERVED_PRELOAD, { status: 200 }))).toEqual(["PROBE_STATUS_WRONG"])
	})

	it("fails a response that sets a cookie", () => {
		expect(codes(withAnswer(ROOT_DEFAULT, { setCookie: "seen=1" }))).toEqual(["SET_COOKIE_PRESENT"])
	})

	it("fails a response that carries a content security policy", () => {
		expect(
			codes(withAnswer(UNPREFIXED_MISS, { contentSecurityPolicy: "default-src 'self'" })),
		).toEqual(["CONTENT_SECURITY_POLICY_PRESENT"])
	})

	it("fails a probe the Worker never answered", () => {
		expect(codes(clean().slice(1))).toEqual(["PROBE_NOT_ASKED"])
	})
})
