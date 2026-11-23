import { describe, expect, test } from "bun:test"
import { LLMS_TITLE, type LlmsPost, llmsTxt } from "./llms-txt"
import { DOCS_URL, SITE_HOME_URL, SOURCE_URL } from "./site"

const POSTS: readonly LlmsPost[] = [
	{
		title: "Newer guide",
		url: "https://blog.trajectonomics.com/guides/newer/",
		description: "A guide to the newer thing.",
	},
	{
		title: "Older news",
		url: "https://blog.trajectonomics.com/news/older/",
		description: "A note on the older thing.",
	},
]

const SUMMARY = "Comparisons, guides and news about traj."

describe("the llms.txt the blog serves", () => {
	const text = llmsTxt({ summary: SUMMARY, posts: POSTS })
	const lines = text.split("\n")

	test("opens with the blog's title and then the one-line summary", () => {
		expect(lines[0]).toBe(`# ${LLMS_TITLE}`)
		expect(LLMS_TITLE).toBe("Trajectonomics Blog")
		expect(lines[2]).toBe(`> ${SUMMARY}`)
	})

	test("lists each Post as a link to its canonical URL, followed by its description", () => {
		const start = lines.indexOf("## Posts")
		expect(start).toBeGreaterThan(0)
		expect(lines.slice(start + 2, start + 4)).toEqual([
			"- [Newer guide](https://blog.trajectonomics.com/guides/newer/): A guide to the newer thing.",
			"- [Older news](https://blog.trajectonomics.com/news/older/): A note on the older thing.",
		])
	})

	test("keeps the Posts in the order it is given, which is newest first", () => {
		const postsSection = lines.slice(lines.indexOf("## Posts"), lines.indexOf("## Elsewhere"))
		const items = postsSection.filter((line) => line.startsWith("- ["))
		expect(items).toHaveLength(2)
		expect(items[0]?.startsWith("- [Newer guide](")).toBe(true)
		expect(items[1]?.startsWith("- [Older news](")).toBe(true)
	})

	test("links the Site, the Docs and GitHub under Elsewhere", () => {
		const start = lines.indexOf("## Elsewhere")
		expect(start).toBeGreaterThan(0)
		expect(lines.slice(start + 2, start + 5)).toEqual([
			`- [Site](${SITE_HOME_URL})`,
			`- [Docs](${DOCS_URL})`,
			`- [GitHub](${SOURCE_URL})`,
		])
	})

	test("ends with one newline and states no section the shape does not name", () => {
		expect(text.endsWith("\n")).toBe(true)
		expect(text.endsWith("\n\n")).toBe(false)
		expect(lines.filter((line) => line.startsWith("## "))).toEqual(["## Posts", "## Elsewhere"])
	})

	test("still writes the shape when the blog has no English Post yet", () => {
		const empty = llmsTxt({ summary: SUMMARY, posts: [] })
		expect(empty).toContain("## Posts\n\n## Elsewhere")
	})
})
