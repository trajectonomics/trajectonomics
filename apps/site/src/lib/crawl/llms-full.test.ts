import { describe, expect, it } from "bun:test"
import { OWNER_WRITTEN_PLACEHOLDER } from "../language/dictionary"
import { FALLBACK_LANGUAGE } from "../language/language"
import { dictionaryFor } from "../language/languages"
import { FI_DEMO_COMMAND, INSTALL_PROMPT } from "../site"
import { LLMS_FULL_FILE, LLMS_FULL_TXT } from "./llms-full"

/** The English Dictionary the file is written from. */
const dictionary = dictionaryFor(FALLBACK_LANGUAGE)

describe("the full Answer engine file", () => {
	it("is named for llmstxt.org and opens with the page's own document title", () => {
		expect(LLMS_FULL_FILE).toBe("llms-full.txt")
		expect(LLMS_FULL_TXT.startsWith(`# ${dictionary.documentTitle}\n\n> `)).toBe(true)
	})

	it("carries the landing copy: the headline, the subline and the release the page prints", () => {
		expect(LLMS_FULL_TXT).toContain(
			`## ${dictionary.heroHeadingPrefix} ${dictionary.heroHeadingAccent}`,
		)
		expect(LLMS_FULL_TXT).toContain(dictionary.heroSubline)
		expect(LLMS_FULL_TXT).toContain(`${dictionary.heroLicence} · ${dictionary.heroVersion}`)
	})

	it("renders every section the page shows, under the page's own headings", () => {
		for (const heading of [
			dictionary.actionHeading,
			dictionary.howHeading,
			dictionary.featuresHeading,
		]) {
			expect(LLMS_FULL_TXT).toContain(`## ${heading}`)
		}
	})

	it("lists every feature and every step, in the order the page lists them", () => {
		for (const [index, title] of dictionary.featureTitles.entries()) {
			expect(LLMS_FULL_TXT).toContain(`- **${title}**: ${dictionary.featureCopies[index]}`)
		}
		for (const [index, step] of dictionary.howSteps.entries()) {
			expect(LLMS_FULL_TXT).toContain(`${index + 1}. ${step}`)
		}
	})

	it("prints the demo command and its answer as fenced code, not as a link", () => {
		expect(LLMS_FULL_TXT).toContain(`\`\`\`bash\n${FI_DEMO_COMMAND}\n\`\`\``)
		expect(LLMS_FULL_TXT).toContain("```json\n{\n")
	})

	it("prints the Prompt route sentence, and carries no Languages section", () => {
		expect(LLMS_FULL_TXT).toContain(INSTALL_PROMPT)
		expect(LLMS_FULL_TXT).not.toContain("## Languages")
	})

	it("carries no text the owner has not written, and no placeholder for it", () => {
		expect(LLMS_FULL_TXT).not.toContain(OWNER_WRITTEN_PLACEHOLDER)
	})
})
