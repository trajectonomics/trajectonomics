import { describe, expect, it } from "bun:test"
import { elementsByTag, textOf } from "../lib/build/html"
import { currentLanguageName } from "../lib/language/dictionary"
import { LANGUAGES, languageEntry, localeUrl, otherLanguages } from "../lib/language/languages"
import { DOCS_PATH, GITHUB_SKILLS_URL, SITE_NAME } from "../lib/site"
import Header from "./Header.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

describe("the Header component in every Language, current or not", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary
		for (const markCurrent of [true, false]) {
			const variant = `${language}, markCurrent=${markCurrent}`

			it(`renders a header with a nav, and no heading (${variant})`, async () => {
				const page = scanComponent(
					await renderComponent(Header, { language, dictionary, markCurrent }),
				)
				const header = withClass(page, "site-header")[0]
				if (header === undefined) throw new Error("no site header rendered")
				expect(header.tag).toBe("header")
				const nav = elementsByTag(page, "nav")[0]
				if (nav === undefined) throw new Error("no nav rendered")
				expect(nav.ancestors.includes(header)).toBe(true)
				expect(headings(page)).toEqual([])
			})

			it(`names the wordmark link after the Site and hides the artwork (${variant})`, async () => {
				const page = scanComponent(
					await renderComponent(Header, { language, dictionary, markCurrent }),
				)
				const wordmark = elementsByTag(page, "a").find(
					(element) =>
						element.attributes["aria-label"] === SITE_NAME &&
						element.attributes["href"] === localeUrl(language),
				)
				if (wordmark === undefined) throw new Error("no wordmark link rendered")
				const artwork = page.elements.find(
					(element) =>
						element.tag === "svg" &&
						element.ancestors.includes(wordmark) &&
						element.attributes["aria-hidden"] === "true",
				)
				expect(artwork).toBeDefined()
			})

			it(`links the docs and GitHub (${variant})`, async () => {
				const page = scanComponent(
					await renderComponent(Header, { language, dictionary, markCurrent }),
				)
				const links = elementsByTag(page, "a")
				const docs = links.find((element) => element.attributes["href"] === DOCS_PATH)
				const github = links.find((element) => element.attributes["href"] === GITHUB_SKILLS_URL)
				if (docs === undefined || github === undefined) throw new Error("a header link is missing")
				expect(textOf(page, docs)).toBe(dictionary.docsLink)
				expect(textOf(page, github)).toBe(dictionary.githubLink)
			})

			it(`marks the current Language only when the page is its home (${variant})`, async () => {
				const page = scanComponent(
					await renderComponent(Header, { language, dictionary, markCurrent }),
				)
				const current = elementsByTag(page, "a").find(
					(element) =>
						element.attributes["lang"] === language &&
						element.attributes["href"] === localeUrl(language) &&
						element.attributes["aria-label"] === currentLanguageName(dictionary),
				)
				if (current === undefined) throw new Error("no current-Language link rendered")
				expect(textOf(page, current)).toBe(dictionary.languageSwitchLabel)
				expect(current.attributes["aria-current"]).toBe(markCurrent ? "page" : undefined)
			})

			it(`offers every other Language by its own name (${variant})`, async () => {
				const page = scanComponent(
					await renderComponent(Header, { language, dictionary, markCurrent }),
				)
				for (const other of otherLanguages(language)) {
					const link = elementsByTag(page, "a").find(
						(element) => element.attributes["href"] === localeUrl(other.language),
					)
					if (link === undefined) throw new Error(`no link to ${other.language}`)
					expect(link.attributes["lang"]).toBe(other.language)
					expect(link.attributes["hreflang"]).toBe(other.language)
					expect(textOf(page, link)).toBe(other.dictionary.languageName)
				}
			})

			it(`renders no aria-current anywhere when the page is not a home (${variant})`, async () => {
				const page = scanComponent(
					await renderComponent(Header, { language, dictionary, markCurrent }),
				)
				expect(withAttribute(page, "aria-current").length).toBe(markCurrent ? 1 : 0)
			})
		}
	}
})
