import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkStructure } from "./structure"

function build(index: string, notFound = index): readonly BuiltFile[] {
	return [
		{ path: "index.html", content: index },
		{ path: "404.html", content: notFound },
		{ path: "_astro/site.css", content: "body{}" },
	]
}

const complete = "<html><head></head><body><nav></nav><main></main></body></html>"

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkStructure(files).map((failure) => failure.code)
}

describe("the structure of the built pages", () => {
	it("passes a page with exactly one head, body, nav and main", () => {
		expect(codes(build(complete))).toEqual([])
	})

	it("fails a build with no index page at the assets root", () => {
		const files = build(complete).filter((file) => file.path !== "index.html")
		expect(codes(files)).toContain("INDEX_PAGE_MISSING")
	})

	it("fails a build with no Not-found page at the assets root", () => {
		const files = build(complete).filter((file) => file.path !== "404.html")
		expect(codes(files)).toContain("NOT_FOUND_PAGE_MISSING")
	})

	it("counts opening tags only, so one nav is one nav", () => {
		expect(codes(build("<html><head></head><body><nav></nav><main></main></body></html>"))).toEqual(
			[],
		)
	})

	it("fails a page with two navs", () => {
		const page = "<html><head></head><body><nav></nav><nav></nav><main></main></body></html>"
		expect(codes(build(page, complete))).toEqual(["NAV_NOT_SINGLE"])
	})

	it("fails a page with no main", () => {
		expect(codes(build("<html><head></head><body><nav></nav></body></html>", complete))).toEqual([
			"MAIN_NOT_SINGLE",
		])
	})

	it("fails a page with two heads", () => {
		const page = "<html><head></head><head></head><body><nav></nav><main></main></body></html>"
		expect(codes(build(page, complete))).toEqual(["HEAD_NOT_SINGLE"])
	})

	it("fails a page with two bodies", () => {
		const page = "<html><head></head><body><nav></nav><main></main></body><body></body></html>"
		expect(codes(build(page, complete))).toEqual(["BODY_NOT_SINGLE"])
	})

	it("fails the Not-found page too, not only the index page", () => {
		const notFound = "<html><head></head><body><main></main></body></html>"
		expect(codes(build(complete, notFound))).toEqual(["NAV_NOT_SINGLE"])
	})
})
