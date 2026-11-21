import { describe, expect, it } from "bun:test"
import type { HtmlElement, ScannedPage } from "../lib/build/html"
import { elementsByTag, isInlineScript, textOf } from "../lib/build/html"
import type { Dictionary } from "../lib/language/dictionary"
import { currentLanguageName } from "../lib/language/dictionary"
import { LANGUAGES, languageEntry, otherLanguages } from "../lib/language/languages"
import { DOCS_PATH, SITE_NAME, STAR_REPOS } from "../lib/site"
import { STAR_SNAPSHOT } from "../lib/site/star-snapshot"
import { formatStarCount } from "../lib/site/stars"
import Header from "./Header.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute } from "./testing/scan"

/** The attributes a header link carries, as the checks read them. */
interface LinkShape {
	readonly text: string
	readonly lang: string | undefined
	readonly hreflang: string | undefined
	readonly href: string | undefined
}

/** The header's one disclosure: the Language menu. */
function menus(page: ScannedPage): readonly HtmlElement[] {
	return withAttribute(page, "data-header-menu")
}

/** The links one disclosure's panel holds, in document order. */
function linksIn(page: ScannedPage, menu: HtmlElement): readonly LinkShape[] {
	return elementsByTag(page, "a")
		.filter((anchor) => anchor.ancestors.includes(menu))
		.map((anchor) => ({
			text: textOf(page, anchor),
			lang: anchor.attributes["lang"],
			hreflang: anchor.attributes["hreflang"],
			href: anchor.attributes["href"],
		}))
}

/** The menu whose panel holds a link to `href`. */
function menuWith(page: ScannedPage, href: string): HtmlElement {
	const menu = menus(page).find((element) =>
		elementsByTag(page, "a").some(
			(anchor) => anchor.attributes["href"] === href && anchor.ancestors.includes(element),
		),
	)
	if (menu === undefined) throw new Error(`no header menu holds a link to ${href}`)
	return menu
}

/** The summary of one disclosure, whose text names the menu. */
function summaryOf(page: ScannedPage, menu: HtmlElement): HtmlElement {
	const summary = page.elements.find(
		(element) => element.tag === "summary" && element.ancestors.includes(menu),
	)
	if (summary === undefined) throw new Error("a header menu rendered no summary")
	return summary
}

/** The one repository link, its count, and the two marks it draws. */
function repositoryLink(page: ScannedPage) {
	const repo = STAR_REPOS[0]
	if (repo === undefined) throw new Error("the Site names no repository")
	const stars = formatStarCount(STAR_SNAPSHOT.stars[repo.repo] ?? 0)
	const links = elementsByTag(page, "a").filter(
		(element) => element.attributes["href"] === repo.url,
	)
	const link = links[0]
	if (link === undefined) throw new Error("the repository link is missing")
	const marks = page.elements.filter(
		(element) => element.tag === "svg" && element.ancestors.includes(link),
	)
	return { stars, links, link, marks }
}

/** The path the first mark inside `link` draws. */
function markPath(page: ScannedPage, link: HtmlElement): string {
	const mark = page.elements.find(
		(element) => element.tag === "svg" && element.ancestors.includes(link),
	)
	const drawn = page.elements.find(
		(element) => element.tag === "path" && mark !== undefined && element.ancestors.includes(mark),
	)
	return drawn?.attributes["d"] ?? ""
}

/** The header element itself, found by the class the layout and the rules name. */
function headerOf(page: ScannedPage): HtmlElement {
	const header = page.elements.find((element) =>
		(element.attributes["class"] ?? "").split(/\s+/).includes("site-header"),
	)
	if (header === undefined) throw new Error("no site header rendered")
	return header
}

/** One rendered header, so each test names the variant it judges. */
async function renderHeader(language: string, dictionary: Dictionary, markCurrent: boolean) {
	return scanComponent(
		await renderComponent(Header, {
			language,
			dictionary,
			markCurrent,
		}),
	)
}

