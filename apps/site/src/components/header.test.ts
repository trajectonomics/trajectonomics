import { describe, expect, it } from "bun:test"
import type { HtmlElement, ScannedPage } from "../lib/build/html"
import { elementsByTag, isInlineScript, textOf } from "../lib/build/html"
import type { Dictionary } from "../lib/language/dictionary"
import { currentLanguageName } from "../lib/language/dictionary"
import { LANGUAGES, languageEntry, otherLanguages } from "../lib/language/languages"
import { DOCS_PATH, GITHUB_ORG_URL, SITE_NAME } from "../lib/site"
import { STARRED_REPOS, TOP_REPO_NAME } from "../lib/site/star-snapshot"
import { formatStarCount } from "../lib/site/stars"
import Header from "./Header.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

/** The attributes a header link carries, as the checks read them. */
interface LinkShape {
	readonly text: string
	readonly lang: string | undefined
	readonly hreflang: string | undefined
	readonly href: string | undefined
}

/** The header's two disclosures: the Star menu and the Language menu. */
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

			it(`names the top repository on the Star menu's trigger, with no verb (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const menu = menuWith(page, STARRED_REPOS[0]?.url ?? GITHUB_ORG_URL)
				const summary = summaryOf(page, menu)
				expect(textOf(page, summary)).toBe(TOP_REPO_NAME ?? "")
				const label =
					TOP_REPO_NAME === undefined
						? dictionary.starMenuLabel
						: `${dictionary.starMenuLabel}: ${TOP_REPO_NAME}`
				expect(summary.attributes["aria-label"]).toBe(label)
			})

			it(`offers every repository in the Star menu, highest stars first (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const menu = menuWith(page, STARRED_REPOS[0]?.url ?? GITHUB_ORG_URL)
				const group = withClass(page, "header-menu-group")[0]
				// A repository at zero is left out, so a menu with no starred repository has no group either.
				expect(group === undefined ? undefined : textOf(page, group)).toBe(
					STARRED_REPOS.length === 0 ? undefined : dictionary.starMenuGroupLabel,
				)
				expect(linksIn(page, menu).map((link) => [link.text, link.href])).toEqual([
					...STARRED_REPOS.map((repo) => [`${repo.name} ${formatStarCount(repo.stars)}`, repo.url]),
					[dictionary.starMenuAllRepos, GITHUB_ORG_URL],
				])
			})

			it(`draws a star on the Star menu's trigger, never the GitHub mark (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const summary = summaryOf(page, menuWith(page, STARRED_REPOS[0]?.url ?? GITHUB_ORG_URL))
				const mark = page.elements.find(
					(element) => element.tag === "svg" && element.ancestors.includes(summary),
				)
				if (mark === undefined) throw new Error("the Star menu's trigger draws no mark")
				const classes = (mark.attributes["class"] ?? "").split(/\s+/)
				expect(classes).toContain("header-menu-mark")
				expect(classes).toContain("header-menu-star")
				const drawn = page.elements.find(
					(element) => element.tag === "path" && element.ancestors.includes(mark),
				)
				// The star's own path, so the mark cannot silently return to the GitHub mark's `M8 0C3.58`.
				expect(drawn?.attributes["d"]?.startsWith("M8 1.8L9.6")).toBe(true)
			})

			it(`marks no current repository in the Star menu's panel (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const panel = withClass(page, "header-menu-panel")[0]
				if (panel === undefined) throw new Error("the Star menu renders no panel")
				const checked = page.elements.filter(
					(element) =>
						element.ancestors.includes(panel) &&
						(element.attributes["class"] ?? "").split(/\s+/).includes("header-menu-check"),
				)
				expect(checked).toEqual([])
				// The footer's arrow is the panel's only glyph, so a check has nowhere to hide.
				const marks = page.elements.filter(
					(element) => element.tag === "svg" && element.ancestors.includes(panel),
				)
				expect(marks).toHaveLength(1)
				expect(
					marks[0]?.ancestors.some((element) => element.attributes["href"] === GITHUB_ORG_URL),
				).toBe(true)
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
