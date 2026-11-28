import { describe, expect, it } from "bun:test"
import { OWNER_WRITTEN_PLACEHOLDER } from "../language/dictionary"
import { FALLBACK_LANGUAGE } from "../language/language"
import { ABSOLUTE_CLEAN_URL, dictionaryFor, languageBuildUrl } from "../language/languages"
import { FI_DEMO_COMMAND, FI_DEMO_SETUP_COMMANDS, INSTALL_PROMPT } from "../site"
import { LLMS_FULL_FILE, LLMS_FULL_TXT } from "./llms-full"
import { linkCount } from "./llms-markdown"

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
			dictionary.featuresHeading,
			dictionary.faqHeading,
		]) {
			expect(LLMS_FULL_TXT).toContain(`## ${heading}`)
		}
	})

	it("carries every FAQ answer, so an agent reads what a visitor can open", () => {
		for (const answer of dictionary.faqAnswers) {
			expect(LLMS_FULL_TXT).toContain(answer)
		}
	})

	it("carries no How it works section, because the page no longer has one", () => {
		expect(LLMS_FULL_TXT).not.toContain("How it works")
		expect(LLMS_FULL_TXT).not.toContain("Presentation layer")
		expect(LLMS_FULL_TXT).not.toContain("Logic layer")
	})

	it("lists every feature, in the order the page lists them", () => {
		for (const [index, title] of dictionary.featureTitles.entries()) {
			expect(LLMS_FULL_TXT).toContain(`- **${title}**: ${dictionary.featureCopies[index]}`)
		}
	})

	it("walks the demo from the first-time setup to the command and the answer it prints", () => {
		expect(LLMS_FULL_TXT).toContain(
			[
				"```bash",
				"# First-time setup: record your balance, then fill base.json with your numbers before applying it.",
				...FI_DEMO_SETUP_COMMANDS,
				"",
				"# Ask when you reach financial independence:",
				FI_DEMO_COMMAND,
				"```",
			].join("\n"),
		)
		expect(LLMS_FULL_TXT).toContain("```json\n{\n")
	})

	it("carries both transcripts, so the argument survives with no script", () => {
		for (const said of [
			dictionary.actionReask,
			dictionary.actionExplain,
			dictionary.actionGuessReason,
			dictionary.actionSure,
			dictionary.actionConfession,
			dictionary.actionGuideQuestion,
			dictionary.actionAttachName,
			dictionary.actionNeedMore,
			dictionary.actionData,
			dictionary.actionProvenance,
		]) {
			expect(LLMS_FULL_TXT).toContain(said)
		}
		expect(LLMS_FULL_TXT).toContain(dictionary.actionWithoutLabel)
		expect(LLMS_FULL_TXT).toContain(dictionary.actionWithLabel)
	})

	it("carries no run label, because the page has none", () => {
		expect(LLMS_FULL_TXT).not.toContain("Run 1")
	})

	it("prints the Prompt route sentence, and carries no Languages section", () => {
		expect(LLMS_FULL_TXT).toContain(INSTALL_PROMPT)
		expect(LLMS_FULL_TXT).not.toContain("## Languages")
	})

	it("links the Site's one address, once, and no Language build path", () => {
		expect(linkCount(LLMS_FULL_TXT, ABSOLUTE_CLEAN_URL)).toBe(1)
		expect(LLMS_FULL_TXT).not.toContain(`](${languageBuildUrl("th")})`)
	})

	it("carries no text the owner has not written, and no placeholder for it", () => {
		expect(LLMS_FULL_TXT).not.toContain(OWNER_WRITTEN_PLACEHOLDER)
	})
})
