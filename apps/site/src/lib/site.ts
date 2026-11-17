/** The origin the Site is served from, so canonical and `hreflang` links can be absolute. */
export const SITE_ORIGIN = "https://trajectonomics.com"

/** The Site's name: the brand lockup's accessible name, and the name the Organisation goes by. */
export const SITE_NAME = "trajectonomics"

/**
 * The install command the Site shows: unpinned and without `-y`, because the visitor copies it as it
 * is. It is one value, the same text in every Language, and a fixture no edit may change silently.
 */
export const INSTALL_COMMAND = "npx skills add trajectonomics/skills --skill traj-onboarding"

/**
 * The command the See it in action section shows the agent running, taken from the CLI's own `traj fi`
 * examples. A product fixture, the same text in every Language, and not copy.
 */
export const FI_DEMO_COMMAND =
	"traj fi --scenario base --as-of 2026-03-31 --horizon 2066-03-31 --json"

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

/** The Docs Portal's CLI page, the CLI docs link under the How it works section and in the footer. */
export const DOCS_CLI_PATH = "/docs/cli/"

/**
 * The Docs Portal's CLI installation page: every install channel, release pinning and uninstall. It is the
 * way out under the install command, for the visitor the skills CLI cannot reach (ADR 0009).
 */
export const DOCS_CLI_INSTALL_PATH = "/docs/cli/installation/"

/** The CLI's v0.1.0 release date, the machine-readable date the footer's release line names. */
export const RELEASE_DATE = "2026-11-12"

/** The skills repository: the star menu, the How it works star link and the footer's licence name it. */
export const GITHUB_SKILLS_URL = "https://github.com/trajectonomics/skills"

/** The traj CLI's repository. */
export const GITHUB_CLI_URL = "https://github.com/trajectonomics/cli"

/** The CLI's issue tracker, where the disclaimer sends a visitor who finds a bug. */
export const GITHUB_CLI_ISSUES_URL = `${GITHUB_CLI_URL}/issues`

/** The CLI's releases page: every version and its notes. */
export const GITHUB_CLI_RELEASES_URL = `${GITHUB_CLI_URL}/releases`

/** The Organisation, for the footer's link. */
export const GITHUB_ORG_URL = "https://github.com/trajectonomics"

/** The skills repository's MIT licence, the footer's licence link. */
export const SKILLS_LICENCE_URL = `${GITHUB_SKILLS_URL}/blob/main/LICENSE`

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
	Object.freeze({ repo: "cli", name: "cli", url: GITHUB_CLI_URL }),
	Object.freeze({ repo: "skills", name: "skills", url: GITHUB_SKILLS_URL }),
])
