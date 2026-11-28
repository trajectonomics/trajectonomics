import { describe, expect, test } from "bun:test"
import { withShareTags } from "./hosted-share"

/** A page as the hosted build writes it, with the marker at the head's own indentation. */
const PAGE = [
	"<!doctype html>",
	'<html lang="en" data-theme="light">',
	"\t<head>",
	'\t\t<meta charset="utf-8" />',
	"\t\t<!-- hosted:share -->",
	'\t\t<link rel="manifest" href="/demo/manifest.webmanifest" />',
	"\t</head>",
	"</html>",
].join("\n")

describe("the hosted Demo's share tags", () => {
	test("replaces the marker line with the card's tags, at the marker's indentation", () => {
		const tags = withShareTags(PAGE)
		expect(tags).toContain('\n\t\t<meta property="og:type" content="website" />\n')
		expect(tags).toContain(
			'\n\t\t<meta property="og:title" content="Demo dashboard · Trajectonomics" />\n',
		)
		expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />')
		expect(tags).not.toContain("hosted:share")
		// Nine og tags: the card, the image and its size and type, and no og:url.
		expect(tags.match(/property="og:/g)).toHaveLength(9)
		expect(tags).not.toContain("og:url")
	})

	test("keeps the rest of the page as it was", () => {
		const tags = withShareTags(PAGE)
		expect(tags.split("\n")[0]).toBe("<!doctype html>")
		expect(tags).toContain('<link rel="manifest" href="/demo/manifest.webmanifest" />')
		expect(tags.split("\n").at(-1)).toBe("</html>")
	})

	test("throws when the marker is missing", () => {
		expect(() => withShareTags(PAGE.replace("<!-- hosted:share -->", ""))).toThrow(
			"marker is missing",
		)
	})

	test("throws when the marker appears twice", () => {
		const doubled = PAGE.replace(
			"\t\t<!-- hosted:share -->",
			"\t\t<!-- hosted:share -->\n\t\t<!-- hosted:share -->",
		)
		expect(() => withShareTags(doubled)).toThrow("appears 2 times, not once")
	})
})
