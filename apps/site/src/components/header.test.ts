import { describe, expect, it } from "bun:test"
import type { HtmlElement, ScannedPage } from "../lib/build/html"
import { elementsByTag, isInlineScript, textOf } from "../lib/build/html"
import type { Dictionary } from "../lib/language/dictionary"
import { currentLanguageName } from "../lib/language/dictionary"
import { LANGUAGES, languageEntry, localeUrl, otherLanguages } from "../lib/language/languages"
import { DOCS_PATH, GITHUB_ORG_URL, SITE_NAME } from "../lib/site"
import { STARRED_REPOS, TOP_STAR_LABEL } from "../lib/site/star-snapshot"
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
						element.attributes["aria-label"] === SITE_NAME &&
						element.attributes["href"] === localeUrl(language),
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

			it(`names the highest count on the Star menu's trigger, with no verb (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const menu = menuWith(page, STARRED_REPOS[0]?.url ?? GITHUB_ORG_URL)
				const summary = summaryOf(page, menu)
				expect(textOf(page, summary)).toBe(TOP_STAR_LABEL ?? "")
				const label =
					TOP_STAR_LABEL === undefined
						? dictionary.starMenuLabel
						: `${dictionary.starMenuLabel}: ${TOP_STAR_LABEL}`
				expect(summary.attributes["aria-label"]).toBe(label)
			})

			it(`offers every repository in the Star menu, highest stars first (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const menu = menuWith(page, STARRED_REPOS[0]?.url ?? GITHUB_ORG_URL)
				const group = withClass(page, "header-menu-group")[0]
				expect(group === undefined ? undefined : textOf(page, group)).toBe(
					dictionary.starMenuGroupLabel,
				)
				expect(linksIn(page, menu).map((link) => [link.text, link.href])).toEqual([
					...STARRED_REPOS.map((repo) => [`${repo.name} ${formatStarCount(repo.stars)}`, repo.url]),
					[dictionary.starMenuAllRepos, GITHUB_ORG_URL],
				])
			})

			it(`checks the repository the trigger names, and only that one (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const menu = menuWith(page, STARRED_REPOS[0]?.url ?? GITHUB_ORG_URL)
				const rows = page.elements.filter(
					(element) =>
						element.tag === "a" &&
						element.ancestors.includes(menu) &&
						(element.attributes["class"] ?? "").includes("header-menu-row"),
				)
				const checked = rows.map((row) =>
					page.elements.some(
						(element) =>
							element.tag === "svg" &&
							element.ancestors.includes(row) &&
							(element.attributes["class"] ?? "").includes("header-menu-check"),
					),
				)
				expect(checked).toEqual(rows.map((_, index) => index === 0))
			})

			it(`marks the current Language only when the page is its home (${variant})`, async () => {
				const page = await renderHeader(language, dictionary, markCurrent)
				const current = elementsByTag(page, "a").find(
					(element) =>
						element.attributes["lang"] === language &&
						element.attributes["href"] === localeUrl(language) &&
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
				const menu = menuWith(page, localeUrl(other.language))
				expect(textOf(page, summaryOf(page, menu))).toBe(dictionary.languageSwitchLabel)
				expect(linksIn(page, menu)).toEqual(
					[languageEntry(language), ...otherLanguages(language)].map((entry) => ({
						text: entry.dictionary.languageName,
						lang: entry.language,
						hreflang: entry.language,
						href: localeUrl(entry.language),
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
