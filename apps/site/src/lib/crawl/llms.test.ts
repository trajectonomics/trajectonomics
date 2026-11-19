import { describe, expect, it } from "bun:test"
import { OWNER_WRITTEN_PLACEHOLDER } from "../language/dictionary"
import { FALLBACK_LANGUAGE } from "../language/language"
import { absoluteLocaleUrl, dictionaryFor, LANGUAGES } from "../language/languages"
import {
	DOCS_CLI_INSTALL_PATH,
	DOCS_CLI_PATH,
	DOCS_PATH,
	GITHUB_CLI_URL,
	GITHUB_SKILLS_URL,
	INSTALL_PROMPT,
	SITE_NAME,
	SITE_ORIGIN,
	SKILLS_LICENCE_URL,
} from "../site"
import { LLMS_FILE, LLMS_TXT } from "./llms"

/** The `## ` section titles the file states, in order. */
function titles(): readonly string[] {
	return LLMS_TXT.split("\n")
		.filter((line) => line.startsWith("## "))
		.map((line) => line.slice(3))
}

describe("the short Answer engine file", () => {
	it("is named for llmstxt.org and opens with the Site's name as one `#` heading", () => {
		expect(LLMS_FILE).toBe("llms.txt")
		expect(LLMS_TXT.startsWith(`# ${SITE_NAME}\n\n> `)).toBe(true)
	})

	it("summarises the Site in the one line the Dictionary states for the fallback Language", () => {
		expect(LLMS_TXT).toContain(`> ${dictionaryFor(FALLBACK_LANGUAGE).description}\n`)
	})

	it("names the sections a reader needs: the Site, the docs, the source, the install and the licence", () => {
		expect(titles()).toEqual(["Site", "Docs", "Source", "Install", "License"])
	})

	it("links every Language home at its absolute Locale URL", () => {
		for (const entry of LANGUAGES) {
			expect(LLMS_TXT).toContain(`](${absoluteLocaleUrl(entry.language)})`)
		}
	})

	it("links the Docs Portal, both repositories and the MIT licence the footer links", () => {
		for (const url of [
			`${SITE_ORIGIN}${DOCS_PATH}`,
			`${SITE_ORIGIN}${DOCS_CLI_PATH}`,
			`${SITE_ORIGIN}${DOCS_CLI_INSTALL_PATH}`,
			GITHUB_CLI_URL,
			GITHUB_SKILLS_URL,
			SKILLS_LICENCE_URL,
		]) {
			expect(LLMS_TXT).toContain(`](${url})`)
		}
	})

	it("prints the one Prompt route sentence the Site shows, word for word", () => {
		expect(LLMS_TXT).toContain(INSTALL_PROMPT)
	})

	it("carries no text the owner has not written, and no placeholder for it", () => {
		expect(LLMS_TXT).not.toContain(OWNER_WRITTEN_PLACEHOLDER)
	})
})
