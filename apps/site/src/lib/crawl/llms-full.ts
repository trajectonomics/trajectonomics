import { FALLBACK_LANGUAGE } from "../language/language"
import { absoluteLocaleUrl, dictionaryFor, LANGUAGES } from "../language/languages"
import {
	FI_DEMO_COMMAND,
	FI_DEMO_DATE,
	FI_DEMO_OUTPUT,
	INSTALL_PROMPT,
	SKILLS_LICENCE_URL,
} from "../site"
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

/** A line of one transcript: the speaker the page aligns, then what they say. */
const line = (speaker: string, said: string) => `- ${speaker}: ${said}`

/** The agent alone's exchange, in the order the page plays it. */
const ALONE = [
	`**${dictionary.actionWithoutLabel}**`,
	"",
	line(dictionary.actionYou, dictionary.actionQuestion),
	line(dictionary.actionAgent, dictionary.actionGuesses[0] ?? ""),
	line(dictionary.actionYou, dictionary.actionReask),
	line(dictionary.actionAgent, dictionary.actionGuesses[1] ?? ""),
	line(dictionary.actionYou, dictionary.actionExplain),
	line(dictionary.actionAgent, dictionary.actionGuessReason),
	line(dictionary.actionYou, dictionary.actionSure),
	line(dictionary.actionAgent, dictionary.actionConfession),
]

/** The agent with traj's exchange: the guide question, the sheet, the figure it asks for, then the CLI. */
const WITH_TRAJ = [
	`**${dictionary.actionWithLabel}**`,
	"",
	line(dictionary.actionYou, dictionary.actionQuestion),
	line(dictionary.actionAgent, dictionary.actionGuideQuestion),
	line(dictionary.actionYou, `${dictionary.actionAttach} (${dictionary.actionAttachName})`),
	line(dictionary.actionAgent, dictionary.actionNeedMore),
	line(dictionary.actionYou, dictionary.actionData),
	line(dictionary.actionAgent, dictionary.actionSkillLine),
	"",
	...DEMO,
	"",
	line(dictionary.actionAgent, `${dictionary.actionAnswer} (${dictionary.actionProvenance})`),
]

/** The three things the agent hands back on the presentation layer, drawn under their own names. */
const OUTPUTS = [
	`- ${dictionary.howPresentationItems[0]}: ${dictionary.howOutputChat.join(" / ")}`,
	`- ${dictionary.howPresentationItems[1]}: ${FI_DEMO_DATE.slice(0, 4)}`,
	`- ${dictionary.howPresentationItems[2]}: ${dictionary.howOutputStatus} (${dictionary.howOutputSource})`,
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
		...ALONE,
		"",
		...WITH_TRAJ,
		"",
		dictionary.actionExampleNote,
	]),
	section(dictionary.howHeading, [
		dictionary.howLede,
		"",
		...dictionary.howSteps.map(
			(step, index) => `${index + 1}. ${step} — ${dictionary.howStepActors[index] ?? ""}`,
		),
		"",
		...LAYERS,
		"",
		...OUTPUTS,
	]),
	section(dictionary.featuresHeading, FEATURES),
	section("Install", [INSTALL_PROMPT]),
	section("License", [linkLine(dictionary.licence, SKILLS_LICENCE_URL)]),
	section("Languages", OTHER_LANGUAGES),
])
