import { describe, expect, it } from "bun:test"
import { readDesignTokens } from "../../scripts/adapters/design-tokens"
import { renderComponent } from "../components/testing/render"
import { scanComponent } from "../components/testing/scan"
import {
	elementsByTag,
	type HtmlElement,
	isDataBlockType,
	type ScannedPage,
} from "../lib/build/html"
import { themePaints } from "../lib/design/theme-paint"
import { dictionaryFor, LANGUAGES } from "../lib/language/languages"
import { structuredData } from "../lib/site/structured-data"
import Layout from "./Layout.astro"

/** One rendered page: the markup the component wrote, and the same markup scanned. */
interface Rendered {
	readonly html: string
	readonly page: ScannedPage
}

/** The two paints the pinned Theme CSS publishes, read as `verify:build` reads them. */
const PAINTS = themePaints(await readDesignTokens())

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
		it(`paints the browser bar once per published Theme (${language})`, async () => {
			const paints = metas((await home(language)).page).filter(
				(meta) => meta.attributes["name"] === "theme-color",
			)
			expect(paints.map((meta) => meta.attributes["media"])).toEqual(
				PAINTS.map((paint) => paint.media),
			)
			expect(paints.map((meta) => meta.attributes["content"])).toEqual(
				PAINTS.map((paint) => paint.colour),
			)
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
			expect(metaNames(rendered.page)).toEqual(["viewport", "theme-color", "theme-color", "robots"])
			expect(metas(rendered.page).filter((meta) => meta.attributes["property"])).toEqual([])
			expect(blocks(rendered.html)).toEqual([])
		})
	}
})
