import { describe, expect, test } from "bun:test"
import { checkBuild } from "./check-build"
import type { BuiltFile, FailureCode } from "./failures"

/** A page that meets every rule; each test breaks one. */
const HEAD = `<title>Blog</title><link rel="canonical" href="https://trajectonomics.com/blog/">`
const SHELL = `<a href="/">Home</a><a href="/blog/">Blog</a><footer></footer>`
const PAGE = `<html><head>${HEAD}</head><body>${SHELL}</body></html>`
const NOT_FOUND = `<html><head><title>Not found</title><meta name="robots" content="noindex"></head><body>${SHELL}</body></html>`

/** A build that passes: the front page and the Not-found Page. */
const GOOD: readonly BuiltFile[] = [
	{ path: "blog/index.html", text: PAGE },
	{ path: "blog/404.html", text: NOT_FOUND },
	{ path: "blog/fonts/aleo-latin-300.woff2" },
]

/** The codes a build fails with. */
function codes(files: readonly BuiltFile[]): readonly FailureCode[] {
	return checkBuild(files).map((failure) => failure.code)
}

/** The good build with its front page replaced. */
function withFrontPage(html: string): readonly BuiltFile[] {
	return [{ path: "blog/index.html", text: html }, ...GOOD.slice(1)]
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

	test("a build that serves the router's preload path fails", () => {
		expect(codes([...GOOD, { path: "blog/__mf-preload.js" }])).toEqual(["preload-path-served"])
	})

	test("a preload file at the assets root fails twice: outside the base, and served", () => {
		expect(codes([...GOOD, { path: "__mf-preload.js" }])).toEqual([
			"file-outside-base",
			"preload-path-served",
		])
	})

	test("a security policy in a page's meta fails", () => {
		const html = PAGE.replace(
			"</head>",
			`<meta http-equiv="Content-Security-Policy" content="script-src 'self'"></head>`,
		)
		expect(codes(withFrontPage(html))).toEqual(["security-policy-meta-set"])
	})

	test("a security policy in a headers file fails", () => {
		const headers = {
			path: "blog/_headers",
			text: "/*\n  Content-Security-Policy: default-src 'self'",
		}
		expect(codes([...GOOD, headers])).toEqual(["security-policy-header-set"])
	})

	test("a page with no link to the Site Home fails", () => {
		expect(codes(withFrontPage(PAGE.replace('<a href="/">Home</a>', "")))).toEqual([
			"shell-home-link-missing",
		])
	})

	test("a page with no link to the blog's front page fails", () => {
		expect(codes(withFrontPage(PAGE.replace('<a href="/blog/">Blog</a>', "")))).toEqual([
			"shell-blog-link-missing",
		])
	})

	test("a page with no footer fails", () => {
		expect(codes(withFrontPage(PAGE.replace("<footer></footer>", "")))).toEqual([
			"shell-footer-missing",
		])
	})

	test("a build with no Not-found Page fails", () => {
		expect(codes(GOOD.filter((file) => file.path !== "blog/404.html"))).toEqual([
			"not-found-page-missing",
		])
	})

	test("a file outside /blog fails, because the router forwards nothing else", () => {
		expect(codes([...GOOD, { path: "favicon.ico" }])).toEqual(["file-outside-base"])
	})

	test("each failure names the file that breaks the rule", () => {
		const [failure] = checkBuild(withFrontPage(PAGE.replace("<footer></footer>", "")))
		expect(failure?.path).toBe("blog/index.html")
	})
})
