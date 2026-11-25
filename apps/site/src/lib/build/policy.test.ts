import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkContentSecurityPolicy } from "./policy"

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkContentSecurityPolicy(files).map((failure) => failure.code)
}

const META = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">'

describe("the content security policy the router relies on", () => {
	it("passes a build that sets no policy", () => {
		expect(codes([{ path: "index.html", content: "<html><head></head></html>" }])).toEqual([])
	})

	it("fails built HTML that carries a policy in a meta element", () => {
		expect(codes([{ path: "index.html", content: `<html><head>${META}</head></html>` }])).toEqual([
			"CONTENT_SECURITY_POLICY_PRESENT",
		])
	})

	it("fails a _headers file that carries a policy", () => {
		expect(
			codes([
				{
					path: "_headers",
					content: "/*\n  Content-Security-Policy: default-src 'self'\n",
				},
			]),
		).toEqual(["CONTENT_SECURITY_POLICY_PRESENT"])
	})

	it("passes the hosted Demo's policy, scoped to /demo/*", () => {
		expect(
			codes([
				{
					path: "_headers",
					content: "/demo/*\n  Content-Security-Policy: default-src 'self'\n",
				},
			]),
		).toEqual([])
	})

	it("fails a headers file whose Demo policy also covers another path", () => {
		expect(
			codes([
				{
					path: "_headers",
					content:
						"/demo/*\n  Content-Security-Policy: default-src 'self'\n/*\n  Content-Security-Policy: default-src 'self'\n",
				},
			]),
		).toEqual(["CONTENT_SECURITY_POLICY_PRESENT"])
	})
})
