import { describe, expect, test } from "bun:test"
import { SHARE_IMAGE_URL } from "../head-tags"
import { PORTAL_ORIGIN } from "../site"
import type { BuiltFile } from "./built-files"
import { checkHeadTags } from "./head-tags"

/** The head a built page states for `url` and `title`, in the order the layout writes it. */
function head(url: string, title: string, description?: string): string {
	return [
		`<title>${title}</title>`,
		description === undefined ? "" : `<meta name="description" content="${description}">`,
		`<link rel="canonical" href="${url}">`,
		`<meta property="og:title" content="${title}">`,
		`<meta property="og:description" content="${description ?? "Documentation for running the Trajectonomics CLI and helping make its tax rules right."}">`,
		`<meta property="og:url" content="${url}">`,
		'<meta property="og:type" content="website">',
		'<meta property="og:site_name" content="Trajectonomics Docs">',
		`<meta property="og:image" content="${SHARE_IMAGE_URL}">`,
		'<meta property="og:image:width" content="1200">',
		'<meta property="og:image:height" content="630">',
		'<meta property="og:image:type" content="image/png">',
		'<meta name="twitter:card" content="summary_large_image">',
		`<meta name="twitter:image" content="${SHARE_IMAGE_URL}">`,
	].join("")
}

/** A built page whose head is `headHtml` around its body. */
function page(path: string, headHtml: string): BuiltFile {
	return {
		path,
		content: `<!doctype html><html><head>${headHtml}</head><body><main></main></body></html>`,
	}
}

const LANDING = page("index.html", head(`${PORTAL_ORIGIN}/`, "Trajectonomics Docs", "Landing."))
const DEEP = page(
	"cli/install/index.html",
	head(`${PORTAL_ORIGIN}/cli/install/`, "Install the CLI", "How to install traj."),
)

function codesOf(files: readonly BuiltFile[]): readonly string[] {
	return checkHeadTags(files).map((failure) => failure.code)
}

describe("the canonical link and share tags of the built Docs Portal", () => {
	test("the landing page and a deep page state the canonical and every Open Graph and X tag", () => {
		expect(codesOf([LANDING, DEEP])).toEqual([])
	})

	test("a deep page with no canonical link is reported as HEAD_TAG_MISSING", () => {
		const content = DEEP.content.replace(/<link rel="canonical"[^>]*>/, "")

		expect(codesOf([{ ...DEEP, content }])).toEqual(["HEAD_TAG_MISSING"])
	})

	test("a page whose canonical names another page is reported as HEAD_TAG_MISMATCH", () => {
		const content = DEEP.content.replace(`${PORTAL_ORIGIN}/cli/install/`, `${PORTAL_ORIGIN}/cli/`)
		const failures = checkHeadTags([{ ...DEEP, content }])

		expect(failures.map((failure) => failure.code)).toEqual(["HEAD_TAG_MISMATCH"])
		expect(failures[0]?.message).toContain("canonical")
	})

	test("a landing page with no X card is reported as HEAD_TAG_MISSING", () => {
		const content = LANDING.content.replace(
			'<meta name="twitter:card" content="summary_large_image">',
			"",
		)

		expect(codesOf([{ ...LANDING, content }])).toEqual(["HEAD_TAG_MISSING"])
	})

	test("an og:title that differs from the page title is reported as HEAD_TAG_MISMATCH", () => {
		const content = DEEP.content.replace(
			'og:title" content="Install the CLI"',
			'og:title" content="Other"',
		)

		expect(codesOf([{ ...DEEP, content }])).toEqual(["HEAD_TAG_MISMATCH"])
	})

	test("the 404 page is no reader page and states none of the tags", () => {
		const notFound = page("404.html", "<title>Page not found</title>")

		expect(codesOf([notFound])).toEqual([])
	})
})
