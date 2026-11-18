import { FALLBACK_LANGUAGE } from "../language/language"
import { absoluteLocaleUrl, dictionaryFor, LANGUAGES } from "../language/languages"
import { FI_DEMO_COMMAND, FI_DEMO_OUTPUT, INSTALL_PROMPT, SKILLS_LICENCE_URL } from "../site"
import { linkLine, renderLlms, section } from "./llms-markdown"

/** The full Answer engine file's built path, relative to the Worker's assets root. */
export const LLMS_FULL_FILE = "llms-full.txt"

/** The Language the full file is written in: the one a crawler falls back to, so no copy is invented. */
const dictionary = dictionaryFor(FALLBACK_LANGUAGE)

/** The headline as one line, the accent run last in it as the page writes it. */
const HEADLINE = `${dictionary.heroHeadingPrefix} ${dictionary.heroHeadingAccent}`

/** The pill's two runs: the licence and the release, both facts the page prints. */
const RELEASE = `${dictionary.heroLicence} · ${dictionary.heroVersion}`

/** The demo the page shows: the command an agent runs, and the abridged JSON it answers with. */
const DEMO = ["```bash", FI_DEMO_COMMAND, "```", "", "```json", ...FI_DEMO_OUTPUT, "```"]

/** The comparison: what an agent answers alone, run by run, and what it answers with the skill. */
const COMPARISON = [
	`**${dictionary.actionQuestion}**`,
	"",
	...dictionary.actionRunLabels.map(
		(label, index) =>
			`- ${label} — ${dictionary.actionWithoutLabel}: ${dictionary.actionGuesses[index] ?? ""}`,
	),
	`- ${dictionary.actionWithLabel}: ${dictionary.actionAnswer}`,
]

/** The three layers, named with the owner and the sentence the page gives each. */
const LAYERS = [
	`**${dictionary.howPresentationLabel}** — ${dictionary.howPresentationOwner}: ${dictionary.howPresentationCopy}`,
	`**${dictionary.howSkillsLabel}**: ${dictionary.howSkillsCopy}`,
	`**${dictionary.howLogicLabel}** — ${dictionary.howLogicOwner}: ${dictionary.howLogicCopy}`,
]

/** Every feature, its title and its sentence, in the order the page lists them. */
const FEATURES = dictionary.featureTitles.map(
	(title, index) => `- **${title}**: ${dictionary.featureCopies[index] ?? ""}`,
)

/** Every Language other than this file's, so a reader can reach the home in its own Language. */
const OTHER_LANGUAGES = LANGUAGES.filter((entry) => entry.language !== FALLBACK_LANGUAGE).map(
	(entry) => linkLine(entry.dictionary.languageName, absoluteLocaleUrl(entry.language)),
)

/**
 * The full Answer engine file at `/llms-full.txt`: the landing page's copy in the fallback Language,
 * rendered as Markdown, and the link to the home in every other Language. It is the page's own words,
 * so it cannot say anything the page does not.
 */
export const LLMS_FULL_TXT = renderLlms(dictionary.documentTitle, dictionary.description, [
	section(HEADLINE, [dictionary.heroSubline, "", RELEASE]),
	section(dictionary.actionHeading, [
		dictionary.actionLede,
		"",
		...COMPARISON,
		"",
		dictionary.actionSkillLine,
		"",
		...DEMO,
		"",
		dictionary.actionExampleNote,
	]),
	section(dictionary.howHeading, [
		dictionary.howLede,
		"",
		...dictionary.howSteps.map((step, index) => `${index + 1}. ${step}`),
		"",
		...LAYERS,
	]),
	section(dictionary.featuresHeading, FEATURES),
	section("Install", [INSTALL_PROMPT]),
	section("License", [linkLine(dictionary.licence, SKILLS_LICENCE_URL)]),
	section("Languages", OTHER_LANGUAGES),
])
