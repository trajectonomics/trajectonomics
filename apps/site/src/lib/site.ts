/** The origin the Site is served from, so canonical and `hreflang` links can be absolute. */
export const SITE_ORIGIN = "https://trajectonomics.com"

/** The Site's name: the brand lockup's accessible name, and the name the Organisation goes by. */
export const SITE_NAME = "trajectonomics"

/** The CLI's name: the program the Site is about, and the `name` Structured data gives it. */
export const CLI_NAME = "traj"

/** The apple-touch icon's path: the one image the Site publishes of itself. */
export const APPLE_TOUCH_ICON_PATH = "/favicon/apple-touch-icon.png"

/** That icon on the Site's own origin, which is the absolute URL a `logo` must be. */
export const APPLE_TOUCH_ICON_URL = `${SITE_ORIGIN}${APPLE_TOUCH_ICON_PATH}`

/**
 * The skills repository's raw path to the skills it publishes on its default branch, which a coding
 * agent reads with nothing installed: no skills CLI, no Node version, no clone.
 */
const SKILLS_RAW_PATH = "https://raw.githubusercontent.com/trajectonomics/skills/main/skills"

/** The Onboarding skill's published file: the one the prompt names, so the path and the prompt agree. */
export const ONBOARDING_SKILL_URL = `${SKILLS_RAW_PATH}/traj-onboarding/SKILL.md`

/**
 * The prompt the Site shows: one sentence the visitor pastes into a coding agent, which then reads the
 * Onboarding skill and sets the machine up itself. It is one value, the same text in every Language,
 * a fixture no edit may change silently, and it prints no command.
 */
export const INSTALL_PROMPT = `Set up traj: read ${ONBOARDING_SKILL_URL} and follow it.`

/**
 * The command the demo window shows the agent running, taken from the CLI's own `traj fi`
 * examples. A product fixture, the same text in every Language, and not copy.
 */
export const FI_DEMO_COMMAND =
	"traj fi --scenario base --as-of 2026-03-31 --horizon 2066-03-31 --json"

/** The name on the demo window's title bar: the app a visitor's agent runs in, drawn rather than embedded. */
export const DEMO_APP_NAME = "Claude"

/** What the visitor types before the question to hand it to the traj skill: the skill's own name, the same in every Language. */
export const DEMO_SKILL_COMMAND = "/traj"

/** The earliest month the demo's survival answer says earned income could stop: the figure it repeats. */
export const FI_DEMO_DATE = "2041-08-01"

/**
 * The abridged JSON `traj fi --json` prints for the demo, one line each: the echo of the date it read,
 * the tax status and the answer. A product fixture in the CLI's own field names, not copy.
 */
export const FI_DEMO_OUTPUT: readonly string[] = Object.freeze([
	"{",
	'  "asOf": "2026-03-31",',
	'  "tax": "not_applied",',
	'  "method": "survival",',
	`  "fi": { "reachable": true, "fiDate": "${FI_DEMO_DATE}" }`,
	"}",
])

/** The Docs Portal's path, which the router serves; this repository does not build it. */
export const DOCS_PATH = "/docs/"

/** The Docs Portal's CLI page, the CLI docs link in the footer. */
export const DOCS_CLI_PATH = "/docs/cli/"

/**
 * The Docs Portal's CLI installation page: every install channel, release pinning and uninstall. It is the
 * way out under the prompt, for the visitor the skills CLI cannot reach (ADR 0015).
 */
export const DOCS_CLI_INSTALL_PATH = "/docs/cli/installation/"

/** The skills repository: the footer's own link and the footer's licence name it. */
export const GITHUB_SKILLS_URL = "https://github.com/trajectonomics/skills"

/**
 * The monorepo the CLI is built and released from. Issues and releases live at its root, and it is the
 * one repository the Star menu counts, because its star is the one the button adds.
 */
export const GITHUB_REPO_URL = "https://github.com/trajectonomics/trajectonomics"

/** The traj CLI's source folder in the monorepo. */
export const GITHUB_CLI_URL = `${GITHUB_REPO_URL}/tree/main/apps/cli`

/** The CLI's issue tracker, where the disclaimer sends a visitor who finds a bug. */
export const GITHUB_CLI_ISSUES_URL = `${GITHUB_REPO_URL}/issues`

/** The CLI's releases page: every version and its notes, tagged cli-vX.Y.Z. */
export const GITHUB_CLI_RELEASES_URL = `${GITHUB_REPO_URL}/releases`

/** The Organisation, for the footer's link. */
export const GITHUB_ORG_URL = "https://github.com/trajectonomics"

/** The skills repository's MIT licence, the footer's licence link. */
export const SKILLS_LICENCE_URL = `${GITHUB_SKILLS_URL}/blob/main/LICENSE`

/**
 * The owner's Google Search Console token, once the owner pastes one in. While it is `undefined` the
 * page carries no verification meta, because a token this repository invented verifies nothing.
 */
export const GOOGLE_SITE_VERIFICATION_TOKEN: string | undefined = undefined

/** The owner's Bing Webmaster Tools token, under the same rule as the Google one. */
export const BING_SITE_VERIFICATION_TOKEN: string | undefined = undefined

/**
 * One repository the Star menu offers: the repository's own name on GitHub, the name a visitor
 * reads, and where its star goes.
 */
export interface StarRepo {
	readonly repo: string
	readonly name: string
	readonly url: string
}

/**
 * The repositories the Star menu may list, in the order a tie falls back to. The menu orders them by
 * the committed star snapshot, highest first, and leaves out a repository at zero, so adding a
 * repository is one entry here and a snapshot refresh.
 */
export const STAR_REPOS: readonly StarRepo[] = Object.freeze([
	Object.freeze({
		repo: "trajectonomics",
		name: "trajectonomics/trajectonomics",
		url: GITHUB_REPO_URL,
	}),
])
