import { describe, expect, it } from "bun:test"
import type { ProbePath, ProbeResponse } from "./status"
import { checkProbeResponses, PROBE_PATHS } from "./status"

function response(
	path: ProbePath,
	status: number,
	extra: Partial<ProbeResponse> = {},
): ProbeResponse {
	return { path, status, setCookie: null, contentSecurityPolicy: null, ...extra }
}

function clean(): readonly ProbeResponse[] {
	return [
		response(PROBE_PATHS[0], 200),
		response(PROBE_PATHS[1], 404),
		response(PROBE_PATHS[2], 404),
	]
}

function codes(responses: readonly ProbeResponse[]): readonly string[] {
	return checkProbeResponses(responses).map((failure) => failure.code)
}

describe("the statuses a local Worker answers", () => {
	it("passes a clean Worker: 200 at / and 404 at both unknown paths", () => {
		expect(codes(clean())).toEqual([])
	})

	it("fails when / does not return 200", () => {
		const responses = clean().map((item) => (item.path === "/" ? response("/", 500) : item))
		expect(codes(responses)).toEqual(["ROOT_NOT_OK"])
	})

	it("fails when an unknown path does not return 404", () => {
		const responses = clean().map((item) =>
			item.path === "/does-not-exist" ? response(item.path, 200) : item,
		)
		expect(codes(responses)).toEqual(["UNKNOWN_PATH_NOT_FOUND"])
	})

	it("fails when the Reserved preload path is served instead of missing", () => {
		const responses = clean().map((item) =>
			item.path === "/__mf-preload.js" ? response(item.path, 200) : item,
		)
		expect(codes(responses)).toEqual(["RESERVED_PRELOAD_PATH_NOT_FOUND"])
	})

	it("fails a response that sets a cookie", () => {
		const responses = clean().map((item) =>
			item.path === "/" ? response("/", 200, { setCookie: "seen=1" }) : item,
		)
		expect(codes(responses)).toEqual(["SET_COOKIE_PRESENT"])
	})

	it("fails a response that carries a content security policy", () => {
		const responses = clean().map((item) =>
			item.path === "/does-not-exist"
				? response(item.path, 404, { contentSecurityPolicy: "default-src 'self'" })
				: item,
		)
		expect(codes(responses)).toEqual(["CONTENT_SECURITY_POLICY_PRESENT"])
	})
})
