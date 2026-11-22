import { describe, expect, test } from "bun:test"
import { checkBuild } from "./check-build"
import type { BuiltFile, FailureCode } from "./failures"

/** A page that meets every rule; each test breaks one. */
const HEAD = `<title>Blog</title><link rel="canonical" href="https://blog.trajectonomics.com/">`
const IMAGE = `<img src="/posts/a/cover.webp" alt="Three robots">`
const SHELL = `<a href="https://trajectonomics.com/">Home</a><a href="/">Blog</a><footer></footer>`
const PAGE = `<html><head>${HEAD}</head><body>${IMAGE}${SHELL}</body></html>`
const NOT_FOUND = `<html><head><title>Not found</title><meta name="robots" content="noindex"></head><body>${SHELL}</body></html>`

/** A build that passes: the front page, its image and the Not-found Page. */
const GOOD: readonly BuiltFile[] = [
	{ path: "index.html", text: PAGE },
	{ path: "404.html", text: NOT_FOUND },
	{ path: "posts/a/cover.webp" },
]

/** The codes a build fails with. */
function codes(files: readonly BuiltFile[]): readonly FailureCode[] {
	return checkBuild(files).map((failure) => failure.code)
}

/** The good build with its front page replaced. */
function withFrontPage(html: string): readonly BuiltFile[] {
	return [{ path: "index.html", text: html }, ...GOOD.slice(1)]
}

describe("the built blog", () => {
	test("a build that meets every rule has no failure", () => {
		expect(checkBuild(GOOD)).toEqual([])
	})

	test("a page with no title fails", () => {
		expect(codes(withFrontPage(PAGE.replace("<title>Blog</title>", "")))).toEqual([
			"page-title-missing",
		])
	})

	test("a page with a blank title fails", () => {
		expect(codes(withFrontPage(PAGE.replace("<title>Blog</title>", "<title> </title>")))).toEqual([
			"page-title-missing",
		])
	})

	test("an indexable page with no canonical fails", () => {
		const html = PAGE.replace(/<link rel="canonical"[^>]*>/, "")
		expect(codes(withFrontPage(html))).toEqual(["page-canonical-missing"])
	})

	test("a noindex page needs no canonical", () => {
		expect(codes(GOOD)).not.toContain("page-canonical-missing")
	})

	test("an image the build does not contain fails", () => {
		expect(codes(GOOD.filter((file) => file.path !== "posts/a/cover.webp"))).toEqual([
			"page-image-missing",
		])
	})

	test("an image with no alt text fails", () => {
		expect(codes(withFrontPage(PAGE.replace(' alt="Three robots"', "")))).toEqual([
			"page-image-alt-missing",
		])
	})

	test("an image from another host is not looked for in the build", () => {
		const html = PAGE.replace("/posts/a/cover.webp", "https://example.com/a.webp")
		expect(codes(withFrontPage(html))).toEqual([])
	})

	test("a page with no link to the Site Home fails", () => {
		const html = PAGE.replace('<a href="https://trajectonomics.com/">Home</a>', "")
		expect(codes(withFrontPage(html))).toEqual(["shell-home-link-missing"])
	})

	test("a page with no link to the blog's front page fails", () => {
		expect(codes(withFrontPage(PAGE.replace('<a href="/">Blog</a>', "")))).toEqual([
			"shell-blog-link-missing",
		])
	})

	test("a page with no footer fails", () => {
		expect(codes(withFrontPage(PAGE.replace("<footer></footer>", "")))).toEqual([
			"shell-footer-missing",
		])
	})

	test("a build with no Not-found Page fails", () => {
		expect(codes(GOOD.filter((file) => file.path !== "404.html"))).toEqual([
			"not-found-page-missing",
		])
	})

	test("each failure names the file that breaks the rule", () => {
		const [failure] = checkBuild(withFrontPage(PAGE.replace("<footer></footer>", "")))
		expect(failure?.path).toBe("index.html")
	})
})
