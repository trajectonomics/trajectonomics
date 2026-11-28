import { FALLBACK_LANGUAGE } from "../language/language"
import { ABSOLUTE_CLEAN_URL, dictionaryFor } from "../language/languages"
import { openJotDictionaryFor } from "../language/openjot-dictionary"
import {
	FI_DEMO_COMMAND,
	FI_DEMO_OUTPUT,
	FI_DEMO_SETUP_COMMANDS,
	INSTALL_PROMPT,
	SKILLS_LICENCE_URL,
} from "../site"
import { ABSOLUTE_OPENJOT_URL } from "../site/openjot"
import { linkLine, renderLlms, section } from "./llms-markdown"

/** The full Answer engine file's built path, relative to the Worker's assets root. */
export const LLMS_FULL_FILE = "llms-full.txt"

/** The Language the full file is written in: the one a crawler falls back to, so no copy is invented. */
const dictionary = dictionaryFor(FALLBACK_LANGUAGE)

/** The OpenJot page's words, in the same fallback Language. */
const openJot = openJotDictionaryFor(FALLBACK_LANGUAGE)

/** The headline as one line, the accent run last in it as the page writes it. */
const HEADLINE = `${dictionary.heroHeadingPrefix} ${dictionary.heroHeadingAccent}`

/** The pill's two runs: the licence and the release, both facts the page prints. */
const RELEASE = `${dictionary.heroLicence} · ${dictionary.heroVersion}`

/**
 * The comment above each setup command, in order: what happens before it. This file is the only place
 * the setup is written out, because the page's install window shows the prompt alone. The template's
 * `--as-of` reads the ledger, so the balance is recorded first.
 */
const SETUP_NOTES: readonly string[] = [
	"# First-time setup:",
	"# Record your balance in the ledger first: an opening on or before the as-of date.",
	"# Fill base.json with your numbers, then apply it.",
]

/** The setup commands, each under the comment that says what comes before it. */
const SETUP_LINES = FI_DEMO_SETUP_COMMANDS.flatMap((command, at) => {
	const note = SETUP_NOTES[at]
	return note === undefined ? [command] : [note, command]
})

/** The line above the demo command: the question that command answers. */
const ASK_NOTE = "# Ask when you reach financial independence:"

/**
 * The demo this file carries, and the page no longer plays: the first-time setup, the command an agent
 * runs, and the abridged JSON it answers with. The setup label is there because `scenario apply base
 * --file` replaces an existing `base` plan, so the three commands are a one-time setup and not a
 * repeatable script.
 */
const DEMO = [
	"```bash",
	...SETUP_LINES,
	"",
	ASK_NOTE,
	FI_DEMO_COMMAND,
	"```",
	"",
	"```json",
	...FI_DEMO_OUTPUT,
	"```",
]

/** A line of one transcript: the speaker, then what they say. */
const line = (speaker: string, said: string) => `- ${speaker}: ${said}`

/** The agent alone's exchange, in the order this file tells it. */
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

/** Every feature, its title and its sentence, in the order the page lists them. */
const FEATURES = dictionary.featureTitles.map(
	(title, index) => `- **${title}**: ${dictionary.featureCopies[index] ?? ""}`,
)

/** The FAQ as the page shows it: each question in bold, then its answer. */
const FAQ = dictionary.faqQuestions.flatMap((question, index) => [
	`- **${question}** ${dictionary.faqAnswers[index] ?? ""}`,
])

/** The Site's one address, named in full because the file is read away from the Site. */
const ADDRESS_LINES = [linkLine(dictionary.documentTitle, ABSOLUTE_CLEAN_URL)]

/** The OpenJot page: its address, its summary and the app it describes. */
const OPENJOT_LINES = [
	linkLine(openJot.documentTitle, ABSOLUTE_OPENJOT_URL),
	"",
	openJot.description,
]

/**
 * The full Answer engine file at `/llms-full.txt`: the Site's words in the fallback Language, rendered
 * as Markdown, at the Site's one address. It carries the two demo transcripts, which the page no
 * longer shows, so it says more than the page: the exchanges, the setup and the JSON answer are only
 * here. Every line of that copy is still the owner's own Dictionary text.
 */
export const LLMS_FULL_TXT = renderLlms(dictionary.documentTitle, dictionary.description, [
	section("Address", ADDRESS_LINES),
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
	section(dictionary.featuresHeading, FEATURES),
	section(dictionary.faqHeading, FAQ),
	section("OpenJot", OPENJOT_LINES),
	section("Install", [INSTALL_PROMPT]),
	section("License", [linkLine(dictionary.licence, SKILLS_LICENCE_URL)]),
])
