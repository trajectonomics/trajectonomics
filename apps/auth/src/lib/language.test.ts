import { describe, expect, it } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import {
	dictionaryFor,
	LANGUAGES,
	languageOf,
	PAGES,
	pageFile,
	pageLabel,
	pagePath,
} from "./language"

describe("the address of a page", () => {
	it("puts English at the root and Thai under /th/", () => {
		expect(pagePath("en", "home")).toBe("/")
		expect(pagePath("en", "sign-in")).toBe("/sign-in/")
		expect(pagePath("en", "account")).toBe("/account/")
		expect(pagePath("th", "home")).toBe("/th/")
		expect(pagePath("th", "sign-in")).toBe("/th/sign-in/")
		expect(pagePath("th", "account")).toBe("/th/account/")
	})

	it("reads the language back from the address", () => {
		expect(languageOf("/sign-in/")).toBe("en")
		expect(languageOf("/th/sign-in/")).toBe("th")
		expect(languageOf("/th")).toBe("th")
		expect(languageOf("/th/")).toBe("th")
		expect(languageOf("/thai/sign-in/")).toBe("en")
	})
})

describe("the pages the build writes", () => {
	const pagesRoot = join(import.meta.dir, "..", "pages")

	it("has an Astro file for every page in every language", () => {
		const missing = PAGES.flatMap((page) =>
			LANGUAGES.filter((language) => !existsSync(join(pagesRoot, pageFile(language, page)))).map(
				(language) => `${language}/${page}`,
			),
		)
		expect(missing).toEqual([])
	})
})

describe("the header marker", () => {
	it("names the page it is on, so the bar is not the same word everywhere", () => {
		for (const language of LANGUAGES) {
			const words = dictionaryFor(language)
			expect(pageLabel("sign-in", words)).toBe(words.signInTitle)
			expect(pageLabel("device", words)).toBe(words.deviceTitle)
			expect(pageLabel("consent", words)).toBe(words.consentTitle)
			expect(pageLabel("account", words)).toBe(words.accountTitle)
			expect(pageLabel("privacy", words)).toBe(words.privacyTitle)
			expect(pageLabel("terms", words)).toBe(words.termsTitle)
		}
	})
})
