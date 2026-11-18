import { describe, expect, it } from "bun:test"
import { readDesignTokens } from "../../scripts/adapters/design-tokens"
import { renderComponent } from "../components/testing/render"
import { scanComponent } from "../components/testing/scan"
import {
	elementsByTag,
	type HtmlElement,
	isDataBlockType,
	type ScannedPage,
	scriptElements,
} from "../lib/build/html"
import { shippedThemes } from "../lib/design/shipped-themes"
import { themePaints } from "../lib/design/theme-paint"
import { dictionaryFor, LANGUAGES } from "../lib/language/languages"
import { structuredData } from "../lib/site/structured-data"
import Layout from "./Layout.astro"

/** One rendered page: the markup the component wrote, and the same markup scanned. */
interface Rendered {
	readonly html: string
	readonly page: ScannedPage
}

/**
 * The paint the pinned Theme CSS publishes for the Themes a production build ships, read as
 * `verify:build` reads it. The container renders with no Build Mode, and no mode means production.
 */
const PAINTS = themePaints(await readDesignTokens(), shippedThemes("production"))

/** The metas of one rendered page, in document order. */
function metas(page: ScannedPage): readonly HtmlElement[] {
	return elementsByTag(page, "meta")
}

/** The `name` of every meta that carries one, in document order. */
function metaNames(page: ScannedPage): readonly string[] {
	return metas(page).flatMap((meta) => {
		const name = meta.attributes["name"]
		return name === undefined ? [] : [name]
	})
}

/** The parsed body of every Structured data block in rendered markup. */
function blocks(html: string): readonly unknown[] {
	const block = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
	return [...html.matchAll(block)].map((match) => JSON.parse(match[1] ?? ""))
}

/** One Language's home, rendered as the page renders it. */
async function home(language: string): Promise<Rendered> {
	const dictionary = dictionaryFor(language)
	const html = await renderComponent(Layout, {
		language,
		title: dictionary.documentTitle,
		description: dictionary.description,
		indexed: true,
	})
	return { html, page: scanComponent(html) }
}

/** One Language's Not-found page, rendered as the page renders it. */
async function miss(language: string): Promise<Rendered> {
	const html = await renderComponent(Layout, {
		language,
		title: dictionaryFor(language).notFoundHeading,
		indexed: false,
	})
	return { html, page: scanComponent(html) }
}

describe("the Layout every page renders", () => {
	for (const { language } of LANGUAGES) {
		it(`asks for the dark Theme and paints the browser bar once, with no media (${language})`, async () => {
			const rendered = await home(language)
			const [html] = elementsByTag(rendered.page, "html")
			expect(html?.attributes["data-theme"]).toBe("dark")
			const paints = metas(rendered.page).filter(
				(meta) => meta.attributes["name"] === "theme-color",
			)
			expect(paints.map((meta) => meta.attributes["media"])).toEqual(
				PAINTS.map((paint) => paint.media),
			)
			expect(paints.map((meta) => meta.attributes["content"])).toEqual(
				PAINTS.map((paint) => paint.colour),
			)
			expect(paints).toHaveLength(1)
			expect(paints[0]?.attributes["content"]).toBe("#0a0a0a")
		})

		it(`carries no script that reads the device scheme (${language})`, async () => {
			const rendered = await home(language)
			const scripts = scriptElements(rendered.html)
			expect(scripts.filter((script) => /prefers-color-scheme/i.test(script.body))).toEqual([])
		})

		it(`carries one Structured data block naming the page (${language})`, async () => {
			const rendered = await home(language)
			expect(blocks(rendered.html)).toEqual([structuredData(language)])
			expect(
				elementsByTag(rendered.page, "script").filter((script) =>
					isDataBlockType(script.attributes["type"]),
				),
			).toHaveLength(1)
		})

		it(`carries the title and the summary in the page's own Language (${language})`, async () => {
			const rendered = await home(language)
			const dictionary = dictionaryFor(language)
			const description = metas(rendered.page).find(
				(meta) => meta.attributes["name"] === "description",
			)
			expect(description?.attributes["content"]).toBe(dictionary.description)
			expect(rendered.html).toContain(`<title>${dictionary.documentTitle}</title>`)
		})

		it(`keeps a miss out of every index and every claim (${language})`, async () => {
			const rendered = await miss(language)
			expect(metaNames(rendered.page)).toEqual(["viewport", "theme-color", "robots"])
			expect(metas(rendered.page).filter((meta) => meta.attributes["property"])).toEqual([])
			expect(blocks(rendered.html)).toEqual([])
		})
	}
})
