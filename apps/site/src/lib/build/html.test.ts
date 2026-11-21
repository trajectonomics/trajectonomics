import { describe, expect, it } from "bun:test"
import { elementsByTag, scanHtml, textOf } from "./html"
import { unescapeText } from "./html-tag"

const PAGE = `<!doctype html>
<html lang="en" data-theme="light">
	<head>
		<!-- the inline Theme script comes before any stylesheet -->
		<script is:inline>const tag = "<nav>"</script>
		<link rel="stylesheet" href="/_astro/site.css">
		<title>Title text the checks ignore</title>
	</head>
	<body class="bg-background text-foreground">
		<header class="border-b"><nav><a href="/">Trajectonomics</a></nav></header>
		<main><h1>Hero</h1><p>Sub-line with <strong>bold</strong> words</p><img src="/x.png"></main>
		<footer><p>Footer</p></footer>
	</body>
</html>`

const page = scanHtml(PAGE)

describe("the elements a built page scans into", () => {
	it("keeps the attributes of an element, quoted or bare", () => {
		const [html] = elementsByTag(page, "html")
		expect(html?.attributes).toEqual({ lang: "en", "data-theme": "light" })
	})

	it("reads an attribute value that contains a closing bracket", () => {
		const [img] = elementsByTag(scanHtml('<img alt="a > b">'), "img")
		expect(img?.attributes["alt"]).toBe("a > b")
	})

	it("leaves a comment and a doctype out", () => {
		const tags = scanHtml("<!-- <nav></nav> --><!doctype html><main></main>").elements.map(
			(element) => element.tag,
		)
		expect(tags).toEqual(["main"])
	})

	it("does not read markup inside a script or a style as an element", () => {
		expect(elementsByTag(page, "nav")).toHaveLength(1)
	})

	it("closes the element a closing tag names, not the innermost one", () => {
		const tags = scanHtml("<div><p>one</p><p>two</p></div><footer></footer>").elements.map(
			(element) => element.tag,
		)
		expect(tags).toEqual(["div", "p", "p", "footer"])
	})

	it("lists the elements in document order, so the hero precedes the footer", () => {
		expect(page.elements.map((element) => element.tag)).toEqual([
			"html",
			"head",
			"script",
			"link",
			"title",
			"body",
			"header",
			"nav",
			"a",
			"main",
			"h1",
			"p",
			"strong",
			"img",
			"footer",
			"p",
		])
	})
})

describe("the text runs of a built page", () => {
	it("carry every ancestor, outermost first", () => {
		const bold = page.text.find((run) => run.text === "bold")
		expect(bold?.ancestors.map((element) => element.tag)).toEqual([
			"html",
			"body",
			"main",
			"p",
			"strong",
		])
	})

	it("leave out the text of a script, a style and the title", () => {
		const runs = page.text.map((run) => run.text)
		expect(runs).not.toContain("Title text the checks ignore")
		expect(runs.join("")).not.toContain("<nav>")
	})

	it("leave out whitespace, which no one reads", () => {
		expect(scanHtml("<p>\n\t \n</p>").text).toEqual([])
	})

	it("read the text an element carries, including the text of its children", () => {
		const [paragraph] = elementsByTag(page, "p")
		expect(paragraph === undefined ? "" : textOf(page, paragraph)).toBe("Sub-line with bold words")
	})

	it("collapse the whitespace of an element's text, as a browser renders it", () => {
		const scanned = scanHtml('<a href="/">  Star   on\nGitHub </a>')
		const [anchor] = elementsByTag(scanned, "a")
		expect(anchor === undefined ? "" : textOf(scanned, anchor)).toBe("Star on GitHub")
	})
})

describe("the text an element carries, once the writer's escaping is undone", () => {
	it("turns the characters an HTML writer escapes back into the text the page shows", () => {
		expect(unescapeText("traj &amp; friends")).toBe("traj & friends")
		expect(unescapeText("don&#39;t &lt;panic&gt; &quot;now&quot;")).toBe('don\'t <panic> "now"')
	})

	it("leaves escaping written twice alone once, so text that shows a literal entity survives", () => {
		expect(unescapeText("&amp;amp;")).toBe("&amp;")
	})

	it("leaves an entity it does not know as it is, so no text is invented", () => {
		expect(unescapeText("&nbsp; &copy;")).toBe("&nbsp; &copy;")
	})
})
