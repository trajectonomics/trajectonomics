import { describe, expect, it } from "bun:test"
import { elementsByTag, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import {
	DOCS_CLI_INSTALL_PATH,
	DOCS_CLI_PATH,
	DOCS_PATH,
	GITHUB_CLI_ISSUES_URL,
	GITHUB_CLI_RELEASES_URL,
	GITHUB_CLI_URL,
	GITHUB_ORG_URL,
	GITHUB_SKILLS_URL,
	SITE_NAME,
	SKILLS_LICENCE_URL,
} from "../lib/site"
import Footer from "./Footer.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withClass } from "./testing/scan"

describe("the Footer component in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`renders one footer with the disclaimer first (${language})`, async () => {
			const page = scanComponent(await renderComponent(Footer, { dictionary }))
			const footer = elementsByTag(page, "footer")[0]
			if (footer === undefined) throw new Error("no footer rendered")
			const disclaimer = page.elements.find(
				(element) =>
					element.tag === "p" &&
					element.ancestors.includes(footer) &&
					textOf(page, element) === dictionary.footerDisclaimer,
			)
			expect(disclaimer).toBeDefined()
		})

		it(`states the three facts above the disclaimer (${language})`, async () => {
			const page = scanComponent(await renderComponent(Footer, { dictionary }))
			const footer = elementsByTag(page, "footer")[0]
			if (footer === undefined) throw new Error("no footer")
			const facts = page.elements.find((element) => "data-facts" in element.attributes)
			if (facts === undefined) throw new Error("no facts in the footer")
			expect(facts.ancestors).toContain(footer)
			const labels = elementsByTag(page, "dt").map((term) => textOf(page, term))
			const texts = elementsByTag(page, "dd").map((value) => textOf(page, value))
			expect(labels).toEqual([...dictionary.factLabels])
			expect(texts).toEqual([...dictionary.factTexts])
			const disclaimer = page.elements.find(
				(element) => element.tag === "p" && textOf(page, element) === dictionary.footerDisclaimer,
			)
			if (disclaimer === undefined) throw new Error("no disclaimer")
			expect(page.elements.indexOf(facts)).toBeLessThan(page.elements.indexOf(disclaimer))
		})

		it(`links the licence and the organisation (${language})`, async () => {
			const page = scanComponent(await renderComponent(Footer, { dictionary }))
			const links = elementsByTag(page, "a")
			const licence = links.find((element) => element.attributes["href"] === SKILLS_LICENCE_URL)
			const org = links.find((element) => element.attributes["href"] === GITHUB_ORG_URL)
			if (licence === undefined || org === undefined) throw new Error("a footer link is missing")
			expect(textOf(page, licence)).toBe(dictionary.licence)
			expect(textOf(page, org)).toBe(dictionary.org)
		})

		it(`makes the disclaimer the footer's first paragraph, ahead of the brand and the columns (${language})`, async () => {
			const page = scanComponent(await renderComponent(Footer, { dictionary }))
			const first = elementsByTag(page, "p")[0]
			if (first === undefined) throw new Error("no paragraph rendered")
			expect(textOf(page, first)).toBe(dictionary.footerDisclaimer)
		})

		it(`lists three labelled columns of links, and every link goes where it says (${language})`, async () => {
			const page = scanComponent(await renderComponent(Footer, { dictionary }))
			const labels = withClass(page, "footer-label").map((element) => textOf(page, element))
			expect(labels).toEqual([
				dictionary.footerProductLabel,
				dictionary.footerSourceLabel,
				dictionary.footerHelpLabel,
			])
			const links = withClass(page, "footer-link").map((element) => [
				textOf(page, element),
				element.attributes["href"],
			])
			expect(links).toEqual([
				[dictionary.footerDocsLink, DOCS_PATH],
				[dictionary.footerCliDocsLink, DOCS_CLI_PATH],
				[dictionary.footerInstallLink, DOCS_CLI_INSTALL_PATH],
				[dictionary.footerCookieLink, "/?consent=reset"],
				[dictionary.footerCliRepo, GITHUB_CLI_URL],
				[dictionary.footerSkillsRepo, GITHUB_SKILLS_URL],
				[dictionary.org, GITHUB_ORG_URL],
				[dictionary.footerIssues, GITHUB_CLI_ISSUES_URL],
				[dictionary.footerReleases, GITHUB_CLI_RELEASES_URL],
				[dictionary.licence, SKILLS_LICENCE_URL],
			])
		})

		it(`draws the wordmark as decoration, not a second brand link or a second nav (${language})`, async () => {
			const page = scanComponent(await renderComponent(Footer, { dictionary }))
			const wordmark = withClass(page, "footer-wordmark")[0]
			expect(wordmark?.attributes["aria-hidden"]).toBe("true")
			expect(wordmark?.attributes["data-text"]).toBe(SITE_NAME)
			expect(page.text.some((run) => run.text.trim() === SITE_NAME)).toBe(true)
			expect(elementsByTag(page, "nav")).toEqual([])
		})

		it(`renders no heading (${language})`, async () => {
			const page = scanComponent(await renderComponent(Footer, { dictionary }))
			expect(headings(page)).toEqual([])
		})
	}
})
