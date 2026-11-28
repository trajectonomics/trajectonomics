import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkDemoHome } from "./demo"
import { checkDemoHeaders } from "./demo-headers"

const POLICY =
	"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'self'; frame-ancestors 'self'"

const HEADERS = `# The hosted Demo\n/demo/*\n  Content-Security-Policy: ${POLICY}\n`

function codes(failures: readonly { code: string }[]): readonly string[] {
	return failures.map((failure) => failure.code)
}

function page(path: string, body: string): BuiltFile {
	return { path, content: `<html><body>${body}</body></html>` }
}

describe("the hosted Demo the Site serves", () => {
	it("passes when the Demo built its home", () => {
		expect(codes(checkDemoHome([page("demo/index.html", "")]))).toEqual([])
	})

	it("fails when the Demo built no home", () => {
		expect(codes(checkDemoHome([page("index.html", "")]))).toEqual(["DEMO_HOME_MISSING"])
	})
})

describe("the policy the headers file sets for the Demo", () => {
	it("passes the Demo's own scoped policy", () => {
		expect(codes(checkDemoHeaders([{ path: "_headers", content: HEADERS }]))).toEqual([])
	})

	it("fails a build with no headers file", () => {
		expect(codes(checkDemoHeaders([]))).toEqual(["DEMO_HEADERS_MISSING"])
	})

	it("fails a headers file with no /demo/* block", () => {
		expect(
			codes(checkDemoHeaders([{ path: "_headers", content: "/*\n  X-Frame-Options: DENY\n" }])),
		).toEqual(["DEMO_HEADERS_MISSING"])
	})

	it("fails a /demo/* block with no policy", () => {
		expect(
			codes(
				checkDemoHeaders([{ path: "_headers", content: "/demo/*\n  X-Frame-Options: DENY\n" }]),
			),
		).toEqual(["DEMO_HEADERS_CSP_MISSING"])
	})

	it("fails a policy that allows another origin in a directive", () => {
		const content = HEADERS.replace("img-src 'self'", "img-src 'self' https:")
		expect(codes(checkDemoHeaders([{ path: "_headers", content }]))).toEqual([
			"DEMO_HEADERS_CSP_WRONG",
		])
	})

	it("fails a policy with no frame-ancestors", () => {
		const content = HEADERS.replace("; frame-ancestors 'self'", "")
		expect(codes(checkDemoHeaders([{ path: "_headers", content }]))).toEqual([
			"DEMO_HEADERS_CSP_WRONG",
		])
	})

	it("fails a policy that refuses to be framed by the Site's own home", () => {
		const content = HEADERS.replace("frame-ancestors 'self'", "frame-ancestors 'none'")
		expect(codes(checkDemoHeaders([{ path: "_headers", content }]))).toEqual([
			"DEMO_HEADERS_CSP_WRONG",
		])
	})

	it("fails a policy whose form-action is not none", () => {
		const content = HEADERS.replace("form-action 'none'", "form-action 'self'")
		expect(codes(checkDemoHeaders([{ path: "_headers", content }]))).toEqual([
			"DEMO_HEADERS_CSP_WRONG",
		])
	})

	it("fails a policy that allows inline style elements in style-src", () => {
		const content = HEADERS.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
		expect(codes(checkDemoHeaders([{ path: "_headers", content }]))).toEqual([
			"DEMO_HEADERS_CSP_WRONG",
		])
	})

	it("fails a policy with no style-src-attr", () => {
		const content = HEADERS.replace("; style-src-attr 'unsafe-inline'", "")
		expect(codes(checkDemoHeaders([{ path: "_headers", content }]))).toEqual([
			"DEMO_HEADERS_CSP_WRONG",
		])
	})

	it("fails a policy whose style-src-attr allows more than inline attributes", () => {
		const content = HEADERS.replace(
			"style-src-attr 'unsafe-inline'",
			"style-src-attr 'self' 'unsafe-inline'",
		)
		expect(codes(checkDemoHeaders([{ path: "_headers", content }]))).toEqual([
			"DEMO_HEADERS_CSP_WRONG",
		])
	})
})
