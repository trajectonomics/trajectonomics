import { describe, expect, test } from "bun:test"
import { checkBuild } from "./check-build"
import type { BuiltFile, FailureCode } from "./failures"

/** A page that meets every rule; each test breaks one. */
const HEAD = `<title>Blog</title><link rel="canonical" href="https://trajectonomics.com/blog/">`
const IMAGE = `<img src="/blog/posts/a/cover.webp" alt="Three robots">`
const SHELL = `<a href="/">Home</a><a href="/blog/">Blog</a><footer></footer>`
const PAGE = `<html><head>${HEAD}</head><body>${IMAGE}${SHELL}</body></html>`
const NOT_FOUND = `<html><head><title>Not found</title><meta name="robots" content="noindex"></head><body>${SHELL}</body></html>`

/** A build that passes: the front page, its image and the Not-found Page. */
const GOOD: readonly BuiltFile[] = [
	{ path: "index.html", text: PAGE },
	{ path: "404.html", text: NOT_FOUND },
	{ path: "posts/a/cover.webp" },
	{ path: "llms.txt", text: "# Trajectonomics Blog\n" },
]

/** A Post page: an article that states its BlogPosting in one JSON-LD block. */
const BLOG_POSTING = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"A"}</script>`
const POST = `<html><head><title>A</title><link rel="canonical" href="https://trajectonomics.com/blog/guides/a/"><meta property="og:type" content="article">${BLOG_POSTING}</head><body>${SHELL}</body></html>`

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
		const html = PAGE.replace("/blog/posts/a/cover.webp", "https://example.com/a.webp")
		expect(codes(withFrontPage(html))).toEqual([])
	})

	test("a page with no link to the Site Home fails", () => {
		const html = PAGE.replace('<a href="/">Home</a>', "")
		expect(codes(withFrontPage(html))).toEqual(["shell-home-link-missing"])
	})

	test("a page with no link to the blog's front page fails", () => {
		expect(codes(withFrontPage(PAGE.replace('<a href="/blog/">Blog</a>', "")))).toEqual([
			"shell-blog-link-missing",
		])
	})

	test("a page in a prefixed tree links to its own tree's front page", () => {
		const thai = PAGE.replace('<a href="/blog/">Blog</a>', '<a href="/blog/th/">บล็อก</a>').replace(
			'href="https://trajectonomics.com/blog/"',
			'href="https://trajectonomics.com/blog/th/"',
		)
		expect(codes([...GOOD, { path: "th/index.html", text: thai }])).toEqual([])
		expect(codes([...GOOD, { path: "th/index.html", text: PAGE }])).toEqual([
			"shell-blog-link-missing",
		])
	})

	test("a canonical the build lacks fails", () => {
		const html = PAGE.replace(
			"https://trajectonomics.com/blog/",
			"https://trajectonomics.com/blog/guides/gone/",
		)
		expect(codes(withFrontPage(html))).toEqual(["page-canonical-unbuilt"])
	})

	test("an alternate the build lacks fails, and one it has passes", () => {
		const alternate = (href: string) =>
			PAGE.replace("</head>", `<link rel="alternate" hreflang="th" href="${href}"></head>`)
		expect(codes(withFrontPage(alternate("https://trajectonomics.com/blog/")))).toEqual([])
		expect(codes(withFrontPage(alternate("https://trajectonomics.com/blog/th/")))).toEqual([
			"page-alternate-unbuilt",
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

	test("a build with no llms.txt fails, so answer engines have no index", () => {
		expect(codes(GOOD.filter((file) => file.path !== "llms.txt"))).toEqual(["llms-txt-missing"])
	})

	test("a Post page that states no BlogPosting fails", () => {
		const bare = POST.replace(BLOG_POSTING, "")
		expect(codes([...GOOD, { path: "guides/a/index.html", text: bare }])).toEqual([
			"post-structured-data-missing",
		])
	})

	test("a Post page that states its BlogPosting passes", () => {
		expect(checkBuild([...GOOD, { path: "guides/a/index.html", text: POST }])).toEqual([])
	})

	test("each failure names the file that breaks the rule", () => {
		const [failure] = checkBuild(withFrontPage(PAGE.replace("<footer></footer>", "")))
		expect(failure?.path).toBe("index.html")
	})

	test("a build missing expected redirects fails", () => {
		const expected = [{ from: "/blog/guides/a/", to: "/blog/essays/a/" }]
		expect(checkBuild(GOOD, expected).map((entry) => entry.code)).toEqual(["redirects-missing"])
	})

	test("a _redirects rule whose target is built and source is gone passes", () => {
		const essay = POST.replace("/blog/guides/a/", "/blog/essays/a/")
		const expected = [{ from: "/blog/guides/a/", to: "/blog/essays/a/" }]
		const files: readonly BuiltFile[] = [
			...GOOD,
			{ path: "essays/a/index.html", text: essay },
			{ path: "_redirects", text: "/blog/guides/a/ /blog/essays/a/ 301\n" },
		]
		expect(checkBuild(files, expected)).toEqual([])
	})

	test("a _redirects rule targeting an unbuilt page fails", () => {
		const files: readonly BuiltFile[] = [
			...GOOD,
			{ path: "_redirects", text: "/blog/guides/a/ /blog/essays/missing/ 301\n" },
		]
		expect(codes(files)).toEqual(["redirect-target-unbuilt"])
	})

	test("a _redirects rule colliding with a built page fails", () => {
		const essay = POST.replace("/blog/guides/a/", "/blog/essays/a/")
		const files: readonly BuiltFile[] = [
			...GOOD,
			{ path: "guides/a/index.html", text: POST },
			{ path: "essays/a/index.html", text: essay },
			{ path: "_redirects", text: "/blog/guides/a/ /blog/essays/a/ 301\n" },
		]
		expect(codes(files)).toEqual(["redirect-source-built"])
	})

	test("a two-token _redirects rule without a status is still checked", () => {
		const files: readonly BuiltFile[] = [
			...GOOD,
			{ path: "_redirects", text: "/blog/guides/a/ /blog/essays/missing/\n" },
		]
		expect(codes(files)).toEqual(["redirect-target-unbuilt"])
	})

	test("a _redirects file missing an expected rule fails", () => {
		const essay = POST.replace("/blog/guides/a/", "/blog/essays/a/")
		const expected = [
			{ from: "/blog/guides/a/", to: "/blog/essays/a/" },
			{ from: "/blog/guides/a", to: "/blog/essays/a/" },
		]
		const files: readonly BuiltFile[] = [
			...GOOD,
			{ path: "essays/a/index.html", text: essay },
			{ path: "_redirects", text: "/blog/guides/a/ /blog/essays/a/ 301\n" },
		]
		expect(checkBuild(files, expected).map((entry) => entry.code)).toEqual([
			"redirect-rule-missing",
		])
	})
})