describe("the Header component in every Language, current or not", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary
		for (const markCurrent of [true, false]) {
			const variant = `${language}, markCurrent=${markCurrent}`

			it(`renders the page's header out of flow, with a nav and no heading (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const header = headerOf(page)
				expect(header.tag).toBe("header")
				const classes = (header.attributes["class"] ?? "").split(/\s+/)
				// The header is fixed, and keeps bg-background for the no-scroll-timeline fallback.
				expect(classes).toContain("fixed")
				expect(classes).toContain("bg-background")
				const nav = elementsByTag(page, "nav")[0]
				if (nav === undefined) throw new Error("no nav rendered")
				expect(nav.ancestors.includes(header)).toBe(true)
				expect((nav.attributes["class"] ?? "").split(/\s+/)).toContain("header-bar")
				expect(headings(page)).toEqual([])
			})

			it(`names the brand link after the Site and hides the artwork (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const brand = elementsByTag(page, "a").find(
					(element) =>
						element.attributes["aria-label"] === SITE_NAME && element.attributes["href"] === "/",
				)
				if (brand === undefined) throw new Error("no brand link rendered")
				const artwork = page.elements.find(
					(element) =>
						element.tag === "svg" &&
						element.ancestors.includes(brand) &&
						element.attributes["aria-hidden"] === "true",
				)
				expect(artwork).toBeDefined()
			})

			it(`links the docs (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const docs = elementsByTag(page, "a").find(
					(element) => element.attributes["href"] === DOCS_PATH,
				)
				if (docs === undefined) throw new Error("the docs link is missing")
				expect(textOf(page, docs)).toBe(dictionary.docsLink)
			})

			it(`links the one repository, with its star count and no repository menu (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const { stars, links, link, marks } = repositoryLink(page)
				expect(links).toHaveLength(1)
				expect(textOf(page, link)).toBe(stars)
				expect(link.attributes["aria-label"]).toBe(`${dictionary.repoLinkLabel} ${stars}`)
				expect(marks.map((mark) => mark.attributes["class"])).toEqual([
					"header-repo-mark",
					"header-repo-out",
				])
				// The GitHub mark twenty's community link draws, so the header cannot return to a star menu.
				expect(markPath(page, link).startsWith("M6.979")).toBe(true)
				expect(menus(page)).toHaveLength(1)
			})

			it(`puts the Language menu after the repository link, at the end of the bar (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const { link } = repositoryLink(page)
				const menu = menus(page)[0]
				if (menu === undefined) throw new Error("no Language menu rendered")
				const end = page.elements.find((element) =>
					(element.attributes["class"] ?? "").split(/\s+/).includes("header-end"),
				)
				if (end === undefined) throw new Error("no header-end group rendered")
				expect(link.ancestors.includes(end)).toBe(true)
				expect(menu.ancestors.includes(end)).toBe(true)
				expect(page.elements.indexOf(menu)).toBeGreaterThan(page.elements.indexOf(link))
			})

			it(`marks the current Language only when the page is its home (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const current = elementsByTag(page, "a").find(
					(element) =>
						element.attributes["lang"] === language &&
						element.attributes["href"] === `/?lang=${language}` &&
						element.attributes["aria-label"] === currentLanguageName(dictionary),
				)
				if (current === undefined) throw new Error("no current-Language link rendered")
				expect(textOf(page, current)).toBe(dictionary.languageName)
				expect(current.attributes["aria-current"]).toBe(markCurrent ? "page" : undefined)
			})

			it(`offers every Language by its own name in the Language menu (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const other = otherLanguages(language)[0]
				if (other === undefined) throw new Error("the Site speaks one Language only")
				const menu = menuWith(page, `/?lang=${other.language}`)
				expect(textOf(page, summaryOf(page, menu))).toBe(dictionary.languageSwitchLabel)
				expect(linksIn(page, menu)).toEqual(
					[languageEntry(language), ...otherLanguages(language)].map((entry) => ({
						text: entry.dictionary.languageName,
						lang: entry.language,
						hreflang: undefined,
						href: `/?lang=${entry.language}`,
					})),
				)
			})

			it(`renders no aria-current anywhere when the page is not a home (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				expect(withAttribute(page, "aria-current").length).toBe(markCurrent ? 1 : 0)
			})

			it(`carries its inline menu script (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				expect(page.elements.some(isInlineScript)).toBe(true)
			})
		}
	}
})
