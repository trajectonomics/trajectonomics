import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkStructure } from "./structure"

const complete = "<html><head></head><body><nav></nav><main><h1></h1></main></body></html>"

/** The English home at the address, the Thai home on its build path, and one stylesheet. */
function build(thai = complete, english = complete): readonly BuiltFile[] {
	return [
		{ path: "index.html", content: english },
		{ path: "th/index.html", content: thai },
		{ path: "_astro/site.css", content: "body{}" },
	]
}

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkStructure(files).map((failure) => failure.code)
}

describe("the structure of the built pages", () => {
	it("passes every home with exactly one head, body, nav, main and h1", () => {
		expect(codes(build())).toEqual([])
	})

	it("passes a Not-found page too, because it carries the same landmarks", () => {
		expect(codes([...build(), { path: "404.html", content: complete }])).toEqual([])
	})

	it("fails a document built under a Language code that is no build path", () => {
		expect(codes([...build(), { path: "en/index.html", content: complete }])).toEqual([
			"LANGUAGE_CODE_DIRECTORY_PRESENT",
		])
	})

	it("does not count a landmark a comment names, so a commented-out nav is no nav", () => {
		const page = "<html><head></head><body><!-- <nav></nav> --><main><h1></h1></main></body></html>"
		expect(codes(build(page))).toEqual(["PAGE_NAV_COUNT"])
	})

	it("does not count a landmark a script carries as text", () => {
		const page =
			'<html><head></head><body><nav></nav><main><h1></h1></main><script>const tpl = "<nav></nav>"</script></body></html>'
		expect(codes(build(page))).toEqual([])
	})

	it("fails a page with no nav", () => {
		expect(codes(build("<html><head></head><body><main><h1></h1></main></body></html>"))).toEqual([
			"PAGE_NAV_COUNT",
		])
	})

	it("fails a page with two navs", () => {
		const page =
			"<html><head></head><body><nav></nav><nav></nav><main><h1></h1></main></body></html>"
		expect(codes(build(complete, page))).toEqual(["PAGE_NAV_COUNT"])
	})

	it("fails a page with no main", () => {
		expect(codes(build("<html><head></head><body><nav></nav><h1></h1></body></html>"))).toEqual([
			"PAGE_MAIN_COUNT",
		])
	})

	it("fails a page with two mains", () => {
		const page =
			"<html><head></head><body><nav></nav><main></main><main><h1></h1></main></body></html>"
		expect(codes(build(complete, page))).toEqual(["PAGE_MAIN_COUNT"])
	})

	it("fails a page with no h1", () => {
		expect(codes(build("<html><head></head><body><nav></nav><main></main></body></html>"))).toEqual(
			["PAGE_H1_COUNT"],
		)
	})

	it("fails a page with two h1s", () => {
		const page = "<html><head></head><body><nav></nav><main><h1></h1><h1></h1></main></body></html>"
		expect(codes(build(complete, page))).toEqual(["PAGE_H1_COUNT"])
	})

	it("fails a page with two heads", () => {
		const page =
			"<html><head></head><head></head><body><nav></nav><main><h1></h1></main></body></html>"
		expect(codes(build(page))).toEqual(["HEAD_NOT_SINGLE"])
	})

	it("fails a page with two bodies", () => {
		const page =
			"<html><head></head><body><nav></nav><main><h1></h1></main></body><body></body></html>"
		expect(codes(build(page))).toEqual(["BODY_NOT_SINGLE"])
	})

	it("names every page it fails, not only the first", () => {
		const page = "<html><head></head><body><nav></nav><h1></h1></body></html>"
		expect(codes(build(page, page))).toEqual(["PAGE_MAIN_COUNT", "PAGE_MAIN_COUNT"])
	})

	it("names the page URL rather than the build file, so the failure points at the page", () => {
		const [failure] = checkStructure(build("<html><head></head><body><nav></nav></body></html>"))
		expect(failure?.path).toBe("/th/")
	})
})
