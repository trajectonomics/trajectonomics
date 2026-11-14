import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkStructure } from "./structure"

const complete = "<html><head></head><body><nav></nav><main></main></body></html>"

function build(thai = complete, english = complete): readonly BuiltFile[] {
	return [
		{ path: "th/index.html", content: thai },
		{ path: "en/index.html", content: english },
		{ path: "_astro/site.css", content: "body{}" },
	]
}

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkStructure(files).map((failure) => failure.code)
}

describe("the structure of the built pages", () => {
	it("passes every home with exactly one head, body, nav and main", () => {
		expect(codes(build())).toEqual([])
	})

	it("passes a Not-found page too, because the router injects onto it as well", () => {
		expect(codes([...build(), { path: "th/404.html", content: complete }])).toEqual([])
	})

	it("fails a build that put a document at /, which must redirect instead", () => {
		expect(codes([...build(), { path: "index.html", content: complete }])).toEqual([
			"ROOT_DOCUMENT_PRESENT",
		])
	})

	it("counts opening tags only, so one nav is one nav", () => {
		expect(codes(build("<html><head></head><body><nav></nav><main></main></body></html>"))).toEqual(
			[],
		)
	})

	it("fails a page with two navs", () => {
		const page = "<html><head></head><body><nav></nav><nav></nav><main></main></body></html>"
		expect(codes(build(complete, page))).toEqual(["NAV_NOT_SINGLE"])
	})

	it("fails a page with no main", () => {
		expect(codes(build("<html><head></head><body><nav></nav></body></html>"))).toEqual([
			"MAIN_NOT_SINGLE",
		])
	})

	it("fails a page with two heads", () => {
		const page = "<html><head></head><head></head><body><nav></nav><main></main></body></html>"
		expect(codes(build(page))).toEqual(["HEAD_NOT_SINGLE"])
	})

	it("fails a page with two bodies", () => {
		const page = "<html><head></head><body><nav></nav><main></main></body><body></body></html>"
		expect(codes(build(page))).toEqual(["BODY_NOT_SINGLE"])
	})

	it("names every page it fails, not only the first", () => {
		const page = "<html><head></head><body><nav></nav></body></html>"
		expect(codes(build(page, page))).toEqual(["MAIN_NOT_SINGLE", "MAIN_NOT_SINGLE"])
	})
})
