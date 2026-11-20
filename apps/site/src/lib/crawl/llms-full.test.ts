import { describe, expect, it } from "bun:test"
import { OWNER_WRITTEN_PLACEHOLDER } from "../language/dictionary"
import { FALLBACK_LANGUAGE } from "../language/language"
import { absoluteLocaleUrl, dictionaryFor, LANGUAGES } from "../language/languages"
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

	it("names each step's actor and the three things the agent hands back", () => {
		for (const [index, actor] of dictionary.howStepActors.entries()) {
			expect(LLMS_FULL_TXT).toContain(`${index + 1}. ${dictionary.howSteps[index]} — ${actor}`)
		}
		for (const item of dictionary.howPresentationItems) expect(LLMS_FULL_TXT).toContain(item)
		expect(LLMS_FULL_TXT).toContain(dictionary.howOutputChat.join(" / "))
		expect(LLMS_FULL_TXT).toContain(dictionary.howOutputSource)
	})

	it("carries no run label, because the page has none", () => {
		expect(LLMS_FULL_TXT).not.toContain("Run 1")
	})

	it("prints the Prompt route sentence, and links the home in every other Language", () => {
		expect(LLMS_FULL_TXT).toContain(INSTALL_PROMPT)
		for (const entry of LANGUAGES.filter((one) => one.language !== FALLBACK_LANGUAGE)) {
			expect(LLMS_FULL_TXT).toContain(
				`- [${entry.dictionary.languageName}](${absoluteLocaleUrl(entry.language)})`,
			)
		}
	})

	it("carries no text the owner has not written, and no placeholder for it", () => {
		expect(LLMS_FULL_TXT).not.toContain(OWNER_WRITTEN_PLACEHOLDER)
	})
})
