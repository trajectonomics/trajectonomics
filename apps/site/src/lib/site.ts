/** The origin the Site is served from, so canonical and `hreflang` links can be absolute. */
export const SITE_ORIGIN = "https://trajectonomics.com"

/** The Site's name: the document title of every Language home, and the brand lockup's accessible name. */
export const SITE_NAME = "trajectonomics"

/**
 * The install command the Site shows: unpinned and without `-y`, because the visitor copies it as it
 * is. It is one value, the same text in every Language, and a fixture no edit may change silently.
 */
export const INSTALL_COMMAND = "npx skills add trajectonomics/skills --skill traj-onboarding"

/**
 * The plan the two-tile diagram shows the CLI running, and the figure it returns: a product fixture,
 * the same text in every Language, not copy.
 */
export const DIAGRAM_PLAN_COMMAND = "$ traj plan"

/** The figure the diagram's CLI tile returns: a product fixture, not copy. */
export const DIAGRAM_PLAN_AMOUNT = "14,280.00"

/** The Docs Portal's path, which the router serves; this repository does not build it. */
export const DOCS_PATH = "/docs/"

/** The Docs Portal's CLI page, the CLI docs link under the diagram. */
export const DOCS_CLI_PATH = "/docs/cli/"

/**
 * The Docs Portal's CLI installation page: every install channel, release pinning and uninstall. It is the
 * way out under the install command, for the visitor the skills CLI cannot reach (ADR 0009).
 */
export const DOCS_CLI_INSTALL_PATH = "/docs/cli/installation/"

/** The CLI's v0.1.0 release date, the machine-readable date the footer's release line names. */
export const RELEASE_DATE = "2026-11-12"

/** The skills repository: the star menu, the diagram's star link and the footer's licence name it. */
export const GITHUB_SKILLS_URL = "https://github.com/trajectonomics/skills"

/** The traj CLI's repository. */
export const GITHUB_CLI_URL = "https://github.com/trajectonomics/cli"

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
